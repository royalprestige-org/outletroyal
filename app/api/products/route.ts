import {allProducts,requireAdmin,responseError} from '@/lib/catalog-db';
export async function GET(){if(!await requireAdmin())return Response.json({error:'Inicia sesión para administrar el catálogo.'},{status:401});try{return Response.json({products:await allProducts()});}catch(e){return responseError(e)}}
