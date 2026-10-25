import test from 'node:test';
import assert from 'node:assert/strict';
import {rating,summarize} from '../public/arcaea-ptt/calc.mjs';
import {createPlan,validatePlan,projectPlan,chartKey,PLAN_KEY} from '../public/arcaea-ptt/plan.mjs';
const actual=()=>Array.from({length:50},(_,i)=>({id:String(i),name:'Chart '+i,difficulty:'FTR',cc:10,score:9900000,clear:true}));
test('plan format is separate and cannot import a real-score backup',()=>{
 assert.notEqual(PLAN_KEY,'arc-ptt-v1');assert.throws(()=>validatePlan({version:1,mode:'modern',records:actual()}));
 const p=createPlan();assert.equal(validatePlan(JSON.parse(JSON.stringify(p))).items.length,19);assert.equal('records' in p,false);
 p.items[0].first=p.items[0].later+1;assert.throws(()=>validatePlan(p));
});
test('unavailable Heavenly caress stays out of forecast until unlocked',()=>{
 const p=createPlan();const h=p.items.find(r=>r.name==='Heavenly caress');p.items=[h];
 assert.equal(h.available,false);assert.equal(h.later,9960000);assert.equal(rating(h.cc,h.later,.2),12.9);
 const a=actual(),before=projectPlan(a,p);assert.equal(before.forecast.potential,before.baseline.potential);
 h.available=true;const after=projectPlan(a,p);assert.ok(after.forecast.potential>before.forecast.potential);
 assert.equal(after.forecast.best.length,50);assert.equal(after.forecast.sorted.length,51);assert.equal(after.completed,0);
});
test('projection keeps better actual results, deduplicates charts and never mutates real scores',()=>{
 const p=createPlan();p.items=p.items.slice(0,1);const item=p.items[0];
 const a=actual();a[0]={...a[0],name:item.name,difficulty:item.difficulty,cc:item.cc,score:10000000};
 const saved=JSON.stringify(a);a.forEach(Object.freeze);Object.freeze(a);
 const result=projectPlan(a,p);assert.equal(JSON.stringify(a),saved);assert.equal(result.forecast.sorted.length,50);
 assert.equal(result.forecast.potential,result.baseline.potential);assert.equal(result.completed,1);
 assert.equal(result.forecast.sorted.find(r=>chartKey(r)===chartKey(item)).score,10000000);
});
test('recompute top ten and fixed denominator, rather than adding standalone gains',()=>{
 const p=createPlan();p.items=p.items.slice(0,2);const a=actual();const result=projectPlan(a,p);
 const expected=summarize([...a,...p.items.map(r=>({...r,score:r.later}))],'modern');assert.equal(result.forecast.potential,expected.potential);
 assert.ok(result.forecast.top>result.baseline.top);assert.equal(result.baseline.potential,summarize(a,'modern').potential);
 p.stage='first';assert.ok(projectPlan(a,p).forecast.potential<result.forecast.potential);
 p.items.forEach(r=>r.enabled=false);assert.equal(projectPlan(a,p).forecast.potential,result.baseline.potential);
});
