//! Source-owned synthetic state. Personal tools and presentation never live here.
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq, Hash)]
pub struct Identity {
    pub source: String,
    pub campus: String,
    pub encounter: String,
    pub object: String,
}
impl Identity {
    fn valid(&self) -> bool {
        [&self.source, &self.campus, &self.encounter, &self.object]
            .iter()
            .all(|s| !s.is_empty() && s.len() <= 480 && s.chars().count() <= 160)
    }
}
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SourceSettings {
    pub privacy: bool,
    pub role: String,
    pub locked: bool,
    pub fullscreen: bool,
    pub connectivity: String,
    pub route_fault: String,
}
impl Default for SourceSettings {
    fn default() -> Self {
        Self {
            privacy: false,
            role: "clinician".into(),
            locked: false,
            fullscreen: false,
            connectivity: "fresh".into(),
            route_fault: "none".into(),
        }
    }
}
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Field {
    label: String,
    value: String,
    at: Option<i64>,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Activity {
    pub identity: Identity,
    pub version: u64,
    pub stage: usize,
    pub scenario: String,
    pub route_kind: String,
    compact: String,
    title: String,
    body: String,
    source_state: String,
    source_at: Option<i64>,
    synced_at: Option<i64>,
    fields: Vec<Field>,
    tone: String,
    priority: String,
    scope: String,
    patient: String,
    guard: String,
    action_label: String,
    pub withdrawn: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    lab_ref: Option<Value>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Stage {
    title: String,
    body: String,
    source_state: String,
    tone: String,
    fields: Vec<StageField>,
    #[serde(default)]
    unknown_time: bool,
    #[serde(default)]
    unknown_field_time: bool,
    #[serde(default)]
    stale: bool,
    #[serde(default)]
    important: bool,
    #[serde(default)]
    withdrawn: bool,
    action_label: Option<String>,
    route_fault: Option<String>,
}
#[derive(Deserialize)]
struct StageField {
    label: String,
    value: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Scenario {
    id: String,
    name: String,
    source: String,
    scope: String,
    guard: String,
    action_label: String,
    stages: Vec<Stage>,
}
#[derive(Deserialize)]
#[serde(tag = "type")]
pub enum SourceCommand {
    #[serde(rename = "clinical:sync")]
    Sync,
    #[serde(rename = "clinical:refresh")]
    Refresh,
    #[serde(rename = "clinical:reset")]
    Reset,
    #[serde(rename = "clinical:configure")]
    Configure { settings: Map<String, Value> },
    #[serde(rename = "clinical:scenario")]
    Scenario {
        scenario: String,
        stage: Option<usize>,
        separate: Option<bool>,
        #[serde(rename = "labVariant")]
        lab_variant: Option<String>,
    },
    #[serde(rename = "clinical:open")]
    Open {
        #[serde(rename = "requestId")]
        request_id: String,
        identity: Identity,
        version: u64,
        #[serde(rename = "routeKind")]
        route_kind: String,
    },
    #[serde(rename = "clinical:lab-read")]
    LabRead {
        #[serde(rename = "requestId")]
        request_id: String,
        identity: Identity,
        version: u64,
        #[serde(rename = "reportId")]
        report_id: String,
    },
    #[serde(rename = "clinical:source-read")]
    SourceRead { ticket: String },
}
impl SourceCommand {
    pub fn is_read(&self) -> bool {
        matches!(
            self,
            Self::Sync
                | Self::Refresh
                | Self::Open { .. }
                | Self::LabRead { .. }
                | Self::SourceRead { .. }
        )
    }
}
#[derive(Default)]
pub struct Output {
    pub events: Vec<Value>,
    pub reply: Option<Value>,
}
struct Ticket {
    identity: Identity,
    version: u64,
    expires: i64,
}
pub struct Engine {
    pub settings: SourceSettings,
    activities: Vec<Activity>,
    reports: HashMap<Identity, Value>,
    tickets: Vec<(String, Ticket)>,
    serial: u64,
    catalogue: Vec<Scenario>,
    fixtures: Value,
}
impl Engine {
    pub fn new() -> Result<Self, String> {
        Ok(Self {
            settings: SourceSettings::default(),
            activities: Vec::new(),
            reports: HashMap::new(),
            tickets: Vec::new(),
            serial: 0,
            catalogue: serde_json::from_str(include_str!("../../../src/clinical/catalogue.json"))
                .map_err(|e| e.to_string())?,
            fixtures: serde_json::from_str(include_str!("../../../shared/lab-fixtures.json"))
                .map_err(|e| e.to_string())?,
        })
    }
    fn allowed(&self, a: &Activity) -> bool {
        !self.settings.privacy
            && !self.settings.locked
            && !self.settings.fullscreen
            && self.settings.role != "none"
            && (a.scope == self.settings.role
                || (a.scope == "logistics" && self.settings.role == "clinician"))
    }
    fn public(&self, a: &Activity) -> Activity {
        if self.allowed(a) {
            return a.clone();
        }
        let mut masked = a.clone();
        masked.patient = "患者信息已保护".into();
        masked.title = a.compact.clone();
        masked.body = "身份或展示权限不允许查看详情。".into();
        masked.source_state = "详情已保护".into();
        masked.fields.clear();
        masked.source_at = None;
        masked.synced_at = None;
        masked.lab_ref = None;
        masked
    }
    pub fn snapshot(&self) -> Value {
        json!({"type":"clinical:snapshot","settings":self.settings,"activities":self.activities.iter().map(|a|self.public(a)).collect::<Vec<_>>()})
    }
    fn valid_request(id: &str, identity: &Identity) -> bool {
        !id.is_empty() && id.len() <= 80 && identity.valid()
    }
    pub fn handle(&mut self, command: SourceCommand, now: i64) -> Result<Output, String> {
        let mut out = Output::default();
        match command {
            SourceCommand::Sync => out.reply = Some(self.snapshot()),
            SourceCommand::Reset => {
                self.activities.clear();
                self.reports.clear();
                self.tickets.clear();
                self.settings = SourceSettings::default();
                out.events.push(json!({"type":"clinical:reset"}));
                out.events.push(self.snapshot());
            }
            SourceCommand::Configure { settings } => {
                let mut next = serde_json::to_value(&self.settings).map_err(|e| e.to_string())?;
                for (key, value) in settings {
                    match key.as_str(){
                        "privacy"|"locked"|"fullscreen" if value.is_boolean()=>{},
                        "role" if value.as_str().is_some_and(|s|["clinician","finance","logistics","none"].contains(&s))=>{},
                        "connectivity" if value.as_str().is_some_and(|s|["fresh","stale","offline"].contains(&s))=>{},
                        "routeFault" if value.as_str().is_some_and(|s|["none","failed","mismatch"].contains(&s))=>{},
                        _=>return Err("Invalid source setting; personal and presentation state belongs to viewers".into()),
                    }
                    next[key] = value;
                }
                self.settings = serde_json::from_value(next).map_err(|e| e.to_string())?;
                self.tickets.clear();
                out.events
                    .push(json!({"type":"clinical:settings","settings":self.settings}));
                out.events.push(self.snapshot());
            }
            SourceCommand::Scenario {
                scenario,
                stage,
                separate,
                lab_variant,
            } => {
                let route = route(&scenario).ok_or("Unknown synthetic clinical scenario")?;
                let def = self
                    .catalogue
                    .iter()
                    .find(|d| d.id == scenario)
                    .ok_or("Unknown synthetic clinical scenario")?;
                let stage = stage.unwrap_or(0);
                let v = def
                    .stages
                    .get(stage)
                    .ok_or("Unknown synthetic clinical stage")?;
                if let Some(variant) = &lab_variant {
                    if scenario != "S04"
                        || !["baseline", "normal", "extended"].contains(&variant.as_str())
                    {
                        return Err("Unknown synthetic report variant".into());
                    }
                }
                let suffix = if separate.unwrap_or(false) {
                    self.serial = self.serial.saturating_add(1);
                    format!("-{}", self.serial)
                } else {
                    String::new()
                };
                let identity = Identity {
                    source: def.source.clone(),
                    campus: "DEMO-本部".into(),
                    encounter: match scenario.as_str() {
                        "S07" => "DEMO-VISIT-OLD",
                        "S15" => "DEMO-ASSET",
                        _ => "DEMO-VISIT-006",
                    }
                    .into(),
                    object: format!("DEMO-{scenario}{suffix}"),
                };
                let index = self.activities.iter().position(|a| a.identity == identity);
                if index.is_none() && self.activities.len() >= 20 {
                    out.events
                        .push(json!({"type":"clinical:overflow","count":1}));
                    return Ok(out);
                }
                let version = index.map_or(1, |i| self.activities[i].version.saturating_add(1));
                let mut a = Activity {
                    identity: identity.clone(),
                    version,
                    stage,
                    scenario: scenario.clone(),
                    route_kind: route.into(),
                    compact: format!("{} · 1 项动态", def.name),
                    title: v.title.clone(),
                    body: v.body.clone(),
                    source_state: v.source_state.clone(),
                    source_at: if v.unknown_time {
                        None
                    } else {
                        Some(now - 60000)
                    },
                    synced_at: Some(now - if v.stale { 3600000 } else { 0 }),
                    fields: v
                        .fields
                        .iter()
                        .enumerate()
                        .map(|(i, f)| Field {
                            label: f.label.clone(),
                            value: f.value.clone(),
                            at: if v.unknown_field_time && i > 0 {
                                None
                            } else {
                                Some(now - 60000 * (i as i64 + 1))
                            },
                        })
                        .collect(),
                    tone: v.tone.clone(),
                    priority: if v.important { "important" } else { "routine" }.into(),
                    scope: def.scope.clone(),
                    patient: if scenario == "S15" {
                        "设备 DEMO-ECG-01"
                    } else {
                        "王某某 · 成人 · 06床（仅模拟）"
                    }
                    .into(),
                    guard: def.guard.clone(),
                    action_label: v.action_label.as_ref().unwrap_or(&def.action_label).clone(),
                    withdrawn: v.withdrawn,
                    lab_ref: None,
                };
                if let Some(variant) = lab_variant {
                    let mut report = self
                        .fixtures
                        .get(&variant)
                        .cloned()
                        .ok_or("Missing synthetic report fixture")?;
                    report["identity"] =
                        serde_json::to_value(&identity).map_err(|e| e.to_string())?;
                    report["version"] = json!(version);
                    report["id"] = json!(format!("LAB-{}", identity.object));
                    let count = report["items"]
                        .as_array()
                        .ok_or("Invalid report fixture")?
                        .iter()
                        .filter(|i| {
                            i["flag"]
                                .as_str()
                                .is_some_and(|s| ["H", "L", "A"].contains(&s))
                        })
                        .count();
                    a.title = "检验报告已出".into();
                    a.compact = "检验报告 · 1 项动态".into();
                    a.body = format!(
                        "血常规 肝功能 CRP　{}",
                        if count > 0 {
                            format!("{count} 项异常")
                        } else {
                            "全部正常".into()
                        }
                    );
                    a.patient = "模拟检验报告".into();
                    a.source_state = "只读报告已发布".into();
                    a.fields.clear();
                    a.withdrawn = false;
                    a.lab_ref = Some(json!({"id":report["id"],"abnormalCount":count}));
                    self.reports.insert(identity, report);
                } else {
                    self.reports.remove(&identity);
                }
                if let Some(fault) = &v.route_fault {
                    if ["none", "failed", "mismatch"].contains(&fault.as_str()) {
                        self.settings.route_fault = fault.clone();
                    }
                }
                if let Some(i) = index {
                    self.activities[i] = a.clone();
                } else {
                    self.activities.push(a.clone());
                }
                out.events
                    .push(json!({"type":"clinical:settings","settings":self.settings}));
                out.events
                    .push(json!({"type":"clinical:activity","activity":self.public(&a)}));
            }
            SourceCommand::Refresh => {
                if self.settings.connectivity != "fresh" {
                    out.reply = Some(json!({"type":"clinical:refresh-failed"}));
                } else {
                    for a in &mut self.activities {
                        a.synced_at = Some(now);
                    }
                    out.events.push(self.snapshot());
                }
            }
            SourceCommand::Open {
                request_id,
                identity,
                version,
                route_kind,
            } => {
                if !Self::valid_request(&request_id, &identity) {
                    return Err("Invalid route request".into());
                }
                let answer = json!({"type":"clinical:route","requestId":request_id});
                let mut reply = answer;
                match self.activities.iter().find(|a| a.identity == identity) {
                    None => reply["error"] = json!("mismatch"),
                    Some(a) if a.version != version || a.route_kind != route_kind => {
                        reply["error"] = json!("mismatch")
                    }
                    Some(a) if !self.allowed(a) => reply["error"] = json!("unauthorized"),
                    Some(_)
                        if self.settings.connectivity != "fresh"
                            || self.settings.route_fault != "none" =>
                    {
                        reply["error"] = json!(if self.settings.route_fault == "mismatch" {
                            "mismatch"
                        } else {
                            "failed"
                        })
                    }
                    Some(a) => {
                        let ticket = Uuid::new_v4().to_string();
                        reply["ticket"] = json!(ticket);
                        reply["identity"] = json!(a.identity);
                        reply["version"] = json!(a.version);
                        self.tickets.push((
                            ticket,
                            Ticket {
                                identity: a.identity.clone(),
                                version: a.version,
                                expires: now + 60000,
                            },
                        ));
                        if self.tickets.len() > 20 {
                            self.tickets.remove(0);
                        }
                    }
                }
                out.reply = Some(reply);
            }
            SourceCommand::LabRead {
                request_id,
                identity,
                version,
                report_id,
            } => {
                if !Self::valid_request(&request_id, &identity) {
                    return Err("Invalid report request".into());
                }
                let a = self.activities.iter().find(|a| a.identity == identity);
                let report = self.reports.get(&identity);
                let valid = a
                    .is_some_and(|a| a.version == version && !a.withdrawn && self.allowed(a))
                    && report.is_some_and(|r| r["id"].as_str() == Some(&report_id))
                    && self.settings.connectivity == "fresh"
                    && self.settings.route_fault == "none";
                out.reply = Some(if valid {
                    json!({"type":"clinical:lab-report","requestId":request_id,"report":report})
                } else {
                    json!({"type":"clinical:lab-report","requestId":request_id,"error":"Report identity, version or permission changed"})
                });
            }
            SourceCommand::SourceRead { ticket } => {
                let t = self
                    .tickets
                    .iter()
                    .find(|(id, _)| id == &ticket)
                    .map(|(_, t)| t);
                let a = t.and_then(|t| self.activities.iter().find(|a| a.identity == t.identity));
                let valid = t.is_some_and(|t| t.expires >= now)
                    && a.zip(t)
                        .is_some_and(|(a, t)| a.version == t.version && self.allowed(a))
                    && self.settings.connectivity == "fresh";
                out.reply = Some(if valid {
                    let a = a.ok_or("Source object disappeared")?;
                    let mut result =
                        json!({"type":"clinical:source","ticket":ticket,"activity":self.public(a)});
                    if a.lab_ref.is_some() {
                        result["labReport"] = self
                            .reports
                            .get(&a.identity)
                            .cloned()
                            .unwrap_or(Value::Null);
                    }
                    result
                } else {
                    json!({"type":"clinical:source","ticket":ticket,"error":"对象、权限或版本已变化，请返回重新打开。"})
                });
            }
        }
        Ok(out)
    }
}
fn route(id: &str) -> Option<&'static str> {
    Some(match id {
        "S02" => "orders",
        "S03" => "critical",
        "S04" => "reports",
        "S05" => "finance",
        "S06" => "handoff",
        "S07" => "followup",
        "S08" => "report-version",
        "S09" => "specimen",
        "S10" => "blood",
        "S11" => "pharmacy",
        "S12" => "examination",
        "S13" => "transport",
        "S14" => "consult",
        "S15" => "equipment",
        _ => return None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn command(e: &mut Engine, v: Value) -> Output {
        e.handle(serde_json::from_value(v).unwrap(), 1800000000000)
            .unwrap()
    }
    #[test]
    fn shared_node_source_contract_matches_all_scenarios() {
        let cases: Vec<Value> =
            serde_json::from_str(include_str!("../../../shared/source-contract.json")).unwrap();
        for case in cases {
            let mut engine = Engine::new().unwrap();
            for payload in case["commands"].as_array().unwrap() {
                engine
                    .handle(
                        serde_json::from_value(payload.clone()).unwrap(),
                        1800000000000,
                    )
                    .unwrap();
            }
            assert_eq!(engine.snapshot(), case["snapshot"], "{}", case["name"]);
        }
    }
    #[test]
    fn source_snapshots_have_no_personal_or_presentation_state() {
        let e = Engine::new().unwrap();
        let s = e.snapshot();
        assert!(s.get("timer").is_none());
        assert!(s["settings"].get("reduced").is_none());
    }
    #[test]
    fn reports_are_masked_and_tickets_revoke_on_permission_change() {
        let mut e = Engine::new().unwrap();
        command(
            &mut e,
            json!({"type":"clinical:scenario","scenario":"S04","labVariant":"extended"}),
        );
        let a = e.snapshot()["activities"][0].clone();
        let route=command(&mut e,json!({"type":"clinical:open","requestId":"test","identity":a["identity"],"version":1,"routeKind":"reports"})).reply.unwrap();
        command(
            &mut e,
            json!({"type":"clinical:configure","settings":{"privacy":true}}),
        );
        assert!(e.snapshot()["activities"][0].get("labRef").is_none());
        let reply = command(
            &mut e,
            json!({"type":"clinical:source-read","ticket":route["ticket"]}),
        )
        .reply
        .unwrap();
        assert!(reply.get("error").is_some());
    }
    #[test]
    fn refresh_and_sync_have_distinct_timestamp_semantics() {
        let mut e = Engine::new().unwrap();
        command(
            &mut e,
            json!({"type":"clinical:scenario","scenario":"S03","stage":5}),
        );
        let before = e.snapshot()["activities"][0]["syncedAt"].clone();
        assert_eq!(
            command(&mut e, json!({"type":"clinical:sync"}))
                .reply
                .unwrap()["activities"][0]["syncedAt"],
            before
        );
    }
    #[test]
    fn simulator_writes_are_not_viewer_commands() {
        let c: SourceCommand = serde_json::from_value(json!({"type":"clinical:reset"})).unwrap();
        assert!(!c.is_read());
        assert!(
            serde_json::from_value::<SourceCommand>(json!({"type":"clinical:complete"})).is_err()
        );
    }
}
