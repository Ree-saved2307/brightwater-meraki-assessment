import {after} from 'next/server';
import {validSignature,xml,speak,escapeXml} from '@/lib/plivo';
import {getRecord,saveRecord,transaction,query,rateLimit} from '@/lib/store';
import {agentTurn,type AgentCall} from '@/lib/agent-engine';
import {agentProfile} from '@/lib/agent-profile';
export const runtime='nodejs';
export const maxDuration=120;
type Session={id:string;owner:string;created:number;turn:number;closed:boolean;agent?:string;version?:number;pending?:number;reply?:string;end?:boolean;silence:number};
export async function POST(req:Request,{params}:{params:Promise<{action:string}>}){
 const {action}=await params,origin=process.env.APP_ORIGIN||'',url=new URL(req.url),body=await req.text();
 if(body.length>16000)return new Response('Too large',{status:413});
 const fields=Object.fromEntries(new URLSearchParams(body));
 if(!validSignature(origin+url.pathname+url.search,fields,req.headers,process.env.PLIVO_AUTH_TOKEN||''))return new Response('Forbidden',{status:403});
 const uuid=fields.CallUUID||fields.CallUuid;if(!uuid||!/^[\w-]{8,100}$/.test(uuid))return new Response('Invalid call',{status:400});
 const key='PLIVO-'+uuid,base=origin+'/api/plivo/';
 const link=(a:string,t:number)=>escapeXml(base+a+'?turn='+t);
 const wait=(t:number)=>xml(`<Wait length="2"/><Redirect method="POST">${link('poll',t)}</Redirect>`);
 const finish=(text:string)=>xml(speak(text)+'<Hangup/>');
 const gather=(text:string,t:number)=>xml(`<GetInput action="${link('input',t)}" method="POST" inputType="speech" language="en-GB" speechEndTimeout="3" executionTimeout="30" log="false">${speak(text)}</GetInput><Redirect method="POST">${link('silence',t)}</Redirect>`);
 try{
 if(action==='fallback')return finish('Sorry, this demonstration is temporarily unavailable. No booking or dispatch has been made. Goodbye.');
 let session=await getRecord<Session>(key);
 if(action==='hangup'){if(session){session.closed=true;await saveRecord(key,'telephone-session',session);}return xml('');}
 if(action==='answer'){
  if(!session){if(fields.To?.replace(/\D/g,'')!==process.env.PLIVO_NUMBER||!(await agentProfile()).enabled||!process.env.DEEPSEEK_API_KEY||!await rateLimit('plivo-starts',100,86400))return finish('This demonstration is unavailable. Goodbye.');
   const admin=(await query("SELECT id FROM users WHERE role='admin' AND active=1 LIMIT 1")).rows[0];if(!admin)return finish('Service unavailable.');
   session={id:key,owner:admin.id,created:Date.now(),turn:0,closed:false,silence:0};await saveRecord(key,'telephone-session',session);
  }
  return gather('Hello, this is the Brightwater AI demonstration for fictional UK plumbing enquiries. This is a real phone connection, but we cannot book or dispatch anyone. Your speech is processed by AI and a transcript is stored for the demonstration. Please use fictional details. How can I help?',session.turn);
 }
 if(!session||session.closed)return finish('This call has ended. Goodbye.');
 if(Date.now()-session.created>600000||session.turn>=20){session.closed=true;await saveRecord(key,'telephone-session',session);return finish('We have reached the demonstration call limit. Thank you. Goodbye.');}
 if(action==='poll'){
  if(session.pending){if(Date.now()-session.pending>45000)return finish('Sorry, the assistant is taking too long. Please try again later.');return wait(session.turn);}
  if(session.end)return finish(session.reply||'Thank you. Goodbye.');return gather(session.reply||'How can I help?',session.turn);
 }
 if(action==='silence'||action==='input'){
  const turn=Number(url.searchParams.get('turn'));if(turn!==session.turn||session.pending)return wait(session.turn);
  const speech=(fields.Speech||'').trim().slice(0,2000);
  if(!speech){session.silence++;await saveRecord(key,'telephone-session',session);return session.silence>=3?finish('I have not heard a response. Please call again when ready. Goodbye.'):gather('Take your time. I am listening. What would you like help with?',session.turn);}
  const claimed=await transaction(async()=>{const current=await getRecord<Session>(key);if(!current||current.closed||current.pending||current.turn!==turn)return false;current.pending=Date.now();current.silence=0;await saveRecord(key,'telephone-session',current);return true;});
  if(!claimed)return wait(session.turn);
  after(async()=>{let result:AgentCall|undefined;try{result=await agentTurn(session!.agent,speech,session!.owner,session!.version,{signal:AbortSignal.timeout(35000)});}catch{}
   await transaction(async()=>{const current=await getRecord<Session>(key);if(!current||current.closed)return;current.pending=undefined;current.turn++;current.agent=result?.id||current.agent;current.version=result?.version||current.version;current.reply=result?.messages.at(-1)?.content||'Sorry, I cannot complete that request right now. No booking or dispatch has been made. Please try again later.';current.end=!result||result.closed;await saveRecord(key,'telephone-session',current);});
  });return wait(session.turn);
 }
 return new Response('Not found',{status:404});
 }catch{return finish('Sorry, this demonstration encountered a problem. No booking or dispatch has been made. Goodbye.');}
}
