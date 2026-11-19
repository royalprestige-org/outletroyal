export type PriceItem={id:string;basePrice:number;quantity:number};
export type Payment='cash'|'card'|'finance';
export const factors:Record<number,number>={12:.103,18:.075,24:.062};
export function cartBase(items:PriceItem[]){return items.reduce((sum,item)=>sum+item.basePrice*item.quantity,0)}
export function maxOriginalPrice(items:PriceItem[]){return Math.max(0,...items.map(item=>item.basePrice))}
export function giftEligible(productPrice:number,originalBase:number){return originalBase>0&&productPrice>=originalBase*.10&&productPrice<=originalBase*.20}
export function additionalEligible(product:{id:string;basePrice:number;isKitchenSet:boolean},items:PriceItem[]){return items.length>0&&!product.isKitchenSet&&!items.some(item=>item.id===product.id)&&product.basePrice<=maxOriginalPrice(items)}
export function quote(items:PriceItem[],additionalPrice:number,payment:Payment,months:number){
 const original=cartBase(items),special=additionalPrice/2,subtotal=original+special;
 if(payment==='cash')return {original,subtotal,down:0,monthly:0,total:Math.round((original*.9+special)*100)/100,discount:Math.round(original*.1*100)/100};
 if(payment==='card')return {original,subtotal,down:0,monthly:Math.round(subtotal/months*100)/100,total:subtotal,discount:0};
 const factor=factors[months]||factors[12],down=subtotal*.2,monthly=Math.round((subtotal-down)*factor*100)/100;
 return {original,subtotal,down:Math.round(down*100)/100,monthly,total:Math.round((down+monthly*months)*100)/100,discount:0};
}
