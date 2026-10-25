import http from 'node:http';
import {WebSocket,WebSocketServer} from 'ws';
import {getRecord,saveRecord,transaction} from '../lib/store';
import {tokenHash,ulawRms,ReplyGeneration,type TelephoneStream} from '../lib/telephone-stream';
import {agentTurn,type AgentCall} from '../lib/agent-engine';
import {agentProfile} from '../lib/agent-profile';
import {reserveVoiceBudget} from '../lib/voice';
const server=http.createServer((req,res)=>{const upstream=http.request({hostname:'127.0.0.1',port:3001,path:req.url,method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode||502,r.headers);r.pipe(res);});upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end('Application starting');});req.on('aborted',()=>upstream.destroy());res.on('close',()=>{if(!res.writableEnded)upstream.destroy();});req.pipe(upstream);});
const wss=new WebSocketServer({noServer:true,maxPayload:65536,perMessageDeflate:false});
let connections=0;
server.on('upgrade',async(req,socket,head)=>{try{const url=new URL(req.url||'','http://localhost'),id=url.searchParams.get('id')||'',token=url.searchParams.get('token')||'';
 if(url.pathname!=='/voice-stream'||connections>=3||!/^STREAM-[\w-]{8,100}$/.test(id)||token.length!==64)throw Error();
 const session=await transaction(async()=>{const s=await getRecord<TelephoneStream>(id);if(!s||s.closed||s.connected||s.expires<Date.now()||s.tokenHash!==tokenHash(token))return; s.connected=true;await saveRecord(id,'telephone-stream',s);return s;});if(!session)throw Error();
 wss.handleUpgrade(req,socket,head,ws=>{connections++;void handle(ws,session).catch(()=>ws.close(1011,'Stream unavailable'));});
 }catch{socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();}});
