'use client';
import {useEffect,useRef,useState} from 'react';
import {Expand,Minus,Plus,LocateFixed} from 'lucide-react';
import {flowNodes,flowEdges,mapSize,type CallStage,type CallEvent} from '@/lib/call-flow';
export default function ConversationMap({active,events,onSelect,running}:{running:boolean;active:CallStage;events:CallEvent[];onSelect:(stage:CallStage)=>void}){
 const root=useRef<HTMLDivElement>(null),[view,setView]=useState({x:24,y:24,z:.7}),[follow,setFollow]=useState(false),drag=useRef<{x:number;y:number;originX:number;originY:number}|null>(null),[selected,setSelected]=useState<CallStage>('opening');
 const pendingFrame=useRef<number|null>(null),pendingPan=useRef<{x:number;y:number}|null>(null);
 useEffect(()=>()=>{if(pendingFrame.current!==null)cancelAnimationFrame(pendingFrame.current);},[]);
 function endDrag(){drag.current=null;}
 function pan(clientX:number,clientY:number){
  const start=drag.current;if(!start)return;
  // Capture coordinates now: pointer-up may clear the ref before React runs an update.
  pendingPan.current={x:start.originX+clientX-start.x,y:start.originY+clientY-start.y};
  if(pendingFrame.current!==null)return;
  pendingFrame.current=requestAnimationFrame(()=>{pendingFrame.current=null;const next=pendingPan.current;if(!next)return;setView(v=>({...v,x:Math.max(-mapSize.width*v.z,Math.min(root.current?.clientWidth||900,next.x)),y:Math.max(-mapSize.height*v.z,Math.min(root.current?.clientHeight||480,next.y))}));});
 }
 const visited=new Set(events.map(e=>e.stage));visited.add('opening');
 const transitions=new Set(events.slice(1).map((e,i)=>events[i].stage+'>'+e.stage));
 function fit(){const width=root.current?.clientWidth||900,height=root.current?.clientHeight||480;const z=Math.max(.15,Math.min((width-40)/mapSize.width,(height-40)/mapSize.height));setView({x:20,y:20,z});setFollow(false);}
 useEffect(()=>{fit();},[]);
 useEffect(()=>{if(running)setFollow(true);},[running]);
 useEffect(()=>{if(!follow)return;const node=flowNodes.find(n=>n.id===active);if(!node)return;const width=root.current?.clientWidth||900,height=root.current?.clientHeight||480;setView(v=>{const z=Math.max(.85,v.z);return {z,x:width/2-(node.x+110)*z,y:height/2-(node.y+42)*z};});},[active,follow]);
 function zoom(delta:number){setView(v=>{const z=Math.min(1.4,Math.max(.25,v.z+delta)),width=root.current?.clientWidth||900,height=root.current?.clientHeight||480;return {z,x:width/2-(width/2-v.x)*z/v.z,y:height/2-(height/2-v.y)*z/v.z};});setFollow(false);}
 return <div className="conversation-map" ref={root} onPointerDown={e=>{if(e.button!==0||!(e.target instanceof Element)||e.target.closest('button,select,input,.map-controls'))return;drag.current={x:e.clientX,y:e.clientY,originX:view.x,originY:view.y};e.currentTarget.setPointerCapture(e.pointerId);setFollow(false);}} onPointerMove={e=>pan(e.clientX,e.clientY)} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag} aria-label="Interactive conversation map. Drag to pan; use zoom controls. Select a stage to inspect it.">
 <div className="map-grid"/>
 <div className="map-world" style={{width:mapSize.width,height:mapSize.height,transform:`translate(${view.x}px,${view.y}px) scale(${view.z})`}}><svg width={mapSize.width} height={mapSize.height} aria-hidden="true"><defs><marker id="flow-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="currentColor"/></marker></defs>{flowEdges.map(([from,to])=>{const a=flowNodes.find(n=>n.id===from)!,b=flowNodes.find(n=>n.id===to)!,x1=a.x+220,y1=a.y+43,x2=b.x,y2=b.y+43;const live=active===to&&transitions.has(from+'>'+to),done=transitions.has(from+'>'+to);return <path key={from+to} d={`M ${x1} ${y1} C ${x1+75} ${y1}, ${x2-75} ${y2}, ${x2} ${y2}`} className={`map-edge ${done?'visited':''} ${live?'live':''}`} markerEnd="url(#flow-arrow)"/>;})}</svg>{flowNodes.map((n,i)=><button type="button" key={n.id} className={`map-node ${visited.has(n.id)?'visited':''} ${active===n.id?'active':''} ${n.id==='safety'?'safety':''} ${selected===n.id?'selected':''}`} style={{left:n.x,top:n.y}} onFocus={e=>{if(e.currentTarget.matches(':focus-visible')){setFollow(false);setView(v=>({...v,x:(root.current?.clientWidth||900)/2-(n.x+110)*v.z,y:(root.current?.clientHeight||440)/2-(n.y+43)*v.z}));}}} onClick={()=>{setSelected(n.id);onSelect(n.id);}} aria-pressed={selected===n.id}><span className="map-node-marker">{visited.has(n.id)?'✓':'•'}</span><span><strong>{n.label}</strong><small>{n.detail}</small></span>{active===n.id&&<i aria-label="Current stage"/>}</button>)}</div>
 <div className="map-caption"><span className="environment-dot"/>Possible routes · highlighted links are observed transitions</div>
 <div className="map-controls"><select aria-label="Jump to conversation stage" value={selected} style={{maxWidth:155,fontSize:12}} onChange={e=>{const id=e.target.value as CallStage,n=flowNodes.find(n=>n.id===id)!;setSelected(id);onSelect(id);setFollow(false);setView({z:.85,x:(root.current?.clientWidth||900)/2-(n.x+110)*.85,y:(root.current?.clientHeight||480)/2-(n.y+43)*.85});}}>{flowNodes.map(n=><option key={n.id} value={n.id}>{n.label}</option>)}</select><button type="button" onClick={()=>zoom(-.1)} aria-label="Zoom out"><Minus size={16}/></button><span>{Math.round(view.z*100)}%</span><button type="button" onClick={()=>zoom(.1)} aria-label="Zoom in"><Plus size={16}/></button><button type="button" onClick={fit} aria-label="Fit entire map"><Expand size={16}/></button><button type="button" className={follow?'on':''} onClick={()=>setFollow(!follow)} aria-pressed={follow} title="Follow the current stage"><LocateFixed size={16}/> Follow</button></div>
 <div className="map-minimap" aria-hidden="true"><svg viewBox={`0 0 ${mapSize.width} ${mapSize.height}`}>{flowEdges.map(([a,b])=>{const n=flowNodes.find(n=>n.id===a)!,m=flowNodes.find(n=>n.id===b)!;return <line key={a+b} x1={n.x+110} y1={n.y+40} x2={m.x+110} y2={m.y+40} stroke="#c4ced8" strokeWidth="8"/>;})}{flowNodes.map(n=><rect key={n.id} x={n.x} y={n.y} width="220" height="86" rx="12" fill={n.id===active?'#f28c28':visited.has(n.id)?'#1b3a5c':'#dce3e9'}/>)}</svg></div>
 </div>;
}
