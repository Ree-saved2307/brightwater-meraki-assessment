'use client';
import {useEffect,useRef,useState} from 'react';
type RecognitionResult={isFinal:boolean;0:{transcript:string}};
type Recognition={lang:string;interimResults:boolean;continuous:boolean;onresult:((e:{resultIndex:number;results:ArrayLike<RecognitionResult>})=>void)|null;onend:(()=>void)|null;onerror:((e:{error:string})=>void)|null;start:()=>void;stop:()=>void;abort:()=>void};
type SpeechWindow=Window&{SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
export type VoiceMode='browser'|'elevenlabs'|'off';
export function useCallVoice({mode,onText,onError}:{mode:VoiceMode;onText:(text:string)=>void;onError:(message:string)=>void}){
 const [state,setState]=useState<'idle'|'listening'|'transcribing'|'speaking'>('idle'),[interim,setInterim]=useState(''),[supported,setSupported]=useState(false),[level,setLevel]=useState(0);
 const alive=useRef(true),recognition=useRef<Recognition|null>(null),audio=useRef<HTMLAudioElement|null>(null),request=useRef<AbortController|null>(null),recordRequest=useRef<AbortController|null>(null),recorder=useRef<MediaRecorder|null>(null),media=useRef<MediaStream|null>(null),discard=useRef(false),finishSpeech=useRef<(()=>void)|null>(null),generation=useRef(0),captureGeneration=useRef(0),frame=useRef(0),recordTimer=useRef<ReturnType<typeof setTimeout>|null>(null),callbacks=useRef({onText,onError});
 callbacks.current={onText,onError};
 useEffect(()=>{alive.current=true;const w=window as SpeechWindow;setSupported(!!(w.SpeechRecognition||w.webkitSpeechRecognition));return()=>{alive.current=false;stopAll();};},[]);
 function stopSpeaking(){generation.current++;request.current?.abort();audio.current?.pause();audio.current=null;if(typeof window!=='undefined')window.speechSynthesis?.cancel();finishSpeech.current?.();finishSpeech.current=null;if(alive.current)setState('idle');}
 function stopListening(cancel=true){captureGeneration.current++;discard.current=cancel;recognition.current?.abort();recognition.current=null;recordRequest.current?.abort();if(recorder.current?.state==='recording')recorder.current.stop();media.current?.getTracks().forEach(t=>t.stop());media.current=null;cancelAnimationFrame(frame.current);if(recordTimer.current)clearTimeout(recordTimer.current);if(alive.current){setState(s=>s==='speaking'?s:'idle');setInterim('');setLevel(0);}}
 function stopAll(){stopSpeaking();stopListening();}
 async function say(text:string,ref?:{id:string;index:number}){
  stopSpeaking();if(mode==='off'||!alive.current)return;const sequence=generation.current;setState('speaking');
  try{if(mode==='elevenlabs'){
   const abort=new AbortController();request.current=abort;const r=await fetch('/api/voice/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(ref||{}),signal:abort.signal});if(!r.ok)throw Error((await r.json()).error);const blob=await r.blob();if(sequence!==generation.current||!alive.current)return;const url=URL.createObjectURL(blob),player=new Audio(url);audio.current=player;
   await new Promise<void>((resolve,reject)=>{const done=()=>{URL.revokeObjectURL(url);resolve();};finishSpeech.current=done;player.onended=done;player.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Audio could not play. Try browser voice.'));};player.play().catch(reject);});
  }else{
   if(!window.speechSynthesis)throw Error('Speech playback is not supported here. Choose typed mode.');
   await new Promise<void>((resolve,reject)=>{const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-GB';utterance.rate=1;utterance.voice=window.speechSynthesis.getVoices().find(v=>v.lang==='en-GB')||null;finishSpeech.current=resolve;utterance.onend=()=>resolve();utterance.onerror=e=>e.error==='interrupted'||e.error==='canceled'?resolve():reject(Error('Browser voice could not play. Check your audio settings.'));window.speechSynthesis.speak(utterance);});
  }}catch(e){if((e as Error).name!=='AbortError'&&alive.current)callbacks.current.onError((e as Error).message);}finally{if(sequence===generation.current&&alive.current)setState('idle');}
 }
 async function listen(){
  stopSpeaking();stopListening();discard.current=false;const capture=captureGeneration.current;setInterim('');
  if(mode==='elevenlabs'){
   let context:AudioContext|undefined;
   try{
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Microphone recording is unavailable. Use Chrome or typed input.');
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});if(!alive.current||discard.current||capture!==captureGeneration.current){stream.getTracks().forEach(t=>t.stop());return;}media.current=stream;
    const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(m=>MediaRecorder.isTypeSupported(m));const record=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);recorder.current=record;const chunks:BlobPart[]=[];record.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    record.onstop=async()=>{cancelAnimationFrame(frame.current);if(recordTimer.current)clearTimeout(recordTimer.current);stream.getTracks().forEach(t=>t.stop());context?.close().catch(()=>{});if(discard.current||!alive.current||capture!==captureGeneration.current)return;setState('transcribing');setLevel(0);try{const blob=new Blob(chunks,{type:record.mimeType}),data=new FormData();data.append('file',blob,record.mimeType.includes('mp4')?'turn.mp4':'turn.webm');const abort=new AbortController();recordRequest.current=abort;const r=await fetch('/api/voice/transcribe',{method:'POST',body:data,signal:abort.signal});const result=await r.json();if(!r.ok)throw Error(result.error);if(!discard.current&&alive.current&&capture===captureGeneration.current){setState('idle');if(result.text)callbacks.current.onText(result.text);else callbacks.current.onError('No speech detected. Try again or type your message.');}}catch(e){if((e as Error).name!=='AbortError'&&alive.current){setState('idle');callbacks.current.onError((e as Error).message);}}};
    record.start();setState('listening');context=new AudioContext();const analyser=context.createAnalyser();analyser.fftSize=256;context.createMediaStreamSource(stream).connect(analyser);const values=new Uint8Array(analyser.fftSize);let heard=false,lastSound=Date.now();
    const tick=()=>{if(record.state!=='recording')return;analyser.getByteTimeDomainData(values);const rms=Math.sqrt(values.reduce((n,v)=>n+((v-128)/128)**2,0)/values.length);setLevel(Math.min(1,rms*8));if(rms>.02){heard=true;lastSound=Date.now();}if(heard&&Date.now()-lastSound>2800){record.stop();return;}frame.current=requestAnimationFrame(tick);};tick();recordTimer.current=setTimeout(()=>{if(record.state==='recording')record.stop();},30000);
   }catch(e){media.current?.getTracks().forEach(t=>t.stop());context?.close().catch(()=>{});setState('idle');callbacks.current.onError((e as Error).name==='NotAllowedError'?'Microphone access is blocked. Allow Microphone in Chrome site settings and enable Google Chrome in Mac System Settings → Privacy & Security → Microphone, then restart Chrome.':(e as Error).message);}
   return;
  }
  const w=window as SpeechWindow,Constructor=w.SpeechRecognition||w.webkitSpeechRecognition;
  if(!Constructor){callbacks.current.onError('This browser does not support speech recognition. Use Chrome, connect ElevenLabs, or type your message.');return;}
  // Ask for device access explicitly before starting the separate speech service.
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('Microphone access requires a supported browser and HTTPS.');
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   stream.getTracks().forEach(track=>track.stop());
   if(!alive.current||discard.current||capture!==captureGeneration.current)return;
  }catch(e){setState('idle');callbacks.current.onError((e as Error).name==='NotAllowedError'?'Microphone access is blocked. In Chrome, open the controls beside the address → Site settings → Microphone → Allow. Also enable Google Chrome in Mac System Settings → Privacy & Security → Microphone, then restart Chrome.':(e as Error).message);return;}
  const r=new Constructor();recognition.current=r;r.lang='en-GB';r.continuous=false;r.interimResults=true;let finalText='';
  r.onresult=e=>{let preview='';for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)finalText+=e.results[i][0].transcript+' ';else preview+=e.results[i][0].transcript;}setInterim((finalText+preview).trim());};
  r.onerror=e=>{if(e.error!=='aborted'&&e.error!=='no-speech')callbacks.current.onError(e.error==='not-allowed'||e.error==='service-not-allowed'?'Microphone access succeeded, but browser speech recognition was refused. End this call, choose ElevenLabs as the voice engine, and start a new call.':`Browser speech recognition: ${e.error}. Try ElevenLabs or typed input.`);};
  r.onend=()=>{if(recognition.current!==r)return;recognition.current=null;if(alive.current){setState('idle');setInterim('');if(!discard.current&&finalText.trim())callbacks.current.onText(finalText.trim().slice(0,2000));}};
  try{r.start();setState('listening');}catch{setState('idle');callbacks.current.onError('Microphone could not start. Try again or use typed input.');}
 }
 function finishTurn(){if(recorder.current?.state==='recording')recorder.current.stop();else recognition.current?.stop();}
 return {state,interim,supported,level,say,listen,stopAll,stopSpeaking,stopListening,finishTurn};
}
