import {db,requireAdmin,responseError} from '@/lib/catalog-db';
import {validSlot} from '@/lib/appointments';
import {slots} from '@/data/colonias';
export async function GET(request:Request){
 try{const date=new URL(request.url).searchParams.get('date')||'';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return Response.json({error:'Fecha inválida'},{status:400});
  const rows=await db().prepare('SELECT slot,expires_at FROM appointment_slots WHERE date=? AND expires_at>?').bind(date,Date.now()).all<{slot:string;expires_at:number}>();
  return Response.json({slots:slots.map(slot=>({slot,available:validSlot(date,slot)&&!rows.results.some(r=>r.slot===slot)}))});
 }catch(e){return responseError(e)}
}
