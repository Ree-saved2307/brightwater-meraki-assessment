import {teamDirectory,updateStaffProfile,canAssign} from '@/lib/team';
import {taskData,saveTask,insights} from '@/lib/tasks';
import {agentProfile,publishAgent} from '@/lib/agent-profile';
import { NextRequest,NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import {authenticated,identity,signOut} from '@/lib/auth';
import {users,setupRequired,createUser,loginUser,newSession,permitted,checkSetupToken,disableUser,type Role} from '@/lib/identity';
import {agentStatus,agentTurn,approveAgentAction,endAgentCall,type AgentCall} from '@/lib/agent-engine';
import {query,audit,auditList,getRecord,listRecords,rateLimit,saveRecord,transaction} from '@/lib/db';
import {coverage,validateEnquiry,staff,type EnquiryInput} from '@/lib/business';
import {routeCall,validateScenario,type Scenario,type RoutingConfig} from '@/lib/routing';
import {automationData,cancelSubject,completeTask,jobAction,rules,retireRotaReminders,runDue,scheduleCall,scheduleEnquiry,scheduleRota,validRules} from '@/lib/automation-engine';
import {operationsData,simulateDelivery,retryDelivery} from '@/lib/operations';
export const runtime='nodejs';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:NextRequest){const path=req.nextUrl.pathname.replace('/api/','');if(path==='health'){try{await query('SELECT 1');return json({status:'ok'});}catch{return json({status:'unavailable'},503);}}if(path==='session')return json({authenticated:await authenticated(),demo:process.env.DEMO_MODE==='true',user:await identity(),setup:(await setupRequired())});if(!await authenticated())return json({error:'Please sign in to the workspace.'},401);const currentActor=await identity();if(path==='workspace')return json({team:await teamDirectory(),tasks:await taskData(currentActor!),insights:currentActor?.role!=='engineer'?await insights():null,agentProfile:await agentProfile(),enquiries:(await listRecords('enquiry')),calls:(await listRecords('call')),incidents:(await listRecords('incident')),settings:(await getRecord('settings')),rota:(await getRecord('rota')),audit:(await auditList()),automations:(await automationData()),agent:{...agentStatus(),calls:(await listRecords<AgentCall>('agent-call')).filter(c=>c.owner===(currentActor?.id)).slice(0,30)},operations:(await operationsData()),users:(await identity())?.role==='admin'?(await users()):[]});return json({error:'Not found'},404);}
export async function POST(req:NextRequest){
 const origin=req.headers.get('origin');
 const expectedOrigin=process.env.APP_ORIGIN||`${req.nextUrl.protocol}//${req.headers.get('host')}`;
 if(!origin||origin!==expectedOrigin)return json({error:'Request origin not allowed.'},403);
 if(Number(req.headers.get('content-length')||0)>20000)return json({error:'Request too large.'},413);
 let body:Record<string,unknown>;try{const raw=await req.text();if(Buffer.byteLength(raw)>20000)return json({error:'Request too large.'},413);body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))throw Error();}catch{return json({error:'Invalid request.'},400);}
 const path=req.nextUrl.pathname.replace('/api/','');
 const setSession=(token:string)=>{const res=json({ok:true});res.cookies.set('bw_session',token,{httpOnly:true,sameSite:'strict',secure:expectedOrigin.startsWith('https:'),maxAge:28800,path:'/'});return res;};
 if(path==='setup'){
  if(!(await rateLimit('setup',10,300)))return json({error:'Try again in five minutes.'},429);
  if(!checkSetupToken(String(body.token||'')))return json({error:'Setup token is not valid.'},403);
  try{const token=(await transaction(async ()=>{if(!(await setupRequired()))throw Error('Initial setup is already complete.');const u=(await createUser(String(body.email||''),String(body.name||''),String(body.password||''),'admin'));(await audit('Initial administrator created',u.email,u.email));return (await newSession(u.id));}));return setSession(token);}catch(e){return json({error:(e as Error).message},422);}
 }
 if(path==='login'){
  if(!(await rateLimit('login',30,300)))return json({error:'Too many attempts. Try again in five minutes.'},429);
  if(process.env.DEMO_MODE==='true'&&body.demo===true)return setSession('local-demo');
  const token=(await loginUser(String(body.email||''),String(body.password||'')));if(!token)return json({error:'Email or password is incorrect.'},401);return setSession(token);
 }
 if(path==='logout'){await signOut();const res=json({ok:true});res.cookies.delete('bw_session');return res;}
 if(path==='enquiries'){
  if(!(await rateLimit('public-enquiries',30,300)))return json({error:'The enquiry form is busy. Please try again shortly.'},429);
  const allowed=['name','phone','email','postcode','job','message','website'];if(allowed.some(k=>body[k]!==undefined&&typeof body[k]!=='string'))return json({error:'Invalid field format.'},400);
  const input=body as unknown as EnquiryInput;if(input.website)return json({error:'Unable to accept this submission.'},400);const errors=validateEnquiry(input);if(Object.keys(errors).length)return json({errors},422);
  const id=`BW-${randomUUID().slice(0,8).toUpperCase()}`;
  (await transaction(async ()=>{(await saveRecord(id,'enquiry',{id,...Object.fromEntries(allowed.filter(k=>k!=='website').map(k=>[k,String(body[k]||'').trim()])),existingAgent:body.existingAgent===true,coverage:coverage(input.postcode,input.job,body.existingAgent===true),status:'New',owner:'',created:new Date().toISOString(),notes:[],synthetic:true}));(await audit('Enquiry received',id,'Website visitor'));(await scheduleEnquiry(id));}));return json({id},201);
 }
 const actor=await identity();if(!actor)return json({error:'Your session ended. Sign in again.'},401);
 if(!permitted(actor.role,path))return json({error:'Your role cannot perform this action.'},403);
 if(path==='staff/profile'){try{await updateStaffProfile(String(body.id||''),body,actor);return json({ok:true});}catch(e){return json({error:(e as Error).message},422);}}
 if(path==='tasks/save'){try{return json(await saveTask(body,actor));}catch(e){return json({error:(e as Error).message},422);}}
 if(path==='agent/profile'){try{return json(await publishAgent(body,actor));}catch(e){return json({error:(e as Error).message},422);}}
 if(path==='users/create'){try{const u=(await createUser(String(body.email||''),String(body.name||''),String(body.password||''),String(body.role||'viewer') as Role));(await audit('Staff account created',u.email,actor.email));return json({ok:true});}catch{return json({error:'Use a unique email, name, valid role and a password of at least 14 characters (maximum 72 UTF-8 bytes).'},422);}}
 if(path==='users/disable'){try{(await disableUser(String(body.id||''),actor));return json({ok:true});}catch(e){return json({error:(e as Error).message},422);}}
 if(path==='agent/turn'){try{return json(await agentTurn(typeof body.id==='string'?body.id:undefined,String(body.message||''),actor.id,Number(body.version)));}catch(e){return json({error:(e as Error).message},422);}}
 if(path==='agent/end'){try{return json((await endAgentCall(String(body.id||''),actor.id)));}catch(e){return json({error:(e as Error).message},409);}}
 if(path==='agent/review'){try{return json((await approveAgentAction(String(body.id||''),String(body.proposalId||''),body.approve===true,actor.id)));}catch(e){return json({error:(e as Error).message},409);}}
 if(path==='rota/acknowledge'){const r=(await getRecord<Record<string,unknown>>('rota'))!;if(actor.role==='engineer'&&r.primary!==actor.id&&r.backup!==actor.id)return json({error:'Only assigned engineers may acknowledge this rota.'},403);if(body.version!==r.version)return json({error:'Rota changed. Refresh first.'},409);(await transaction(async ()=>{(await saveRecord('rota','rota',{...r,acknowledged:true,acknowledgedBy:actor.email}));(await retireRotaReminders());(await audit('Rota handover acknowledged',String(r.version),actor.email));}));return json({ok:true});}

 (await audit('Workspace action requested',path,actor.email));
 if(path==='communications/simulate'){try{return json((await simulateDelivery(String(body.subject||''),String(body.template||''),String(body.channel||''),body.fail===true,actor.email)));}catch(e){return json({error:(e as Error).message},422);}}
 if(path==='communications/retry'){try{(await retryDelivery(String(body.id||''),actor.email));return json({ok:true});}catch(e){return json({error:(e as Error).message},409);}}
 if(path==='automations/run'){return json({processed:(await runDue(new Date(),'manual'))});}
 if(path==='automations/job'){
  try{(await jobAction(String(body.id||''),String(body.action||'')));return json({ok:true});}catch(e){return json({error:(e as Error).message},409);}
 }
 if(path==='automations/task'){
  try{await saveTask({id:body.id,version:(await getRecord<any>(String(body.id)))?.version||1,status:'Done'},actor);return json({ok:true});}catch(e){return json({error:(e as Error).message},404);}
 }
 if(path==='automations/rules'){
  if(!validRules(body))return json({error:'Use valid switches and delays from 1 to 10,080 minutes.'},422);
  return (await transaction(async ()=>{const current=(await rules());if(body.version!==current.version)return json({error:'Rules changed. Refresh before publishing.'},409);(await saveRecord('automation-rules','automation-rules',{version:current.version+1,enabled:body.enabled,assignOwner:body.assignOwner,draftAcknowledgment:body.draftAcknowledgment,followupMinutes:body.followupMinutes,emergencyMinutes:body.emergencyMinutes,rotaReminderMinutes:body.rotaReminderMinutes}));(await audit('Automation rules published',`Version ${current.version+1}`));return json({ok:true});}));
 }
 if(path==='enquiries/update'){
  const id=String(body.id||''),entry=(await getRecord<Record<string,unknown>>(id));if(!entry||!id.startsWith('BW-'))return json({error:'Enquiry not found.'},404);
  if(body.status!==undefined&&!['New','In progress','Waiting','Resolved'].includes(String(body.status)))return json({error:'Invalid status.'},422);
  if(body.owner!==undefined&&body.owner!==''&&!(await teamDirectory()).some(s=>s.id===body.owner&&canAssign(s)))return json({error:'Choose a valid owner.'},422);
  if(body.note!==undefined&&(typeof body.note!=='string'||body.note.length>2000))return json({error:'Note is too long.'},422);
  const updated={...entry,status:body.status??entry.status,owner:body.owner??entry.owner,notes:[...(entry.notes as unknown[]||[]),...(String(body.note||'').trim()?[{text:String(body.note).trim(),created:new Date().toISOString(),by:actor.name}]:[])]};(await transaction(async ()=>{(await saveRecord(id,'enquiry',updated));(await audit('Enquiry updated',id));if(updated.status==='Resolved')(await cancelSubject(id));}));return json({ok:true});
 }
 if(path==='simulate'){
  if(!validateScenario(body as unknown as Scenario,await teamDirectory()))return json({error:'Choose a valid scenario.'},422);
  const scenario=body as unknown as Scenario,config=(await getRecord<RoutingConfig>('settings'))!,result=routeCall(scenario,config,await teamDirectory()),id=`SIM-${randomUUID().slice(0,8).toUpperCase()}`;
  (await transaction(async ()=>{(await saveRecord(id,'call',{id,scenario,result,created:new Date().toISOString(),status:result.needsFollowup?'Open':'Complete',synthetic:true}));(await audit('Simulation completed',`${id}: ${result.outcome}`));if(result.needsFollowup)(await scheduleCall(id,result.owner));}));return json({id,...result});
 }
 if(path==='calls/resolve'){
  const id=String(body.id||''),call=(await getRecord<Record<string,unknown>>(id));if(!call||!id.startsWith('SIM-'))return json({error:'Call not found.'},404);(await transaction(async ()=>{(await saveRecord(id,'call',{...call,status:'Resolved'}));(await audit('Call follow-up resolved',id));(await cancelSubject(id));}));return json({ok:true});
 }
 if(path==='rota'){
  if(!(await teamDirectory()).some(p=>p.id===body.primary&&p.active&&p.onCall)||!(await teamDirectory()).some(p=>p.id===body.backup&&p.active&&p.gas)||body.primary===body.backup)return json({error:'Choose an on-call engineer and a different qualified backup.'},422);
  const current=(await getRecord<{version:number}>('rota'))!;if(body.version!==current.version)return json({error:'The rota changed. Refresh before saving.'},409);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(body.week))||Number.isNaN(Date.parse(String(body.week))))return json({error:'Choose a valid week.'},422);
  (await transaction(async ()=>{(await retireRotaReminders());(await saveRecord('rota','rota',{primary:body.primary,backup:body.backup,week:body.week,acknowledged:body.acknowledged===true,version:current.version+1}));(await audit('Rota published',`${body.primary} / backup ${body.backup}`));if(body.acknowledged!==true)(await scheduleRota(current.version+1));}));return json({ok:true});
 }
 if(path==='settings'){
  const current=(await getRecord<RoutingConfig>('settings'))!;if(body.version!==current.version)return json({error:'Settings changed. Refresh before publishing.'},409);
  const ring=Number(body.ringSeconds),queue=Number(body.queueSeconds);if(!Number.isInteger(ring)||ring<10||ring>60||!Number.isInteger(queue)||queue<0||queue>120)return json({error:'Ring time must be 10–60 seconds; queue time 0–120 seconds.'},422);
  if(!['voicemailEmail','accountsEmail'].every(k=>typeof body[k]==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body[k] as string)&&(body[k] as string).length<200))return json({error:'Enter valid mailbox addresses.'},422);
  const dates=body.holidayDates;if(!Array.isArray(dates)||dates.length>30||dates.some(d=>typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d)||Number.isNaN(Date.parse(d))))return json({error:'Holiday overrides must be valid dates.'},422);
  (await transaction(async ()=>{(await saveRecord(`config-${current.version}`,'config-history',current));(await saveRecord('settings','settings',{version:current.version+1,ringSeconds:ring,queueSeconds:queue,voicemailEmail:body.voicemailEmail,accountsEmail:body.accountsEmail,holidayDates:dates}));(await audit('Routing settings published',`Version ${current.version+1}`));}));return json({ok:true});
 }
 if(path==='incidents'){
  const title=String(body.title||'').trim(),notes=String(body.notes||'').trim();if(title.length<5||title.length>150||notes.length>5000)return json({error:'Add a title of 5–150 characters.'},422);const id=`INC-${randomUUID().slice(0,6).toUpperCase()}`;(await transaction(async ()=>{(await saveRecord(id,'incident',{id,title,notes,status:'Investigating',created:new Date().toISOString()}));(await audit('Incident opened',id));}));return json({ok:true});
 }
 return json({error:'Not found'},404);
}
