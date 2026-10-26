import {NextRequest,NextResponse} from 'next/server';
import {portalTicket,publicTicket,customerReply} from '@/lib/tickets';
import {trustedOrigin,limitedBody} from '@/lib/request-guards';
import {rateLimit} from '@/lib/store';
export const runtime='nodejs';
async function handle(req:NextRequest,post=false){if(post&&!trustedOrigin(req))return NextResponse.json({error:'Invalid origin.'},{status:403});const id=req.nextUrl.searchParams.get('id')||'',token=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';if(!await rateLimit(`portal:${id.slice(0,30)}`,60))return NextResponse.json({error:'Too many requests. Try again shortly.'},{status:429});try{const ticket=post?await customerReply(id,token,JSON.parse(Buffer.from(await limitedBody(req,12000)).toString()).text):publicTicket(await portalTicket(id,token));return NextResponse.json({ticket},{headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to access ticket.'},{status:400});}}
export const GET=(req:NextRequest)=>handle(req);
export const POST=(req:NextRequest)=>handle(req,true);
