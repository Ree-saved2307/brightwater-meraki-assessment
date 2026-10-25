import {dailyBackup} from '../lib/operations';
import {closeStore} from '../lib/store';
let timer:ReturnType<typeof setInterval>,busy=false;
async function tick(){if(busy)return;busy=true;try{await dailyBackup();}catch{console.error('Database backup failed; inspect backup status.');}finally{busy=false;}}
void tick();timer=setInterval(tick,3600000);
async function stop(){clearInterval(timer);while(busy)await new Promise(r=>setTimeout(r,100));await closeStore();process.exit(0);}process.on('SIGTERM',stop);process.on('SIGINT',stop);
