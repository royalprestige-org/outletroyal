'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {CalendarDays,Check,ChevronLeft,ChevronRight,ClipboardCopy,MessageCircle,RotateCcw,Search,ShieldCheck,XCircle} from 'lucide-react';
import {ASSISTANCE_TIME_LABEL,STATUS_NAMES,SERVICE_NAMES,formatServiceDate,serviceLocalDate,shortServiceFolio,type AssistanceService,type AssistanceStatus} from '@/lib/assistance';
import './admin-assistance.css';

type StatusEvent={action:string;previousStatus:string|null;newStatus:string;previousDate:string|null;newDate:string;createdAt:string};
type ServiceRequest={
 id:string;contact_id:string;customer_name:string;phone:string;
 service_type:AssistanceService;is_existing_client:boolean;
 date:string;time:string;note:string;admin_note:string;
 status:AssistanceStatus;interest_product_name:string|null;
 whatsapp_message:string;created_at:string;updated_at:string;contact_requests:number;
 history:StatusEvent[];
};
type Filters={service:string;status:string;phone:string;name:string;from:string;to:string;client:string};
type Api={requests:ServiceRequest[];total:number;page:number;pageSize:number;error?:string};
const emptyFilters:Filters={service:'',status:'',phone:'',name:'',from:'',to:'',client:''};
const dateTime=(date:string)=>new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mazatlan',dateStyle:'medium',timeStyle:'short'}).format(new Date(date));
const toDate=(value:string)=>String(value||'').slice(0,10);
export default function AdminAssistance(){
 const [filters,setFilters]=useState<Filters>(emptyFilters),[page,setPage]=useState(1);
 const [data,setData]=useState<Api>({requests:[],total:0,page:1,pageSize:30});
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [adminNote,setAdminNote]=useState(''),[moving,setMoving]=useState(false);
 const [newDate,setNewDate]=useState(''),[dateAvailable,setDateAvailable]=useState<'idle'|'checking'|'free'|'taken'>('idle');
 const pages=Math.max(1,Math.ceil(data.total/data.pageSize));
 const selected=useMemo(()=>data.requests.find(x=>x.id===selectedId)||data.requests[0]||null,[data.requests,selectedId]);
 const refresh=useCallback(async(signal?:AbortSignal)=>{
  const params=new URLSearchParams();
  for(const [k,v] of Object.entries(filters))if(v)params.set(k,v);
  params.set('page',String(page));
  const res=await fetch('/api/admin/assistance?'+params.toString(),{cache:'no-store',signal});
  const json=await res.json() as Api;
  if(!res.ok)throw Error(json.error||'No se pudo cargar la agenda.');
  setData(json);setSelectedId(id=>json.requests.some(r=>r.id===id)?id:json.requests[0]?.id||null);
 },[filters,page]);
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError('');
  void refresh(controller.signal).catch(e=>{if(!controller.signal.aborted)setError((e as Error).message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return()=>controller.abort();
 },[refresh]);
 useEffect(()=>{setAdminNote(selected?.admin_note||'');setMoving(false);setNewDate('');setDateAvailable('idle');setNotice('')},[selected?.id,selected?.admin_note]);
 useEffect(()=>{
  if(!moving||!newDate||newDate===selected?.date){setDateAvailable('idle');return}
  const controller=new AbortController();
  setDateAvailable('checking');
  fetch('/api/assistance/availability?date='+encodeURIComponent(newDate),{cache:'no-store',signal:controller.signal})
   .then(async r=>{const x=await r.json() as {available?:boolean};if(!r.ok)throw Error();return x})
   .then(x=>{if(!controller.signal.aborted)setDateAvailable(x.available?'free':'taken')})
   .catch(()=>{if(!controller.signal.aborted)setDateAvailable('taken')});
  return()=>controller.abort();
 },[moving,newDate,selected?.date]);
 function setFilter<K extends keyof Filters>(key:K,value:Filters[K]){
  setFilters(f=>({...f,[key]:value}));setPage(1);
 }
 async function update(action:'confirm'|'cancel'|'reschedule'|'save'){
  if(!selected||busy)return;
  if(action==='cancel'&&!window.confirm('¿Cancelar esta solicitud y liberar el horario?'))return;
  setBusy(true);setError('');setNotice('');
  try{
   const response=await fetch('/api/admin/assistance/'+selected.id,{method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action,date:action==='reschedule'?newDate:undefined,adminNote})});
   const result=await response.json() as {error?:string};
   if(!response.ok)throw Error(result.error||'No pudimos actualizar la solicitud.');
   await refresh();
   setNotice(action==='reschedule'?'Reagendada: nueva fecha bloqueada y anterior liberada.':action==='cancel'?'Solicitud cancelada; fecha liberada.':action==='confirm'?'Solicitud confirmada.':'Nota guardada.');
   setMoving(false);setNewDate('');
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 const isActive=!!selected&&selected.status!=='cancelled';
 return <section className="service-admin" aria-label="Administración de asistencia">
   <header className="service-admin-header"><div><h2>Solicitudes de asistencia</h2><p>Un horario diario · {ASSISTANCE_TIME_LABEL} · Baja California Sur</p></div><span>{data.total} solicitudes</span></header>
   <div className="service-admin-filters">
    <label>Servicio<select value={filters.service} onChange={e=>setFilter('service',e.target.value)}><option value="">Todos</option><option value="demonstration">Demostraciones</option><option value="maintenance">Mantenimiento</option></select></label>
    <label>Estado<select value={filters.status} onChange={e=>setFilter('status',e.target.value)}><option value="">Todos</option>{Object.entries(STATUS_NAMES).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label>
    <label>Teléfono<input inputMode="tel" type="tel" value={filters.phone} placeholder="Buscar teléfono" onChange={e=>setFilter('phone',e.target.value)}/></label>
    <label>Nombre<input value={filters.name} placeholder="Buscar nombre" onChange={e=>setFilter('name',e.target.value)}/></label>
    <label>Desde<input type="date" value={filters.from} onChange={e=>setFilter('from',e.target.value)}/></label>
    <label>Hasta<input type="date" value={filters.to} onChange={e=>setFilter('to',e.target.value)}/></label>
    <label>¿Ya es cliente?<select value={filters.client} onChange={e=>setFilter('client',e.target.value)}><option value="">Todos</option><option value="yes">Sí</option><option value="no">No</option></select></label>
    <button type="button" onClick={()=>{setFilters(emptyFilters);setPage(1)}}><RotateCcw size={15}/> Limpiar</button>
   </div>
   {error&&<p role="alert" className="service-admin-error">{error}</p>}
   {notice&&<p role="status" className="service-admin-ok">{notice}</p>}
   <div className="service-admin-columns">
    <div className="service-admin-list">
     <div className="service-admin-list-title"><strong>Agenda</strong><small>{loading?'Cargando…':data.total+' registros'}</small></div>
     {data.requests.length===0&&!loading&&<p className="service-admin-empty">No hay solicitudes con estos filtros.</p>}
     {data.requests.map(r=><button type="button" key={r.id} className={r.id===selected?.id?'service-admin-entry selected':'service-admin-entry'} onClick={()=>setSelectedId(r.id)}>
       <span className="service-entry-top"><strong>{r.customer_name}</strong><small className={'service-status '+r.status}>{STATUS_NAMES[r.status]}</small></span>
       <span>{SERVICE_NAMES[r.service_type]} · {formatServiceDate(toDate(r.date))}</span>
       <small>{r.phone} · {ASSISTANCE_TIME_LABEL}</small>
      </button>)}
     {data.total>data.pageSize&&<div className="service-pages"><button disabled={page===1||loading} onClick={()=>setPage(x=>x-1)}><ChevronLeft size={15}/> Anterior</button><span>{page} / {pages}</span><button disabled={page===pages||loading} onClick={()=>setPage(x=>x+1)}>Siguiente <ChevronRight size={15}/></button></div>}
    </div>
    <div className="service-admin-detail">
     {selected?<><div className="service-detail-header"><span>FOLIO {shortServiceFolio(selected.id)}</span><h3>{selected.customer_name}</h3><span className={'service-status '+selected.status}>{STATUS_NAMES[selected.status]}</span></div>
       <dl className="service-details">
        <div><dt>Servicio</dt><dd>{SERVICE_NAMES[selected.service_type]}</dd></div>
        <div><dt>Teléfono</dt><dd><a href={'https://wa.me/52'+selected.phone} target="_blank" rel="noopener noreferrer">{selected.phone}</a></dd></div>
        <div><dt>Cliente existente</dt><dd>{selected.is_existing_client?'Sí':'No'}</dd></div>
        <div><dt>Fecha</dt><dd>{formatServiceDate(toDate(selected.date))} · {ASSISTANCE_TIME_LABEL}</dd></div>
        {selected.interest_product_name&&<div><dt>Artículo de interés</dt><dd>{selected.interest_product_name}</dd></div>}
        <div className="full"><dt>Comentarios del cliente</dt><dd>{selected.note||'Sin comentarios'}</dd></div>
       </dl>
       <label className="service-admin-note">Nota de seguimiento (solo administrador)<textarea maxLength={2000} rows={2} value={adminNote} onChange={e=>setAdminNote(e.target.value)} placeholder="Próxima acción, contacto o indicaciones"/></label>
       <div className="service-actions">
        <button type="button" disabled={busy||adminNote===(selected.admin_note||'')} className="quiet" onClick={()=>void update('save')}>Guardar nota</button>
        {isActive&&selected.status!=='confirmed'&&<button type="button" disabled={busy} onClick={()=>void update('confirm')}><Check size={16}/> Confirmar</button>}
        {isActive&&<button type="button" disabled={busy} className="quiet" onClick={()=>{setMoving(v=>!v);setNewDate('')}}><CalendarDays size={16}/> Reagendar</button>}
        {isActive&&<button type="button" disabled={busy} className="danger" onClick={()=>void update('cancel')}><XCircle size={16}/> Cancelar</button>}
       </div>
       {moving&&isActive&&<div className="service-reschedule"><strong>Elegir nueva fecha</strong>
        <p>La fecha anterior se liberará únicamente cuando la nueva quede reservada.</p>
        <label>Nueva fecha<input type="date" min={serviceLocalDate()} value={newDate} onChange={e=>setNewDate(e.target.value)}/></label>
        <div className="service-date-status">{ASSISTANCE_TIME_LABEL} · {dateAvailable==='free'?'Disponible':dateAvailable==='taken'?'Ocupado':dateAvailable==='checking'?'Consultando disponibilidad…':'Selecciona un día distinto'}</div>
        <button type="button" disabled={busy||dateAvailable!=='free'||newDate===selected.date} onClick={()=>void update('reschedule')}>Confirmar nueva fecha</button>
       </div>}
       <div className="service-message"><div><strong>Mensaje preparado para WhatsApp</strong><button type="button" onClick={()=>void navigator.clipboard.writeText(selected.whatsapp_message).then(()=>setNotice('Mensaje copiado.')).catch(()=>setError('Selecciona el texto para copiarlo.'))}><ClipboardCopy size={15}/> Copiar</button></div>
        <pre>{selected.whatsapp_message}</pre><small>El registro no confirma que el cliente haya enviado el mensaje.</small>
       </div>
       <details className="service-history"><summary>Historial de cambios ({selected.history?.length||0})</summary>
        {(selected.history||[]).map((event,i)=><p key={i}>{dateTime(event.createdAt)} · {event.action==='create'?'Agendada':event.action==='confirm'?'Confirmada':event.action==='cancel'?'Cancelada':event.action==='reschedule'?'Reagendada':'Nota actualizada'} {event.previousDate&&toDate(event.previousDate)!==toDate(event.newDate)?' — '+formatServiceDate(toDate(event.previousDate))+' → '+formatServiceDate(toDate(event.newDate)):''}</p>)}
       </details>
      </>:<p className="service-admin-empty">Selecciona una solicitud para gestionar su estado.</p>}
    </div>
   </div>
  </section>;
}
