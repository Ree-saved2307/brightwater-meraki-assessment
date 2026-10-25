import type {Metadata} from 'next';
import Website from '@/components/Website';
export const metadata:Metadata={title:'Clear prices, including VAT',description:'Published prices for Brightwater plumbing and heating services.'};
export default function Page(){return <Website key='pricing' page='pricing'/>;}
