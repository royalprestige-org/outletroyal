// Compatibility for old Sites imports. Supabase verifies identity, not HTTP headers.
import { createClient } from '@/lib/supabase/server';
export type ChatGPTUser = {userId:string;displayName:string;email:string;fullName:string|null};
export async function getChatGPTUser(): Promise<ChatGPTUser|null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return null;
  const supabase = await createClient();
  const {data,error} = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user?.email || !user.email_confirmed_at) return null;
  const fullName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null;
  return {userId:user.id,email:user.email,displayName:fullName || user.email,fullName};
}
export function chatGPTSignInPath(returnTo:string) {
  const dest = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/admin';
  return '/login?next='+encodeURIComponent(dest);
}
export function chatGPTSignOutPath(returnTo = '/') {
  const dest = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
  return '/auth/signout?next='+encodeURIComponent(dest);
}
