import {checkoutQuote,outletActive,partitionCart,roundMoney} from '@/lib/outlet';
import {db,seedIfEmpty} from '@/lib/catalog-db';
import {additionalEligible,cartBase,giftEligible,type Payment,type PriceItem} from '@/lib/pricing';

export type QuoteRequest={items:{productId:string;quantity:number}[];additionalId?:string;giftId?:string;payment:Payment;months:number;purchaseMode?:'normal'|'outlet';expectedOutlet?:boolean};
export async function calculatePublicQuote(input:QuoteRequest){
 if(!Array.isArray(input.items)||!input.items.length||input.items.length>60||!['cash','card','finance'].includes(input.payment))throw new Error('Revisa tu selección y forma de pago.');
 if(input.purchaseMode!==undefined&&!['normal','outlet'].includes(input.purchaseMode))throw new Error('Revisa la modalidad de compra.');
 await seedIfEmpty();const database=db();
 const [products,offers,relations,suggestions]=await Promise.all([
  database.prepare('SELECT id,name,base_price,is_kitchen_set,is_gift_eligible FROM public.products').all<{id:string;name:string;base_price:number;is_kitchen_set:boolean;is_gift_eligible:boolean}>(),
  database.prepare('SELECT id,name,special_price FROM public.offers WHERE active=true').all<{id:string;name:string;special_price:number}>(),
  database.prepare('SELECT product_id,related_product_id FROM public.product_relations ORDER BY product_id,position').all<{product_id:string;related_product_id:string}>(),
  database.prepare('SELECT product_id,gift_product_id FROM public.product_gift_suggestions ORDER BY product_id,position,gift_product_id').all<{product_id:string;gift_product_id:string}>()
 ]);
 const productById=new Map(products.results.map(p=>[p.id,p])),offerById=new Map(offers.results.map(o=>[`OF-${o.id}`,o]));
 const relationMap=new Map<string,string[]>();
 for(const relation of relations.results)relationMap.set(relation.product_id,[...(relationMap.get(relation.product_id)||[]),relation.related_product_id]);
 const giftSuggestions=new Map<string,string[]>();
 for(const suggestion of suggestions.results)
  giftSuggestions.set(suggestion.product_id,[...(giftSuggestions.get(suggestion.product_id)||[]),suggestion.gift_product_id]);

 // 'items' solo contiene los artículos elegidos manualmente. La cotización
 // amplía A->B,C,D una única vez; B->A no se infiere y no hay recursión.
 const direct=new Map<string,number>();
 for(const item of input.items){
  const id=String(item.productId||''),quantity=Number(item.quantity);
  if(direct.has(id)||!Number.isInteger(quantity)||quantity<1||quantity>100||
     !productById.has(id)&&!offerById.has(id))throw new Error('Un artículo de la selección ya no está disponible.');
  direct.set(id,quantity);
 }
 const combined=new Map(direct);
 for(const [parentId,quantity] of direct){
  for(const linkedId of relationMap.get(parentId)||[]){
   if(!productById.has(linkedId))throw new Error('Uno de los artículos relacionados ya no está disponible.');
   combined.set(linkedId,(combined.get(linkedId)||0)+quantity);
  }
 }
 if(combined.size>60||[...combined.values()].some(qty=>qty>100))throw new Error('La cantidad de artículos relacionados supera el límite de la selección.');

 const lines:PriceItem[]=[],selected:{productId:string;name:string;quantity:number;basePrice:number}[]=[];
 for(const [id,quantity] of combined){
  const p=productById.get(id),o=offerById.get(id);
  const basePrice=p?.base_price??o!.special_price;
  lines.push({id,basePrice,quantity});selected.push({productId:id,name:p?.name??o!.name,quantity,basePrice});
 }
 const {normal,outlet}=partitionCart(lines,outletActive()&&input.purchaseMode!=='normal'),hasOutlet=outlet.length>0;
 if(input.purchaseMode==='outlet'&&normal.length)throw new Error('Un artículo relacionado no participa en Outlet. Cambia a Compra regular o elige otro artículo.');
 if(typeof input.expectedOutlet==='boolean'&&input.expectedOutlet!==hasOutlet)throw new Error('La promoción cambió. Actualiza el catálogo y revisa la forma de pago.');
 if(hasOutlet ? input.payment==='finance'||input.months!==0 : input.payment==='card'&&![3,6,12].includes(input.months)||input.payment==='finance'&&![12,18,24].includes(input.months))throw new Error('Revisa la forma de pago: Outlet acepta contado o tarjeta en un solo pago.');
 // Solo los artículos elegidos directamente definen los regalos sugeridos.
 // Varias selecciones combinan sus sugerencias sin duplicados; ninguna
 // sugerencia implica que esté habilitada ni que cumpla el monto aplicable.
 const suggestedIds=[...new Set([...direct.keys()].flatMap(id=>giftSuggestions.get(id)||[]))];
 const original=cartBase(normal);
 const giftOptions=suggestedIds.map(id=>productById.get(id))
   .filter((p):p is NonNullable<typeof p>=>!!p&&p.is_gift_eligible===true&&giftEligible(p.base_price,original));
 const addOptions=hasOutlet?[]:products.results.filter(p=>additionalEligible({id:p.id,basePrice:p.base_price,isKitchenSet:!!p.is_kitchen_set},lines));
 if(input.giftId&&!giftOptions.some(p=>p.id===input.giftId)||input.additionalId&&!addOptions.some(p=>p.id===input.additionalId))throw new Error('Actualiza el regalo o producto adicional para esta selección.');
 const addition=addOptions.find(p=>p.id===input.additionalId),result=checkoutQuote(normal,outlet,addition?.base_price??0,input.payment,input.months);
 const unitPrices=new Map([...outlet.map(p=>[p.id,p.basePrice] as const),...normal.map(p=>[p.id,input.payment==='cash'?roundMoney(p.basePrice*.9):p.basePrice] as const)]);
 return {hasOutlet,allowsReferrals:normal.length>0,unitPrices,result:{total:result.total,monthly:result.monthly,down:result.down},giftOptions:giftOptions.map(p=>p.id),addOptions:addOptions.map(p=>p.id),selected,gift:giftOptions.find(p=>p.id===input.giftId),addition};
}
