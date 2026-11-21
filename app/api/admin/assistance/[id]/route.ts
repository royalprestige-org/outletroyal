import {db,requireAdmin,responseError} from '@/lib/catalog-db';
import {validServiceDate} from '@/lib/assistance';

type Row={id:string;status:string;date:string;admin_note:string};
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!await requireAdmin())return Response.json({error:'Acceso administrativo requerido.'},{status:401});
 try{
  const {id}=await params;
  if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'Folio inválido.'},{status:400});
  const input=await request.json() as {action?:string;date?:string;adminNote?:string};
  const action=input.action||'';
  if(!['confirm','cancel','reschedule','save'].includes(action))
   return Response.json({error:'Acción no permitida.'},{status:400});
  const database=db();
  const old=await database.prepare('SELECT id,status,requested_date::text AS date,admin_note FROM public.service_requests WHERE id=?::uuid')
   .bind(id).first<Row>();
  if(!old)return Response.json({error:'Solicitud no encontrada.'},{status:404});
  if(old.status==='cancelled'&&action!=='save')
   return Response.json({error:'Una solicitud cancelada permanece en el historial. Registra otra para una nueva cita.'},{status:409});
  const note=typeof input.adminNote==='string'?input.adminNote.trim():old.admin_note;
  if(note.length>2000)return Response.json({error:'La nota administrativa es demasiado larga.'},{status:400});
  const newDate=action==='reschedule'?String(input.date||''):old.date;
  if(action==='reschedule'){
   if(!validServiceDate(newDate)||newDate===old.date)
    return Response.json({error:'Elige una nueva fecha futura diferente a la actual.'},{status:400});
   const occupied=await database.prepare(`SELECT EXISTS(
    SELECT 1 FROM public.appointments
    WHERE date=? AND slot='20:00–22:00'
      AND (status='confirmed' OR (status='pending' AND expires_at>?))
   ) AS n`).bind(newDate,Date.now()).first<{n:boolean}>();
   if(occupied?.n)return Response.json({error:'La nueva fecha ya está ocupada por una visita existente.'},{status:409});
  }
  const status=action==='confirm'?'confirmed':action==='cancel'?'cancelled':action==='reschedule'?'rescheduled':old.status;
  const row=await database.prepare(`
   WITH changed AS (
     UPDATE public.service_requests
        SET status=?,requested_date=?::date,admin_note=?,updated_at=now()
      WHERE id=?::uuid AND status=?
      RETURNING id,status,requested_date::text AS date
   ), logged AS (
     INSERT INTO public.service_request_events(
       request_id,action,previous_status,new_status,previous_date,new_date
     )
     SELECT id,?,?,?,?::date,?::date FROM changed RETURNING id
   )
   SELECT changed.id,changed.status,changed.date FROM changed JOIN logged ON logged.id=changed.id
  `).bind(status,newDate,note,id,old.status,action,old.status,status,old.date,newDate)
   .first<{id:string;status:string;date:string}>();
  if(!row)return Response.json({error:'La solicitud cambió de estado. Actualiza la lista.'},{status:409});
  return Response.json({ok:true,...row});
 }catch(error){
  const pg=error as {code?:string};
  if(pg.code==='23505')return Response.json({error:'Ese día ya fue reservado por otra persona. Selecciona otra fecha.'},{status:409});
  if(error instanceof SyntaxError)return Response.json({error:'Formato inválido.'},{status:400});
  return responseError(error);
 }
}
