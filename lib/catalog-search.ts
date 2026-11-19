type SearchProduct={id:string;name:string;family:string;category:string;description:string;components:{label:string;quantity:number}[]};
export function normalizeSearch(text:string){return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9]+/g,' ').trim()}
export function displayFamily(product:Pick<SearchProduct,'name'|'family'>){
 if(product.family!=='Ollas y sartenes')return product.family;
 const name=normalizeSearch(product.name);
 if(/\b(sarten|paellera)/.test(name))return 'Sartenes';
 if(/\b(olla|cacerola|multipan|pavera)/.test(name))return 'Ollas';
 return 'Planchas y parrillas';
}
function stem(word:string){return word.length>4&&word.endsWith('es')?word.slice(0,-2):word.length>3&&word.endsWith('s')?word.slice(0,-1):word}
export function matchesProduct(product:SearchProduct,query:string){
 const terms=normalizeSearch(query).split(' ').filter(Boolean);
 if(!terms.length)return true;
 const text=normalizeSearch([product.id,product.name,displayFamily(product),product.family,product.category,product.description,...product.components.map(part=>part.label+' '+part.quantity)].join(' '));
 const words=text.split(' ');
 return terms.every(term=>text.includes(term)||words.some(word=>stem(word).startsWith(stem(term))));
}
