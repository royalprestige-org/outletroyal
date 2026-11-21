/** Keep public-facing catalog labels independent of manufacturer trademarks. */
export function hasRestrictedBrand(value:unknown):boolean {
 return typeof value==='string' && /royal|prestige|hy[\s-]*cite/i.test(value);
}
