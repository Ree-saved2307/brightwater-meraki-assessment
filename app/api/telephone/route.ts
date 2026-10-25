import {identity} from '@/lib/auth';
import {listRecords,getRecord} from '@/lib/store';
import type {TelephoneStream} from '@/lib/telephone-stream';
import type {AgentCall} from '@/lib/agent-engine';
export async function GET(){const user=await identity();if(!user||!['admin','dispatcher'].includes(user.role))return Response.json({error:'Staff access required'},{status:403});const sessions=(await listRecords<TelephoneStream>('telephone-stream')).filter(s=>Date.now()-s.created<86400000).slice(0,10);return Response.json({sessions:await Promise.all(sessions.map(async s=>({id:s.id,created:s.created,closed:s.closed,status:s.status,error:s.error,stage:s.stage,events:s.events,call:s.agent?await getRecord<AgentCall>(s.agent):null})))},{headers:{'Cache-Control':'no-store'}});}
