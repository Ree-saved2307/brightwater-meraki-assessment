import type {Metadata} from 'next';
import Website from '@/components/Website';
export const metadata:Metadata={title:'Check our service area',description:'Check postcode and service eligibility around Portsmouth, Chichester and Southampton.'};
export default function Page(){return <Website key='coverage' page='coverage'/>;}
