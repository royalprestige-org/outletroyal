import {cartBase, quote, type Payment, type PriceItem} from './pricing';

export const OUTLET_START = Date.parse('2026-11-17T00:00:00-07:00');
export const OUTLET_END = Date.parse('2026-12-02T00:00:00-07:00');
export const OUTLET_NOTICE = 'Los precios Outlet no son acumulables con regalos ni otras promociones';

// Clasificación por SKU: la familia de bebidas también contiene utensilios de estufa y repuestos.
const electricAppliances = new Set([52,56,57,66,67,69,73,74,75,140]);
const electronicAccessories = new Set([78,96]);
export function outletActive(now = Date.now()) { return now >= OUTLET_START && now < OUTLET_END; }
export function outletRate(id: string, active: boolean) {
 const match = /^RP-(\d{3})$/.exec(id);
 const sku = match ? Number(match[1]) : 0;
 if (!active || sku < 1 || sku > 140 || electronicAccessories.has(sku)) return 0;
 return electricAppliances.has(sku) ? 30 : 40;
}
export const roundMoney = (value: number) => Math.round(value * 100) / 100;
export const outletPrice = (list: number, rate: number) => roundMoney(list * (100 - rate) / 100);
export function partitionCart(lines: PriceItem[], active: boolean) {
 const normal = lines.filter(line => !outletRate(line.id, active));
 const outlet = lines.filter(line => outletRate(line.id, active)).map(line => ({...line,basePrice:outletPrice(line.basePrice,outletRate(line.id,active))}));
 return {normal,outlet};
}
export function checkoutQuote(normal: PriceItem[], outlet: PriceItem[], additional: number, payment: Payment, months: number) {
 if (!outlet.length) return quote(normal,additional,payment,months);
 const normalTotal = payment === 'cash' ? quote(normal,0,'cash',0).total : cartBase(normal);
 return {total:roundMoney(normalTotal+cartBase(outlet)),monthly:0,down:0};
}
