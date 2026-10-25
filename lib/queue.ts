import {Queue} from 'bullmq';
export function redisConnection(){if(!process.env.REDIS_URL)throw Error('REDIS_URL is required for queue services.');const u=new URL(process.env.REDIS_URL);return {host:u.hostname,port:Number(u.port||6379),username:u.username||undefined,password:decodeURIComponent(u.password)||undefined,db:Number(u.pathname.slice(1)||0),maxRetriesPerRequest:null,...(u.protocol==='rediss:'?{tls:{}}:{})};}
export const queueName='brightwater-operations';
export function workQueue(){return new Queue(queueName,{connection:redisConnection(),defaultJobOptions:{attempts:5,backoff:{type:'exponential',delay:5000},removeOnComplete:{age:86400,count:500},removeOnFail:{age:604800,count:1000}}});}
