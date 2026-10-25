import {staff} from './business';
import {query,getRecord,saveRecord,audit,transaction} from './store';
import type {Identity} from './identity';
export type TeamMember={id:string;name:string;role:string;initials:string;gas:boolean;onCall:boolean;active:boolean;account:boolean;accessRole?:string};
export async function teamDirectory():Promise<TeamMember[]>{
 const rows=(await query('SELECT id,name,role,active FROM users')).rows;
 const people:TeamMember[]=[...staff.map(s=>({...s,onCall:['dan','priya','tom'].includes(s.id),active:true,account:false})),...rows.map(u=>({id:u.id,name:u.name,role:u.role==='engineer'?'Engineer':u.role==='dispatcher'?'Dispatcher':u.role==='admin'?'Administrator':'Viewer',accessRole:u.role,initials:u.name.split(' ').map((s:string)=>s[0]).slice(0,2).join(''),gas:false,onCall:u.role==='engineer',active:!!u.active,account:true}))];
 for(const p of people){const profile=await getRecord<{gas:boolean;onCall:boolean;specialty?:string}>(`staff-profile-${p.id}`);if(profile){p.gas=profile.gas;p.onCall=profile.onCall;p.role=profile.specialty||p.role;}}
 return people;
}
export async function updateStaffProfile(id:string,body:Record<string,unknown>,actor:Identity){if(actor.role!=='admin')throw Error('Administrator access required.');return transaction(async()=>{const person=(await teamDirectory()).find(p=>p.id===id&&p.active);if(!person)throw Error('Active staff member not found.');if(typeof body.gas!=='boolean'||typeof body.onCall!=='boolean')throw Error('Set gas qualification and on-call eligibility.');if(person.accessRole==='viewer'&&(body.gas||body.onCall))throw Error('A viewer cannot be assigned engineering duties.');const specialty=String(body.specialty||person.role).trim();if(specialty.length>80)throw Error('Specialty is too long.');await saveRecord(`staff-profile-${id}`,'staff-profile',{gas:body.gas,onCall:body.onCall,specialty,verifiedBy:actor.id,updated:new Date().toISOString()});await audit('Staff qualifications updated',id,actor.email);});}
export const canAssign=(p:TeamMember)=>p.active&&p.accessRole!=='viewer';
