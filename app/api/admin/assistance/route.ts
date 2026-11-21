import {db,requireAdmin,responseError} from '@/lib/catalog-db';

export async function GET(request:Request){
 if(!await requireAdmin())return Response.json({error:'Acceso administrativo requerido.'},{status:401});
 try{
  const p=new URL(request.url).searchParams;
  const conditions:string[]=[];
  const binds:unknown[]=[];
  const service=p.get('service')||'',status=p.get('status')||'';
  const phone=(p.get('phone')||'').replace(/\D/g,'').slice(0,10);
  const name=(p.get('name')||'').trim().slice(0,90);
  const start=p.get('from')||'',end=p.get('to')||'';
  if(['demonstration','maintenance'].includes(service)){conditions.push('r.service_type=?');binds.push(service)}
  if(['scheduled','confirmed','cancelled','rescheduled'].includes(status)){conditions.push('r.status=?');binds.push(status)}
  if(phone){conditions.push('r.phone LIKE ?');binds.push('%'+phone+'%')}
  if(name){conditions.push('r.customer_name ILIKE ?');binds.push('%'+name.replace(/[\\%_]/g,'\\$&')+'%')}
  if(/^\d{4}-\d{2}-\d{2}$/.test(start)){conditions.push('r.requested_date>=?::date');binds.push(start)}
  if(/^\d{4}-\d{2}-\d{2}$/.test(end)){conditions.push('r.requested_date<=?::date');binds.push(end)}
  const client=p.get('client');
  if(client==='yes'||client==='no'){conditions.push('r.is_existing_client=?');binds.push(client==='yes')}
  const contact=p.get('contactId')||'';
  if(/^[0-9a-f-]{36}$/i.test(contact)){conditions.push('r.contact_id=?::uuid');binds.push(contact)}
  const where=conditions.length?' WHERE '+conditions.join(' AND '):'';
  const page=Math.max(1,Math.min(10000,Number(p.get('page')||1)||1));
  const size=30;
  const [count,rows]=await Promise.all([
   db().prepare('SELECT count(*)::int AS n FROM public.service_requests r'+where).bind(...binds).first<{n:number}>(),
   db().prepare(`
     SELECT r.id,r.contact_id,r.customer_name,r.phone,r.service_type,r.is_existing_client,
      r.requested_date::text AS date,r.requested_time::text AS time,
      r.note,r.admin_note,r.status,r.interest_product_id,r.interest_product_name,
      r.whatsapp_message,r.created_at,r.updated_at,
      (SELECT count(*)::int FROM public.service_requests h WHERE h.contact_id=r.contact_id) AS contact_requests,
      COALESCE((SELECT json_agg(json_build_object(
       'action',e.action,'previousStatus',e.previous_status,'newStatus',e.new_status,
       'previousDate',e.previous_date,'newDate',e.new_date,'createdAt',e.created_at
      ) ORDER BY e.created_at)
       FROM public.service_request_events e WHERE e.request_id=r.id),'[]'::json) AS history
     FROM public.service_requests r${where}
     ORDER BY CASE WHEN r.status='scheduled' THEN 0 WHEN r.status='confirmed' THEN 1
        WHEN r.status='rescheduled' THEN 2 ELSE 3 END,
       r.requested_date ASC,r.created_at DESC LIMIT ? OFFSET ?`)
     .bind(...binds,size,(page-1)*size).all()
  ]);
  return Response.json({requests:rows.results,total:count?.n||0,page,pageSize:size},
   {headers:{'Cache-Control':'private,no-store'}});
 }catch(error){return responseError(error)}
}
