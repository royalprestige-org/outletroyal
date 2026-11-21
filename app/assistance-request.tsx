'use client';
import {useEffect,useMemo,useState} from 'react';
import {CalendarDays,CheckCircle2,Clock3,MessageCircle,ShieldCheck,UserRound,Wrench,CookingPot} from 'lucide-react';
import Link from 'next/link';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {ASSISTANCE_TIME_LABEL,serviceLocalDate,validServiceDate,type AssistanceService,formatServiceDate,shortServiceFolio} from '@/lib/assistance';
import './assistance.css';

type Draft={
 requestId:string;serviceType:AssistanceService;name:string;phone:string;isExistingClient:''|'yes'|'no';
 date:string;note:string;interestProductId:string;
};
type Receipt={id:string;status:string;registered:boolean;message:string};
const KEY='cocina-bcs-assistance-draft-v1';
const defaultForm=():Draft=>({requestId:'',serviceType:'demonstration',name:'',phone:'',isExistingClient:'',date:'',note:'',interestProductId:''});
const digits=(v:string)=>v.replace(/\D/g,'').replace(/^52(?=\d{10}$)/,'');
const dateMax=()=>{
 const today=serviceLocalDate();const d=new Date(today+'T12:00:00.000Z');d.setUTCDate(d.getUTCDate()+120);return d.toISOString().slice(0,10);
};
type Props={
 open:boolean;onOpenChange:(open:boolean)=>void;defaultName?:string;defaultPhone?:string;
 interestProduct?:{id:string;name:string}|null;
};
export default function AssistanceRequest({open,onOpenChange,defaultName='',defaultPhone='',interestProduct}:Props){
 const [form,setForm]=useState<Draft>(defaultForm);
 const [ready,setReady]=useState(false);
 const [availability,setAvailability]=useState<null|'checking'|'free'|'taken'|'failed'>(null);
 const [saving,setSaving]=useState(false),[error,setError]=useState('');
 const [receipt,setReceipt]=useState<Receipt|null>(null);
 const [requestDate,setRequestDate]=useState('');
 const contactReady=form.name.trim().length>=2&&digits(form.phone).length===10;
 const dateReady=contactReady&&!!form.date&&validServiceDate(form.date);
 const canSubmit=dateReady&&availability==='free'&&form.isExistingClient!==''&&!saving&&!receipt;
 const dateLabel=useMemo(()=>form.date?formatServiceDate(form.date):'', [form.date]);
 useEffect(()=>{
  if(!open)return;
  setReady(false);setReceipt(null);setError('');setAvailability(null);setRequestDate('');
  let saved:Partial<Draft>={};
  try{const str=sessionStorage.getItem(KEY);if(str)saved=JSON.parse(str) as Partial<Draft>}catch{}
  setForm({
   ...defaultForm(),...saved,
   requestId:typeof saved.requestId==='string'&&saved.requestId?saved.requestId:crypto.randomUUID(),
   name:typeof saved.name==='string'&&saved.name?saved.name:defaultName,
   phone:typeof saved.phone==='string'&&saved.phone?saved.phone:defaultPhone,
   serviceType:saved.serviceType==='maintenance'?'maintenance':'demonstration',
   interestProductId:interestProduct?.id||saved.interestProductId||''
  });
  setReady(true);
 },[open,defaultName,defaultPhone,interestProduct?.id]);
 useEffect(()=>{
  if(!open||!ready||receipt)return;
  try{sessionStorage.setItem(KEY,JSON.stringify(form))}catch{}
 },[open,ready,form,receipt]);
 useEffect(()=>{
  if(!open||!ready||!contactReady||!form.date||!validServiceDate(form.date)){setAvailability(null);return}
  const controller=new AbortController();
  setAvailability('checking');
  fetch('/api/assistance/availability?date='+encodeURIComponent(form.date),{cache:'no-store',signal:controller.signal})
   .then(async res=>{const j=await res.json() as {available?:boolean};if(!res.ok)throw Error('Error de disponibilidad');return j})
   .then(data=>{if(!controller.signal.aborted)setAvailability(data.available?'free':'taken')})
   .catch(()=>{if(!controller.signal.aborted)setAvailability('failed')});
  return()=>controller.abort();
 },[open,ready,contactReady,form.date]);
 function update<K extends keyof Draft>(key:K,value:Draft[K]){
  setForm(current=>({...current,[key]:value}));
  if(key==='date')setAvailability(null);
  setError('');
 }
 function close(next:boolean){if(!next){setReady(false)}onOpenChange(next)}
 async function submit(){
  if(!canSubmit)return;
  setSaving(true);setError('');
  // Open a user-initiated tab before the async request, avoiding mobile popup blockers.
  const popup=window.open('about:blank','_blank');
  if(popup){popup.document.title='Preparando WhatsApp';popup.document.body.textContent='Registrando tu solicitud…';}
  try{
   const response=await fetch('/api/assistance',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
     requestId:form.requestId,customerName:form.name.trim(),phone:digits(form.phone),
     serviceType:form.serviceType,isExistingClient:form.isExistingClient==='yes',
     date:form.date,note:form.note.trim(),interestProductId:form.interestProductId||null
    })
   });
   const result=await response.json() as Receipt&{error?:string};
   if(!response.ok||!result.registered)throw Error(result.error||'No fue posible registrar la solicitud.');
   setReceipt(result);setRequestDate(form.date);
   try{sessionStorage.removeItem(KEY)}catch{}
   const link='https://wa.me/526241710903?text='+encodeURIComponent(result.message);
   if(popup&&!popup.closed)popup.location.replace(link);
   // No automatic redirection of the current tab: preserve the confirmation and a fallback link.
  }catch(e){
   if(popup&&!popup.closed)popup.close();
   setError((e as Error).message);
   if(form.date)setAvailability('failed');
  }finally{setSaving(false)}
 }
 return <Sheet open={open} onOpenChange={close}>
  <SheetContent className="assistance-sheet">
   <SheetHeader className="assistance-heading">
    <SheetTitle>Solicitar asistencia</SheetTitle>
    <SheetDescription>Elige tu servicio y la fecha. Tu solicitud quedará registrada antes de abrir WhatsApp.</SheetDescription>
   </SheetHeader>
   {receipt?<div className="assistance-success" role="status">
     <CheckCircle2 size={44} aria-hidden="true"/>
     <h2>Solicitud agendada</h2>
     <p>Recibimos tus datos y reservamos el horario. Nos pondremos en contacto para confirmar los detalles.</p>
     <dl><div><dt>Folio</dt><dd>{shortServiceFolio(receipt.id)}</dd></div>
      <div><dt>Fecha</dt><dd>{formatServiceDate(requestDate)}</dd></div>
      <div><dt>Horario</dt><dd>{ASSISTANCE_TIME_LABEL}</dd></div></dl>
     <a className="assistance-whatsapp" href={'https://wa.me/526241710903?text='+encodeURIComponent(receipt.message)} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/> Enviar mensaje por WhatsApp</a>
     <small>El envío desde WhatsApp es opcional, pero ayuda a iniciar la conversación. Tu registro ya está guardado.</small>
     <button type="button" className="assistance-secondary" onClick={()=>close(false)}>Cerrar</button>
    </div>:<div className="assistance-body">
    <div className="assistance-group">
     <p className="assistance-label">¿En qué podemos ayudarte?</p>
     <div className="assistance-services" role="radiogroup" aria-label="Tipo de asistencia">
      <button type="button" role="radio" aria-checked={form.serviceType==='demonstration'} className={form.serviceType==='demonstration'?'selected':''} onClick={()=>update('serviceType','demonstration')}><CookingPot size={23}/><strong>Demostración</strong><span>Conocer artículos de cocina</span></button>
      <button type="button" role="radio" aria-checked={form.serviceType==='maintenance'} className={form.serviceType==='maintenance'?'selected':''} onClick={()=>update('serviceType','maintenance')}><Wrench size={23}/><strong>Mantenimiento</strong><span>Revisión de un equipo</span></button>
     </div>
    </div>
    <div className="assistance-group">
     <h3><UserRound size={17}/> Tus datos</h3>
     <label htmlFor="assistance-name">Nombre completo<input id="assistance-name" type="text" autoComplete="name" maxLength={180} value={form.name} placeholder="¿Cómo te llamas?" onChange={e=>update('name',e.target.value)}/></label>
     <label htmlFor="assistance-phone">Teléfono de WhatsApp<input id="assistance-phone" inputMode="tel" type="tel" autoComplete="tel" maxLength={20} value={form.phone} placeholder="10 dígitos" onChange={e=>update('phone',e.target.value)}/></label>
     <div className="assistance-client-question"><p>¿Ya eres cliente?</p><div role="radiogroup" aria-label="¿Ya eres cliente?">
      <button type="button" role="radio" aria-checked={form.isExistingClient==='yes'} className={form.isExistingClient==='yes'?'active':''} onClick={()=>update('isExistingClient','yes')}>Sí</button>
      <button type="button" role="radio" aria-checked={form.isExistingClient==='no'} className={form.isExistingClient==='no'?'active':''} onClick={()=>update('isExistingClient','no')}>No</button>
     </div></div>
    </div>
    <div className="assistance-group">
     <h3><CalendarDays size={17}/> Fecha y horario</h3>
     <label htmlFor="assistance-date" className={!contactReady?'assistance-muted':''}>Elegir fecha
      <input id="assistance-date" type="date" min={serviceLocalDate()} max={dateMax()} disabled={!contactReady} value={form.date} onChange={e=>update('date',e.target.value)}/>
     </label>
     <div className={!dateReady?'assistance-time assistance-muted':'assistance-time'}>
      <Clock3 size={18}/><span>{ASSISTANCE_TIME_LABEL} · Todos los días</span>
      <span className="assistance-availability">{!contactReady?'Completa tus datos':availability==='checking'?'Comprobando…':availability==='taken'?'Ocupado':availability==='free'?'Disponible':availability==='failed'?'No se pudo consultar':dateReady?'Selecciona fecha':'Elige fecha'}</span>
     </div>
     {availability==='taken'&&<p className="assistance-hint error">Esta fecha está ocupada. Selecciona otra.</p>}
     {availability==='failed'&&<button type="button" className="assistance-retry" onClick={()=>{const d=form.date;update('date','');setTimeout(()=>update('date',d),0)}}>Volver a comprobar</button>}
    </div>
    <div className="assistance-group">
     <label htmlFor="assistance-note">Comentarios <small>Opcional</small>
      <textarea id="assistance-note" rows={3} maxLength={1500} value={form.note}
       placeholder={form.serviceType==='maintenance'?'¿Qué equipo tienes y qué necesitas revisar?':'¿Qué artículo te gustaría conocer o qué deseas consultar?'}
       onChange={e=>update('note',e.target.value)}/>
     </label>
     {interestProduct&&form.interestProductId===interestProduct.id&&<p className="assistance-interest">Artículo de interés: {interestProduct.name}</p>}
    </div>
    {error&&<p className="assistance-error" role="alert">{error}</p>}
    <div className="assistance-actions">
     <button type="button" className="assistance-submit" disabled={!canSubmit} onClick={()=>void submit()}><MessageCircle size={18}/>{saving?'Registrando…':'Registrar y continuar a WhatsApp'}</button>
     <p><ShieldCheck size={14}/> Tus datos quedan guardados al registrar la solicitud. <Link href="/privacidad" target="_blank">Privacidad</Link></p>
    </div>
   </div>}
  </SheetContent>
 </Sheet>;
}
