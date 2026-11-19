'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
export async function signIn(data:FormData) {
  const email=String(data.get('email')||'').trim(),password=String(data.get('password')||'');
  const target=String(data.get('next')||'/admin');
  const next=target.startsWith('/')&&!target.startsWith('//')?target:'/admin';
  if(!email||!password)redirect('/login?error=credenciales');
  const supabase=await createClient();
  const {error}=await supabase.auth.signInWithPassword({email,password});
  if(error)redirect('/login?error=credenciales');
  redirect(next);
}
