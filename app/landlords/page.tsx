import type {Metadata} from 'next';
import Website from '@/components/Website';
export const metadata:Metadata={title:'Services for landlords',description:'Gas safety certificates and boiler services for landlords and letting agents.'};
export default function Page(){return <Website key='landlords' page='landlords'/>;}
