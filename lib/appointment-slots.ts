import {db} from '@/lib/catalog-db';
import {keyFor} from '@/lib/appointments';
export async function claimSlot(date:string,slot:string,token:string,expiresAt:number){
 const database=db(),key=keyFor(date,slot),now=Date.now();
 // Citas históricas de 20:00 a 22:00 no pueden solaparse con asistencia a las 20:30.
 if(slot==='20:00–22:00'){
  const overlap=await database.prepare("SELECT EXISTS(SELECT 1 FROM public.service_requests WHERE requested_date=?::date AND status IN ('scheduled','confirmed','rescheduled')) AS occupied")
   .bind(date).first<{occupied:boolean}>();
  if(overlap?.occupied)return false;
 }
 await database.prepare(`INSERT INTO appointment_slots (key,date,slot,hold_token,appointment_id,expires_at) VALUES (?,?,?,?,NULL,?)
 ON CONFLICT(key) DO UPDATE SET hold_token=excluded.hold_token,appointment_id=NULL,expires_at=excluded.expires_at
 WHERE appointment_slots.expires_at<=? OR (appointment_slots.hold_token=? AND appointment_slots.appointment_id IS NULL)`).bind(key,date,slot,token,expiresAt,now,token).run();
 const row=await database.prepare('SELECT hold_token,appointment_id,expires_at FROM appointment_slots WHERE key=?').bind(key).first<{hold_token:string;appointment_id:string|null;expires_at:number}>();
 return row?.hold_token===token&&!row.appointment_id&&row.expires_at===expiresAt;
}
export async function releaseSlot(date:string,slot:string,token:string){await db().prepare('DELETE FROM appointment_slots WHERE key=? AND hold_token=? AND appointment_id IS NULL').bind(keyFor(date,slot),token).run()}
