export const flowNodes=[
 {id:'opening',label:'Opening & rapport',detail:'AI introduction · permission to continue',x:40,y:270},
 {id:'qualification',label:'Understand the job',detail:'Symptoms · customer needs · missing details',x:300,y:270},
 {id:'urgency',label:'Triage urgency',detail:'Water leak · no heat · vulnerable occupant',x:570,y:270},
 {id:'coverage',label:'Check the area',detail:'Postcode and service eligibility',x:570,y:75},
 {id:'pricing',label:'Explain the price',detail:'Published prices · scope · no promises',x:840,y:75},
 {id:'objections',label:'Handle concerns',detail:'Price · uncertainty · another provider',x:1110,y:75},
 {id:'rota',label:'Check the rota',detail:'Availability · qualified gas backup',x:840,y:270},
 {id:'handoff',label:'Staff handoff',detail:'Office review · no automatic dispatch',x:1110,y:270},
 {id:'callback',label:'Arrange a callback',detail:'Busy caller · preferred time · consent',x:570,y:465},
 {id:'proposal',label:'Propose next steps',detail:'Callback · handoff · message draft',x:1380,y:270},
 {id:'approval',label:'Operator approval',detail:'A person reviews every proposed action',x:1650,y:270},
 {id:'closing',label:'Confirm & close',detail:'Recap · expectations · goodbye',x:1920,y:270},
 {id:'safety',label:'Gas safety stop',detail:'0800 111 999 · no Brightwater dispatch',x:1110,y:465},
 {id:'clarify',label:'Clarify / correct details',detail:'Unclear audio · conflicting details · ask again',x:300,y:75},
 {id:'consent',label:'Respect caller choice',detail:'Declines AI or follow-up · offer staff or close',x:300,y:660},
 {id:'accounts',label:'Accounts enquiry',detail:'No financial disclosure · Sarah review',x:570,y:660},
 {id:'existing',label:'Existing job / cancellation',detail:'Record requested change · never claim booking changed',x:840,y:660},
 {id:'complaint',label:'Complaint / repeat failure',detail:'Acknowledge impact · capture issue · staff escalation',x:1110,y:660},
 {id:'restricted',label:'Restricted coverage',detail:'Service-only areas · existing-agent restrictions',x:840,y:855},
 {id:'unavailable',label:'Outside scope / area',detail:'Explain verified restriction · no false booking',x:1110,y:855},
 {id:'quote',label:'Site quotation needed',detail:'Boiler replacement / bathroom · Mark review',x:1380,y:75},
 {id:'landlord',label:'Portfolio requirements',detail:'Property count · certificates · agent eligibility',x:840,y:1045},
 {id:'access',label:'Access & communication',detail:'Tenant access · preferred channel · accessibility',x:1110,y:1045},
 {id:'hours',label:'Hours / holiday check',detail:'Use routing diagnostics · no assumed availability',x:840,y:465},
 {id:'backup',label:'Backup / missed response',detail:'Qualified cover required · staff review if unavailable',x:1380,y:465},
 {id:'consent_check',label:'Confirm action consent',detail:'Agree purpose and next step before proposal',x:1380,y:660},
 {id:'recovery',label:'Unresolved / tool limit',detail:'No invented outcome · operator review',x:1650,y:855},
] as const;
export type CallStage=typeof flowNodes[number]['id'];
export const flowEdges:[CallStage,CallStage][]=[['opening','qualification'],['qualification','coverage'],['qualification','urgency'],['qualification','callback'],['coverage','pricing'],['pricing','objections'],['objections','proposal'],['urgency','rota'],['rota','handoff'],['handoff','proposal'],['callback','proposal'],['proposal','approval'],['approval','closing'],['urgency','safety'],['safety','closing'],['qualification', 'clarify'],['clarify', 'qualification'],['opening', 'consent'],['consent', 'closing'],['consent', 'handoff'],['qualification', 'accounts'],['accounts', 'handoff'],['qualification', 'existing'],['existing', 'handoff'],['existing', 'complaint'],['complaint', 'handoff'],['coverage', 'restricted'],['coverage', 'unavailable'],['restricted', 'pricing'],['unavailable', 'closing'],['qualification', 'landlord'],['landlord', 'coverage'],['landlord', 'access'],['access', 'consent_check'],['pricing', 'quote'],['quote', 'handoff'],['urgency', 'hours'],['hours', 'rota'],['rota', 'backup'],['backup', 'handoff'],['callback', 'consent_check'],['handoff', 'consent_check'],['consent_check', 'proposal'],['proposal', 'recovery'],['recovery', 'handoff']];
// Context stages describe observed caller needs, not completed business actions.
export const contextStages=['opening','qualification','urgency','objections','callback','handoff','clarify','consent','accounts','existing','complaint','quote','landlord','access','hours','backup','consent_check'] as const;
export const mapSize={width:2200,height:1200};
export type CallEvent={stage:CallStage;label:string;time:string;turn:number};
export const greeting="Hello, you’re speaking with Brightwater’s AI assistant in a simulated call. I can help with plumbing, heating and gas safety enquiries. What can I help you with today?";
export const scenarioScripts={
 boiler:{name:'Boiler service',description:'Routine booking, coverage and pricing',opening:'Hello. I would like to arrange a boiler service.',turns:['My postcode is PO4 0AA. It is a routine service, everything is working.','I am Alex, a fictional test customer. How much does a boiler service cost?','That is a little more than I expected. What does the published price cover?','Afternoons next week would suit me. I understand this is not a confirmed appointment.','Yes, I consent to a simulated callback from the office. Please propose that for staff approval.','That is everything, thank you. Please end the call.']},
 emergency:{name:'Vulnerable household',description:'Urgency, gas qualifications and staff handoff',opening:'The boiler has stopped and my elderly father has no heating.',turns:['There is no smell of gas and no water leak. The postcode is PO3 5XX.','He is elderly and unwell. Can you check your emergency coverage and qualified backup?','What is the emergency call-out price? Please do not promise an arrival time.','Yes, please propose a simulated urgent handoff for the operator to review.','Thank you. Please end the call.']},
 landlord:{name:'Landlord portfolio',description:'Multi-property certificates and objections',opening:'I need gas safety certificates for three rental properties.',turns:['All three properties are in PO12 1AA. I am a landlord.','What would the total certificate cost be for three properties?','I already use another company. Can you explain your published offer without making comparisons you cannot verify?','Next Tuesday afternoon is my preferred callback time.','Yes, I consent to a simulated callback proposal for the office.','Thank you. Please end the call.']},
 busy:{name:'Busy caller',description:'Respect timing, offer callback, confirm consent',opening:'I asked about a dripping tap, but I am too busy to talk now.',turns:['Please offer a callback instead. My postcode is PO7 7AA.','Tomorrow afternoon would be my preference, subject to the office confirming.','Yes, I consent to a simulated callback proposal.','That is all, goodbye.']},
 gas:{name:'Gas safety stop',description:'Immediate safety route; no booking or dispatch',opening:'I can smell gas in the kitchen.',turns:[]},
 excluded:{name:'Excluded postcode',description:'PO10 boundary',opening:'Can you fix a tap in PO10 7AA?',turns:['Please check coverage before offering any appointment.', 'Thank you, goodbye.']},
 restricted:{name:'Restricted service area',description:'PO19 restrictions',opening:'Can you repair a leaking tap in PO19 1AA?',turns:['What services are available in that area?', 'Thank you, goodbye.']},
 accounts:{name:'Accounts query',description:'Staff review without financial disclosure',opening:'I think my invoice has the wrong amount.',turns:['Please propose an accounts callback. I consent to that, not a payment.']},
 change:{name:'Change an existing job',description:'No fabricated booking changes',opening:'I need to cancel an existing visit.',turns:['Please record a cancellation request for staff, do not say it is cancelled.']},
 complaint:{name:'Repeated missed response',description:'Complaint and escalation',opening:'I called three times and nobody got back to me.',turns:['Please acknowledge this complaint and propose a staff callback with my consent.']},
 decline:{name:'Decline AI assistance',description:'Respect refusal',opening:'I do not want to speak with an AI.',turns:['Please end this call.']},
 correction:{name:'Corrected postcode',description:'Re-check changed facts',opening:'I need a boiler service in PO4 0AA.',turns:['Sorry, the postcode is actually PO10 7AA. Please check again.']},
 quote:{name:'Bathroom quotation',description:'Mark review without fixed price',opening:'I want a complete bathroom renovation.',turns:['My postcode is PO3 5XX. Can Mark review a quote request?', 'I consent to a simulated callback proposal.']},
} as const;
export type ScenarioKey=keyof typeof scenarioScripts;
