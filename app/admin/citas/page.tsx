import {requireAdmin} from '@/lib/catalog-db';
import {redirect} from 'next/navigation';
import AppointmentsClient from './appointments-client';
export const dynamic='force-dynamic';
export default async function Page(){if(!await requireAdmin())redirect('/signin-with-chatgpt?return_to=%2Fadmin%2Fcitas');return <AppointmentsClient/>}
