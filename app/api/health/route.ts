import { db } from '@/lib/catalog-db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET() {
  try {
    const row=await db().prepare('SELECT COUNT(*) AS n FROM public.products').first<{n:number}>();
    return Response.json({status:'ready',catalogProducts:row?.n||0},{
      headers:{'Cache-Control':'no-store'},
    });
  } catch {
    return Response.json({status:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
