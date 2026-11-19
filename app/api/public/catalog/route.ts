import {outletActive,outletRate,outletPrice,OUTLET_END,OUTLET_START} from '@/lib/outlet';
import {allProducts,db,responseError} from '@/lib/catalog-db';
export async function GET(){try{
 const active=outletActive();
 const products=(await allProducts()).map(({basePrice,completed,updatedAt,kind,...publicProduct})=>{const rate=outletRate(String(publicProduct.id),active);return {...publicProduct,...(rate?{outlet:{list:basePrice,price:outletPrice(Number(basePrice),rate),rate}}:{})}});
 const database=db(),rows=await database.prepare('SELECT id,name,description FROM offers WHERE active=true ORDER BY updated_at DESC').all<{id:string;name:string;description:string}>();
 const details=await database.prepare('SELECT offer_id,product_id,quantity FROM offer_items').all<{offer_id:string;product_id:string;quantity:number}>();
 return Response.json({campaign:{active,startsAt:OUTLET_START,endsAt:OUTLET_END},products,offers:rows.results.map(o=>({...o,items:details.results.filter(i=>i.offer_id===o.id).map(i=>({productId:i.product_id,quantity:i.quantity}))}))},{headers:{'Cache-Control':'no-store'}});
}catch(e){return responseError(e)}}
