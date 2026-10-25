import {agentProfile} from './agent-profile';
import {getRecord,rateLimit,saveRecord,transaction} from './store';
import type {AgentCall} from './agent-engine';
import {greeting} from './call-flow';
export async function spokenText(owner:string,id?:string,index?:number){if(!id)return (await agentProfile()).greeting;const call=(await getRecord<AgentCall>(id));if(!id.startsWith('AGENT-')||!call||call.owner!==owner)throw Error('Conversation not found.');const m=Number.isInteger(index)?call.messages[index!]:undefined;if(!m||m.role!=='assistant')throw Error('Choose an assistant reply.');return m.content.slice(0,2000);}
export async function reserveVoiceBudget(characters:number){const month=new Date().toISOString().slice(0,7),id=`voice-budget-${month}`,limit=Math.max(100,Math.min(1000000,Number(process.env.ELEVENLABS_CHARACTER_LIMIT)||8000));(await transaction(async ()=>{const current=(await getRecord<{characters:number}>(id))||{characters:0};if(current.characters+characters>limit)throw Error('This app’s monthly voice character limit is reached. Switch to browser voice or review your provider allowance.');(await saveRecord(id,'voice-budget',{characters:current.characters+characters,limit,month}));}));}
export async function synthesize(text:string,owner:string,signal?:AbortSignal,callId?:string){
 if(!process.env.ELEVENLABS_API_KEY)throw Error('ElevenLabs is not connected. Select browser voice for now.');
 if(!(await rateLimit(`voice:${owner}`,20,60)))throw Error('Voice rate limit reached. Please wait a minute.');(await reserveVoiceBudget(text.length));
 const call=callId?await getRecord<AgentCall>(callId):undefined;if(callId&&(!call||call.owner!==owner))throw Error('Conversation not found.');
 const voice=call?.profile?.voiceId||(await agentProfile()).voiceId||process.env.ELEVENLABS_VOICE_ID||'JBFqnCBsd6RMkjVDRZzb';if(!/^[A-Za-z0-9_-]{10,100}$/.test(voice))throw Error('Invalid voice configuration.');
 const response=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,{method:'POST',headers:{'xi-api-key':process.env.ELEVENLABS_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({text,model_id:process.env.ELEVENLABS_MODEL||'eleven_multilingual_v2'}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(25000)]):AbortSignal.timeout(25000)});
 if(!response.ok)throw Error(`ElevenLabs voice is unavailable (${response.status}). Check the key, voice access and credit allowance. No automatic paid upgrade is performed.`);
 return response.body;
}
export async function transcribe(file:File,owner:string,signal?:AbortSignal){
 if(!process.env.ELEVENLABS_API_KEY)throw Error('ElevenLabs is not connected.');
 if(file.size>1500000||file.size<100||!/^audio\/(webm|mp4|ogg|wav|mpeg)/.test(file.type))throw Error('Record an audio turn shorter than 30 seconds.');
 if(!(await rateLimit(`transcribe:${owner}`,20,60))||!(await rateLimit('transcribe-month-'+new Date().toISOString().slice(0,7),60,2678400)))throw Error('Transcription test allowance reached. Use browser recognition or typed input.');
 const data=new FormData();data.append('file',file);data.append('model_id','scribe_v2');data.append('language_code','en');data.append('tag_audio_events','false');
 const response=await fetch('https://api.elevenlabs.io/v1/speech-to-text',{method:'POST',headers:{'xi-api-key':process.env.ELEVENLABS_API_KEY},body:data,signal:signal?AbortSignal.any([signal,AbortSignal.timeout(25000)]):AbortSignal.timeout(25000)});
 if(!response.ok)throw Error(`ElevenLabs transcription is unavailable (${response.status}). Check access and credits.`);
 const result=await response.json();return String(result.text||'').trim().slice(0,2000);
}
