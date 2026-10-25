import {NextRequest,NextResponse} from 'next/server';
import {identity} from '@/lib/auth';
import {permitted} from '@/lib/identity';
import {agentTurn} from '@/lib/agent-engine';
import {limitedBody,trustedOrigin} from '@/lib/request-guards';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 if(!trustedOrigin(req))return NextResponse.json({error:'Request origin not allowed.'},{status:403});
 const actor=await identity();if(!actor)return NextResponse.json({error:'Sign in to use the call studio.'},{status:401});
 if(!permitted(actor.role,'agent/turn'))return NextResponse.json({error:'Your role cannot run a call simulation.'},{status:403});
 let body:Record<string,unknown>;try{body=JSON.parse(new TextDecoder().decode(await limitedBody(req,12000)));if(!body||typeof body.message!=='string')throw Error();}catch{return NextResponse.json({error:'Invalid call message.'},{status:400});}
 const abort=new AbortController();const signal=AbortSignal.any([req.signal,abort.signal]);const encoder=new TextEncoder();
 const stream=new ReadableStream({async start(controller){const send=(event:Record<string,unknown>)=>{if(!signal.aborted)controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));};try{const call=await agentTurn(typeof body.id==='string'?body.id:undefined,String(body.message),actor.id,Number(body.version),{signal,onEvent:send});send({type:'complete',call});}catch(error){if(!signal.aborted)send({type:'error',error:(error as Error).message});}finally{if(!signal.aborted)controller.close();}},cancel(){abort.abort();}});
 return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'}});
}
