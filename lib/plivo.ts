import {createHmac,timingSafeEqual} from 'node:crypto';
export function signature(url:string,params:Record<string,string>,nonce:string,token:string){
 const u=new URL(url),query=[...u.searchParams.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${k}=${v}`).join('&');
 const keys=Object.keys(params).sort();
 const base=u.origin+u.pathname+(query||keys.length?'?'+query:'')+(query&&keys.length?'.':'');
 return createHmac('sha256',token).update(base+keys.map(k=>k+params[k]).join('')+'.'+nonce).digest('base64');
}
export function validSignature(url:string,params:Record<string,string>,headers:Headers,token:string){const nonce=headers.get('x-plivo-signature-v3-nonce');if(!nonce||!token)return false;const expected=Buffer.from(signature(url,params,nonce,token));return [headers.get('x-plivo-signature-v3'),headers.get('x-plivo-signature-ma-v3')].filter(Boolean).some(value=>value!.split(',').some(s=>{const b=Buffer.from(s.trim());return b.length===expected.length&&timingSafeEqual(b,expected);}));}
export const escapeXml=(s:string)=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
export const speak=(text:string)=>`<Speak language="en-GB">${escapeXml(text)}</Speak>`;
export const xml=(body:string)=>new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,{headers:{'Content-Type':'application/xml','Cache-Control':'no-store'}});
