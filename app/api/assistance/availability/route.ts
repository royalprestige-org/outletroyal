import {db,responseError} from '@/lib/catalog-db';
import {validServiceDate} from '@/lib/assistance';

export async function GET(request:Request){
 const date=new URL(request.url).searchParams.get('date')||'';
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))
  return Response.json({error:'Fecha inválida.'},{status:400});
 if(!validServiceDate(date))
  return Response.json({date,available:false,time:'20:30'},{headers:{'Cache-Control':'no-store'}});
 try{
  const rows=await db().prepare(`
    SELECT
      EXISTS(SELECT 1 FROM public.service_requests
       WHERE requested_date=?::date AND status IN ('scheduled','confirmed','rescheduled'))
      OR EXISTS(SELECT 1 FROM public.appointments
       WHERE date=? AND slot='20:00–22:00'
       AND (status='confirmed' OR (status='pending' AND expires_at>?)))
    AS occupied
  `).bind(date,date,Date.now()).first<{occupied:boolean}>();
  return Response.json({date,time:'20:30',available:!rows?.occupied},
   {headers:{'Cache-Control':'no-store'}});
 }catch(error){return responseError(error)}
}
