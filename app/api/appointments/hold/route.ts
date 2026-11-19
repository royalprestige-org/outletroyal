import {db,responseError} from '@/lib/catalog-db';
import {cleanText,HOLD_MS,validSlot} from '@/lib/appointments';
import {claimSlot,releaseSlot} from '@/lib/appointment-slots';
export async function POST(request:Request){
 try{const data=await request.json() as Record<string,unknown>,date=cleanText(data.date,10),slot=cleanText(data.slot,20);
  if(!validSlot(date,slot))return Response.json({error:'Este horario ya no está disponible.'},{status:400});
  const ip=request.headers.get('CF-Connecting-IP');
  let prefix='';
  if(ip){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip));prefix=Array.from(new Uint8Array(digest)).slice(0,12).map(b=>b.toString(16).padStart(2,'0')).join('')+'.';
   const active=await db().prepare('SELECT COUNT(*) AS n FROM appointment_slots WHERE hold_token LIKE ? AND appointment_id IS NULL AND expires_at>?').bind(prefix+'%',Date.now()).first<{n:number}>();
   if((active?.n||0)>=3)return Response.json({error:'Ya tienes tres horarios apartados. Libera uno para continuar.'},{status:429});
  }
  const token=prefix+crypto.randomUUID(),expiresAt=Date.now()+HOLD_MS;
  if(!await claimSlot(date,slot,token,expiresAt))return Response.json({error:'Alguien acaba de apartar este horario. Elige otro.'},{status:409});
  return Response.json({token,expiresAt});
 }catch(e){return responseError(e)}
}
export async function DELETE(request:Request){
 try{const data=await request.json() as Record<string,unknown>,date=cleanText(data.date,10),slot=cleanText(data.slot,20),token=cleanText(data.token,100);
  if(token&&date&&slot)await releaseSlot(date,slot,token);
  return Response.json({ok:true});
 }catch(e){return responseError(e)}
}
