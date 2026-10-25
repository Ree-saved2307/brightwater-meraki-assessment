import type {Metadata} from 'next';
import Website from '@/components/Website';
export const metadata:Metadata={title:'Contact Brightwater',description:'Send a fictional test enquiry or check office and emergency hours.'};
export default function Page(){return <Website key='contact' page='contact'/>;}
