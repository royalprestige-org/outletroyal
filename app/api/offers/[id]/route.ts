import {db,requireAdmin,responseError} from '@/lib/catalog-db';
import {save} from '../route';
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){return save(request,(await params).id)}
export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){
 if(!await requireAdmin())return Response.json({error:'Acceso no autorizado'},{status:401});
 try{const id=(await params).id;const database=db();await database.batch([database.prepare('DELETE FROM offer_items WHERE offer_id=?').bind(id),database.prepare('DELETE FROM offers WHERE id=?').bind(id)]);return Response.json({ok:true})}catch(e){return responseError(e)}
}
