import type {Metadata} from 'next';
import Website from '@/components/Website';
export const metadata:Metadata={title:'Plumbing and heating services',description:'Explore boiler servicing, plumbing, gas certificates and quoted work.'};
export default function Page(){return <Website key='services' page='services'/>;}
