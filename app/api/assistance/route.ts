import {db,responseError} from '@/lib/catalog-db';
import {buildAssistanceWhatsApp,validServiceDate,type AssistanceService} from '@/lib/assistance';

type Payload={requestId?:unknown;customerName?:unknown;phone?:unknown;serviceType?:unknown;isExistingClient?:unknown;date?:unknown;note?:unknown;interestProductId?:unknown};
const str=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max+1):'';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');
  if(origin){
   const allowed=[new URL(request.url).host,request.headers.get('x-forwarded-host')];
   if(!allowed.includes(new URL(origin).host))return Response.json({error:'Origen no permitido.'},{status:403});
  }
  const raw=await request.text();
  if(raw.length>5500)return Response.json({error:'La solicitud es demasiado larga.'},{status:413});
  const input=JSON.parse(raw) as Payload;
  const requestId=str(input.requestId,40);
  const name=str(input.customerName,180);
  const phone=str(input.phone,25).replace(/\D/g,'').replace(/^52(?=\d{10}$)/,'');
  const service=input.serviceType as AssistanceService;
  const date=str(input.date,10);
  const note=str(input.note,1500);
  const productId=str(input.interestProductId,100);
  if(!uuid.test(requestId)||name.length<2||name.length>180||
     !/^\d{10}$/.test(phone)||!['demonstration','maintenance'].includes(service)||
     typeof input.isExistingClient!=='boolean'||!validServiceDate(date)||
     note.length>1500||productId.length>100)
   return Response.json({error:'Revisa tu nombre, teléfono, servicio y fecha.'},{status:400});

  // Idempotent retries preserve the original slot and prevent duplicate submissions.
  const previous=await db().prepare('SELECT id,phone,whatsapp_message FROM public.service_requests WHERE client_request_id=?::uuid')
   .bind(requestId).first<{id:string;phone:string;whatsapp_message:string}>();
  if(previous){
   if(previous.phone!==phone)return Response.json({error:'La solicitud cambió de contacto. Inicia otra solicitud.'},{status:409});
   return Response.json({id:previous.id,status:'scheduled',message:previous.whatsapp_message,registered:true},
    {headers:{'Cache-Control':'no-store'}});
  }

  const recent=await db().prepare("SELECT COUNT(*)::int AS total FROM public.service_requests WHERE phone=? AND created_at>now()-interval '1 hour'")
   .bind(phone).first<{total:number}>();
  if((recent?.total||0)>=4)return Response.json({error:'Se registraron varias solicitudes. Intenta más tarde.'},{status:429});

  const legacy=await db().prepare(`SELECT EXISTS(SELECT 1 FROM public.appointments WHERE date=? AND slot='20:00–22:00'
   AND (status='confirmed' OR (status='pending' AND expires_at>?))) AS occupied`)
    .bind(date,Date.now()).first<{occupied:boolean}>();
  if(legacy?.occupied)return Response.json({error:'La fecha elegida ya está ocupada. Elige otra.'},{status:409});

  const record=productId?await db().prepare('SELECT id,name FROM public.products WHERE id=?')
   .bind(productId).first<{id:string;name:string}>():null;
  if(productId&&!record)return Response.json({error:'El artículo seleccionado ya no está disponible.'},{status:400});

  const id=crypto.randomUUID();
  const message=buildAssistanceWhatsApp({
   id,serviceType:service,customerName:name,phone,isExistingClient:input.isExistingClient,
   date,note,interestProductName:record?.name
  });
  const row=await db().prepare(`
   WITH contact AS (
     INSERT INTO public.lead_contacts(phone,name,city) VALUES (?,?, '')
     ON CONFLICT(phone) DO UPDATE SET name=EXCLUDED.name,updated_at=now()
     RETURNING id
   ), appointment AS (
     INSERT INTO public.service_requests(
       id,client_request_id,contact_id,customer_name,phone,service_type,
       is_existing_client,requested_date,note,interest_product_id,
       interest_product_name,status,whatsapp_message
     )
     SELECT ?::uuid,?::uuid,contact.id,?,?,?,?,?::date,?,?,?,'scheduled',?
     FROM contact RETURNING id
   ), history AS (
     INSERT INTO public.service_request_events(request_id,action,new_status,new_date)
     SELECT appointment.id,'create','scheduled',?::date FROM appointment RETURNING id
   )
   SELECT appointment.id FROM appointment JOIN history ON history.id IS NOT NULL
  `).bind(
   phone,name,
   id,requestId,name,phone,service,input.isExistingClient,date,note,
   record?.id||null,record?.name||null,message,date
  ).first<{id:string}>();
  if(!row)return Response.json({error:'No pudimos registrar la solicitud.'},{status:500});
  return Response.json({id:row.id,status:'scheduled',registered:true,message},
   {status:201,headers:{'Cache-Control':'no-store'}});
 }catch(error){
  if(error instanceof SyntaxError)return Response.json({error:'Formato de solicitud inválido.'},{status:400});
  const pg=error as {code?:string;constraint?:string};
  if(pg.code==='23505'){
   if(pg.constraint==='service_requests_client_request_id_key'){
    // A simultaneous retry may have already committed this exact request.
    return Response.json({error:'La solicitud se registró. Actualiza para consultar tu comprobante.'},{status:409});
   }
   return Response.json({error:'La fecha acaba de ocuparse. Elige otra disponible.'},{status:409});
  }
  return responseError(error);
 }
}
