import {cleanText} from '@/lib/appointments';

export const REFERRAL_GIFT_ID='RP-106';
export const REFERRAL_GIFT_NAME='Juego Deluxe 3 piezas';
export type SuggestedFriend={name:string;phone:string};

export function cleanReferralOffer(raw:unknown,customerPhone:string):{friends:SuggestedFriend[];confirmedAt:string}|null{
 if(!raw)return null;
 const offer=raw as {friends?:unknown;permissionConfirmed?:unknown};
 if(offer.permissionConfirmed!==true||!Array.isArray(offer.friends)||offer.friends.length!==4)throw new Error('Para elegir el regalo por recomendaciones, registra cuatro amistades que hayan autorizado compartir sus datos.');
 const friends=offer.friends.map(friend=>({name:cleanText(friend?.name,180),phone:cleanText(friend?.phone,30)}));
 const digits=(phone:string)=>phone.replace(/\D/g,'').replace(/^52(?=\d{10}$)/,'');
 const numbers=friends.map(friend=>digits(friend.phone));
 if(friends.some(friend=>friend.name.length<2)||numbers.some(number=>!/^\d{10}$/.test(number))||new Set(numbers).size!==4||numbers.includes(digits(customerPhone)))throw new Error('Revisa los cuatro nombres y teléfonos: cada amistad debe ser distinta y tener un número de 10 dígitos.');
 return {friends,confirmedAt:new Date().toISOString()};
}
