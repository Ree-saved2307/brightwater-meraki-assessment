import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
const dir=mkdtempSync(join(tmpdir(),'bw-hosted-test-'));
const port='3107';
const setupToken=randomBytes(32).toString('hex');
const child=spawn(process.execPath,['scripts/start-hosted.mjs'],{stdio:['ignore','pipe','pipe'],env:{...process.env,PORT:port,DATA_DIR:dir,DEMO_MODE:'false',SESSION_SECRET:randomBytes(32).toString('hex'),SETUP_TOKEN:setupToken,APP_ORIGIN:'https://staging.example.test'}});
let logs='';child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
const exited=new Promise(resolve=>child.once('exit',(code)=>resolve(code)));
try{
 let healthy=false;
 for(let i=0;i<40;i++){
  try{const r=await fetch(`http://127.0.0.1:${port}/api/health`,{signal:AbortSignal.timeout(3000)});healthy=r.ok&&(await r.json()).status==='ok';}catch{}
  if(healthy)break;await new Promise(r=>setTimeout(r,500));
 }
 assert.ok(healthy,'Hosted health check became ready');
 const r=await fetch(`http://127.0.0.1:${port}/api/workspace`,{signal:AbortSignal.timeout(5000)});assert.equal(r.status,401);
 const post=async(path,body,cookie='')=>fetch(`http://127.0.0.1:${port}/api/${path}`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://staging.example.test',Cookie:cookie},body:JSON.stringify(body)});
 const setup=await post('setup',{token:setupToken,email:'admin@example.test',name:'Test Admin',password:'test-password-long-enough'});assert.equal(setup.status,200);const admin=setup.headers.get('set-cookie').split(';')[0];
 assert.equal((await post('setup',{token:setupToken,email:'other@example.test',name:'Other Admin',password:'test-password-long-enough'})).status,422);
 assert.equal((await post('users/create',{email:'viewer@example.test',name:'Viewer',password:'test-password-long-enough',role:'viewer'},admin)).status,200);
 const login=await post('login',{email:'viewer@example.test',password:'test-password-long-enough'});assert.equal(login.status,200);const viewer=login.headers.get('set-cookie').split(';')[0];
 assert.equal((await post('settings',{},viewer)).status,403);
 assert.equal((await post('agent/turn',{message:'Hello'},viewer)).status,403);
 await post('logout',{},viewer);assert.equal((await fetch(`http://127.0.0.1:${port}/api/workspace`,{headers:{Cookie:viewer}})).status,401);
 let heartbeat=false;for(let i=0;i<40;i++){const db=new DatabaseSync(join(dir,'brightwater.sqlite'));heartbeat=!!db.prepare("SELECT payload FROM records WHERE id='automation-worker'").get();db.close();if(heartbeat)break;await new Promise(r=>setTimeout(r,500));}assert.ok(heartbeat,'Worker heartbeat saved alongside the hosted server');
 child.kill('SIGTERM');assert.equal(await exited,0);
 console.log('PASS: hosted supervisor starts web+worker, database health is ready, anonymous staff access denied, graceful shutdown completes.');
}catch(e){console.error(logs);throw e;}finally{if(child.exitCode===null){child.kill('SIGTERM');await exited;}rmSync(dir,{recursive:true,force:true});}
