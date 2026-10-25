export const services = [
  {id:'boiler',name:'Boiler service',price:95,display:'£95',detail:'Keep your boiler working as it should.',category:'Heating'},
  {id:'certificate',name:'Gas safety certificate',price:75,display:'£75',detail:'CP12 for landlords. £60 per property for three or more.',category:'Landlords'},
  {id:'combined',name:'Service + gas certificate',price:145,display:'£145',detail:'Boiler service and landlord gas safety certificate.',category:'Landlords'},
  {id:'plumbing',name:'Standard call-out',price:85,display:'£85',detail:'First hour. Monday–Friday, 8am–6pm.',category:'Plumbing'},
  {id:'labour',name:'Additional labour',price:60,display:'£60 / hour',detail:'Charged in 30-minute increments.',category:'Plumbing'},
  {id:'emergency',name:'Emergency call-out',price:150,display:'£150',detail:'First hour. Available emergency evenings and Saturday mornings.',category:'Emergency'},
  {id:'flush',name:'Power flush',price:420,display:'£420',detail:'A thorough clean of your central heating system.',category:'Heating'},
  {id:'replacement',name:'Boiler replacement',price:2200,display:'From £2,200',detail:'Subject to a quotation following a site visit.',category:'Quoted work'},
  {id:'bathroom',name:'Bathroom installation',price:null,display:'By quotation',detail:'Discuss your bathroom with Mark.',category:'Quoted work'},
] as const;
export type ServiceId = typeof services[number]['id'];
export const jobServices = services.filter(s=>s.id!=='labour');
export const staff = [
 {id:'sarah',name:'Sarah Collins',role:'Office manager',initials:'SC',gas:false},
 {id:'mark',name:'Mark Ellis',role:'Owner · Gas Safe engineer',initials:'ME',gas:true},
 {id:'dan',name:'Dan Hughes',role:'Senior Gas Safe engineer',initials:'DH',gas:true},
 {id:'priya',name:'Priya Shah',role:'Gas Safe engineer',initials:'PS',gas:true},
 {id:'tom',name:'Tom Barker',role:'Plumber',initials:'TB',gas:false},
 {id:'lewis',name:'Lewis Grant',role:'Apprentice',initials:'LG',gas:false},
];
export type Coverage = {status:'covered'|'restricted'|'outside'|'invalid';title:string;message:string;district?:string};
export function coverage(postcode:string,service:string,existingAgent=false):Coverage {
 const p=postcode.trim().toUpperCase().replace(/\s/g,'');
 if(!/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(p)) return {status:'invalid',title:'Check your postcode',message:'Enter a full UK postcode, for example PO3 5XX.'};
 const district=p.slice(0,-3), match=district.match(/^(PO|SO)(\d+)$/);
 if(!match) return {status:'outside',title:'Outside our service area',message:'We currently work in Portsmouth and the surrounding areas listed below.',district};
 const n=Number(match[2]);
 if(match[1]==='PO' && ((n>=1&&n<=9)||(n>=11&&n<=17))) return {status:'covered',title:'You’re in our area',message:'This postcode is within our area for all listed services. We’ll confirm the job details when we reply.',district};
 if(match[1]==='PO'&&n>=18&&n<=20) return ['boiler','certificate','combined'].includes(service)?{status:'covered',title:'We cover this service',message:'In Chichester we offer boiler services and gas safety certificates only.',district}:{status:'restricted',title:'A smaller service range here',message:'In PO18–PO20 we offer boiler services and gas safety certificates only.',district};
 if(match[1]==='SO'&&n>=14&&n<=19) return existingAgent&&['certificate','combined'].includes(service)?{status:'covered',title:'Existing agent coverage',message:'Southampton landlord work is for existing letting-agent clients. Our office will confirm your account and job.',district}:{status:'restricted',title:'Existing letting agents only',message:'SO14–SO19 is covered for landlord work for existing letting-agent clients only. Ask the office about other landlord job types.',district};
 return {status:'outside',title:'Outside our service area',message:'This postcode is outside our listed coverage. We don’t offer work outside this area.',district};
}
export type EnquiryInput={name:string;phone:string;email:string;postcode:string;job:string;message:string;existingAgent?:boolean;website?:string};
export function validateEnquiry(input:EnquiryInput){
 const errors:Record<string,string>={};
 if(!input.name?.trim()||input.name.trim().length<2||input.name.length>100)errors.name='Enter your name (2–100 characters).';
 if(!input.phone||!/^\+?[\d\s()-]{9,25}$/.test(input.phone)||input.phone.replace(/\D/g,'').length<9)errors.phone='Enter a valid telephone number.';
 if(!input.email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)||input.email.length>200)errors.email='Enter a valid email address.';
 if(!jobServices.some(s=>s.id===input.job))errors.job='Choose a service.';
 const c=coverage(input.postcode||'',input.job,!!input.existingAgent);
 if(c.status==='invalid')errors.postcode=c.message;
 if(!input.message?.trim()||input.message.trim().length<10||input.message.length>3000)errors.message='Tell us about the job in 10–3,000 characters.';
 return errors;
}
