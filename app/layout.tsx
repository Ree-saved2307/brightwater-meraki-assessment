import type {Metadata} from 'next';
import '@fontsource/manrope/400.css';import '@fontsource/manrope/500.css';import '@fontsource/manrope/600.css';import '@fontsource/manrope/700.css';import '@fontsource/manrope/800.css';
import '@fontsource/inter/400.css';import '@fontsource/inter/500.css';import '@fontsource/inter/600.css';
import './globals.css';
export const metadata:Metadata={title:{default:'Brightwater — Local hands. Clear prices.',template:'%s | Brightwater'},description:'Fictional assessment demo. Plumbing and heating in Portsmouth, clear prices and a local team.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en-GB"><body>{children}</body></html>;}
