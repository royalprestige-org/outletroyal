// One-time, idempotent-on-empty import from the canonical Sites v13 catalog.
// Do not run automatically during a Vercel build or on a populated database.
import { readFile } from 'node:fs/promises';
import pg from 'pg';
const { Pool } = pg;
const source = JSON.parse(await readFile(new URL('../data/catalog.json', import.meta.url), 'utf8'));
if (source.length !== 140 || new Set(source.map(p => p.id)).size !== 140)
  throw new Error('Unexpected catalog snapshot, refusing seed.');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const count = await client.query('SELECT count(*)::integer AS n FROM public.products');
  if (count.rows[0].n !== 0) throw new Error('Seed only allowed on an empty product table.');
  for (const p of source) {
    await client.query(
      'INSERT INTO public.products(id,name,family,category,description,base_price,kind,is_kitchen_set,completed,updated_at,warranty_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,false,$9,$10::jsonb)',
      [p.id,p.name,p.family,p.category || '',p.description || '',p.basePrice,p.kind,!!p.isKitchenSet,new Date().toISOString(),JSON.stringify(p.warranty || {})]
    );
    for (const [i,c] of (p.components || []).entries()) {
      await client.query(
        'INSERT INTO public.product_components(id,product_id,component_product_id,label,quantity,position) VALUES($1,$2,null,$3,$4,$5)',
        ['seed:'+p.id+':'+i,p.id,c.label,c.quantity,i]
      );
    }
    for (const [i,path] of (p.photos || []).entries()) {
      await client.query(
        'INSERT INTO public.product_photos(id,product_id,object_key,position) VALUES($1,$2,$3,$4)',
        ['seed:'+p.id+':photo:'+i,p.id,path==='/chef-assist.webp'?'static:chef-assist':path,i]
      );
    }
  }
  await client.query('COMMIT');
  console.log('Imported 140 products with components, warranties and photo references.');
} catch (error) {
  await client.query('ROLLBACK');
  console.error(error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
