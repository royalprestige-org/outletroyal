import {db,requireAdmin,responseError} from '@/lib/catalog-db';
import {cleanText,emptySale,HOLD_MS,keyFor,parseJSON,prefillFinalCost,type Sale,type Source,totals,validSlot} from '@/lib/appointments';
import {calculatePublicQuote} from '@/lib/public-quote';
import type {Payment} from '@/lib/pricing';
import {cleanReferralOffer,REFERRAL_GIFT_ID} from '@/lib/referrals';
export async function GET(){
 if(!await requireAdmin())return Response.json({error:'Acceso no autorizado'},{status:401});
 try{const rows=await db().prepare('SELECT * FROM appointments ORDER BY date DESC,slot DESC,created_at DESC LIMIT 500').all<Record<string,any>>();
  const referrals=await db().prepare('SELECT * FROM appointment_referrals').all<Record<string,any>>();
  return Response.json({appointments:rows.results.map(row=>{
   const sale=parseJSON<Sale>(row.sale_json,emptySale());sale.referrals=referrals.results.filter(x=>x.appointment_id===row.id).map(x=>({id:x.id,name:x.name,phone:x.phone,age:x.age,married:x.married,work:x.work,health:x.health,notes:x.notes}));
   return {id:row.id,kind:row.kind,status:row.status==='pending'&&row.expires_at<=Date.now()?'expired':row.status,date:row.date,slot:row.slot,expiresAt:row.expires_at,customerName:row.customer_name,phone:row.phone,city:row.city,colonia:row.colonia,address:row.address,source:parseJSON<Source>(row.source_json,{items:[],giftId:'',additionalId:'',payment:'',months:0,estimatedTotal:0}),sale,notes:row.notes,createdAt:row.created_at,...totals(sale)};
  })});
 }catch(e){return responseError(e)}
}
export async function POST(request:Request){
 try{const data=await request.json() as Record<string,any>,kind=data.kind==='instant'?'instant':'scheduled',date=cleanText(data.date,10),slot=cleanText(data.slot,20),name=cleanText(data.customerName,180),phone=cleanText(data.phone,30),city=cleanText(data.city,80),colonia=cleanText(data.colonia,120),address=cleanText(data.address,300);
  if(kind==='instant'&&!await requireAdmin())return Response.json({error:'Acceso no autorizado'},{status:401});
  if(!name||!phone||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!slot||kind==='scheduled'&&(!validSlot(date,slot)||!city||!colonia))return Response.json({error:'Completa el nombre, teléfono y los datos de la visita.'},{status:400});
  const now=new Date().toISOString(),id=crypto.randomUUID(),database=db(),untrusted=data.source&&typeof data.source==='object'?data.source as Source:{items:[],giftId:'',additionalId:'',payment:'',months:0,estimatedTotal:0};let expiresAt:number|null=null;
  let referralOffer:ReturnType<typeof cleanReferralOffer>=null;
  let outletUnitPrices:Map<string,number>|undefined;
  let source:Source=untrusted;
  if(kind==='scheduled'){
   try{const priced=await calculatePublicQuote({items:untrusted.items,additionalId:untrusted.additionalId,giftId:untrusted.giftId,payment:untrusted.payment as Payment,months:Number(untrusted.months),purchaseMode:untrusted.purchaseMode,expectedOutlet: (untrusted as Source & {expectedOutlet?:boolean}).expectedOutlet});
    if(untrusted.referralOffer&&!priced.allowsReferrals)throw new Error('Los precios Outlet no son acumulables con regalos ni otras promociones.');
    referralOffer=cleanReferralOffer(untrusted.referralOffer,phone);
    if(priced.hasOutlet)outletUnitPrices=priced.unitPrices;
    source={purchaseMode:untrusted.purchaseMode||'outlet',items:priced.selected,giftId:untrusted.giftId||'',additionalId:untrusted.additionalId||'',payment:untrusted.payment,months:Number(untrusted.months)||0,estimatedTotal:priced.result.total,...(referralOffer?{referralOffer}:{})};
   }catch(e){return Response.json({error:(e as Error).message},{status:400})}
  }
  const sale=emptySale(),catalog=await database.prepare('SELECT id,name,base_price FROM products').all<{id:string;name:string;base_price:number}>(),priceMap=new Map(catalog.results.map(p=>[p.id,p]));
  if(Array.isArray(source.items))for(const item of source.items.slice(0,60)){
   const p=priceMap.get(item.productId),quantity=Number(item.quantity);
   if(p&&Number.isInteger(quantity)&&quantity>=1&&quantity<=100)sale.products.push({productId:p.id,name:p.name,quantity,unitPrice:outletUnitPrices?.get(item.productId)??(source.payment==='cash'?Math.round(p.base_price*.9*100)/100:p.base_price)});
   else if(item.productId?.startsWith('OF-')&&Number.isInteger(quantity)&&quantity>=1&&quantity<=100){const o=await database.prepare('SELECT id,name,special_price FROM offers WHERE id=?').bind(item.productId.slice(3)).first<{id:string;name:string;special_price:number}>();if(o)sale.products.push({productId:item.productId,name:o.name,quantity,unitPrice:outletUnitPrices?.get(item.productId)??(source.payment==='cash'?Math.round(o.special_price*.9*100)/100:o.special_price)})}
  }
  const gift=priceMap.get(source.giftId);if(gift)sale.gifts.push({productId:gift.id,name:gift.name,quantity:1});
  const referralGift=priceMap.get(REFERRAL_GIFT_ID);if(referralOffer&&referralGift)sale.gifts.push({productId:referralGift.id,name:referralGift.name,quantity:1});
  const addon=priceMap.get(source.additionalId);if(addon)sale.promotions.push({productId:addon.id,name:addon.name,quantity:1,unitPrice:Math.round(addon.base_price*.5*100)/100});
  sale.payment=['cash','card','finance'].includes(source.payment)?source.payment:'';sale.months=[3,6,12,18,24].includes(Number(source.months))?Number(source.months):0;
  if(kind==='scheduled'){
   const token=cleanText(data.token,100),reserved=await database.prepare('SELECT hold_token,expires_at,appointment_id FROM appointment_slots WHERE key=?').bind(keyFor(date,slot)).first<{hold_token:string;expires_at:number;appointment_id:string|null}>();
   if(!token||reserved?.hold_token!==token||reserved.expires_at<=Date.now()||reserved.appointment_id)return Response.json({error:'La reserva de 60 minutos venció. Selecciona el horario otra vez.'},{status:409});
   expiresAt=reserved.expires_at;
   const result=await database.prepare('UPDATE appointment_slots SET appointment_id=?,expires_at=? WHERE key=? AND hold_token=? AND appointment_id IS NULL AND expires_at>?').bind(id,expiresAt,keyFor(date,slot),token,Date.now()).run();
   if(!result.meta.changes)return Response.json({error:'El horario ya no está disponible.'},{status:409});
  }
  const finalSale=prefillFinalCost(sale,source.estimatedTotal);
  try{const statements=[database.prepare('INSERT INTO appointments (id,kind,status,date,slot,expires_at,customer_name,phone,city,colonia,address,source_json,sale_json,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,kind,kind==='instant'?'confirmed':'pending',date,slot,expiresAt,name,phone,city,colonia,address,JSON.stringify(source).slice(0,20000),JSON.stringify(finalSale),'',now,now)];
   if(referralOffer)for(const friend of referralOffer.friends)statements.push(database.prepare('INSERT INTO appointment_referrals (id,appointment_id,name,phone,age,married,work,health,notes) VALUES (?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),id,friend.name,friend.phone,null,'','','','Autorización declarada por quien recomienda. Confirmar antes del contacto comercial.'));
   await database.batch(statements);
  }
  catch(e){if(kind==='scheduled')await database.prepare('DELETE FROM appointment_slots WHERE appointment_id=?').bind(id).run();throw e}
  return Response.json({id,status:kind==='instant'?'confirmed':'pending',expiresAt});
 }catch(e){return responseError(e)}
}
