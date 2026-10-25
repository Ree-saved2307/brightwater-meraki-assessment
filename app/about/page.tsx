import type {Metadata} from 'next';
import Website from '@/components/Website';
export const metadata:Metadata={title:'Meet your local team',description:'Meet the Brightwater plumbing and heating team.'};
export default function Page(){return <Website key='about' page='about'/>;}
