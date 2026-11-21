import 'server-only';
import { Pool } from 'pg';
import seed from '@/data/catalog.json';
import { getChatGPTUser } from '@/app/chatgpt-auth';

type Row = Record<string, unknown>;
const warrantyById = new Map(seed.map(product => [product.id, product.warranty]));
let pool: Pool | undefined;

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL no está configurada.');
  if (!pool) pool = new Pool({
    connectionString,
    max: 4,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    allowExitOnIdle: true,
  });
  return pool;
}

function normalizeRow<T>(row: Row | undefined): T | null {
  if (!row) return null;
  const normalized: Row = { ...row };
  for (const field of ['n', 'expires_at']) {
    const value = normalized[field];
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      const number = Number(value);
      if (Number.isSafeInteger(number)) normalized[field] = number;
    }
  }
  return normalized as T;
}

class PreparedQuery {
  constructor(readonly sql: string, readonly parameters: unknown[] = []) {}
  bind(...parameters: unknown[]) {
    return new PreparedQuery(this.sql, parameters);
  }
  compile() {
    let index = 0;
    const text = this.sql.replace(/\?/g, () => '$' + (++index));
    if (index !== this.parameters.length) {
      throw new Error('La cantidad de parámetros SQL no coincide.');
    }
    return { text, values: this.parameters };
  }
  async first<T>(): Promise<T | null> {
    const query = this.compile();
    const result = await getPool().query(query.text, query.values);
    return normalizeRow<T>(result.rows[0]);
  }
  async all<T = Row>(): Promise<{ results: T[] }> {
    const query = this.compile();
    const result = await getPool().query(query.text, query.values);
    return { results: result.rows.map((r: Row) => normalizeRow<T>(r)!) };
  }
  async run() {
    const query = this.compile();
    const result = await getPool().query(query.text, query.values);
    return { meta: { changes: result.rowCount ?? 0 } };
  }
}

class PostgresAdapter {
  prepare(sql: string) { return new PreparedQuery(sql); }
  async batch(statements: PreparedQuery[]) {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      for (const statement of statements) {
        const query = statement.compile();
        await client.query(query.text, query.values);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
const database = new PostgresAdapter();
export function db() { return database; }

export async function requireAdmin() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const admin = await db().prepare('SELECT role FROM public.admin_users WHERE user_id=? AND active=true')
    .bind(user.userId).first<{ role: string }>();
  return admin ? user : null;
}

export async function seedIfEmpty() {
  // Never overwrite administrators' product changes during a request.
  const row = await db().prepare('SELECT COUNT(*) AS n FROM public.products').first<{ n: number }>();
  if (!row?.n) throw new Error('El catálogo todavía no está importado en Supabase.');
}

export async function allProducts() {
  await seedIfEmpty();
  const [ps, cs, ph, rel] = await Promise.all([
    db().prepare('SELECT p.*,c.name AS category_name,sc.name AS subcategory_name FROM public.products p LEFT JOIN public.catalog_categories c ON c.id=p.category_id LEFT JOIN public.catalog_subcategories sc ON sc.id=p.subcategory_id ORDER BY p.id').all<Row>(),
    db().prepare('SELECT * FROM public.product_components ORDER BY product_id,position').all<Row>(),
    db().prepare('SELECT * FROM public.product_photos ORDER BY product_id,position').all<Row>(),
    db().prepare('SELECT product_id,related_product_id FROM public.product_relations ORDER BY product_id,position,related_product_id').all<Row>(), 
  ]);
  const components = new Map<string, unknown[]>();
  const photos = new Map<string, unknown[]>();
  const related = new Map<string,string[]>();
  for (const relation of rel.results) {
    const id = String(relation.product_id);
    related.set(id, [...(related.get(id) || []), String(relation.related_product_id)]);
  }
  for (const c of cs.results) {
    const id = String(c.product_id);
    components.set(id, [...(components.get(id) || []), {
      id: c.id, componentProductId: c.component_product_id,
      label: c.label, quantity: c.quantity,
    }]);
  }
  for (const p of ph.results) {
    const id = String(p.product_id);
    // Legacy static image source was not exported from Sites. Retain its row.
    if (p.object_key === 'static:chef-assist') continue;
    photos.set(id, [...(photos.get(id) || []), {
      id: p.id, url: '/api/photos/' + p.id,
    }]);
  }
  return ps.results.map(p => ({
    id: p.id, name: p.name, family: p.family,
    category: p.category_name || '', subcategory: p.subcategory_name || '', categoryId: p.category_id || null, subcategoryId: p.subcategory_id || null, description: p.description, basePrice: p.base_price,
    kind: p.kind, isKitchenSet: !!p.is_kitchen_set, isGiftEligible: !!p.is_gift_eligible, completed: !!p.completed,
    updatedAt: p.updated_at, components: components.get(String(p.id)) || [],
    relatedProductIds: related.get(String(p.id)) || [],
    photos: photos.get(String(p.id)) || [],
    warranty: p.warranty_json && Object.keys(p.warranty_json as Row).length
      ? p.warranty_json : warrantyById.get(String(p.id)) || null,
  }));
}

export function responseError(error: unknown) {
  console.error(error);
  return Response.json({ error: 'No se pudo completar la operación. Intenta de nuevo.' }, { status: 500 });
}
