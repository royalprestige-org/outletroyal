/** Shared time and validation rules for the dedicated assistance calendar. */
export const ASSISTANCE_TIME='20:30';
export const ASSISTANCE_TIME_LABEL='8:30 p. m.';
export const ASSISTANCE_ZONE='America/Mazatlan';
export type AssistanceService='demonstration'|'maintenance';
export type AssistanceStatus='scheduled'|'confirmed'|'cancelled'|'rescheduled';
export const SERVICE_NAMES:Record<AssistanceService,string>={
 demonstration:'Demostración',
 maintenance:'Mantenimiento'
};
export const STATUS_NAMES:Record<AssistanceStatus,string>={
 scheduled:'Agendada',
 confirmed:'Confirmada',
 cancelled:'Cancelada',
 rescheduled:'Reagendada'
};
export function serviceLocalDate(){
 return new Intl.DateTimeFormat('en-CA',{timeZone:ASSISTANCE_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
export function serviceLocalTime(){
 return new Intl.DateTimeFormat('en-GB',{timeZone:ASSISTANCE_ZONE,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
}
export function validServiceDate(value:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const day=new Date(value+'T12:00:00.000Z');
 if(Number.isNaN(day.getTime())||day.toISOString().slice(0,10)!==value)return false;
 const today=serviceLocalDate();
 if(value<today||(value===today&&serviceLocalTime()>=ASSISTANCE_TIME))return false;
 const horizon=new Date(today+'T12:00:00.000Z');
 horizon.setUTCDate(horizon.getUTCDate()+120);
 return day.getTime()<=horizon.getTime();
}
export function shortServiceFolio(id:string){return 'AS-'+id.slice(0,8).toUpperCase()}
export function formatServiceDate(value:string){
 const day=new Date(value+'T12:00:00.000Z');
 return new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(day);
}
export function buildAssistanceWhatsApp(input:{
 id:string;serviceType:AssistanceService;customerName:string;phone:string;
 isExistingClient:boolean;date:string;note:string;interestProductName?:string|null;
}){
 return [
  'Hola, deseo solicitar asistencia para artículos de cocina.',
  'Folio: '+shortServiceFolio(input.id),
  'Servicio: '+SERVICE_NAMES[input.serviceType],
  'Nombre: '+input.customerName,
  'Teléfono: '+input.phone,
  '¿Ya soy cliente?: '+(input.isExistingClient?'Sí':'No'),
  'Fecha solicitada: '+formatServiceDate(input.date),
  'Horario: '+ASSISTANCE_TIME_LABEL+' (Baja California Sur)',
  input.interestProductName?'Artículo de interés: '+input.interestProductName:'',
  input.note?'Comentarios: '+input.note:'',
  'Mi solicitud quedó registrada y está pendiente de confirmación. Gracias.'
 ].filter(Boolean).join('\n');
}
