import {createHash} from 'node:crypto';
import type {CallStage,CallEvent} from './call-flow';
export type TelephoneStream={id:string;uuid:string;owner:string;tokenHash:string;expires:number;connected:boolean;closed:boolean;created:number;agent?:string;stage:CallStage;events:CallEvent[];status:string;error?:string};
export const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export function ulawRms(bytes:Buffer){let sum=0;for(const b of bytes){const u=(~b)&255;let value=(((u&15)<<3)+132)<<((u&112)>>4);value-=132;sum+=value*value;}return Math.sqrt(sum/Math.max(1,bytes.length));}
export class ReplyGeneration {generation=0;controller=new AbortController();interrupt(){this.controller.abort();this.controller=new AbortController();return ++this.generation;}current(g:number){return g===this.generation&&!this.controller.signal.aborted;}}
