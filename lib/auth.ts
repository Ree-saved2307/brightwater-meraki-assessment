import 'server-only';
import {cookies} from 'next/headers';
import {sessionIdentity,revokeSession,type Identity} from './identity';
export async function identity():Promise<Identity|null>{const token=(await cookies()).get('bw_session')?.value;if(token==='local-demo'&&process.env.DEMO_MODE==='true')return {id:'demo',email:'demo@example.test',name:'Demo operator',role:'admin'};return token?(await sessionIdentity(token)):null;}
export async function authenticated(){return !!await identity();}
export async function signOut(){const token=(await cookies()).get('bw_session')?.value;if(token)(await revokeSession(token));}
