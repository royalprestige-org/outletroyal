import { requireAdmin } from '@/lib/catalog-db';
import { getChatGPTUser } from '../chatgpt-auth';
import { redirect } from 'next/navigation';
import Admin from '../admin-client';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (await requireAdmin()) return <Admin />;
  const user = await getChatGPTUser();
  if (!user) redirect('/login?next=%2Fadmin');
  return <main style={{maxWidth:560,margin:'60px auto',padding:24}}>
    <h1>Acceso administrativo restringido</h1>
    <p>La cuenta {user.email} no tiene permisos de administración activos. Solicita que un administrador la habilite en Supabase.</p>
    <a href="/auth/signout?next=%2Flogin" style={{display:'inline-block',marginTop:12}}>Cerrar sesión y utilizar otra cuenta</a>
    <p><a href="/vitrina">Volver a la tienda</a></p>
  </main>;
}
