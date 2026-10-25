import {staff} from './business';
import type {TeamMember} from './team';
export type Outcome='answered'|'busy'|'no-answer'|'offline';
export type Scenario={date:string;time:string;menu:'1'|'2'|'3'|'invalid';primary:string;backup:string;primaryOutcome:Outcome;backupOutcome:Outcome;gasWork:boolean;gasLeak:boolean;outage:boolean};
export type RouteEvent={id:string;label:string;detail:string;state:'info'|'success'|'warning'|'danger';seconds:number};
export type RouteResult={period:'office'|'emergency'|'closed';events:RouteEvent[];outcome:string;needsFollowup:boolean;owner:string;configVersion:number};
export type RoutingConfig={version:number;ringSeconds:number;queueSeconds:number;voicemailEmail:string;accountsEmail:string;holidayDates:string[]};
export const defaultConfig:RoutingConfig={version:1,ringSeconds:20,queueSeconds:40,voicemailEmail:'info@brightwaterplumbing.co.uk',accountsEmail:'accounts@brightwaterplumbing.co.uk',holidayDates:[]};
const defaultTeam=staff.map(s=>({...s,active:true,account:false,onCall:['dan','priya','tom'].includes(s.id)}));
export function periodFor(date:string,time:string,holidays:string[]=[]):RouteResult['period']{
 const d=new Date(`${date}T12:00:00Z`), day=d.getUTCDay(),[h,m]=time.split(':').map(Number),mins=h*60+m;
 if(holidays.includes(date))return 'closed';
 if(day>=1&&day<=5){if(mins>=480&&mins<1080)return 'office';if(mins>=1080&&mins<1320)return 'emergency';}
 if(day===6&&mins>=540&&mins<720)return 'emergency';
 return 'closed';
}
// Inputs represent a London wall-clock time, not the viewer's local timezone.
export function routeCall(s:Scenario,c:RoutingConfig=defaultConfig,team:TeamMember[]=defaultTeam):RouteResult{
 const names=Object.fromEntries(team.map(p=>[p.id,p.name.split(" ")[0]]));const eligible=(id:string)=>team.some(p=>p.id===id&&p.active&&p.onCall),qualified=(id:string)=>team.some(p=>p.id===id&&p.active&&p.gas);
 const period=periodFor(s.date,s.time,c.holidayDates),events:RouteEvent[]=[];
 let elapsed=0,needsFollowup=false,owner='sarah',outcome='Voicemail';
 const add=(id:string,label:string,detail:string,state:RouteEvent['state']='info',duration=0)=>{elapsed+=duration;events.push({id,label,detail,state,seconds:elapsed});};
 add('incoming','Incoming call',`${s.date} at ${s.time} · Europe/London`);
 if(s.gasLeak){add('gas','Gas emergency guidance','Suspected gas leaks: call the National Gas Emergency Service on 0800 111 999. Brightwater does not attend gas leaks.','danger');return {period,events,outcome:'Gas guidance provided',needsFollowup:false,owner:'none',configVersion:c.version};}
 if(s.outage){add('fallback','Independent fallback','Simulated provider-hosted fallback explains the outage and takes a message. Live fallback is not connected.','warning');add('voicemail','Message recorded','Creates an urgent internal follow-up. No email or call is actually sent.','warning');return {period,events,outcome:'Outage fallback',needsFollowup:true,owner:'mark',configVersion:c.version};}
 add('schedule',period==='office'?'Office hours':period==='emergency'?'Emergency-only hours':'We’re closed',period==='office'?'Bookings, emergencies and accounts.':period==='emergency'?'Emergency route open. Routine enquiries go to voicemail.':'Routine voicemail. Emergency attendance is unavailable.');
 const voicemail=(emergency=false)=>{needsFollowup=true;outcome=emergency?'Emergency escalation required':'Voicemail · callback needed';add('voicemail','Voicemail & follow-up',`Message destination: ${s.menu==='3'?c.accountsEmail:c.voicemailEmail}. Simulator records the task; no email is sent.`,emergency?'danger':'warning');if(emergency){owner='mark';add('alert','Urgent escalation to Mark','No engineer accepted the call. Do not promise attendance.','danger');}};
 if(period==='closed'){voicemail();return {period,events,outcome,needsFollowup,owner,configVersion:c.version};}
 add('menu','Welcome & menu',s.menu==='invalid'?'No valid menu selection. Two retries, then general voicemail.':`Selected ${s.menu}: ${s.menu==='1'?'bookings':s.menu==='2'?'emergencies':'accounts'}.`,'info',4);
 if(s.menu==='invalid'||(period==='emergency'&&s.menu!=='2')){voicemail();return {period,events,outcome,needsFollowup,owner,configVersion:c.version};}
 let primary=s.primary,backup=s.backup;
 if(s.menu==='2'){
   add('rota','Read published rota',primary?`${names[primary]||primary} is on call. Backup: ${names[backup]||'unassigned'}.`:'No primary engineer assigned.',primary?'info':'danger');
   if(!eligible(primary)){owner='mark';add('gap','Rota gap','No valid on-call assignment. Escalate to the owner.','danger');voicemail(true);return {period,events,outcome,needsFollowup,owner,configVersion:c.version};}
   if(s.gasWork&&!qualified(primary)){add('qualification','Qualified engineer required',`${names[primary]||'The primary engineer'} is not gas registered. Escalating to the qualified backup.`,'warning');primary=backup;backup='mark';if(!qualified(primary)){add('qualification-gap','No qualified backup','Escalation required before gas work can be assigned.','danger');voicemail(true);return {period,events,outcome,needsFollowup,owner,configVersion:c.version};}}
 }else{
   const [h,m]=s.time.split(':').map(Number),minutes=h*60+m;
   primary=minutes>=510&&minutes<960?'sarah':s.menu==='1'?'mark':'';
   backup=s.menu==='1'&&primary==='sarah'?'mark':'';
   if(!primary){add('staff-hours','Accounts office unavailable','Sarah works 08:30–16:00. Accounts messages go to the accounts inbox.','warning');voicemail();return {period,events,outcome,needsFollowup,owner,configVersion:c.version};}
   if(primary==='mark')add('staff-hours','Sarah is off duty','Bookings route directly to Mark outside Sarah’s working hours.');
 }
 const attempt=(person:string,status:Outcome,id:string)=>{add(id,`Ring ${names[person]||person}`,status==='answered'?'Call accepted by a person.':status==='busy'?'Destination is busy.':status==='offline'?'Device is unavailable.':'No answer before the ring timeout.',status==='answered'?'success':'warning',status==='answered'?6:status==='busy'||status==='offline'?1:c.ringSeconds);return status==='answered';};
 owner=primary;
 if(attempt(primary,s.primaryOutcome,'primary'))outcome=`Connected to ${names[primary]}`;
 else{
  if(s.menu!=='2'&&s.primaryOutcome==='busy')add('queue','Bounded waiting','Caller can leave a message. Queue expires before the next route.','info',c.queueSeconds);
  if(backup&&backup!==primary&&(s.menu!=='2'||(s.gasWork?qualified(backup):team.some(p=>p.id===backup&&p.active&&(p.onCall||p.gas))))&&attempt(backup,s.backupOutcome,'backup')){owner=backup;outcome=`Connected to ${names[backup]}`;}else voicemail(s.menu==='2');
 }
 if(!needsFollowup)add('complete','Call connected',`${outcome}. Call outcome saved with configuration v${c.version}.`,'success');
 return {period,events,outcome,needsFollowup,owner,configVersion:c.version};
}
export function validateScenario(s:Scenario,team:TeamMember[]=defaultTeam){return /^\d{4}-\d{2}-\d{2}$/.test(s.date)&&!Number.isNaN(Date.parse(s.date))&&new Date(`${s.date}T12:00:00Z`).toISOString().slice(0,10)===s.date&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)&&['1','2','3','invalid'].includes(s.menu)&&['answered','busy','no-answer','offline'].includes(s.primaryOutcome)&&['answered','busy','no-answer','offline'].includes(s.backupOutcome)&&(s.primary===''||team.some(p=>p.id===s.primary&&p.active&&p.onCall))&&(s.backup===''||team.some(p=>p.id===s.backup&&p.active&&p.gas));}
