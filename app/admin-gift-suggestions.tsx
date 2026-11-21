'use client';

import {useMemo,useState} from 'react';
import {Gift,Search,X} from 'lucide-react';
import {visibleProductCode} from '@/lib/product-code';

type Option={id:string;name:string;isGiftEligible:boolean;category?:string};
type Props={
 currentId:string;
 products:Option[];
 value:string[];
 disabled?:boolean;
 onChange:(ids:string[])=>void;
};

export default function AdminGiftSuggestions({currentId,products,value,disabled=false,onChange}:Props){
 const [search,setSearch]=useState('');
 const available=useMemo(()=>products.filter(p=>p.id!==currentId),[products,currentId]);
 const byId=useMemo(()=>new Map(available.map(p=>[p.id,p])),[available]);
 const selected=useMemo(()=>value.map(id=>byId.get(id)).filter((p):p is Option=>!!p),[value,byId]);
 const filtered=useMemo(()=>{
  const q=search.trim().toLocaleLowerCase('es');
  return available.filter(p=>!q||`${p.name} ${p.id} ${visibleProductCode(p.id)} ${p.category||''}`.toLocaleLowerCase('es').includes(q));
 },[available,search]);
 function toggle(id:string,checked:boolean){
  if(disabled)return;
  onChange(checked?[...value,id]:value.filter(item=>item!==id));
 }
 return <section className="gift-suggestion-editor" aria-label="Regalos sugeridos para este producto">
  <div className="gift-suggestion-header">
   <Gift size={20} aria-hidden="true"/>
   <div><h3>Regalos sugeridos <span>{value.length}</span></h3><p>Elige los productos que tengan sentido como regalo al consultar este artículo. No se agregan a la compra.</p></div>
  </div>
  <details className="gift-suggestion-dropdown">
   <summary>Seleccionar regalos del catálogo <span>{value.length} seleccionados</span></summary>
   <div className="gift-suggestion-content">
    <label className="gift-suggestion-search" htmlFor="gift-suggestion-search">
     <Search size={17} aria-hidden="true"/>
     <input id="gift-suggestion-search" type="search" placeholder="Buscar por nombre o código" value={search} onChange={e=>setSearch(e.target.value)} disabled={disabled}/>
    </label>
    <div className="gift-suggestion-options" role="group" aria-label="Catálogo de productos para sugerir">
     {filtered.length?filtered.map(p=><label className="gift-suggestion-option" key={p.id}>
      <input type="checkbox" checked={value.includes(p.id)} onChange={e=>toggle(p.id,e.target.checked)} disabled={disabled}/>
      <span className="gift-suggestion-option-name">{p.name}<small>{visibleProductCode(p.id)}{p.category?` · ${p.category}`:''}</small></span>
      <span className={p.isGiftEligible?'gift-suggestion-status ready':'gift-suggestion-status pending'}>{p.isGiftEligible?'Elegible':'No habilitado'}</span>
     </label>):<p className="gift-suggestion-empty">No hay artículos que coincidan con la búsqueda.</p>}
    </div>
   </div>
  </details>
  <div className="gift-suggestion-selected" aria-live="polite">
   {selected.length?selected.map(p=><span key={p.id} className="gift-suggestion-chip">
    <span>{p.name}</span><button type="button" disabled={disabled} onClick={()=>toggle(p.id,false)} aria-label={`Quitar ${p.name} de regalos sugeridos`}><X size={15}/></button>
   </span>):<p className="gift-suggestion-empty">Sin regalos sugeridos para este artículo.</p>}
  </div>
  <p className="gift-suggestion-help">Importante: para aparecer al cliente, el regalo sugerido también debe tener activo el check <strong>“Elegible para ofrecer como regalo”</strong> en su propia ficha y cumplir las condiciones de la cotización.</p>
 </section>;
}
