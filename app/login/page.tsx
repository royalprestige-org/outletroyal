import { signIn } from './actions';
export const dynamic='force-dynamic';
export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string;next?:string}>}) {
  const params=await searchParams;
  const next=params.next?.startsWith('/')&&!params.next?.startsWith('//')?params.next:'/admin';
  return <main style={{maxWidth:420,margin:'72px auto',padding:24}}>
    <a href="/vitrina">← Volver a la tienda</a>
    <h1 style={{marginTop:24,fontSize:28,fontWeight:700}}>Acceso administrativo</h1>
    <p>Ingresa con tu cuenta autorizada de Outlet Royal.</p>
    {params.error&&<p role="alert" style={{color:'#ae2020'}}>Verifica tus credenciales.</p>}
    <form action={signIn} style={{display:'grid',gap:14,marginTop:24}}>
      <input type="hidden" name="next" value={next}/>
      <label>Correo electrónico<input type="email" name="email" required autoComplete="username" style={{display:'block',width:'100%',padding:12,border:'1px solid #aaa',borderRadius:8}}/></label>
      <label>Contraseña<input type="password" name="password" required autoComplete="current-password" style={{display:'block',width:'100%',padding:12,border:'1px solid #aaa',borderRadius:8}}/></label>
      <button type="submit" style={{padding:13,borderRadius:8,background:'#20252b',color:'#fff'}}>Entrar al panel</button>
    </form>
  </main>;
}
