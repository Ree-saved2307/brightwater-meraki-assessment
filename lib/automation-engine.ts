import {escalateTickets} from './tickets';
import {processTicketMail} from './ticket-mail';
import {createHash} from 'node:crypto';
import {audit, getRecord, listRecords, saveRecord, transaction} from './store';

export type AutomationRules={version:number;enabled:boolean;assignOwner:boolean;draftAcknowledgment:boolean;followupMinutes:number;emergencyMinutes:number;rotaReminderMinutes:number};
export type Job={id:string;kind:'acknowledgment'|'enquiry-followup'|'call-followup'|'rota-handover';subject:string;owner:string;status:'Pending'|'Blocked'|'Completed'|'Cancelled'|'Failed';due:string;created:string;attempts:number;detail:string;completed?:string};
export type Task={id:string;subject:string;title:string;owner:string;status:'Open'|'Done';created:string;due:string;source:string};
export const defaultRules:AutomationRules={version:1,enabled:true,assignOwner:true,draftAcknowledgment:true,followupMinutes:120,emergencyMinutes:15,rotaReminderMinutes:60};
export async function rules(){return (await getRecord<AutomationRules>('automation-rules'))||defaultRules;}
export function validRules(value:Record<string,unknown>){return typeof value.enabled==='boolean'&&typeof value.assignOwner==='boolean'&&typeof value.draftAcknowledgment==='boolean'&&['followupMinutes','emergencyMinutes','rotaReminderMinutes'].every(k=>Number.isInteger(value[k])&&Number(value[k])>=1&&Number(value[k])<=10080);}
function key(value:string){return createHash('sha256').update(value).digest('hex').slice(0,20);}
async function enqueue(kind:Job['kind'],subject:string,owner:string,delay:number,now:Date){const id=`JOB-${key(`${kind}:${subject}`)}`;if((await getRecord(id)))return;(await saveRecord(id,'automation-job',{id,kind,subject,owner,status:'Pending',due:new Date(now.getTime()+delay*60000).toISOString(),created:now.toISOString(),attempts:0,detail:'Waiting for the scheduled worker.'} satisfies Job));}
// Called inside the same transaction as the business event. Each event has a stable key.
export async function scheduleEnquiry(id:string,now=new Date()){
 const r=(await rules());if(!r.enabled)return;
 const e=(await getRecord<Record<string,unknown>>(id));if(!e)return;
 const owner=String(e.owner||(e.job==='emergency'?'mark':'sarah'));
 if(r.assignOwner&&!e.owner){(await saveRecord(id,'enquiry',{...e,owner}));(await audit('Enquiry automatically assigned',`${id} → ${owner}`,'Automation'));}
 if(r.draftAcknowledgment)(await enqueue('acknowledgment',id,owner,0,now));
 (await enqueue('enquiry-followup',id,owner,e.job==='emergency'?r.emergencyMinutes:r.followupMinutes,now));
}
export async function scheduleCall(id:string,owner:string,now=new Date()){if((await rules()).enabled)(await enqueue('call-followup',id,owner,0,now));}
export async function scheduleRota(version:number,now=new Date()){if((await rules()).enabled)(await enqueue('rota-handover',`rota-v${version}`,'mark',(await rules()).rotaReminderMinutes,now));}
export async function cancelSubject(subject:string){for(const j of (await listRecords<Job>('automation-job')))if(j.subject===subject&&['Pending','Blocked','Failed'].includes(j.status))(await saveRecord(j.id,'automation-job',{...j,status:'Cancelled',detail:'The underlying work was resolved.'}));for(const t of (await listRecords<Task>('task')))if(t.subject===subject&&t.status==='Open')(await saveRecord(t.id,'task',{...t,status:'Done'}));}
async function taskFor(j:Job,title:string,owner:string,now:Date){const id=`TASK-${key(j.id)}`;if(!(await getRecord(id)))(await saveRecord(id,'task',{id,subject:j.subject,title,owner,status:'Open',created:now.toISOString(),due:j.due,source:j.id} satisfies Task));}
async function execute(j:Job,now:Date):Promise<Job>{
 const done=(detail:string,status:Job['status']='Completed'):Job=>({...j,status,attempts:j.attempts+1,detail,completed:now.toISOString()});
 if(j.kind==='rota-handover'){
  const rota=(await getRecord<{version:number;acknowledged:boolean}>('rota'));
  if(!rota||j.subject!==`rota-v${rota.version}`||rota.acknowledged)return done('Rota superseded or handover already acknowledged.','Cancelled');
  (await taskFor(j,'Confirm on-call handover and qualified backup','mark',now));return done('Internal handover task created for Mark.');
 }
 const e=(await getRecord<Record<string,unknown>>(j.subject));
 if(!e||['Resolved','Complete'].includes(String(e.status)))return done('Underlying record is resolved or no longer exists.','Cancelled');
 const owner=String(e.owner||j.owner);
 if(j.kind==='acknowledgment'){
  const id=`DRAFT-${key(j.id)}`;
  if(!(await getRecord(id)))(await saveRecord(id,'message-draft',{id,subject:j.subject,to:e.email,subjectLine:`Your Brightwater enquiry ${j.subject}`,text:`Hello ${e.name},\n\nYour enquiry has been received. Reference: ${j.subject}. This is not an appointment confirmation. The office will review the details. For urgent help, use the published emergency contact rather than waiting for an email reply.\n\nBrightwater`,status:'Draft only',created:now.toISOString(),synthetic:e.synthetic===true}));
  return done('Acknowledgment prepared. Email provider not connected; nothing sent.','Blocked');
 }
 (await taskFor(j,j.kind==='call-followup'?'Review unanswered call and arrange follow-up':'Follow up on outstanding enquiry',owner,now));
 return done(`Internal follow-up task created for ${owner}.`);
}
export async function runDue(now=new Date(),source:'worker'|'manual'='worker'){
 const r=(await rules());let processed=0;
 if(r.enabled){
  const due=(await listRecords<Job>('automation-job')).filter(j=>j.status==='Pending'&&j.due<=now.toISOString()).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,100);
  for(const candidate of due)(await transaction(async ()=>{
   const current=(await getRecord<Job>(candidate.id));if(!current||current.status!=='Pending')return;
   try{const next=(await execute(current,now));(await saveRecord(next.id,'automation-job',next));(await audit(`Automation ${next.status.toLowerCase()}`,`${next.id}: ${next.detail}`,'Automation'));processed++;}
   catch{(await saveRecord(current.id,'automation-job',{...current,status:'Failed',attempts:current.attempts+1,detail:'Processing failed. Check the worker logs, then retry.'}));(await audit('Automation failed',current.id,'Automation'));}
  }));
 }
 if(source==='worker'){await escalateTickets(now);await processTicketMail();}
 if(source==='worker')(await saveRecord('automation-worker','worker',{lastRun:now.toISOString(),processed,paused:!r.enabled}));return processed;
}
export async function jobAction(id:string,action:string){return (await transaction(async ()=>{
 const j=(await getRecord<Job>(id));if(!j||!id.startsWith('JOB-'))throw Error('Job not found.');
 if(action==='cancel'&&['Pending','Blocked','Failed'].includes(j.status)){(await saveRecord(id,'automation-job',{...j,status:'Cancelled',detail:'Cancelled by an operator.'}));}
 else if(action==='retry'&&['Blocked','Failed'].includes(j.status)){(await saveRecord(id,'automation-job',{...j,status:'Pending',due:new Date().toISOString(),detail:'Retry requested.'}));}
 else throw Error('This action is not available for the current job state.');
 (await audit(`Automation ${action} requested`,id));
 }));}
export async function completeTask(id:string){const task=(await getRecord<Task>(id));if(!task||!id.startsWith('TASK-'))throw Error('Task not found.');(await transaction(async ()=>{(await saveRecord(id,'task',{...task,status:'Done'}));(await audit('Follow-up task completed',id));}));}
export async function retireRotaReminders(){for(const j of (await listRecords<Job>('automation-job')))if(j.kind==='rota-handover')(await cancelSubject(j.subject));}
export async function automationData(){
 const jobs=(await listRecords<Job>('automation-job')),tasks=(await listRecords<Task>('task'));
 return {rules:(await rules()),jobs:jobs.slice(0,200),tasks:tasks.filter(t=>t.status==='Open'),counts:{pending:jobs.filter(j=>j.status==='Pending').length,blocked:jobs.filter(j=>j.status==='Blocked').length,completed:jobs.filter(j=>j.status==='Completed').length},drafts:(await listRecords('message-draft')).slice(0,100),worker:(await getRecord('automation-worker'))||null};
}
