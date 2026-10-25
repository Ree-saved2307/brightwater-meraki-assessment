import {NextRequest,NextResponse} from 'next/server';
import {identity} from '@/lib/auth';
import {permitted} from '@/lib/identity';
import {limitedBody,trustedOrigin} from '@/lib/request-guards';
import {transcribe} from '@/lib/voice';
export const runtime='nodejs';
export async function POST(req:NextRequest){if(!trustedOrigin(req))return NextResponse.json({error:'Origin not allowed.'},{status:403});const user=await identity();if(!user)return NextResponse.json({error:'Sign in first.'},{status:401});if(!permitted(user.role,'agent/turn'))return NextResponse.json({error:'Your role cannot transcribe audio.'},{status:403});try{const bytes=await limitedBody(req,1600000);const data=await new Response(new Blob([bytes.buffer as ArrayBuffer]),{headers:{'Content-Type':req.headers.get('content-type')||''}}).formData();const file=data.get('file');if(!(file instanceof File))throw Error('Audio file missing.');return NextResponse.json({text:await transcribe(file,user.id,req.signal)},{headers:{'Cache-Control':'no-store'}});}catch(e){return NextResponse.json({error:(e as Error).message},{status:422});}}
