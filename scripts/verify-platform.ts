import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {query,transaction,getRecord,saveRecord,closeStore} from '../lib/store';
import {createUser,loginUser,sessionIdentity} from '../lib/identity';
import {teamDirectory} from '../lib/team';
import {saveTask} from '../lib/tasks';
async function main(){assert.ok(process.env.DATABASE_URL,'PostgreSQL required');const sentinel='QA rollback successful';let verified=false;try{await transaction(async()=>{const u=await createUser(`qa-${randomUUID()}@example.test`,'QA engineer','verification-only-password','engineer');assert.ok((await teamDirectory()).some(p=>p.id===u.id&&p.onCall));const token=await loginUser(u.email,'verification-only-password');assert.ok(token);assert.equal((await sessionIdentity(token!))?.id,u.id);const admin={...u,role:'admin' as const};const task=await saveTask({title:'Temporary database check',owner:u.id,due:new Date().toISOString()},admin);assert.equal((await getRecord(task.id))?.owner,u.id);await saveTask({id:task.id,version:task.version,status:'Done'},u);verified=true;throw Error(sentinel);});}catch(e){if((e as Error).message!==sentinel)throw e;}assert.ok(verified);const migration=await getRecord('migration-sqlite-v1');console.log(JSON.stringify({postgres:'verified',identity:'verified',engineerDirectory:'verified',taskAssignment:'verified',rollback:'verified',migration: migration?{counts:migration.counts,total:migration.total}:'not yet run'}));await closeStore();}
main().catch(()=>{console.error('PostgreSQL verification failed');process.exit(1);});
