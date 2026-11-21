'use client';

import {useEffect,useMemo,useState} from 'react';
import {CalendarDays,ChevronLeft,ChevronRight,ClipboardCopy,FilterX,History,MessageCircle,Phone,Search} from 'lucide-react';
import {visibleProductCode} from '@/lib/product-code';

type ProductOption={id:string;name:string};
type OfferOption={id:string;name:string};
type LeadItem={productId:string;name:string;quantity:number};
type Lead={
 id:string;contact_id:string;customer_name:string;phone:string;city:string;
 purchase_mode:'normal'|'outlet';primary_product_id:string;primary_product_name:string;
 items:LeadItem[];gift_product_id:string|null;gift_name:string|null;
 additional_product_id:string|null;additional_name:string|null;
 payment_preference:string|null;estimated_total:string|null;
 whatsapp_message:string;whatsapp_status:string;visit_folio:string|null;
 created_at:string;contact_consultations:number;
};
type Filters={name:string;phone:string;from:string;to:string;primary:string;gift:string;additional:string};
type ApiResult={rows:Lead[];total:number;contacts:number;page:number;pageSize:number;error?:string};
type ServiceBrief={id:string;service_type:'demonstration'|'maintenance';status:string;date:string;note:string};
const blank:Filters={name:'',phone:'',from:'',to:'',primary:'',gift:'',additional:''};
const fmtDate=(iso:string)=>new Date(iso).toLocaleString('es-MX',{timeZone:'America/Mazatlan',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
const peso=(value:number)=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2}).format(value);
const paymentNames:Record<string,string>={cash:'Contado',card:'Tarjeta',finance:'Financiamiento'};
const safeItems=(lead:Lead):LeadItem[]=>Array.isArray(lead.items)?lead.items:[];

