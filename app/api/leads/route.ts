import {db,requireAdmin,responseError} from '@/lib/catalog-db';

type Conditions={where:string;values:unknown[]};
function parseFilters(query:URLSearchParams):Conditions{
 const terms:string[]=[];
 const values:unknown[]=[];
 const phone=(query.get('phone')||'').replace(/\D/g,'').slice(0,10);
 const name=(query.get('name')||'').trim().slice(0,100);
 const from=query.get('from')||'',to=query.get('to')||'';
 const main=query.get('primary')||'',gift=query.get('gift')||'',additional=query.get('additional')||'';
 const contactId=query.get('contactId')||'';
 if(phone){terms.push("l.phone LIKE ?");values.push('%'+phone+'%')}
 if(name){terms.push("l.customer_name ILIKE ?");values.push('%'+name.replace(/[%_]/g,'\\$&')+'%')}
 if(/^\d{4}-\d{2}-\d{2}$/.test(from)){terms.push("(l.created_at AT TIME ZONE 'America/Mazatlan')::date >= ?::date");values.push(from)}
 if(/^\d{4}-\d{2}-\d{2}$/.test(to)){terms.push("(l.created_at AT TIME ZONE 'America/Mazatlan')::date <= ?::date");values.push(to)}
 if(main){terms.push("l.primary_product_id=?");values.push(main)}
 if(gift){terms.push("l.gift_product_id=?");values.push(gift)}
 if(additional){terms.push("l.additional_product_id=?");values.push(additional)}
 if(/^[0-9a-f-]{36}$/i.test(contactId)){terms.push("l.contact_id=?");values.push(contactId)}
 return {where:terms.length?' WHERE '+terms.join(' AND '):'',values};
}

export async function GET(request:Request){
 if(!await requireAdmin())return Response.json({error:'Acceso administrativo requerido.'},{status:401});
 try{
  const query=new URL(request.url).searchParams;
  const {where,values}=parseFilters(query);
  const page=Math.max(1,Math.min(100000,Number(query.get('page')||'1')||1));
  const pageSize=25;
  const source='FROM public.lead_consultations l JOIN public.lead_contacts c ON c.id=l.contact_id';
  const [counts,rows]=await Promise.all([
    db().prepare(`SELECT COUNT(*)::int AS total,COUNT(DISTINCT l.contact_id)::int AS contacts ${source}${where}`).bind(...values).first<{total:number;contacts:number}>(),
    db().prepare(`SELECT l.*,c.name AS current_contact_name,c.city AS current_contact_city,
      (SELECT COUNT(*)::int FROM public.lead_consultations history WHERE history.contact_id=l.contact_id) AS contact_consultations
      ${source}${where} ORDER BY l.created_at DESC,l.id DESC LIMIT ? OFFSET ?`)
     .bind(...values,pageSize,(page-1)*pageSize).all()
  ]);
  return Response.json({rows:rows.results,total:counts?.total||0,contacts:counts?.contacts||0,page,pageSize},
    {headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return responseError(error)}
}
