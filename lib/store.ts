import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
import {Pool, type PoolClient} from 'pg';
import {defaultConfig} from './routing';
let sqlite:DatabaseSync|undefined, pool:Pool|undefined, ready:Promise<void>|undefined;
const context=new AsyncLocalStorage<{client?:PoolClient;sqlite?:boolean}>();
let localTail=Promise.resolve();
export const postgres=()=>!!process.env.DATABASE_URL;
// Only used for local development and the one-time legacy migration.
export function db(){if(postgres())throw Error('Use asynchronous query() with PostgreSQL.');if(!sqlite){const dir=resolve(process.env.DATA_DIR||'data');mkdirSync(dir,{recursive:true});sqlite=new DatabaseSync(resolve(dir,'brightwater.sqlite'));sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');}return sqlite;}
function getPool(){return pool??=new Pool({connectionString:process.env.DATABASE_URL,max:10,connectionTimeoutMillis:10000,idleTimeoutMillis:30000,statement_timeout:15000});}
async function raw(sql:string,params:unknown[]=[]):Promise<{rows:any[];changes:number}>{
 if(postgres()){let i=0;const r=await (context.getStore()?.client||getPool()).query(sql.replace(/\?/g,()=>`$${++i}`),params);return {rows:Array.isArray(r)?[]:r.rows,changes:Array.isArray(r)?0:r.rowCount||0};}
 const s=db().prepare(sql);if(/^\s*(SELECT|WITH|PRAGMA)/i.test(sql)||/RETURNING/i.test(sql))return {rows:s.all(...params as any[]),changes:0};const r=s.run(...params as any[]);return {rows:[],changes:Number(r.changes)};
}
async function initialise(){
 const schema=[
 'CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,kind TEXT NOT NULL,payload TEXT NOT NULL,updated TEXT NOT NULL)',
 'CREATE INDEX IF NOT EXISTS records_kind_updated ON records(kind,updated)',
 'CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,action TEXT NOT NULL,subject TEXT NOT NULL,actor TEXT NOT NULL,created TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires BIGINT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL,salt TEXT NOT NULL,hash TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1)',
 'CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires BIGINT NOT NULL)',
 'CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires)'];
 for(const sql of schema)await raw(sql);
 const now=new Date().toISOString();
 await raw('INSERT INTO records VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING',['settings','settings',JSON.stringify(defaultConfig),now]);
 await raw('INSERT INTO records VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING',['rota','rota',JSON.stringify({primary:'priya',backup:'dan',week:'2026-10-19',acknowledged:true,version:1}),now]);
}
export async function initStore(){if(!ready)ready=initialise().catch(e=>{ready=undefined;throw e;});await ready;}
export async function query(sql:string,params:unknown[]=[]){await initStore();return raw(sql,params);}
export async function getRecord<T=Record<string,unknown>>(id:string):Promise<T|undefined>{const r=await query('SELECT payload FROM records WHERE id=?',[id]);return r.rows[0]?JSON.parse(r.rows[0].payload):undefined;}
export async function saveRecord(id:string,kind:string,payload:unknown){await query('INSERT INTO records(id,kind,payload,updated) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,payload=excluded.payload,updated=excluded.updated',[id,kind,JSON.stringify(payload),new Date().toISOString()]);}
export async function listRecords<T=Record<string,unknown>>(kind:string):Promise<T[]>{return (await query('SELECT payload FROM records WHERE kind=? ORDER BY updated DESC',[kind])).rows.map(r=>JSON.parse(r.payload));}
export async function audit(action:string,subject:string,actor='Demo operator'){await query('INSERT INTO audit VALUES(?,?,?,?,?)',[randomUUID(),action,subject,actor,new Date().toISOString()]);}
export async function auditList(){return (await query('SELECT * FROM audit ORDER BY created DESC LIMIT 100')).rows;}
export async function rateLimit(key:string,max:number,seconds=60){return transaction(async()=>{const now=Date.now();await query('DELETE FROM limits WHERE expires < ?',[now]);const row=(await query('SELECT count FROM limits WHERE key=?',[key])).rows[0];if(row&&row.count>=max)return false;await query('INSERT INTO limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=limits.count+1',[key,now+seconds*1000]);return true;});}
export async function transaction<T>(fn:()=>T|Promise<T>):Promise<T>{
 if(context.getStore())return fn();await initStore();
 if(postgres()){const client=await getPool().connect();try{await client.query('BEGIN');await client.query("SET LOCAL lock_timeout = '10s'");await client.query('SELECT pg_advisory_xact_lock(72910431)');const result=await context.run({client},fn);await client.query('COMMIT');return result;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}
 let release!:()=>void;const previous=localTail;localTail=new Promise<void>(r=>{release=r;});await previous;
 try{db().exec('BEGIN IMMEDIATE');const result=await context.run({sqlite:true},fn);db().exec('COMMIT');return result;}catch(e){db().exec('ROLLBACK');throw e;}finally{release();}
}
export async function closeStore(){await pool?.end();sqlite?.close();sqlite=undefined;pool=undefined;ready=undefined;}
