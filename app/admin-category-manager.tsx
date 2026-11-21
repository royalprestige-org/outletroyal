'use client';

import {useEffect,useState} from 'react';
import {FolderTree,Plus,Pencil,Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

export type CatalogCategory={
 id:string;
 name:string;
 subcategories:{id:string;name:string}[];
};
type Kind='category'|'subcategory';
type Props={categories:CatalogCategory[];onRefresh:()=>Promise<void>};

export default function AdminCategoryManager({categories,onRefresh}:Props){
 const [chosenId,setChosenId]=useState<string>('');
 const [newCategory,setNewCategory]=useState('');
 const [newSubcategories,setNewSubcategories]=useState('');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const chosen=categories.find(category=>category.id===chosenId)||categories[0]||null;

 useEffect(()=>{
  if(!categories.length){setChosenId('');return;}
  if(!categories.some(category=>category.id===chosenId))setChosenId(categories[0].id);
 },[categories,chosenId]);

 async function mutation(method:'POST'|'PATCH'|'DELETE',body:Record<string,unknown>){
  const response=await fetch('/api/categories',{
   method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
  });
  const result=await response.json().catch(()=>({})) as {error?:string;item?:{id:string}};
  if(!response.ok)throw new Error(result.error||'No se pudo guardar el catálogo.');
  return result;
 }
 async function addCategory(event:React.FormEvent){
  event.preventDefault();
  if(!newCategory.trim()||busy)return;
  setBusy(true);setMessage('');
  try{
   const result=await mutation('POST',{kind:'category',name:newCategory});
   setNewCategory('');
   await onRefresh();
   if(result.item?.id)setChosenId(result.item.id);
   setMessage('Categoría creada. Ahora puedes agregar subcategorías.');
  }catch(e){setMessage((e as Error).message)}
  finally{setBusy(false)}
 }
 async function addSubcategories(event:React.FormEvent){
  event.preventDefault();
  if(!chosen||busy)return;
  const names=[...new Set(newSubcategories.split(/[,;\n]+/).map(name=>name.trim()).filter(Boolean))];
  if(!names.length)return;
  setBusy(true);setMessage('');
  let created=0;
  try{
   for(const name of names){
    await mutation('POST',{kind:'subcategory',categoryId:chosen.id,name});
    created++;
   }
   setNewSubcategories('');
   setMessage(`${created} subcategoría(s) creada(s).`);
  }catch(e){setMessage(`${created} creadas. ${(e as Error).message}`)}
  finally{await onRefresh();setBusy(false)}
 }
 async function rename(kind:Kind,id:string,name:string){
  const requested=window.prompt('Nuevo nombre:',name);
  if(!requested||requested.trim()===name||busy)return;
  setBusy(true);setMessage('');
  try{await mutation('PATCH',{kind,id,name:requested.trim()});await onRefresh();setMessage('Nombre actualizado.')}
  catch(e){setMessage((e as Error).message)}
  finally{setBusy(false)}
 }
 async function remove(kind:Kind,id:string,name:string){
  if(busy||!window.confirm(`¿Eliminar "${name}" del catálogo? No se permite eliminar una categoría en uso.`))return;
  setBusy(true);setMessage('');
  try{await mutation('DELETE',{kind,id});await onRefresh();setMessage('Registro eliminado.')}
  catch(e){setMessage((e as Error).message)}
  finally{setBusy(false)}
 }
 return <section className="category-manager" aria-label="Administrar categorías y subcategorías">
  <div className="category-manager-intro">
   <FolderTree size={28}/>
   <div><h2>Catálogo de categorías</h2><p>Organiza tus productos en categorías y subcategorías. Las asignaciones se realizan individualmente desde cada ficha.</p></div>
  </div>
  {message&&<p role="status" className="category-message">{message}</p>}
  <div className="category-manager-columns">
   <div className="category-manager-panel">
    <h3>Categorías <span>{categories.length}</span></h3>
    <form onSubmit={addCategory} className="category-add-form">
     <label htmlFor="new-category-name">Nueva categoría</label>
     <div className="category-form-row"><Input id="new-category-name" maxLength={90} value={newCategory} onChange={event=>setNewCategory(event.target.value)} placeholder="Ej. Filtración" disabled={busy}/><Button type="submit" disabled={busy||!newCategory.trim()}><Plus size={17}/> Crear</Button></div>
    </form>
    <div className="category-manager-list">
     {categories.map(category=><div className={chosen?.id===category.id?'category-manager-row current':'category-manager-row'} key={category.id}>
      <button type="button" className="category-select" onClick={()=>{setChosenId(category.id);setMessage('')}}><strong>{category.name}</strong><small>{category.subcategories.length} subcategoría(s)</small></button>
      <button type="button" title="Renombrar categoría" aria-label={`Renombrar ${category.name}`} disabled={busy} onClick={()=>rename('category',category.id,category.name)}><Pencil size={16}/></button>
      <button type="button" title="Eliminar categoría" aria-label={`Eliminar ${category.name}`} disabled={busy} onClick={()=>remove('category',category.id,category.name)}><Trash2 size={16}/></button>
     </div>)}
     {!categories.length&&<p className="category-manager-empty">Crea tu primera categoría.</p>}
    </div>
   </div>
   <div className="category-manager-panel">
    <h3>Subcategorías {chosen&&<span>de {chosen.name}</span>}</h3>
    {chosen?<><form onSubmit={addSubcategories} className="category-add-form">
     <label htmlFor="new-subcategory-names">Agregar subcategorías</label>
     <div className="category-form-row"><Input id="new-subcategory-names" value={newSubcategories} onChange={event=>setNewSubcategories(event.target.value)} placeholder="Ej. Agua, Aire" disabled={busy}/><Button type="submit" disabled={busy||!newSubcategories.trim()}><Plus size={17}/> Agregar</Button></div>
     <small>Puedes ingresar varias separadas por comas.</small>
    </form>
    <div className="category-manager-list">{chosen.subcategories.map(sub=><div className="category-manager-row" key={sub.id}>
     <span className="category-subcategory-label">{sub.name}</span>
     <button type="button" title="Renombrar subcategoría" aria-label={`Renombrar ${sub.name}`} disabled={busy} onClick={()=>rename('subcategory',sub.id,sub.name)}><Pencil size={16}/></button>
     <button type="button" title="Eliminar subcategoría" aria-label={`Eliminar ${sub.name}`} disabled={busy} onClick={()=>remove('subcategory',sub.id,sub.name)}><Trash2 size={16}/></button>
    </div>)}{!chosen.subcategories.length&&<p className="category-manager-empty">Esta categoría todavía no tiene subcategorías. También puede usarse sin ellas.</p>}</div>
    </>:<p className="category-manager-empty">Selecciona o crea una categoría para comenzar.</p>}
   </div>
  </div>
 </section>;
}
