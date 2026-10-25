import {rating,truncate} from './calc.mjs';
import {PLAN_KEY,createPlan,validatePlan,projectPlan} from './plan.mjs';
const $=id=>document.getElementById(id);
const format=n=>n.toLocaleString('en-US');
function element(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
export function mountPlan({getRecords,notify}){
 let plan=createPlan();
 try{const saved=localStorage.getItem(PLAN_KEY);if(saved)plan=validatePlan(JSON.parse(saved));}catch{notify('计划存档无法读取，已显示推荐计划；实际成绩不受影响。');}
 function persist(){try{localStorage.setItem(PLAN_KEY,JSON.stringify(plan));}catch{notify('计划未能保存，请导出计划备份。');}}
 function render(keepInputs=false){
  const result=projectPlan(getRecords(),plan);
  $('plan-stage').value=plan.stage;
  $('plan-actual').textContent=truncate(result.baseline.potential,3);$('plan-forecast').textContent=truncate(result.forecast.potential,3);
  $('plan-gain').textContent='+'+(result.forecast.potential-result.baseline.potential).toFixed(5);$('plan-gap').textContent=Math.max(0,13-result.forecast.potential).toFixed(5);
  $('plan-completed').textContent=`${result.completed} / ${result.selected.length}`;
  $('plan-caption').textContent=`${result.selected.length} 首纳入预测 · ${plan.items.filter(r=>!r.available).length} 首未购买 / 未解锁 · 按 v7.0 规则计算`;
  $('plan-progress').style.width=Math.min(100,result.baseline.potential/13*100)+'%';$('plan-progress-label').textContent=`实际进度 ${Math.min(100,result.baseline.potential/13*100).toFixed(1)}%`;
  $('plan-outcome').textContent=result.forecast.potential>=13?'所选目标全部达成后，预计达到 13。':'所选目标全部达成后仍未到 13；可纳入备选曲目、调整目标或继续补充有效成绩。';
  $('plan-incomplete').hidden=result.baseline.best.length>=50;
  if(keepInputs){
   for(const r of result.rows){
    const row=[...$('plan-body').children].find(el=>el.dataset.id===r.item.id);if(!row)continue;
    for(const field of ['first','later']){const input=row.querySelector(`input[data-field=${field}]`);input.nextElementSibling.textContent=`PTT ${rating(r.item.cc,r.item[field],r.item.clear?.2:0).toFixed(4)}`;}
    row.children[5].querySelector('strong').textContent=r.targetRating.toFixed(4);
    row.children[5].querySelector('small').textContent=`若单独完成 +${Math.max(0,r.single).toFixed(5)}`;
    const status=row.querySelector('.plan-status');status.textContent=!r.item.available?'待购买 / 解锁':!r.item.enabled?'备选，未纳入':r.achieved?'已达成':r.firstAchieved&&plan.stage==='later'?'初期已达成':'待推进';status.classList.toggle('done',r.achieved&&r.item.available&&r.item.enabled);
   }
   return;
  }
  const body=$('plan-body');body.replaceChildren();
  for(const {item,current,targetRating,achieved,firstAchieved,single} of result.rows){
   const row=element('tr');row.dataset.id=item.id;if(!item.enabled||!item.available)row.className='plan-paused';
   const includeCell=element('td'),include=element('input');include.type='checkbox';include.checked=item.enabled;include.dataset.field='enabled';include.setAttribute('aria-label',`纳入计划 ${item.name} ${item.difficulty}`);includeCell.append(include);row.append(includeCell);
   const title=element('td');title.append(element('strong',item.name,'record-title'),element('span',item.difficulty,'diff'),element('span',`${item.cc.toFixed(1)} · ${item.group}`,'plan-meta'),element('small',item.note,'plan-note'));row.append(title);
   const actual=element('td');actual.append(element('span',current?format(current.score):'未录入'),element('small',current?`PTT ${current.value.toFixed(4)}`:'仅有目标，无实际成绩','plan-note'));row.append(actual);
   for(const field of ['first','later']){const cell=element('td'),input=element('input');input.type='number';input.inputMode='numeric';input.min='0';input.max='10000000';input.step='1';input.value=item[field];input.dataset.field=field;input.className='plan-score';input.setAttribute('aria-label',`${field==='first'?'初期':'后续'}目标 ${item.name} ${item.difficulty}`);cell.append(input,element('small',`PTT ${rating(item.cc,item[field],item.clear?.2:0).toFixed(4)}`,'plan-note'));row.append(cell);}
   const forecastCell=element('td');forecastCell.append(element('strong',targetRating.toFixed(4)),element('small',`若单独完成 +${Math.max(0,single).toFixed(5)}`,'plan-note'));row.append(forecastCell);
   const status=element('td');const state=!item.available?'待购买 / 解锁':!item.enabled?'备选，未纳入':achieved?'已达成':firstAchieved&&plan.stage==='later'?'初期已达成':'待推进';status.append(element('span',state,achieved&&item.available&&item.enabled?'plan-status done':'plan-status'));
   for(const [field,label,aria] of [['available','已购买 / 解锁','已购买或解锁'],['clear','目标含通关加成','目标含通关加成']]){const labelEl=element('label',undefined,'plan-check'),input=element('input');input.type='checkbox';input.checked=item[field];input.dataset.field=field;input.setAttribute('aria-label',`${aria} ${item.name} ${item.difficulty}`);labelEl.append(input,document.createTextNode(label));status.append(labelEl);}
   row.append(status);body.append(row);
  }
 }
 $('plan-stage').onchange=()=>{plan.stage=$('plan-stage').value;persist();render();};
 $('plan-body').addEventListener('change',event=>{const input=event.target.closest('input[data-field]');if(!input)return;const index=plan.items.findIndex(r=>r.id===input.closest('tr').dataset.id);if(index<0)return;
  const next=structuredClone(plan),field=input.dataset.field;next.items[index][field]=input.type==='checkbox'?input.checked:input.value.trim()===''?NaN:Number(input.value);
  try{validatePlan(next);input.setCustomValidity('');$('plan-error').textContent='';plan=next;persist();render();}catch(e){input.setCustomValidity(e.message);input.reportValidity();$('plan-error').textContent=e.message;}
 });
 $('plan-body').addEventListener('input',event=>{
  const input=event.target.closest('input.plan-score');if(!input)return;
  const index=plan.items.findIndex(r=>r.id===input.closest('tr').dataset.id);if(index<0)return;
  const next=structuredClone(plan);next.items[index][input.dataset.field]=input.value.trim()===''?NaN:Number(input.value);
  try{validatePlan(next);input.setCustomValidity('');$('plan-error').textContent='';plan=next;persist();render(true);}catch(e){input.setCustomValidity(e.message);$('plan-error').textContent=e.message;}
 });
 $('plan-export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(plan,null,2)],{type:'application/json'})),a=element('a');a.href=url;a.download='arcaea-road-to-13-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('计划已导出，文件中不包含实际成绩。');};
 $('plan-import').onclick=()=>$('plan-file').click();
 $('plan-file').onchange=async()=>{const file=$('plan-file').files[0];if(!file)return;try{const next=validatePlan(JSON.parse(await file.text()));if(!confirm('导入将替换当前计划，实际成绩保持独立。是否继续？'))return;plan=next;persist();render();notify('计划已导入。');}catch(e){notify(e.message);}finally{$('plan-file').value='';}};
 const actualTab=$('actual-tab'),planTab=$('plan-tab');
 function switchTab(showPlan){actualTab.setAttribute('aria-selected',String(!showPlan));planTab.setAttribute('aria-selected',String(showPlan));$('actual-panel').hidden=showPlan;$('plan-panel').hidden=!showPlan;if(showPlan)render();}
 actualTab.onclick=()=>{history.replaceState(null,'','#actual');switchTab(false);};planTab.onclick=()=>{history.replaceState(null,'','#plan');switchTab(true);};window.addEventListener('hashchange',()=>switchTab(location.hash==='#plan'));
 persist();switchTab(location.hash==='#plan');return{render};
}
