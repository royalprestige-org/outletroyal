import {checkoutQuote,outletActive,partitionCart,roundMoney} from '@/lib/outlet';
import {db,seedIfEmpty} from '@/lib/catalog-db';
import {additionalEligible,cartBase,giftEligible,type Payment,type PriceItem} from '@/lib/pricing';

export type QuoteRequest={items:{productId:string;quantity:number}[];additionalId?:string;giftId?:string;payment:Payment;months:number;purchaseMode?:'normal'|'outlet';expectedOutlet?:boolean};
export async function calculatePublicQuote(input:QuoteRequest){
 if(!Array.isArray(input.items)||!input.items.length||input.items.length>60||!['cash','card','finance'].includes(input.payment))throw new Error('Revisa tu selección y forma de pago.');
 if(input.purchaseMode!==undefined&&!['normal','outlet'].includes(input.purchaseMode))throw new Error('Revisa la modalidad de compra.');
 await seedIfEmpty();const database=db();
 const [products,offers]=await Promise.all([database.prepare('SELECT id,name,base_price,is_kitchen_set FROM products').all<{id:string;name:string;base_price:number;is_kitchen_set:number}>(),database.prepare('SELECT id,name,special_price FROM offers WHERE active=true').all<{id:string;name:string;special_price:number}>()]);
 const productById=new Map(products.results.map(p=>[p.id,p])),offerById=new Map(offers.results.map(o=>[`OF-${o.id}`,o]));
 const ids=new Set<string>(),lines:PriceItem[]=[],selected:{productId:string;name:string;quantity:number;basePrice:number}[]=[];
 for(const item of input.items){const id=String(item.productId),quantity=Number(item.quantity),p=productById.get(id),o=offerById.get(id);
  if(ids.has(id)||!Number.isInteger(quantity)||quantity<1||quantity>100||!p&&!o)throw new Error('Un producto de la selección ya no está disponible.');
  ids.add(id);const basePrice=p?.base_price??o!.special_price;lines.push({id,basePrice,quantity});selected.push({productId:id,name:p?.name??o!.name,quantity,basePrice});
 }
 const {normal,outlet}=partitionCart(lines,outletActive()&&input.purchaseMode!=='normal'),hasOutlet=outlet.length>0;
 if(typeof input.expectedOutlet==='boolean'&&input.expectedOutlet!==hasOutlet)throw new Error('La promoción cambió. Actualiza el catálogo y revisa la forma de pago.');
 if(hasOutlet ? input.payment==='finance'||input.months!==0 : input.payment==='card'&&![3,6,12].includes(input.months)||input.payment==='finance'&&![12,18,24].includes(input.months))throw new Error('Revisa la forma de pago: Outlet acepta contado o tarjeta en un solo pago.');
 const original=cartBase(normal),giftOptions=products.results.filter(p=>giftEligible(p.base_price,original)),addOptions=hasOutlet?[]:products.results.filter(p=>additionalEligible({id:p.id,basePrice:p.base_price,isKitchenSet:!!p.is_kitchen_set},lines));
 if(input.giftId&&!giftOptions.some(p=>p.id===input.giftId)||input.additionalId&&!addOptions.some(p=>p.id===input.additionalId))throw new Error('Actualiza el regalo o producto adicional para esta selección.');
 const addition=addOptions.find(p=>p.id===input.additionalId),result=checkoutQuote(normal,outlet,addition?.base_price??0,input.payment,input.months);
 const unitPrices=new Map([...outlet.map(p=>[p.id,p.basePrice] as const),...normal.map(p=>[p.id,input.payment==='cash'?roundMoney(p.basePrice*.9):p.basePrice] as const)]);
 return {hasOutlet,allowsReferrals:normal.length>0,unitPrices,result:{total:result.total,monthly:result.monthly,down:result.down},giftOptions:giftOptions.map(p=>p.id),addOptions:addOptions.map(p=>p.id),selected,gift:giftOptions.find(p=>p.id===input.giftId),addition};
}
