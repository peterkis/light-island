// Synthetic source-owned fixtures; no real LIS or patient data.
export function labFixture(identity,version,variant='baseline'){
 const data=[['白细胞','WBC',11.2,3.5,9.5,'×10⁹/L'],['血红蛋白','HGB',128,130,175,'g/L'],['C反应蛋白','CRP',18.4,0,6,'mg/L'],['红细胞','RBC',4.6,4.3,5.8,'×10¹²/L'],['血小板','PLT',235,125,350,'×10⁹/L'],['谷丙转氨酶','ALT',32,9,50,'U/L'],['谷草转氨酶','AST',28,15,40,'U/L'],['总胆红素','TBIL',14.2,3.4,20.5,'μmol/L']];
 let items=data.map(([name,abbr,value,lo,hi,unit],n)=>({id:'item-'+n,name,abbr,value:variant==='normal'?(lo+hi)/2:value,lo,hi,unit,flag:variant==='normal'?'N':value>hi?'H':value<lo?'L':'N'}));
 if(variant==='extended'){items=items.concat([{id:'qual',name:'定性项目（模拟）',abbr:'QUAL',unit:'',value:null,lo:null,hi:null,text:'阳性',flag:'A'},{id:'single',name:'单侧参考（模拟）',abbr:'ONE',unit:'U/L',value:12,lo:null,hi:10,flag:'H'},{id:'equal',name:'退化参考（模拟）',abbr:'EQ',unit:'',value:5,lo:5,hi:5,flag:'unknown'},{id:'missing',name:'结果尚未提供',abbr:'WAIT',unit:'',value:null,lo:null,hi:null,flag:'unknown'}]);}
 return {id:'LAB-'+identity.object,identity:{...identity},version,title:'血常规 + 肝功能 + CRP',source:'检验科 LIS',maskedName:'张**',sex:'男',age:41,specimen:'静脉血',reportedAt:'10:42',items};
}
