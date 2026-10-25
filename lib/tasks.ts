import {randomUUID} from 'node:crypto';
import {audit,getRecord,listRecords,saveRecord,transaction} from './store';
import {teamDirectory,canAssign} from './team';
import type {Identity} from './identity';
export type WorkTask={id:string;subject:string;title:string;description?:string;owner:string;status:'Open'|'In progress'|'Blocked'|'Done';priority?:'Normal'|'High'|'Urgent';created:string;updated?:string;due:string;source:string;version?:number;completed?:string};
export async function taskData(actor:Identity){return (await listRecords<WorkTask>('task')).filter(t=>actor.role!=='engineer'||t.owner===actor.id);}
export async function saveTask(body:Record<string,unknown>,actor:Identity){if(!['admin','dispatcher','engineer'].includes(actor.role))throw Error('Your role cannot change tasks.');return transaction(async()=>{
 const id=String(body.id||''),old=id?await getRecord<WorkTask>(id):undefined;
 if(id&&(!id.startsWith('TASK-')||!old))throw Error('Task not found.');
 if(old&&Number(body.version)!==(old.version||1))throw Error('Task changed. Refresh and try again.');
 if(actor.role==='engineer'&&(!old||old.owner!==actor.id))throw Error('You may only update tasks assigned to you.');
 if(actor.role==='engineer'&&Object.keys(body).some(k=>!['id','version','status'].includes(k)))throw Error('Only dispatchers can change task details or assignment.');
 const title=String(body.title??old?.title??'').trim(),description=String(body.description??old?.description??'').trim(),owner=String(body.owner??old?.owner??''),status=String(body.status??old?.status??'Open'),priority=String(body.priority??old?.priority??'Normal'),due=String(body.due??old?.due??'');
 if(title.length<3||title.length>1300||description.length>3000||!['Open','In progress','Blocked','Done'].includes(status)||!['Normal','High','Urgent'].includes(priority)||!due||!Number.isFinite(Date.parse(due)))throw Error('Provide a title, valid status, priority and due date.');
 if(owner&&!(await teamDirectory()).some(p=>p.id===owner&&canAssign(p)))throw Error('Choose an active staff member.');
 const now=new Date().toISOString();const task:WorkTask={...old,id:old?.id||`TASK-${randomUUID()}`,subject:old?.subject||String(body.subject||'').slice(0,100),title,description,owner,status:status as WorkTask['status'],priority:priority as WorkTask['priority'],due:new Date(due).toISOString(),source:old?.source||'manual',created:old?.created||now,updated:now,completed:status==='Done'?old?.completed||now:undefined,version:(old?.version||0)+1};
 await saveRecord(task.id,'task',task);await audit(old?'Task updated':'Task created',`${task.id} · ${status} · owner ${owner||'unassigned'}`,actor.email);return task;
 });}
export async function insights(){const [tasks,enquiries,calls,jobs,people,worker,beat]=await Promise.all([listRecords<WorkTask>('task'),listRecords<any>('enquiry'),listRecords<any>('agent-call'),listRecords<any>('automation-job'),teamDirectory(),getRecord('automation-worker'),getRecord('automation-beat')]);const now=Date.now();const active=tasks.filter(t=>t.status!=='Done');return {
 counts:{openTasks:active.length,overdue:active.filter(t=>Date.parse(t.due)<now).length,unassigned:active.filter(t=>!t.owner).length,completed:tasks.filter(t=>t.status==='Done').length,enquiries:enquiries.length,openEnquiries:enquiries.filter(e=>e.status!=='Resolved').length,agentCalls:calls.length,failedJobs:jobs.filter(j=>j.status==='Failed').length},
 workload:people.filter(canAssign).map(p=>({id:p.id,name:p.name,open:active.filter(t=>t.owner===p.id).length,overdue:active.filter(t=>t.owner===p.id&&Date.parse(t.due)<now).length,completed:tasks.filter(t=>t.owner===p.id&&t.status==='Done').length})),
 trend:Array.from({length:7},(_,i)=>{const date=new Date(now-(6-i)*86400000).toISOString().slice(0,10);return {date,enquiries:enquiries.filter(e=>e.created?.startsWith(date)).length,calls:calls.filter(c=>c.created?.startsWith(date)).length,completed:tasks.filter(t=>t.completed?.startsWith(date)).length};}),
 calls:{closed:calls.filter(c=>c.closed).length,safetyStops:calls.filter(c=>c.trace?.some((t:any)=>t.tool==='safety_gate')).length,pendingApprovals:calls.reduce((n,c)=>n+c.proposals.filter((p:any)=>p.status==='Pending').length,0),averageTurns:calls.length?Math.round(calls.reduce((n,c)=>n+c.messages.filter((m:any)=>m.role==='user').length,0)/calls.length):0},
 infrastructure:{database:process.env.DATABASE_URL?'PostgreSQL':'SQLite · local',queue:process.env.REDIS_URL?'Redis / BullMQ':'Local worker',worker,beat}
 };}
