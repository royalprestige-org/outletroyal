import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function GET(request:NextRequest) {
  const supabase=await createClient();
  await supabase.auth.signOut();
  const target=request.nextUrl.searchParams.get('next')||'/';
  const next=target.startsWith('/')&&!target.startsWith('//')?target:'/';
  return NextResponse.redirect(new URL(next,request.url));
}
