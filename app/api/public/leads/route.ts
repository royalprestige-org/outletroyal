import {db,responseError} from '@/lib/catalog-db';

type LeadItem={productId:string;name:string;quantity:number};
type LeadPayload={
 customerName?:unknown;
 phone?:unknown;
 city?:unknown;
 purchaseMode?:unknown;
 primaryProductId?:unknown;
 primaryProductName?:unknown;
 items?:unknown;
 giftId?:unknown;
 giftName?:unknown;
 additionalId?:unknown;
 additionalName?:unknown;
 paymentPreference?:unknown;
 estimatedTotal?:unknown;
 whatsappMessage?:unknown;
 visitFolio?:unknown;
};

const clean=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max+1):'';
function validItems(value:unknown):value is LeadItem[]{
 return Array.isArray(value)&&value.length>=1&&value.length<=60&&value.every(item=>
  item&&typeof item==='object'&&typeof item.productId==='string'&&item.productId.length<=90&&
  typeof item.name==='string'&&item.name.trim().length>0&&item.name.length<=180&&
  Number.isInteger(item.quantity)&&item.quantity>=1&&item.quantity<=100);
}

export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');
  const host=new URL(request.url).host;
  const forwardedHost=request.headers.get('x-forwarded-host');
  if(origin&&![host,forwardedHost].includes(new URL(origin).host))
   return Response.json({error:'Origen de solicitud no permitido.'},{status:403});

  const raw=await request.text();
  if(raw.length>17000)return Response.json({error:'La solicitud supera el tamaño permitido.'},{status:413});
  const data=JSON.parse(raw) as LeadPayload;
  const customerName=clean(data.customerName,180),city=clean(data.city,100);
  const phone=clean(data.phone,30).replace(/\D/g,'').replace(/^52(?=\d{10}$)/,'');
  const message=typeof data.whatsappMessage==='string'?data.whatsappMessage:'';
  const primaryId=clean(data.primaryProductId,90),primaryName=clean(data.primaryProductName,180);
  const giftId=clean(data.giftId,90)||null,giftName=clean(data.giftName,180)||null;
  const additionalId=clean(data.additionalId,90)||null,additionalName=clean(data.additionalName,180)||null;
  const mode=data.purchaseMode;
  const payment=data.paymentPreference==null||data.paymentPreference===''?null:clean(data.paymentPreference,20);
  const total=data.estimatedTotal==null?null:Number(data.estimatedTotal);
  const visitFolio=clean(data.visitFolio,100)||null;
  if(customerName.length<2||customerName.length>180||!/^[0-9]{10}$/.test(phone)||city.length>100||
     !['normal','outlet'].includes(String(mode))||!primaryId||primaryId.length>90||
     !primaryName||primaryName.length>180||!validItems(data.items)||
     !data.items.some(item=>item.productId===primaryId)||
     !message||message.length<20||message.length>8000||
     (payment!==null&&!['cash','card','finance'].includes(payment))||
     (total!==null&&(!Number.isFinite(total)||total<0||total>999999999))||
     (giftId&&!giftName)||(additionalId&&!additionalName))
   return Response.json({error:'Revisa tus datos de contacto y productos seleccionados.'},{status:400});

  // Protege contra toques repetidos y spam, sin impedir múltiples consultas legítimas.
  const recent=await db().prepare("SELECT COUNT(*)::int AS n FROM public.lead_consultations WHERE phone=? AND created_at>now()-interval '45 seconds'")
   .bind(phone).first<{n:number}>();
  if((recent?.n||0)>=5)return Response.json({error:'Se han registrado varias consultas seguidas. Vuelve a intentarlo más tarde.'},{status:429});

  // Una única instrucción atómica guarda el contacto y una consulta nueva.
  // Teléfono agrupa el historial; cada consulta conserva un UUID independiente.
  const row=await db().prepare(`
    WITH contact AS (
      INSERT INTO public.lead_contacts(phone,name,city) VALUES (?,?,?)
      ON CONFLICT (phone) DO UPDATE SET
       name=EXCLUDED.name,
       city=CASE WHEN EXCLUDED.city<>'' THEN EXCLUDED.city ELSE public.lead_contacts.city END,
       updated_at=now()
      RETURNING id
    )
    INSERT INTO public.lead_consultations(
      contact_id,customer_name,phone,city,purchase_mode,
      primary_product_id,primary_product_name,items,
      gift_product_id,gift_name,additional_product_id,additional_name,
      payment_preference,estimated_total,whatsapp_message,visit_folio
    )
    SELECT id,?,?,?,?,?,?,?::jsonb,?,?,?,?,?,?,?,? FROM contact
    RETURNING id,created_at`)
    .bind(
      phone,customerName,city,
      customerName,phone,city,mode,primaryId,primaryName,JSON.stringify(data.items),
      giftId,giftName,additionalId,additionalName,
      payment,total,message,visitFolio
    ).first<{id:string;created_at:string}>();
  if(!row)throw new Error('Lead insert returned no record.');
  return Response.json({id:row.id,registered:true,whatsappStatus:'prepared',createdAt:row.created_at},
   {status:201,headers:{'Cache-Control':'no-store'}});
 }catch(error){
  if(error instanceof SyntaxError)return Response.json({error:'Solicitud inválida.'},{status:400});
  return responseError(error);
 }
}
