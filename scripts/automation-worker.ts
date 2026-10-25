import {dailyBackup} from '../lib/operations';
import {runDue} from '../lib/automation-engine';

let running=true;
process.on('SIGTERM',()=>{running=false;});
process.on('SIGINT',()=>{running=false;});
async function main(){
 console.log('Brightwater automation worker started. External delivery is disabled.');
 do{try{const count=(await runDue());await dailyBackup();if(count)console.log(`${new Date().toISOString()} processed ${count} jobs`);}catch(error){console.error('Worker failed:',error);if(process.argv.includes('--once'))process.exitCode=1;}
 if(process.argv.includes('--once'))break;
 await new Promise(resolve=>setTimeout(resolve,5000));
 }while(running);
}
main().catch(()=>{process.exitCode=1;});