async function handle(ws:WebSocket,session:TelephoneStream){
 let stt:WebSocket|undefined,streamId='',closed=false,playing=false,thinking=false,loudMs=0,turns=0,agent:AgentCall|undefined,chain=Promise.resolve(),write=Promise.resolve(),lastMedia=Date.now(),recoveries=0;
 const generation=new ReplyGeneration(),profile=await agentProfile();
 const persist=()=>{const snapshot=structuredClone(session);write=write.then(()=>saveRecord(session.id,'telephone-stream',snapshot)).catch(()=>{});};
 const status=(s:string)=>{session.status=s;persist();};
 const send=(m:unknown)=>{if(ws.readyState===WebSocket.OPEN){if(ws.bufferedAmount>256000)throw Error('Audio backpressure');ws.send(JSON.stringify(m));}};
 function interrupt(){generation.interrupt();playing=false;thinking=false;send({event:'clearAudio',streamId});status('Caller interrupted; listening');}
 function close(){if(closed)return;closed=true;connections--;generation.interrupt();stt?.close();clearInterval(watchdog);clearTimeout(startTimer);session.closed=true;if(session.status!=='Completed')session.status='Call ended';persist();if(ws.readyState===WebSocket.OPEN)ws.close();}
 const fail=(reason='connection failure')=>{console.warn('telephone_stream_failure',JSON.stringify({id:session.id,reason}));session.error='Voice connection interrupted; use the turn-based fallback.';close();};
 const watchdog=setInterval(()=>{if(Date.now()-session.created>600000||Date.now()-lastMedia>45000)close();},5000);
 const startTimer=setTimeout(()=>{if(!streamId)fail();},10000);
 ws.on('close',close);ws.on('error',()=>fail('caller socket error'));
 async function say(text:string,g:number){await reserveVoiceBudget(text.length);if(!generation.current(g)||closed)return;playing=true;status('Agent speaking');
  const r=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${profile.voiceId}/stream?output_format=ulaw_8000`,{method:'POST',headers:{'xi-api-key':process.env.ELEVENLABS_API_KEY||'','Content-Type':'application/json'},body:JSON.stringify({text,model_id:'eleven_flash_v2_5'}),signal:AbortSignal.any([generation.controller.signal,AbortSignal.timeout(20000)])});
  if(!r.ok||!r.body)throw Error('Speech unavailable');const reader=r.body.getReader();try{while(true){const chunk=await reader.read();if(chunk.done)break;if(!generation.current(g)||closed){await reader.cancel();return;}send({event:'playAudio',media:{contentType:'audio/x-mulaw',sampleRate:8000,payload:Buffer.from(chunk.value).toString('base64')}});}}finally{reader.releaseLock();}
  if(generation.current(g))send({event:'checkpoint',streamId,name:`reply-${g}`});
 }
 function transcript(text:string){if(!text.trim()||closed)return;if(playing||thinking)interrupt();const g=generation.generation;
  chain=chain.catch(()=>{}).then(async()=>{if(!generation.current(g)||closed)return;if(++turns>30){await say('We have reached the demonstration call limit. Please call again to continue. Goodbye.',g);session.status='Limit reached';return;}thinking=true;status('Agent checking your request');
   try{const result=await agentTurn(agent?.id,text.slice(0,2000),session.owner,agent?.version,{signal:AbortSignal.any([generation.controller.signal,AbortSignal.timeout(30000)]),onEvent:e=>{if(!generation.current(g)||closed)return;if(typeof e.stage==='string'){session.stage=e.stage as TelephoneStream['stage'];session.events.push({stage:session.stage,label:String(e.tool||e.label||'Conversation stage'),time:new Date().toISOString(),turn:turns});session.events=session.events.slice(-100);persist();}}});recoveries=0;agent=result;session.agent=result.id;persist();thinking=false;if(generation.current(g)&&!closed)await say(result.messages.at(-1)?.content||'Please try again.',g);
   }catch(e){thinking=false;if(!generation.current(g)||closed)return;
    const reason=(e as Error).message;console.warn('telephone_turn_recovery',JSON.stringify({id:session.id,category:/limit/i.test(reason)?'limit':/timeout|abort/i.test(reason)?'timeout':'provider_or_state'}));
    session.error='A response failed; listening remains available.';status('Recovering; caller may retry');
    if(agent){const saved=await getRecord<AgentCall>(agent.id);if(saved)agent=saved;}
    try{await say(++recoveries>=3?'I am having repeated connection problems. Please try again later. No booking has been made.':'Sorry, I could not finish that response. I am still here. Please repeat your question or ask it another way.',g);}catch{if(generation.current(g)&&!closed)fail('recovery speech unavailable');}
   }
  });
 }
 ws.on('message',raw=>{try{const m=JSON.parse(raw.toString());
  if(m.event==='start'){if(streamId||m.start?.callId!==session.uuid||m.start?.accountId!==process.env.PLIVO_AUTH_ID||m.start?.mediaFormat?.encoding!=='audio/x-mulaw'||m.start?.mediaFormat?.sampleRate!==8000){fail();return;}streamId=m.start.streamId;clearTimeout(startTimer);
   stt=new WebSocket('wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&audio_format=ulaw_8000&commit_strategy=vad&language_code=en&vad_silence_threshold_secs=2.5',{headers:{'xi-api-key':process.env.ELEVENLABS_API_KEY||''},maxPayload:65536});
   stt.on('message',data=>{try{const event=JSON.parse(data.toString());if(event.message_type==='session_started'){status('Listening');void say('Hello, this is the Brightwater AI demonstration. Please use fictional UK plumbing enquiries. Your speech is processed by AI and a transcript is stored. We cannot book or dispatch anyone. How can I help?',generation.generation).catch(e=>{if(e.name!=='AbortError')fail();});}
    else if(event.message_type==='partial_transcript'&&event.text?.trim()&&(playing||thinking))interrupt();
    else if(event.message_type==='committed_transcript')transcript(String(event.text||''));
    else if(event.error)fail();}catch{fail();}});stt.on('error',()=>fail('transcription socket error'));stt.on('close',()=>{if(!closed)fail();});
  }else if(m.event==='media'&&streamId&&m.media?.track==='inbound'){
   const payload=String(m.media.payload||'');if(payload.length>12000){fail();return;}lastMedia=Date.now();const b=Buffer.from(payload,'base64');loudMs=ulawRms(b)>650?loudMs+b.length/8:0;if(loudMs>=320&&playing){interrupt();loudMs=0;}
   if(stt?.readyState===WebSocket.OPEN){if(stt.bufferedAmount>128000){fail();return;}stt.send(JSON.stringify({message_type:'input_audio_chunk',audio_base_64:payload,sample_rate:8000}));}
  }else if(m.event==='playedStream'&&m.name===`reply-${generation.generation}`){playing=false;const limited=session.status==='Limit reached';status('Listening');if(agent?.closed||limited){session.status='Completed';close();}}
  else if(m.event==='dtmf'&&m.dtmf?.digit==='*')interrupt();else if(m.event==='stop')close();
 }catch{fail();}});
}
server.listen(Number(process.env.PORT)||3000,'0.0.0.0');
process.on('SIGTERM',()=>{for(const ws of wss.clients)ws.close(1001,'Restart');server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),3000).unref();});
