import {slots,slotAvailable} from '@/data/colonias';

export type AppointmentStatus='pending'|'confirmed'|'cancelled'|'completed'|'expired';
export type SaleLine={productId:string;name:string;quantity:number;unitPrice:number};
export type GiftLine={productId:string;name:string;quantity:number};
export type PromotionLine=SaleLine;
export type Referral={id?:string;name:string;phone:string;age:number|null;married:string;work:string;health:string;notes:string};
export type Source={items:{productId:string;name:string;quantity:number;basePrice:number}[];giftId:string;additionalId:string;payment:string;months:number;estimatedTotal:number;purchaseMode?:'normal'|'outlet';referralOffer?:{friends:{name:string;phone:string}[];confirmedAt:string}};
export type Sale={outcome:''|'sale'|'no_sale';products:SaleLine[];gifts:GiftLine[];promotions:PromotionLine[];payment:string;months:number;notes:string;referrals:Referral[]};
export const FAR_FUTURE=4102444800000;
export const HOLD_MS=60*60*1000;
export const emptySale=():Sale=>({outcome:'',products:[],gifts:[],promotions:[],payment:'',months:0,notes:'',referrals:[]});
export const keyFor=(date:string,slot:string)=>`${date}|${slot}`;
export function localToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mazatlan',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
export function localTime(){return new Intl.DateTimeFormat('en-GB',{timeZone:'America/Mazatlan',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date())}
export function validSlot(date:string,slot:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!slots.includes(slot)||!slotAvailable(date,slot)||date<localToday())return false;
 if(date===localToday()&&slot.slice(0,5)<=localTime())return false;
 return true;
}
export function parseJSON<T>(text:string|undefined|null,fallback:T):T{try{return text?JSON.parse(text) as T:fallback}catch{return fallback}}
export function cleanText(value:unknown,max=300){return String(value??'').trim().slice(0,max)}
export function cleanSale(raw:unknown):Sale{
 const s=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
 const products=(Array.isArray(s.products)?s.products:[]).slice(0,60).map(cleanLine).filter(Boolean) as SaleLine[];
 const promotions=(Array.isArray(s.promotions)?s.promotions:[]).slice(0,40).map(cleanLine).filter(Boolean) as SaleLine[];
 const gifts=(Array.isArray(s.gifts)?s.gifts:[]).slice(0,40).map(x=>({productId:cleanText(x?.productId,100),name:cleanText(x?.name,180),quantity:Number(x?.quantity)})).filter(x=>x.productId&&Number.isInteger(x.quantity)&&x.quantity>=1&&x.quantity<=100);
 const referrals=(Array.isArray(s.referrals)?s.referrals:[]).slice(0,60).map(x=>({id:cleanText(x?.id,100),name:cleanText(x?.name,180),phone:cleanText(x?.phone,30),age:x?.age===''||x?.age==null?null:Number(x.age),married:cleanText(x?.married,30),work:cleanText(x?.work,200),health:cleanText(x?.health,300),notes:cleanText(x?.notes,1000)})).filter(x=>x.name).map(x=>({...x,age:x.age!==null&&Number.isInteger(x.age)&&x.age>=0&&x.age<=120?x.age:null}));
 return {outcome:s.outcome==='sale'||s.outcome==='no_sale'?s.outcome:'',products,gifts,promotions,payment:cleanText(s.payment,80),months:Number(s.months)||0,notes:cleanText(s.notes,3000),referrals};
}
function cleanLine(x:any):SaleLine|null{const productId=cleanText(x?.productId,100),name=cleanText(x?.name,180),quantity=Number(x?.quantity),unitPrice=Number(x?.unitPrice);return productId&&Number.isInteger(quantity)&&quantity>=1&&quantity<=100&&Number.isFinite(unitPrice)&&unitPrice>=0&&unitPrice<=100000000?{productId,name,quantity,unitPrice:Math.round(unitPrice*100)/100}:null}
// Reparte el costo final cotizado entre productos y promoción sin sumar el adicional dos veces.
// Los pesos ya reflejan el descuento de contado en productos y el 50% del adicional.
export function prefillFinalCost(sale:Sale,estimatedTotal:number):Sale{
 const totalCents=Math.round(Number(estimatedTotal)*100),lines=[...sale.products,...sale.promotions];
 if(!Number.isSafeInteger(totalCents)||totalCents<=0||!lines.length)return sale;
 const weights=lines.map(line=>line.unitPrice*line.quantity),weightTotal=weights.reduce((a,b)=>a+b,0);
 if(weightTotal<=0)return sale;
 let remaining=totalCents;
 const allocated=lines.map((line,index)=>{
  const cents=index===lines.length-1?remaining:Math.round(totalCents*weights[index]/weightTotal);
  remaining-=cents;
  return {...line,unitPrice:Math.round(cents/line.quantity)/100};
 });
 return {...sale,products:allocated.slice(0,sale.products.length),promotions:allocated.slice(sale.products.length)};
}
export function totals(s:Sale){const productTotal=s.products.reduce((a,p)=>a+p.quantity*p.unitPrice,0),promotionTotal=s.promotions.reduce((a,p)=>a+p.quantity*p.unitPrice,0);return {productTotal:Math.round(productTotal*100)/100,promotionTotal:Math.round(promotionTotal*100)/100,generalTotal:Math.round((productTotal+promotionTotal)*100)/100}}
