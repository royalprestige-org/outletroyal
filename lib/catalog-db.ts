import {env} from 'cloudflare:workers';
import seed from '@/data/catalog.json';
import {getChatGPTUser} from '@/app/chatgpt-auth';
const warrantyById=new Map(seed.map(product=>[product.id,product.warranty]));

export function db(){if(!env.DB)throw new Error('Catálogo no disponible');return env.DB;}
const ADMIN_USER_ID='9d0bce37-6a0d-45f2-8b77-f41f50166bfc';
// Sites supplies authenticated identity; its site-local ID can differ from the account ID.
const ADMIN_EMAIL_HASH='e475303fc4c24d42dbfcc44dfbd8ede3c30728430cf121ede6dfd7d5084e92d1';
export async function requireAdmin(){
 const user=await getChatGPTUser();
 if(!user)return null;
 if(user.userId===ADMIN_USER_ID)return user;
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(user.email.trim().toLowerCase()));
 const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
 return hash===ADMIN_EMAIL_HASH?user:null;
}
export async function seedIfEmpty(){
 const database=db();
 const row=await database.prepare('SELECT COUNT(*) AS n FROM products').first<{n:number}>();
 if(row?.n)return;
 const now=new Date().toISOString();
 const inserts=seed.map(p=>database.prepare('INSERT OR IGNORE INTO products (id,name,family,category,description,base_price,kind,is_kitchen_set,completed,updated_at) VALUES (?,?,?,?,?,?,?,?,0,?)').bind(p.id,p.name,p.family,p.category,p.description,p.basePrice,p.kind,p.isKitchenSet?1:0,now));
 for(let i=0;i<inserts.length;i+=40)await database.batch(inserts.slice(i,i+40));
 const rel=seed.flatMap(p=>p.components.map((c,i)=>database.prepare('INSERT OR IGNORE INTO product_components (id,product_id,component_product_id,label,quantity,position) VALUES (?,?,?,?,?,?)').bind(`seed:${p.id}:${i}`,p.id,null,c.label,c.quantity,i)));
 for(let i=0;i<rel.length;i+=40)await database.batch(rel.slice(i,i+40));
 await database.prepare('INSERT OR IGNORE INTO product_photos (id,product_id,object_key,position) VALUES (?,?,?,?)').bind('seed:chef-assist','RP-140','static:chef-assist',0).run();
}
export async function allProducts(){
 const database=db();await seedIfEmpty();
 const [ps,cs,ph]=await Promise.all([
  database.prepare('SELECT * FROM products ORDER BY id').all(),
  database.prepare('SELECT * FROM product_components ORDER BY product_id,position').all(),
  database.prepare('SELECT * FROM product_photos ORDER BY product_id,position').all(),
 ]);
 const components=new Map<string,unknown[]>();const photos=new Map<string,unknown[]>();
 for(const c of cs.results){const id=String(c.product_id);components.set(id,[...(components.get(id)||[]),{id:c.id,componentProductId:c.component_product_id,label:c.label,quantity:c.quantity}]);}
 for(const p of ph.results){const id=String(p.product_id);photos.set(id,[...(photos.get(id)||[]),{id:p.id,url:p.object_key==='static:chef-assist'?'/chef-assist.webp':`/api/photos/${p.id}`}]);}
 return ps.results.map(p=>({id:p.id,name:p.name,family:p.family,category:p.category,description:p.description,basePrice:p.base_price,kind:p.kind,isKitchenSet:!!p.is_kitchen_set,completed:!!p.completed,updatedAt:p.updated_at,components:components.get(String(p.id))||[],photos:photos.get(String(p.id))||[],warranty:warrantyById.get(String(p.id))||null}));
}
export function responseError(e:unknown){console.error(e);return Response.json({error:'No se pudo completar la operación. Intenta de nuevo.'},{status:500});}
