import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);const dir=mkdtempSync(join(tmpdir(),'bw-queue-'));Object.assign(process.env,{DATA_DIR:dir,REDIS_URL:'redis://127.0.0.1:6395'});delete process.env.DATABASE_URL;
const {saveRecord,listRecords,closeStore}=require('../lib/store.ts');const {scheduleCall}=require('../lib/automation-engine.ts');const children=[];let logs='';
function start(cmd,args,env={}){const p=spawn(cmd,args,{env:{...process.env,...env},stdio:['ignore','pipe','pipe']});p.stdout.on('data',d=>logs+=d);p.stderr.on('data',d=>logs+=d);children.push(p);return p;}
try{start('/opt/homebrew/bin/redis-server',['--port','6395','--bind','127.0.0.1','--save','','--appendonly','no','--dir',dir]);await new Promise(r=>setTimeout(r,700));await saveRecord('SIM-QUEUE-QA','call',{id:'SIM-QUEUE-QA',status:'Open'});await scheduleCall('SIM-QUEUE-QA','mark');start(process.execPath,['--import','tsx','scripts/queue-worker.ts'],{PORT:'3131'});start(process.execPath,['--import','tsx','scripts/beat.ts'],{PORT:'3132'});
let done=false;for(let i=0;i<45;i++){await new Promise(r=>setTimeout(r,1000));if((await listRecords('task')).length===1){done=true;break;}}
assert.ok(done,logs);assert.equal((await fetch('http://127.0.0.1:3131/api/health')).status,200);assert.equal((await fetch('http://127.0.0.1:3132/api/health')).status,200);await new Promise(r=>setTimeout(r,16000));assert.equal((await listRecords('task')).length,1);console.log('PASS: Redis queue, beat scheduling, worker processing, health endpoints and duplicate prevention.');
}finally{for(const p of children.reverse())p.kill('SIGTERM');await closeStore();await new Promise(r=>setTimeout(r,2000));for(const p of children)if(p.exitCode===null)p.kill('SIGKILL');}
