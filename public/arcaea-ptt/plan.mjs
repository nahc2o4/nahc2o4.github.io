import {rating, summarize} from './calc.mjs';
export const PLAN_KEY='arc-ptt-plan-v1';
export const chartKey=r=>r.name.trim().toLowerCase()+'|'+r.difficulty;
const recommendations=[
['Ringed Genesis','FTR',10.8,9960000,9980000,'新曲优先','纵连、同押与体力；先检查尾段。'],
['Lilly','ETR',10.8,9960000,9980000,'新曲优先','高速重复配置，先检查交互是否顺手。'],
['Black MInD','FTR',10.8,9960000,9980000,'新曲优先','乱打主体，重点熟悉中段配置。'],
['Nightmare','ETR',10.8,9960000,9980000,'新曲优先','先检查结尾片手三连。'],
['Einherjar Joker','BYD',10.9,9940000,9960000,'新曲优先','高速物量，手速与体力取向。'],
['Testify','FTR',10.9,9940000,9960000,'新曲优先','这是 FTR；快速交互与物量。'],
['Designant.','FTR',10.9,9940000,9960000,'新曲优先','这是 FTR；先看低速地键和高速尾段。'],
['Vulcānus','FTR',10.9,9940000,9960000,'新曲优先','综合候选，先检查中段蛇与末段交互。'],
['Code: Oblivion','ETR',10.9,9950000,9960000,'已有曲目','利用熟悉度，逐步减少尾段失误。'],
['PRIMITIVE LIGHTS','FTR',10.8,9960000,9980000,'已有曲目','体力与地键，先稳住初期目标。'],
['MARENYX','ETR',10.8,9950000,9970000,'已有曲目','交互与纵连，适合检查地键稳定性。'],
['Grievous Lady','FTR',11.1,9900000,9920000,'已有曲目','先到 EX+，再决定是否继续投入。'],
['Dantalion','FTR',10.8,9940000,9960000,'已有曲目','持久力与尾段交互。'],
['Undying Macula','ETR',11.0,9950000,9960000,'已有曲目','分阶段推进到单曲 13.000。'],
['BUCHiGiRE Berserker','FTR',10.8,9960000,9980000,'备选曲目','高速交互；注意大幅度蛇。'],
['GENOCIDER','FTR',10.8,9960000,9980000,'备选曲目','高速同押与片手连打。'],
['Stasis','FTR',10.8,9960000,9980000,'备选曲目','先熟悉纵连和特殊配置。'],
['Heavensdoor','BYD',10.8,9960000,9980000,'备选曲目','高速交互，先检查蛇的稳定性。'],
['Heavenly caress','BYD',10.9,9940000,9960000,'未购买候选','预计可达 996 万；购买解锁后再纳入预测。'],
];
export function createPlan(){return{kind:'arcaea-ptt-plan',version:1,goal:13,stage:'later',items:recommendations.map(([name,difficulty,cc,first,later,group,note],i)=>({id:'recommendation-'+i,name,difficulty,cc,first,later,group,note,enabled:i<14||i===18,available:i!==18,clear:true}))};}
export function validatePlan(plan){
 if(!plan||plan.kind!=='arcaea-ptt-plan'||plan.version!==1||plan.goal!==13||!['first','later'].includes(plan.stage)||!Array.isArray(plan.items))throw new Error('请选择“导出计划”生成的计划文件，实际成绩文件不能导入这里。');
 const keys=new Set(),ids=new Set();
 for(const r of plan.items){
  if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id)||typeof r.name!=='string'||!r.name.trim()||r.name.length>100||!['PST','PRS','FTR','ETR','BYD','INS'].includes(r.difficulty)||typeof r.note!=='string'||typeof r.group!=='string'||!['enabled','available','clear'].every(k=>typeof r[k]==='boolean')||!Number.isInteger(r.first)||!Number.isInteger(r.later)||r.first<0||r.later<r.first||r.later>10000000)throw new Error('计划含有无效曲目或目标，请检查目标分数及阶段顺序。');
  rating(r.cc,r.first);rating(r.cc,r.later);if(keys.has(chartKey(r)))throw new Error('计划中同曲同难度不能重复。');keys.add(chartKey(r));ids.add(r.id);
 }
 return plan;
}
export function projectPlan(actual,plan){
 const baseline=summarize(actual,'modern');const actualByChart=new Map(baseline.sorted.map(r=>[chartKey(r),r]));
 const selected=plan.items.filter(r=>r.enabled&&r.available);
 const targets=selected.map(r=>({...r,score:r[plan.stage]}));
 // Retain better real results and reselect B50 / Top10 after adding simulated targets.
 const forecast=summarize([...actual,...targets],'modern');
 const rows=plan.items.map(item=>{const current=actualByChart.get(chartKey(item));const targetRating=rating(item.cc,item[plan.stage],item.clear?.2:0);
 const achieved=!!current&&current.value+1e-10>=targetRating;
 const firstAchieved=!!current&&current.value+1e-10>=rating(item.cc,item.first,item.clear?.2:0);
 const single=summarize([...actual,{...item,score:item[plan.stage]}],'modern').potential-baseline.potential;
 return{item,current,targetRating,achieved,firstAchieved,single};});
 return{baseline,forecast,selected,rows,completed:rows.filter(r=>r.item.enabled&&r.item.available&&r.achieved).length};
}
