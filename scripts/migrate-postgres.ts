import {DatabaseSync} from 'node:sqlite';
import {existsSync,copyFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {query,transaction,getRecord,saveRecord,closeStore} from '../lib/store';
async function main(){if(!process.env.DATABASE_URL)return;const file=resolve(process.env.DATA_DIR||'data','brightwater.sqlite');if(!existsSync(file))return;
await transaction(async()=>{if(await getRecord('migration-sqlite-v1'))return;const old=new DatabaseSync(file,{readOnly:true});const tables=['records','users','sessions','audit','limits'];let total=0;const counts:Record<string,number>={};
try{for(const table of tables){if(!old.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table))continue;const rows=old.prepare(`SELECT * FROM ${table}`).all();counts[table]=rows.length;for(const row of rows){const keys=Object.keys(row),pk=table==='sessions'?'token':table==='limits'?'key':'id';await query(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')}) ON CONFLICT(${pk}) DO UPDATE SET ${keys.filter(k=>k!==pk).map(k=>`${k}=excluded.${k}`).join(',')}`,Object.values(row));total++;}}
await saveRecord('migration-sqlite-v1','migration',{created:new Date().toISOString(),counts,total,source:'Legacy SQLite volume preserved'});console.log('Legacy records migrated to PostgreSQL',{counts,total});}finally{old.close();}});await closeStore();}
main().catch(()=>{console.error('Database migration failed. Startup stopped; legacy database preserved.');process.exit(1);});
