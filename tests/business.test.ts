import {test} from 'node:test';
import assert from 'node:assert/strict';
import {coverage,validateEnquiry} from '../lib/business';
import {periodFor,routeCall,validateScenario,defaultConfig,type Scenario} from '../lib/routing';
const base:Scenario={date:'2026-10-24',time:'10:00',menu:'2',primary:'priya',backup:'dan',primaryOutcome:'no-answer',backupOutcome:'answered',gasWork:false,gasLeak:false,outage:false};
test('postcode coverage keeps PO10 excluded and service restrictions intact',()=>{
 for(const p of ['PO1 1AA','PO9 1AA','PO11 1AA','PO17 1AA'])assert.equal(coverage(p,'plumbing').status,'covered');
 assert.equal(coverage('PO10 1AA','boiler').status,'outside');
 assert.equal(coverage('PO19 1AA','plumbing').status,'restricted');
 assert.equal(coverage('po19 1aa','boiler').status,'covered');
 assert.equal(coverage('SO14 1AA','certificate',false).status,'restricted');
 assert.equal(coverage('SO14 1AA','certificate',true).status,'covered');
 assert.equal(coverage('PO3','boiler').status,'invalid');
});
test('London wall-clock opening boundaries and holiday override',()=>{
 for(const [date,time,expected] of [['2026-10-23','07:59','closed'],['2026-10-23','08:00','office'],['2026-10-23','17:59','office'],['2026-10-23','18:00','emergency'],['2026-10-23','22:00','closed'],['2026-10-24','08:59','closed'],['2026-10-24','09:00','emergency'],['2026-10-24','12:00','closed'],['2026-10-25','10:00','closed']])assert.equal(periodFor(date,time),expected);
 assert.equal(periodFor('2026-10-23','10:00',['2026-10-23']),'closed');
});
test('Saturday no-answer fails over to qualified backup',()=>{const r=routeCall(base);assert.equal(r.outcome,'Connected to Dan');assert.equal(r.owner,'dan');assert.equal(r.needsFollowup,false);assert.equal(r.events.find(e=>e.id==='primary')?.seconds,24);});
test('unanswered emergency becomes owned follow-up',()=>{const r=routeCall({...base,backupOutcome:'offline'});assert.equal(r.needsFollowup,true);assert.equal(r.owner,'mark');assert.equal(r.outcome,'Emergency escalation required');});
test('Tom never receives a gas job; rota gaps escalate',()=>{const r=routeCall({...base,primary:'tom',gasWork:true,primaryOutcome:'answered'});assert.equal(r.outcome,'Connected to Dan');assert.ok(!r.events.some(e=>e.label==='Ring Tom'));assert.equal(routeCall({...base,primary:''}).owner,'mark');assert.equal(routeCall({...base,primary:'tom',backup:'',gasWork:true}).needsFollowup,true);});
test('Sarah hours and accounts routing do not drift into evenings',()=>{assert.equal(routeCall({...base,date:'2026-10-23',time:'08:00',menu:'1',primaryOutcome:'answered'}).outcome,'Connected to Mark');assert.equal(routeCall({...base,date:'2026-10-23',time:'08:30',menu:'1',primaryOutcome:'answered'}).outcome,'Connected to Sarah');assert.ok(!routeCall({...base,date:'2026-10-23',time:'16:00',menu:'3'}).events.some(e=>e.label==='Ring Sarah'));});
test('gas emergency and outage bypass ordinary destinations',()=>{assert.equal(routeCall({...base,gasLeak:true}).outcome,'Gas guidance provided');assert.ok(!routeCall({...base,gasLeak:true}).events.some(e=>e.id==='primary'));assert.equal(routeCall({...base,outage:true}).owner,'mark');});
test('invalid menu, closed hours, routine Saturday calls go to voicemail',()=>{for(const s of [{...base,menu:'invalid' as const},{...base,date:'2026-10-25'},{...base,menu:'1' as const}])assert.equal(routeCall(s).outcome,'Voicemail · callback needed');});
test('published timing changes affect trace and config version',()=>{const r=routeCall(base,{...defaultConfig,ringSeconds:35,version:2});assert.equal(r.events.find(e=>e.id==='primary')?.seconds,39);assert.equal(r.configVersion,2);});
test('scenario rejects impossible date and time',()=>{assert.equal(validateScenario(base),true);assert.equal(validateScenario({...base,date:'2026-02-30'}),false);assert.equal(validateScenario({...base,time:'24:00'}),false);});
test('enquiry validation rejects malformed fields and accepts a complete enquiry',()=>{assert.equal(Object.keys(validateEnquiry({name:'Demo Person',phone:'07700 900123',email:'test@example.test',postcode:'PO3 5XX',job:'boiler',message:'Please arrange a boiler service.'})).length,0);assert.ok(Object.keys(validateEnquiry({name:'A',phone:'12',email:'bad',postcode:'bad',job:'other',message:'x'})).length>=6);});
