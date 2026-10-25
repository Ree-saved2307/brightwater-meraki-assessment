import {randomBytes,randomUUID,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {hashSync,compareSync} from 'bcryptjs';
import {query,audit,transaction} from './store';
export type Role='admin'|'dispatcher'|'engineer'|'viewer';
export type Identity={id:string;email:string;name:string;role:Role};
type User=Identity&{salt:string;hash:string;active:number};
export async function users(){return (await query('SELECT id,email,name,role,active FROM users',[])).rows;}
export async function setupRequired(){return (await users()).length===0;}
export async function createUser(email:string,name:string,password:string,role:Role):Promise<Identity>{
 email=email.trim().toLowerCase();name=name.trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>200||name.length<2||name.length>80||password.length<14||Buffer.byteLength(password,'utf8')>72||!['admin','dispatcher','engineer','viewer'].includes(role))throw Error('Use a valid email, name, role and a password of at least 14 characters (maximum 72 UTF-8 bytes).');
 const id=randomUUID(),salt='',hash=hashSync(password,12);
 (await query('INSERT INTO users(id,email,name,role,salt,hash) VALUES(?,?,?,?,?,?)',[id,email,name,role,salt,hash]));return {id,email,name,role};
}
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export async function loginUser(email:string,password:string){if(password.length>128)return null;const u=(await query('SELECT * FROM users WHERE email=?',[email.trim().toLowerCase()])).rows[0] as User|undefined;
 const valid=u?.hash.startsWith('$2')?Buffer.byteLength(password,'utf8')<=72&&compareSync(password,u.hash):timingSafeEqual(scryptSync(password,u?.salt||'invalid-account-salt',64),u?Buffer.from(u.hash,'hex'):Buffer.alloc(64));if(!u||!u.active||!valid)return null;return (await newSession(u.id));}
export async function newSession(id:string){const token=randomBytes(32).toString('base64url');await query('DELETE FROM sessions WHERE expires<?',[Date.now()]);await query('INSERT INTO sessions VALUES(?,?,?)',[digest(token),id,Date.now()+8*3600000]);return token;}
export async function sessionIdentity(token:string):Promise<Identity|null>{return (await query('SELECT u.id,u.email,u.name,u.role FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>? AND u.active=1',[digest(token),Date.now()])).rows[0] as Identity||null;}
export async function revokeSession(token:string){await query('DELETE FROM sessions WHERE token=?',[digest(token)]);}
export async function disableUser(id:string,actor:Identity){if(id===actor.id)throw Error('You cannot disable your own account.');return (await transaction(async()=>{const result=(await query('UPDATE users SET active=0 WHERE id=?',[id]));if(!result.changes)throw Error('Account not found.');(await query('DELETE FROM sessions WHERE user_id=?',[id]));(await audit('Staff account disabled',id,actor.email));}));}
export function permitted(role:Role,path:string){if(role==='admin')return true;if(role==='viewer')return false;if(['settings','rota','automations/rules','users/create','users/disable','staff/profile','agent/profile','backup'].includes(path))return false;return role==='dispatcher'||['rota/acknowledge','automations/task','tasks/save'].includes(path);}
export function checkSetupToken(value:string){const token=process.env.SETUP_TOKEN||'';return token.length>=32&&value.length===token.length&&timingSafeEqual(Buffer.from(token),Buffer.from(value));}
