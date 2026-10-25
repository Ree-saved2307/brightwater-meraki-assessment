import {spawn} from 'node:child_process';

const serviceRole=process.env.SERVICE_ROLE||'web';
const required=serviceRole==='web'?['DATA_DIR','SESSION_SECRET','APP_ORIGIN']:['DATABASE_URL','REDIS_URL'];
if(serviceRole==='web'&&process.env.DEMO_MODE!=='true')required.push('SETUP_TOKEN');
for(const name of required){if(!process.env[name])throw new Error(`Missing required deployment variable: ${name}`);}
if(serviceRole==='web'&&process.env.SESSION_SECRET.length<32)throw new Error('SESSION_SECRET must contain at least 32 characters.');
if(serviceRole==='web'&&!/^https:\/\//.test(process.env.APP_ORIGIN))throw new Error('APP_ORIGIN must be the public HTTPS origin.');
const children=[];
let stopping=false;
function stop(code){
 if(stopping)return;
 stopping=true;
 for(const child of children)child.kill('SIGTERM');
 const timer=setTimeout(()=>{for(const child of children)child.kill('SIGKILL');process.exit(code);},8000);
 Promise.all(children.map(child=>child.exitCode!==null?Promise.resolve():new Promise(resolve=>child.once('exit',resolve)))).then(()=>{clearTimeout(timer);process.exit(code);});
}
const role=process.env.SERVICE_ROLE||'web';
if(role==='web'&&process.env.DATABASE_URL){const migration=spawn(process.execPath,['--import','tsx','scripts/migrate-postgres.ts'],{stdio:'inherit',env:process.env});const code=await new Promise(resolve=>migration.on('exit',resolve));if(code!==0)process.exit(1);}
const commands=role==='worker'?[['--import','tsx','scripts/queue-worker.ts']]:role==='beat'?[['--import','tsx','scripts/beat.ts']]:[
 ['node_modules/next/dist/bin/next','start','--hostname',process.env.PLIVO_STREAMING==='true'?'127.0.0.1':'0.0.0.0','--port',process.env.PLIVO_STREAMING==='true'?'3001':process.env.PORT||'3000'],
 ...(process.env.PLIVO_STREAMING==='true'?[['--import','tsx','scripts/voice-gateway.ts']]:[]),
 ...(process.env.DATABASE_URL?[['--import','tsx','scripts/backup-worker.ts']]:[]),
 ...(!process.env.REDIS_URL?[['--import','tsx','scripts/automation-worker.ts']]:[])
];
for(const args of commands){
 const child=spawn(process.execPath,args,{stdio:'inherit',env:process.env});
 children.push(child);
 child.on('error',error=>{console.error('Hosted process could not start:',error.message);stop(1);});
 child.on('exit',()=>{if(!stopping)stop(1);});
}
process.on('SIGTERM',()=>stop(0));
process.on('SIGINT',()=>stop(0));
