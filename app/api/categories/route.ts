import {db,requireAdmin,responseError} from '@/lib/catalog-db';
import {hasRestrictedBrand} from '@/lib/brand-policy';

type CategoryRow={id:string;name:string};
type SubcategoryRow={id:string;category_id:string;name:string};
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validName(value:unknown){return typeof value==='string'?value.trim():'';}
function validId(value:unknown){return typeof value==='string'&&uuidPattern.test(value);}
function conflict(error:unknown){
 const code=(error as {code?:string})?.code;
 if(code==='23505')return Response.json({error:'Este nombre ya existe dentro del catálogo correspondiente.'},{status:409});
 if(code==='23503')return Response.json({error:'No se puede eliminar: hay registros que utilizan esta categoría o subcategoría.'},{status:409});
 return responseError(error);
}
async function list(){
 const [parents,children]=await Promise.all([
  db().prepare('SELECT id,name FROM public.catalog_categories ORDER BY name').all<CategoryRow>(),
  db().prepare('SELECT id,category_id,name FROM public.catalog_subcategories ORDER BY name').all<SubcategoryRow>()
 ]);
 return parents.results.map(parent=>({
  id:parent.id,name:parent.name,
  subcategories:children.results.filter(child=>child.category_id===parent.id).map(child=>({id:child.id,name:child.name}))
 }));
}
export async function GET(){
 if(!await requireAdmin())return Response.json({error:'Acceso no autorizado'},{status:401});
 try{return Response.json({categories:await list()},{headers:{'Cache-Control':'no-store'}})}
 catch(e){return responseError(e)}
}
export async function POST(request:Request){
 if(!await requireAdmin())return Response.json({error:'Acceso no autorizado'},{status:401});
 try{
  const input=await request.json() as Record<string,unknown>;
  const name=validName(input.name);
  if(!name||name.length>90)return Response.json({error:'El nombre debe tener de 1 a 90 caracteres.'},{status:400});
  if(hasRestrictedBrand(name))return Response.json({error:'Las categorías deben tener nombres neutrales sin marcas.'},{status:400});
  if(input.kind==='category'){
   const row=await db().prepare('INSERT INTO public.catalog_categories(name) VALUES (?) RETURNING id,name').bind(name).first<CategoryRow>();
   return Response.json({item:row},{status:201});
  }
  if(input.kind==='subcategory'){
   if(!validId(input.categoryId))return Response.json({error:'Selecciona una categoría válida.'},{status:400});
   const parent=await db().prepare('SELECT id FROM public.catalog_categories WHERE id=?').bind(input.categoryId).first<{id:string}>();
   if(!parent)return Response.json({error:'La categoría ya no existe.'},{status:404});
   const row=await db().prepare('INSERT INTO public.catalog_subcategories(category_id,name) VALUES (?,?) RETURNING id,category_id,name').bind(input.categoryId,name).first<SubcategoryRow>();
   return Response.json({item:row},{status:201});
  }
  return Response.json({error:'Tipo de registro inválido.'},{status:400});
 }catch(e){return conflict(e)}
}
export async function PATCH(request:Request){
 if(!await requireAdmin())return Response.json({error:'Acceso no autorizado'},{status:401});
 try{
  const input=await request.json() as Record<string,unknown>,name=validName(input.name);
  if(!validId(input.id)||!name||name.length>90)return Response.json({error:'Revisa el nombre y el registro seleccionado.'},{status:400});
  if(hasRestrictedBrand(name))return Response.json({error:'Las categorías deben tener nombres neutrales sin marcas.'},{status:400});
  const table=input.kind==='category'?'catalog_categories':input.kind==='subcategory'?'catalog_subcategories':null;
  if(!table)return Response.json({error:'Tipo inválido.'},{status:400});
  const row=await db().prepare(`UPDATE public.${table} SET name=? WHERE id=? RETURNING id,name`).bind(name,input.id).first<CategoryRow>();
  return row?Response.json({item:row}):Response.json({error:'Registro no encontrado.'},{status:404});
 }catch(e){return conflict(e)}
}
export async function DELETE(request:Request){
 if(!await requireAdmin())return Response.json({error:'Acceso no autorizado'},{status:401});
 try{
  const input=await request.json() as Record<string,unknown>;
  if(!validId(input.id))return Response.json({error:'ID inválido.'},{status:400});
  const isCategory=input.kind==='category';
  if(!isCategory&&input.kind!=='subcategory')return Response.json({error:'Tipo inválido.'},{status:400});
  if(isCategory){
   const children=await db().prepare('SELECT COUNT(*)::int AS n FROM public.catalog_subcategories WHERE category_id=?').bind(input.id).first<{n:number}>();
   if(children?.n)return Response.json({error:'Elimina primero las subcategorías de esta categoría.'},{status:409});
   const inUse=await db().prepare('SELECT COUNT(*)::int AS n FROM public.products WHERE category_id=?').bind(input.id).first<{n:number}>();
   if(inUse?.n)return Response.json({error:'Hay artículos usando esta categoría. Reasígnalos antes de eliminarla.'},{status:409});
  }else{
   const inUse=await db().prepare('SELECT COUNT(*)::int AS n FROM public.products WHERE subcategory_id=?').bind(input.id).first<{n:number}>();
   if(inUse?.n)return Response.json({error:'Hay artículos usando esta subcategoría. Reasígnalos antes de eliminarla.'},{status:409});
  }
  const table=isCategory?'catalog_categories':'catalog_subcategories';
  const removed=await db().prepare(`DELETE FROM public.${table} WHERE id=?`).bind(input.id).run();
  return removed.meta.changes?Response.json({ok:true}):Response.json({error:'Registro no encontrado.'},{status:404});
 }catch(e){return conflict(e)}
}