export default function AdminLeads({products,offers}:{products:ProductOption[];offers:OfferOption[]}){
 const [filters,setFilters]=useState<Filters>(blank),[page,setPage]=useState(1);
 const [result,setResult]=useState<ApiResult>({rows:[],total:0,contacts:0,page:1,pageSize:25});
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [selectedId,setSelectedId]=useState<string|null>(null),[historySelection,setHistorySelection]=useState<Lead|null>(null);
 const [history,setHistory]=useState<Lead[]|null>(null),[historyPage,setHistoryPage]=useState(1),[historyTotal,setHistoryTotal]=useState(0),[historyLoading,setHistoryLoading]=useState(false);
 const [copyNotice,setCopyNotice]=useState('');
 const [serviceHistory,setServiceHistory]=useState<ServiceBrief[]>([]);
 const options=useMemo(()=>[...products.map(p=>({id:p.id,name:p.name})),...offers.map(o=>({id:'OF-'+o.id,name:o.name}))].sort((a,b)=>a.name.localeCompare(b.name,'es')),[products,offers]);
 const active=useMemo(()=>historySelection||result.rows.find(lead=>lead.id===selectedId)||result.rows[0]||null,[result.rows,selectedId,historySelection]);
 const totalPages=Math.max(1,Math.ceil(result.total/result.pageSize));
 useEffect(()=>{
  if(!active?.contact_id){setServiceHistory([]);return}
  const controller=new AbortController();
  fetch('/api/admin/assistance?contactId='+encodeURIComponent(active.contact_id),{cache:'no-store',signal:controller.signal})
   .then(async r=>r.json() as Promise<{requests:ServiceBrief[]}>)
   .then(j=>{if(!controller.signal.aborted)setServiceHistory(j.requests||[])})
   .catch(()=>{if(!controller.signal.aborted)setServiceHistory([])});
  return()=>controller.abort();
 },[active?.contact_id]);
 const change=(key:keyof Filters,value:string)=>{setFilters(curr=>({...curr,[key]:value}));setPage(1);setHistory(null);setSelectedId(null);setHistorySelection(null)};
 useEffect(()=>{
  const abort=new AbortController();
  const timeout=setTimeout(async()=>{
   setLoading(true);setError('');
   try{
    const params=new URLSearchParams();
    for(const [key,value] of Object.entries(filters))if(value)params.set(key,value);
    params.set('page',String(page));
    const response=await fetch('/api/leads?'+params.toString(),{signal:abort.signal,cache:'no-store'});
    const data=await response.json() as ApiResult;
    if(!response.ok)throw new Error(data.error||'No se pudo consultar Leads.');
    if(!abort.signal.aborted){setResult(data);setSelectedId(current=>data.rows.some(x=>x.id===current)?current:data.rows[0]?.id||null)}
   }catch(e){if(!abort.signal.aborted)setError((e as Error).message)}
   finally{if(!abort.signal.aborted)setLoading(false)}
  },300);
  return()=>{clearTimeout(timeout);abort.abort()};
 },[filters,page]);
 async function viewHistory(contactId:string,pageNumber=1){
  setHistoryLoading(true);setHistoryPage(pageNumber);
  try{
   const params=new URLSearchParams({contactId,page:String(pageNumber)});
   const response=await fetch('/api/leads?'+params.toString(),{cache:'no-store'});
   const data=await response.json() as ApiResult;
   if(!response.ok)throw new Error(data.error||'No se pudo consultar el historial.');
   setHistory(data.rows);setHistoryTotal(data.total);
  }catch(e){setCopyNotice((e as Error).message)}finally{setHistoryLoading(false)}
 }
 async function copyMessage(text:string){
  try{await navigator.clipboard.writeText(text);setCopyNotice('Mensaje copiado.')}catch{setCopyNotice('No fue posible copiar; selecciona el texto del mensaje.')}
 }
 return <section className="leads-panel" aria-label="Registro de consultas y prospectos">
  <div className="leads-intro">
   <div><h2>Consultas de clientes</h2><p>Cada consulta tiene su propio folio. El historial agrupa registros por contacto, pero conserva todas sus solicitudes.</p></div>
   <div className="leads-summary"><strong>{result.total}</strong><span>Consultas filtradas</span><strong>{result.contacts}</strong><span>Contactos distintos</span></div>
  </div>
  <div className="leads-filters">
   <label className="leads-filter"><span>Nombre</span><div className="leads-search"><Search size={16}/><input value={filters.name} onChange={e=>change('name',e.target.value)} placeholder="Buscar nombre"/></div></label>
   <label className="leads-filter"><span>Teléfono</span><div className="leads-search"><Phone size={16}/><input type="tel" inputMode="tel" value={filters.phone} onChange={e=>change('phone',e.target.value)} placeholder="10 dígitos"/></div></label>
   <label className="leads-filter"><span>Desde</span><input type="date" value={filters.from} max={filters.to||undefined} onChange={e=>change('from',e.target.value)}/></label>
   <label className="leads-filter"><span>Hasta</span><input type="date" value={filters.to} min={filters.from||undefined} onChange={e=>change('to',e.target.value)}/></label>
   <label className="leads-filter"><span>Artículo principal</span><select value={filters.primary} onChange={e=>change('primary',e.target.value)}><option value="">Todos los artículos</option>{options.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   <label className="leads-filter"><span>Regalo elegido</span><select value={filters.gift} onChange={e=>change('gift',e.target.value)}><option value="">Todos los regalos</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   <label className="leads-filter"><span>“No te quedes con las ganas”</span><select value={filters.additional} onChange={e=>change('additional',e.target.value)}><option value="">Todos los adicionales</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   <button type="button" className="leads-clear" onClick={()=>{setFilters(blank);setPage(1);setSelectedId(null);setHistory(null)}}><FilterX size={16}/> Limpiar filtros</button>
  </div>
  {error&&<p role="alert" className="leads-error">{error}</p>}
  <div className="leads-columns">
   <div className="leads-list">
    <div className="leads-list-title"><h3>Consultas</h3><span>{loading?'Cargando…':result.total+' registros'}</span></div>
    {result.rows.length===0&&!loading?<p className="leads-empty">No hay consultas con los filtros seleccionados. Los nuevos registros aparecerán cuando alguien pulse el botón para solicitar información por WhatsApp.</p>:result.rows.map(lead=><button type="button" className={active?.id===lead.id?'lead-row current':'lead-row'} key={lead.id} onClick={()=>{setSelectedId(lead.id);setHistory(null);setHistorySelection(null);setCopyNotice('')}}>
     <span className="lead-row-top"><strong>{lead.customer_name}</strong><small>{fmtDate(lead.created_at)}</small></span>
     <span className="lead-row-phone">{lead.phone} · {lead.contact_consultations} consulta{lead.contact_consultations===1?'':'s'}</span>
     <span className="lead-row-product">{lead.primary_product_name}</span>
     <span className="lead-row-benefits">{lead.gift_name?'Regalo: '+lead.gift_name:'Sin regalo'} · {lead.additional_name?'Adicional: '+lead.additional_name:'Sin adicional'}</span>
    </button>)}
    {result.total>result.pageSize&&<div className="leads-pagination"><button disabled={page===1||loading} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={16}/> Anterior</button><span>{page} / {totalPages}</span><button disabled={page===totalPages||loading} onClick={()=>setPage(p=>p+1)}>Siguiente <ChevronRight size={16}/></button></div>}
   </div>
   <div className="leads-detail">
    {active?<><div className="lead-detail-head"><span className="lead-overline">CONSULTA {active.id.slice(0,8).toUpperCase()}</span><h3>{active.customer_name}</h3><p>{fmtDate(active.created_at)} · {active.city||'Ciudad no indicada'}</p></div>
     <div className="lead-detail-contacts"><a href={'https://wa.me/52'+active.phone} target="_blank" rel="noopener noreferrer"><MessageCircle size={17}/> {active.phone}</a><button onClick={()=>viewHistory(active.contact_id)}><History size={17}/> Historial ({active.contact_consultations})</button></div>
     {serviceHistory.length>0&&<div className="lead-service-history"><strong>Asistencia solicitada ({serviceHistory.length})</strong>{serviceHistory.map(item=><p key={item.id}>{item.service_type==='maintenance'?'Mantenimiento':'Demostración'} · {String(item.date).slice(0,10)} · {item.status==='scheduled'?'Agendada':item.status==='confirmed'?'Confirmada':item.status==='rescheduled'?'Reagendada':'Cancelada'}</p>)}</div>}
     <dl className="lead-detail-data">
      <div><dt>Artículo principal</dt><dd>{active.primary_product_name} <small>{visibleProductCode(active.primary_product_id)}</small></dd></div>
      <div><dt>Modalidad y pago preferido</dt><dd>{active.purchase_mode==='outlet'?'Outlet':'Compra Tradicional'} · {active.payment_preference?paymentNames[active.payment_preference]||active.payment_preference:'Sin definir'}</dd></div>
      <div><dt>Regalo sugerido elegido</dt><dd>{active.gift_name||'No eligió regalo'}</dd></div>
      <div><dt>“No te quedes con las ganas”</dt><dd>{active.additional_name||'No eligió producto adicional'}</dd></div>
      <div><dt>Importe estimado</dt><dd>{active.estimated_total!=null?peso(Number(active.estimated_total)):'No se calculó cotización'}</dd></div>
      {active.visit_folio&&<div><dt>Folio de visita</dt><dd>{active.visit_folio}</dd></div>}
     </dl>
     <div className="lead-items"><h4>Artículos consultados</h4>{safeItems(active).map((item,i)=><p key={item.productId+'-'+i}>{item.quantity} × {item.name} <small>{visibleProductCode(item.productId)}</small></p>)}</div>
     <div className="lead-message-head"><h4>Mensaje generado para WhatsApp</h4><button onClick={()=>copyMessage(active.whatsapp_message)}><ClipboardCopy size={16}/> Copiar</button></div>
     <pre className="lead-whatsapp-message">{active.whatsapp_message}</pre>
     <p className="lead-status">Estado: solicitud registrada y mensaje preparado. El envío efectivo desde WhatsApp no puede verificarse automáticamente.</p>
     {copyNotice&&<p role="status" className="lead-feedback">{copyNotice}</p>}
     {history!==null&&<div className="lead-history"><h4>Consultas de este contacto</h4>{historyLoading?<p>Cargando historial…</p>:history.map(lead=><button key={lead.id} type="button" onClick={()=>{setHistorySelection(lead);setHistory(null)}}><CalendarDays size={15}/><span>{fmtDate(lead.created_at)} — {lead.primary_product_name}</span></button>)}{historyTotal>25&&<div className="leads-pagination"><button disabled={historyPage===1} onClick={()=>viewHistory(active.contact_id,historyPage-1)}>Anterior</button><span>{historyPage}/{Math.ceil(historyTotal/25)}</span><button disabled={historyPage>=Math.ceil(historyTotal/25)} onClick={()=>viewHistory(active.contact_id,historyPage+1)}>Siguiente</button></div>}</div>}
    </>:<div className="leads-empty">Selecciona una consulta para revisar el mensaje y el historial del cliente.</div>}
   </div>
  </div>
 </section>;
}
