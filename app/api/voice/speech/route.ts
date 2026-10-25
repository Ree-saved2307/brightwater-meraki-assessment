import {NextRequest,NextResponse} from 'next/server';
import {identity} from '@/lib/auth';
import {permitted} from '@/lib/identity';
import {limitedBody,trustedOrigin} from '@/lib/request-guards';
import {spokenText,synthesize} from '@/lib/voice';
export const runtime='nodejs';
export async function POST(req:NextRequest){if(!trustedOrigin(req))return NextResponse.json({error:'Origin not allowed.'},{status:403});const user=await identity();if(!user)return NextResponse.json({error:'Sign in first.'},{status:401});if(!permitted(user.role,'agent/turn'))return NextResponse.json({error:'Your role cannot generate voice.'},{status:403});try{const body=JSON.parse(new TextDecoder().decode(await limitedBody(req,2000)));const text=(await spokenText(user.id,typeof body.id==='string'?body.id:undefined,Number(body.index)));const audio=await synthesize(text,user.id,req.signal,typeof body.id==='string'?body.id:undefined);return new Response(audio,{headers:{'Content-Type':'audio/mpeg','Cache-Control':'no-store'}});}catch(e){return NextResponse.json({error:(e as Error).message},{status:422});}}
