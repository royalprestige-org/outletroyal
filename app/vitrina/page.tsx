import Storefront from './storefront';
import type {Metadata} from 'next';
export const metadata:Metadata={alternates:{canonical:'https://cocina-los-cabos-bcs.vercel.app/vitrina'}};
export const dynamic='force-dynamic';
export default async function Page(){return <Storefront/>}
