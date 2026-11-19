import {requireAdmin} from '@/lib/catalog-db';
import {getChatGPTUser,chatGPTSignInPath,chatGPTSignOutPath} from '../chatgpt-auth';
import Admin from '../admin-client';
export const dynamic='force-dynamic';
export default async function AdminPage(){
 if(await requireAdmin())return <Admin/>;
 const user=await getChatGPTUser();
 return <main style={{maxWidth:560,margin:'60px auto',padding:24}}>
  <h1>Administración del catálogo</h1>
  <p>{user?'Esta cuenta no tiene acceso a la edición. Inicia sesión con la cuenta propietaria del catálogo.':'Inicia sesión con la cuenta propietaria para editar productos y fotografías.'}</p>
  <p>{user?<a href={chatGPTSignOutPath('/admin')} target="_top">Cerrar sesión para cambiar de cuenta</a>:<a href={chatGPTSignInPath('/admin')} target="_top">Iniciar sesión con ChatGPT</a>}</p>
  <a href="/vitrina">Volver a la vitrina</a>
 </main>;
}
