//! Preserved historical synthetic notices. Clinical delivery never uses receipts here.
use crate::engine::Output;
use serde_json::{json, Value};
use uuid::Uuid;
pub struct Legacy {
    settings: Value,
    notices: Vec<Value>,
    receipts: Vec<Value>,
    serial: u64,
}
impl Default for Legacy {
    fn default() -> Self {
        Self {
            settings: json!({"theme":"ink","engine":"gsap","focus":false,"privacy":true,"reduced":false,"top":0,"shape":"notch"}),
            notices: Vec::new(),
            receipts: Vec::new(),
            serial: 0,
        }
    }
}
impl Legacy {
    pub fn snapshot(&self) -> Value {
        json!({"type":"hello","settings":self.settings,"notices":self.notices,"receipts":self.receipts})
    }
    pub fn receipt(&mut self, payload: &Value, now: i64) -> Option<Value> {
        let id = payload["id"].as_str()?;
        let revision = payload["revision"].as_u64()?;
        let ack = payload["ackId"]
            .as_str()
            .filter(|s| !s.is_empty() && s.len() <= 80)?;
        if !self
            .notices
            .iter()
            .any(|n| n["id"] == id && n["revision"] == revision)
        {
            return None;
        }
        if let Some(receipt) = self.receipts.iter().find(|r| r["id"] == id) {
            return Some(receipt.clone());
        }
        let receipt = json!({"type":"receipt","id":id,"revision":revision,"ackId":ack,"receivedAt":now,"kind":"received-not-treated"});
        self.receipts.push(receipt.clone());
        Some(receipt)
    }
    pub fn notice(&mut self, name: &str, now: i64, index: usize) -> Result<Value, String> {
        let (source, priority, title, summary, extra) = match name {
            "report" => (
                "PACS",
                "routine",
                "影像报告已就绪",
                "新的影像报告已发布。可在原工作站查看，不必立即切换当前任务。",
                json!({"patient":"李** · 12 床（模拟）","context":"心血管内科","threadId":"patient-demo-012"}),
            ),
            "critical" => (
                "LIS",
                "critical",
                "检验危急值已发布",
                "有一项检验结果需要当班人员核对。请进入 LIS 查看原始报告，并按院内流程处理。",
                json!({"patient":"王** · 06 床（模拟）","context":"心血管内科","threadId":"patient-demo-006"}),
            ),
            "unstable" => (
                "HIS",
                "urgent",
                "新的病危医嘱已发布",
                "患者相关医嘱状态已更新，请相关岗位在源系统核对，并完成交接。此处仅记录收到回执。",
                json!({"patient":"王** · 06 床（模拟）","context":"心血管内科","threadId":"patient-demo-006"}),
            ),
            "service" => (
                "IT",
                "routine",
                "你报修的打印服务已恢复",
                "信息服务台已完成处理。原工作站可继续打印，处理过程已同步到工单。",
                json!({"context":"门诊服务 · 工单 IT-2026-0421","groupKey":"ticket-demo-0421","threadId":"ticket-demo-0421"}),
            ),
            "consult" => (
                "NURSING",
                "urgent",
                "协作交接等待确认",
                "上一班次已补充交接内容，请当班同事在护理工作站核对。",
                json!({"context":"心血管内科","patient":"王** · 06 床（模拟）","threadId":"patient-demo-006"}),
            ),
            "burst" => (
                "IT",
                "routine",
                "打印服务进度已更新",
                "同一工单的连续更新被归为一组，避免十二次独立弹窗。",
                json!({"context":"门诊服务 · 连续更新演示","groupKey":"burst-demo","threadId":"burst-demo"}),
            ),
            "journey-his" => (
                "HIS",
                "urgent",
                "临床团队已更新关注事项",
                "与检验提醒属于同一模拟患者上下文。源系统中的处理仍由相应岗位完成。",
                json!({"context":"心血管内科","patient":"王** · 06 床（模拟）","threadId":"patient-demo-006"}),
            ),
            "journey-nursing" => (
                "NURSING",
                "routine",
                "护理交接信息已同步",
                "交接白板已接收到同一患者的上下文更新。可在协作脉络中查看关联事件。",
                json!({"context":"心血管内科","patient":"王** · 06 床（模拟）","threadId":"patient-demo-006"}),
            ),
            _ => return Err("Unknown legacy synthetic scenario".into()),
        };
        if self.notices.len() >= 400 {
            if let Some(i) = self.notices.iter().position(|n| {
                n["requiresAck"] == false || self.receipts.iter().any(|r| r["id"] == n["id"])
            }) {
                self.notices.remove(i);
            } else {
                return Err("Synthetic critical buffer full; event not delivered".into());
            }
        }
        self.serial = self.serial.saturating_add(1);
        let mut notice = json!({"id":format!("demo-{}-{}",self.serial,Uuid::new_v4().simple()),"revision":1,"source":source,"priority":priority,"title":title,"summary":summary,"context":"院内协作","createdAt":now,"requiresAck":priority!="routine"});
        if name == "burst" {
            notice["title"] = json!(format!("打印服务进度已更新 · {}/12", index + 1));
        }
        if let (Some(target), Some(extra)) = (notice.as_object_mut(), extra.as_object()) {
            target.extend(extra.clone());
        }
        self.notices.push(notice.clone());
        Ok(json!({"type":"notice","notice":notice}))
    }
    pub fn control(&mut self, payload: &Value) -> Result<Output, String> {
        let mut out = Output::default();
        match payload["type"].as_str() {
            Some("sync") => out.reply = Some(self.snapshot()),
            Some("reset") => {
                self.notices.clear();
                self.receipts.clear();
                out.events.push(json!({"type":"reset"}));
            }
            Some("configure") => {
                let patch = payload["settings"]
                    .as_object()
                    .ok_or("Invalid legacy settings")?;
                for (k, v) in patch {
                    match k.as_str() {
                        "theme"
                            if v.as_str()
                                .is_some_and(|s| ["ink", "cloud", "dusk"].contains(&s)) =>
                        {
                            self.settings[k] = v.clone()
                        }
                        "engine"
                            if v.as_str()
                                .is_some_and(|s| ["gsap", "css", "mini"].contains(&s)) =>
                        {
                            self.settings[k] = json!(if v == "css" { "css" } else { "gsap" })
                        }
                        "shape"
                            if v.as_str()
                                .is_some_and(|s| ["notch", "capsule"].contains(&s)) =>
                        {
                            self.settings[k] = v.clone()
                        }
                        "focus" | "privacy" | "reduced" if v.is_boolean() => {
                            self.settings[k] = v.clone()
                        }
                        "top" => {}
                        _ => return Err("Invalid legacy setting".into()),
                    }
                }
                self.settings["top"] = json!(0);
                out.events
                    .push(json!({"type":"settings","settings":self.settings}));
            }
            Some("view") => {
                if !payload["mode"]
                    .as_str()
                    .is_some_and(|s| ["compact", "inbox", "expanded", "thread"].contains(&s))
                {
                    return Err("Invalid legacy view".into());
                }
                out.events.push(payload.clone());
            }
            _ => return Err("Unsupported legacy command".into()),
        }
        Ok(out)
    }
}
