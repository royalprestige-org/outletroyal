import {db,requireAdmin,responseError} from '@/lib/catalog-db';
import {cleanSale,cleanText,FAR_FUTURE,HOLD_MS,keyFor,validSlot} from '@/lib/appointments';
import {claimSlot} from '@/lib/appointment-slots';
import {parseJSON,type Source} from '@/lib/appointments';
import {REFERRAL_GIFT_ID} from '@/lib/referrals';
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!await requireAdmin())return Response.json({error:'Acceso no autorizado'},{status:401});
 try{const {id}=await params,data=await request.json() as Record<string,any>,database=db(),old=await database.prepare('SELECT * FROM appointments WHERE id=?').bind(id).first<Record<string,any>>();
  if(!old)return Response.json({error:'Cita no encontrada'},{status:404});
  const action=cleanText(data.action,30),oldStatus=old.status==='pending'&&old.expires_at<=Date.now()?'expired':old.status;
  if(!['save','confirm','cancel','complete','reschedule'].includes(action))return Response.json({error:'Acción inválida'},{status:400});
  if(action==='confirm'&&oldStatus!=='pending'||action==='complete'&&oldStatus!=='confirmed'||action==='reschedule'&&oldStatus==='completed'||action==='cancel'&&!['pending','confirmed','expired'].includes(oldStatus))return Response.json({error:'La cita cambió de estado. Actualiza la agenda.'},{status:409});
  if(action==='confirm'&&old.kind==='scheduled'){
   const reservation=await database.prepare('UPDATE appointment_slots SET expires_at=? WHERE key=? AND appointment_id=? AND expires_at>?').bind(FAR_FUTURE,keyFor(old.date,old.slot),id,Date.now()).run();
   if(!reservation.meta.changes)return Response.json({error:'El apartado ya venció. Reprograma la cita.'},{status:409});
  }
  let date=old.date as string,slot=old.slot as string,newToken='';
  if(action==='reschedule'){
   date=cleanText(data.date,10);slot=cleanText(data.slot,20);
   if(!validSlot(date,slot))return Response.json({error:'El nuevo horario no está disponible.'},{status:400});
   if(old.kind==='scheduled'&&date===old.date&&slot===old.slot&&oldStatus==='confirmed')return Response.json({error:'Elige un horario diferente.'},{status:400});
   newToken=crypto.randomUUID();if(!await claimSlot(date,slot,newToken,Date.now()+HOLD_MS))return Response.json({error:'Ese horario acaba de ser ocupado.'},{status:409});
   const assigned=await database.prepare('UPDATE appointment_slots SET appointment_id=?,expires_at=? WHERE key=? AND hold_token=? AND appointment_id IS NULL').bind(id,FAR_FUTURE,keyFor(date,slot),newToken).run();
   if(!assigned.meta.changes)return Response.json({error:'No se pudo apartar el nuevo horario.'},{status:409});
  }
  const status=action==='cancel'?'cancelled':action==='confirm'||action==='reschedule'?'confirmed':action==='complete'?'completed':old.status;
  const name=cleanText(data.customerName??old.customer_name,180),phone=cleanText(data.phone??old.phone,30),city=cleanText(data.city??old.city,80),colonia=cleanText(data.colonia??old.colonia,120),address=cleanText(data.address??old.address,300),notes=cleanText(data.notes??old.notes,3000);
  if(!name||!phone)return Response.json({error:'Nombre y teléfono son obligatorios.'},{status:400});
  const sale=status==='completed'||action==='save'?cleanSale(data.sale):null;
  if(sale?.outcome==='no_sale'){sale.products=[];sale.gifts=[];sale.promotions=[]}
  const source=parseJSON<Source>(old.source_json,{items:[],giftId:'',additionalId:'',payment:'',months:0,estimatedTotal:0});
  if(sale&&source.referralOffer&&sale.referrals.filter(ref=>ref.name&&ref.phone).length<4){const rewardIndex=sale.gifts.findIndex(gift=>gift.productId===REFERRAL_GIFT_ID);if(rewardIndex!==-1&&(source.giftId!==REFERRAL_GIFT_ID||sale.gifts.filter(gift=>gift.productId===REFERRAL_GIFT_ID).length>1))sale.gifts.splice(rewardIndex,1)}
  const updatedSource=sale&&source.referralOffer?{...source,referralOffer:{...source.referralOffer,friends:sale.referrals.map(ref=>({name:ref.name,phone:ref.phone}))}}:null;
  const statements=[database.prepare('UPDATE appointments SET kind=?,status=?,date=?,slot=?,expires_at=?,customer_name=?,phone=?,city=?,colonia=?,address=?,source_json=COALESCE(?,source_json),sale_json=COALESCE(?,sale_json),notes=?,updated_at=? WHERE id=?').bind(action==='reschedule'?'scheduled':old.kind,status,date,slot,status==='pending'?old.expires_at:null,name,phone,city,colonia,address,updatedSource?JSON.stringify(updatedSource):null,sale?JSON.stringify({...sale,referrals:[]}):null,notes,new Date().toISOString(),id)];
  if(sale){statements.push(database.prepare('DELETE FROM appointment_referrals WHERE appointment_id=?').bind(id));for(const ref of sale.referrals)statements.push(database.prepare('INSERT INTO appointment_referrals (id,appointment_id,name,phone,age,married,work,health,notes) VALUES (?,?,?,?,?,?,?,?,?)').bind(ref.id||crypto.randomUUID(),id,ref.name,ref.phone,ref.age,ref.married,ref.work,ref.health,ref.notes))}
  try{await database.batch(statements)}catch(e){if(newToken)await database.prepare('DELETE FROM appointment_slots WHERE key=? AND hold_token=?').bind(keyFor(date,slot),newToken).run();throw e}
  if(action==='cancel'||action==='reschedule')await database.prepare('DELETE FROM appointment_slots WHERE appointment_id=? AND key!=?').bind(id,action==='reschedule'?keyFor(date,slot):'').run();
  return Response.json({ok:true,status});
 }catch(e){return responseError(e)}
}
