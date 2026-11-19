import {requireAdmin} from '@/lib/catalog-db';
import {redirect} from 'next/navigation';
import Admin from './admin-client';
export const dynamic='force-dynamic';
export default async function Home(){if(!await requireAdmin())redirect('/vitrina');return <Admin/>;}
