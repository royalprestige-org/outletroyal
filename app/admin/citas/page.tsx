import {requireAdmin} from '@/lib/catalog-db';
import {chatGPTSignInPath} from '@/app/chatgpt-auth';
import {redirect} from 'next/navigation';
import AppointmentsClient from './appointments-client';
export const dynamic='force-dynamic';
export default async function Page(){
  if(!await requireAdmin())redirect(chatGPTSignInPath('/admin/citas'));
  return <AppointmentsClient/>;
}
