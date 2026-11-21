'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,Search,SlidersHorizontal,LayoutGrid,List,ShoppingBag,Plus,Minus,Check,Gift,CalendarDays,MessageCircle,ChevronLeft,ChevronRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {RadioGroup,RadioGroupItem} from '@/components/ui/radio-group';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {colonias} from '@/data/colonias';
import AssistanceRequest from '@/app/assistance-request';
import {type Payment} from '@/lib/pricing';
import {OUTLET_NOTICE,OUTLET_START,OUTLET_END,outletActive} from '@/lib/outlet';
import {matchesProduct} from '@/lib/catalog-search';
import {visibleProductCode} from '@/lib/product-code';
import './storefront.css';

type Photo={id:string;url:string};type Part={label:string;quantity:number};type Warranty={label:string;details:string;status:'verified'|'review';sourceUrl:string};
type Item={id:string;name:string;family:string;category:string;subcategory:string;description:string;isKitchenSet:boolean;isGiftEligible:boolean;photos:Photo[];components:Part[];relatedProductIds?:string[];warranty?:Warranty|null;isOffer?:boolean;price?:number;outlet?:{list:number;price:number;rate:number}};
type SelectedItem=Item&{quantity:number;directQuantity:number;relatedQuantity:number;relatedFrom:string[]};
type Offer={id:string;name:string;description:string;price?:number;items:{productId:string;quantity:number}[]};
const money=(value:number)=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2}).format(value);
const imageOf=(p:Item)=>p.photos?.[0]?.url||'';
const cleanBrand=(value:string)=>value.replace(/\s{2,}/g,' ').trim();
const labelFor=(name:string)=>cleanBrand(name)||name;
// Reglas dirigidas, de un nivel: elegir A suma B/C/D, elegir B solo no suma A.
// Los artículos vinculados se cotizan como artículos independientes.
function expandSelection(items:Item[],roots:Record<string,number>):SelectedItem[]{
 const byId=new Map(items.map(item=>[item.id,item]));
 const totals=new Map<string,{direct:number;linked:number;from:string[]}>();
 const addQuantity=(id:string,quantity:number,isDirect:boolean,source?:string)=>{
  if(!byId.has(id))return;
  const current=totals.get(id)||{direct:0,linked:0,from:[]};
  if(isDirect)current.direct+=quantity;
  else{current.linked+=quantity;if(source&&!current.from.includes(source))current.from.push(source)}
  totals.set(id,current);
 };
 for(const [id,quantity] of Object.entries(roots)){
  const parent=byId.get(id);
  if(!parent||quantity<=0)continue;
  addQuantity(id,quantity,true);
  for(const relatedId of parent.relatedProductIds||[])addQuantity(relatedId,quantity,false,parent.name);
 }
 return items.filter(item=>totals.has(item.id)).map(item=>{
  const counts=totals.get(item.id)!;
  return {...item,quantity:counts.direct+counts.linked,directQuantity:counts.direct,relatedQuantity:counts.linked,relatedFrom:counts.from};
 });
}
function OutletPrice({item,quantity=1}:{item:Item;quantity?:number}) {
 if(!item.outlet)return null;
 return <div className="outlet-price"><del aria-label="Precio de lista">{money(item.outlet.list*quantity)}</del><strong>{money(item.outlet.price*quantity)}</strong><span>−{item.outlet.rate}%</span></div>;
}
export default function Storefront(){
 const [products,setProducts]=useState<Item[]>([]),[offers,setOffers]=useState<Offer[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [purchaseMode,setPurchaseMode]=useState<'normal'|'outlet'>('outlet');
 const [campaign,setCampaign]=useState(false),[resolvedKey,setResolvedKey]=useState('');
 const [quoteValue,setSelectedQuote]=useState<{total:number;monthly:number;down:number}|null>(null),[giftIds,setGiftIds]=useState<string[]>([]),[addIds,setAddIds]=useState<string[]>([]),[quoteBusy,setQuoteBusy]=useState(false),[quoteError,setQuoteError]=useState('');
 const [query,setQuery]=useState(''),[category,setCategory]=useState('Todas'),[subcategory,setSubcategory]=useState('Todas'),[detail,setDetail]=useState<Item|null>(null),[photoIndex,setPhotoIndex]=useState(0),[cartOpen,setCartOpen]=useState(false);
 const [catalogView,setCatalogView]=useState<'gallery'|'list'>('gallery'),[pageSize,setPageSize]=useState<10|20|40>(10),[catalogPage,setCatalogPage]=useState(1),[showMobileFilters,setShowMobileFilters]=useState(false),[justAdded,setJustAdded]=useState('');
 const [leadBusy,setLeadBusy]=useState(false),[leadError,setLeadError]=useState('');
 const [assistanceOpen,setAssistanceOpen]=useState(false),[assistanceInterest,setAssistanceInterest]=useState<{id:string;name:string}|null>(null);
  const [cart,setCart]=useState<Record<string,number>>({}),[payment,setPayment]=useState<Payment|null>(null),[months,setMonths]=useState(3),[financeMonths,setFinanceMonths]=useState(12),[giftId,setGiftId]=useState(''),[additionalId,setAdditionalId]=useState('');
 const [city,setCity]=useState(''),[customerName,setCustomerName]=useState(''),[phone,setPhone]=useState('');
 useEffect(()=>{let alive=true;const refresh=()=>fetch('/api/public/catalog',{cache:'no-store'}).then(r=>r.json() as Promise<{products:Item[];offers:Offer[];campaign:{active:boolean}}>).then(data=>{if(!data.products)throw new Error('No se pudo abrir el catálogo.');if(alive){setProducts(data.products.map(p=>({...p,name:labelFor(p.name),description:cleanBrand(p.description||''),components:(p.components||[]).map(part=>({...part,label:labelFor(part.label)})),warranty:p.warranty?{...p.warranty,label:cleanBrand(p.warranty.label),details:cleanBrand(p.warranty.details)}:p.warranty})));setOffers((data.offers||[]).map(o=>({...o,name:labelFor(o.name),description:cleanBrand(o.description||'')})));setCampaign(data.campaign.active);setError('')}}).catch(e=>{if(alive)setError(e.message)}).finally(()=>{if(alive)setLoading(false)});
 void refresh();const timers=[OUTLET_START,OUTLET_END].map(at=>{const delay=at-Date.now();return delay>0&&delay<2147483647?setTimeout(refresh,delay+250):undefined});window.addEventListener('focus',refresh);
 return()=>{alive=false;timers.forEach(clearTimeout);window.removeEventListener('focus',refresh)};
 },[]);
 const offerItems:Item[]=useMemo(()=>offers.map(o=>({id:`OF-${o.id}`,name:o.name,description:o.description,family:'Ofertas especiales',category:'',subcategory:'',isKitchenSet:true,isGiftEligible:false,isOffer:true,price:o.price,photos:[],components:o.items.map(i=>({label:products.find(p=>p.id===i.productId)?.name||i.productId,quantity:i.quantity}))})),[offers,products]);
 const campaignAvailable=campaign&&outletActive(clock),active=campaignAvailable&&purchaseMode==='outlet';
 const all=useMemo(()=>[...offerItems,...products],[offerItems,products]);
 const available=useMemo(()=>{
  const byId=new Map(all.map(p=>[p.id,p]));
  return all.filter(p=>!active||(!!p.outlet&&(p.relatedProductIds||[]).every(id=>!!byId.get(id)?.outlet)));
 },[all,active]);
 const categories=useMemo(()=>['Todas',...new Set(available.map(p=>p.category).filter(Boolean))].sort((a,b)=>a==='Todas'?-1:b==='Todas'?1:a.localeCompare(b,'es')),[available]);
 const subcategories=useMemo(()=>['Todas',...new Set(available.filter(p=>category==='Todas'||p.category===category).map(p=>p.subcategory).filter(Boolean))].sort((a,b)=>a==='Todas'?-1:b==='Todas'?1:a.localeCompare(b,'es')),[available,category]);
 const visible=useMemo(()=>available.filter(p=>(category==='Todas'||(category==='__none__'?!p.category:p.category===category))&&(subcategory==='Todas'||(subcategory==='__none__'?!p.subcategory:p.subcategory===subcategory))&&matchesProduct(p,query)),[available,category,subcategory,query]);
 useEffect(()=>{setCatalogPage(1)},[query,category,subcategory,active,pageSize]);
 const selectedFilterCount=Number(category!=='Todas')+Number(subcategory!=='Todas');
 const totalPages=Math.max(1,Math.ceil(visible.length/pageSize));
 const currentPage=Math.min(catalogPage,totalPages);
 const paginatedProducts=useMemo(()=>visible.slice((currentPage-1)*pageSize,currentPage*pageSize),[visible,currentPage,pageSize]);
 const pageNumbers=Array.from({length:Math.min(5,totalPages)},(_,index)=>Math.max(1,Math.min(totalPages-4,currentPage-2))+index);
 function goToCatalogPage(value:number){setCatalogPage(Math.max(1,Math.min(totalPages,value)));document.getElementById('catalogo')?.scrollIntoView({behavior:'smooth',block:'start'})}
 const roots=useMemo(()=>Object.fromEntries(Object.entries(cart).filter(([id])=>available.some(p=>p.id===id))),[cart,available]);
 const selected=useMemo(()=>expandSelection(all,roots),[all,roots]);
 const hasOutlet=active&&selected.some(p=>p.outlet),hasNormal=selected.some(p=>!active||!p.outlet);
 const allowBenefits=hasNormal;
 const effectivePayment=hasOutlet&&payment==='finance'?null:payment;
 const term=hasOutlet?0:payment==='finance'?financeMonths:payment==='card'?months:0;
 const chosenGift=allowBenefits&&products.some(p=>p.id===giftId&&p.isGiftEligible)?giftId:'',chosenAdditional=hasOutlet?'':additionalId;
 const quoteKey=JSON.stringify([roots,selected.map(p=>[p.id,p.quantity]),effectivePayment,term,chosenGift,chosenAdditional,hasOutlet,purchaseMode]);
 const selectedQuote=resolvedKey===quoteKey?quoteValue:null;
 useEffect(()=>{if(hasOutlet){setAdditionalId('');if(payment==='finance')setPayment(null)}if(!allowBenefits){setGiftId('')}},[hasOutlet,allowBenefits,payment]);
 const giftOptions=useMemo(()=>giftIds.map(id=>products.find(p=>p.id===id)).filter((p):p is Item=>!!p&&p.isGiftEligible),[products,giftIds]);
 const addOptions=useMemo(()=>products.filter(p=>addIds.includes(p.id)),[products,addIds]);
 const additional=products.find(p=>p.id===chosenAdditional);
 useEffect(()=>{if(!effectivePayment||!selected.length){setSelectedQuote(null);setGiftIds([]);setAddIds([]);setQuoteBusy(false);return}let cancelled=false;
  setQuoteBusy(true);const timer=setTimeout(()=>{fetch('/api/public/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:Object.entries(roots).map(([productId,quantity])=>({productId,quantity})),giftId:chosenGift,additionalId:chosenAdditional,payment:effectivePayment,months:term,purchaseMode:active?'outlet':'normal',expectedOutlet:hasOutlet})}).then(async r=>{const data=await r.json() as {error?:string;quote:{total:number;monthly:number;down:number};giftOptions:string[];addOptions:string[]};if(!r.ok)throw new Error(data.error||'No pudimos calcular el total.');return data}).then(data=>{if(cancelled)return;setSelectedQuote(data.quote);setResolvedKey(quoteKey);setGiftIds(data.giftOptions);setAddIds(data.addOptions);setQuoteError('')}).catch(e=>{if(!cancelled){setSelectedQuote(null);setQuoteError((e as Error).message);if(giftId)setGiftId('');if(additionalId)setAdditionalId('')}}).finally(()=>{if(!cancelled)setQuoteBusy(false)})},150);
  return()=>{cancelled=true;clearTimeout(timer)};
 },[quoteKey,products,offers]);
 const contactPhone=phone.replace(/\D/g,'').replace(/^52(?=\d{10}$)/,'');
 const contactReady=customerName.trim().length>=2&&/^\d{10}$/.test(contactPhone);
 const qty=selected.reduce((total,item)=>total+item.quantity,0);
 function chooseMode(mode:'normal'|'outlet'){
 if(mode===purchaseMode)return;
 setPurchaseMode(mode);setCategory('Todas');setSubcategory('Todas');setPayment(null);setGiftId('');setAdditionalId('');setSelectedQuote(null);setResolvedKey('');setGiftIds([]);setAddIds([]);
 }
 function add(p:Item,openCart=false){if(!available.some(item=>item.id===p.id))return;setCart(current=>({...current,[p.id]:(current[p.id]||0)+1}));setDetail(null);if(openCart){setJustAdded('');setCartOpen(true)}else{setJustAdded(p.name)}}
 useEffect(()=>{if(!justAdded)return;const timer=setTimeout(()=>setJustAdded(''),4500);return()=>clearTimeout(timer)},[justAdded]);
 function changeQty(id:string,delta:number){setCart(current=>{const next={...current},n=(next[id]||0)+delta;if(n<=0)delete next[id];else next[id]=n;return next})}
 function openDetail(p:Item){setDetail(p);setPhotoIndex(0)}
 async function whatsapp(){
  if(!selected.length||!contactReady||leadBusy)return;
  const pay=payment==='cash'?'Contado':payment==='card'?(hasOutlet?'Tarjeta, pago único':`${months} meses sin intereses`):payment==='finance'?`Financiamiento directo a ${financeMonths} meses`:'Por definir con el asesor';
  const parts=[
   'Hola, quiero recibir información sobre estos artículos de cocina.',
   `Nombre: ${customerName.trim()}`,
   `Teléfono: ${contactPhone}`,
   city?`Ciudad: ${city}`:'',
   `Modalidad de interés: ${active?'Outlet':'Compra Tradicional'}`,
   'Artículos de interés:',
   ...selected.map(p=>`• ${p.quantity} × ${p.name} (${visibleProductCode(p.id)})${active&&p.outlet?` — Precio Outlet ${money(p.outlet.price*p.quantity)}`:''}`),
   chosenGift?`Regalo elegido: ${products.find(p=>p.id===chosenGift)?.name||chosenGift}`:'',
   additional?`Producto adicional a precio especial: ${additional.name}`:'',
   `Forma de pago preferida: ${pay}`,
   selectedQuote&&!quoteBusy?`Total estimado de la propuesta: ${money(selectedQuote.total)}`:'',
   payment==='finance'&&selectedQuote&&!quoteBusy?`Anticipo estimado: ${money(selectedQuote.down)}; ${financeMonths} mensualidades de ${money(selectedQuote.monthly)}`:'',
   payment==='card'&&!hasOutlet&&selectedQuote&&!quoteBusy?`Mensualidad estimada: ${money(selectedQuote.monthly)}`:'',
   hasOutlet?OUTLET_NOTICE:'',
   'Deseo que me contacten para recibir asesoría. Entiendo que esta página no procesa pagos.'
  ];
  const message=parts.filter(Boolean).join('\n');
  // Se abre la pestaña en la interacción original para evitar bloqueadores de popups móviles.
  const popup=window.open('about:blank','_blank');
  if(popup){
   popup.document.title='Preparando WhatsApp';
   popup.document.body.textContent='Registrando tu consulta y preparando WhatsApp…';
  }
  setLeadBusy(true);setLeadError('');
  try{
   const primaryId=Object.keys(roots)[0];
   const primary=all.find(p=>p.id===primaryId);
   const response=await fetch('/api/public/leads',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
     customerName:customerName.trim(),phone:contactPhone,city,
     purchaseMode:active?'outlet':'normal',
     primaryProductId:primaryId,primaryProductName:primary?.name||primaryId,
     items:selected.map(p=>({productId:p.id,name:p.name,quantity:p.quantity})),
     giftId:chosenGift||null,giftName:chosenGift?products.find(p=>p.id===chosenGift)?.name||null:null,
     additionalId:chosenAdditional||null,additionalName:additional?.name||null,
     paymentPreference:effectivePayment,estimatedTotal:selectedQuote&&!quoteBusy?selectedQuote.total:null,
     whatsappMessage:message,visitFolio:null
    })
   });
   const data=await response.json().catch(()=>({})) as {error?:string;registered?:boolean};
   if(!response.ok||!data.registered)throw new Error(data.error||'No pudimos registrar tu solicitud. Intenta de nuevo.');
   const url='https://wa.me/526241710903?text='+encodeURIComponent(message);
   if(popup&&!popup.closed)popup.location.replace(url);
   else window.location.assign(url);
  }catch(error){
   if(popup&&!popup.closed)popup.close();
   setLeadError((error as Error).message);
  }finally{setLeadBusy(false)}
 }
 return <div className={active?"storefront outlet-store":"storefront"}>
<header className="store-header"><Link href="/vitrina" className="store-brand"><span className="store-emblem">C</span><span>Outlet de artículos de cocina</span></Link><nav aria-label="Navegación principal"><a href="#inicio">Inicio</a><a href="#catalogo">Catálogo</a><a href="#modalidades">Cómo comprar</a><a href="#experiencia">Asesoría</a></nav><a className="mobile-catalog-link" href="#catalogo">Catálogo</a><button className="store-cart" onClick={()=>setCartOpen(true)} aria-label={`Abrir selección, ${qty} artículos`}><ShoppingBag size={20}/><span>Mi selección</span><em>{qty}</em></button></header>
<section id="inicio" className="premium-hero"><div className="premium-hero-copy"><p className="overline">ARTÍCULOS DE COCINA</p><h1>Tu cocina merece <em>algo extraordinario.</em></h1><p>{campaignAvailable?'Explora nuestros artículos y elige entre Compra Tradicional y Outlet.':'Explora nuestros artículos y descubre las opciones de pago de Compra Tradicional.'}</p><div className="premium-hero-actions"><a href="#catalogo" className="hero-action">Ver artículos <ArrowRight size={17}/></a><a href="#modalidades" className="hero-secondary">{campaignAvailable?'Elegir modalidad':'Ver cómo comprar'}</a></div><small>Precios y condiciones según modalidad. Imágenes ilustrativas.</small></div><div className="premium-hero-media" role="img" aria-label="Artículos de cocina en acero inoxidable en una cocina luminosa"><div className="premium-hero-photo"></div><span className="premium-hero-stamp">COCINA · DISEÑO · CALIDAD</span></div></section>
<section id="modalidades" className="purchase-modes" aria-label="Elige cómo comprar"><div className="premium-section-heading"><p className="overline">TÚ ELIGES</p><h2>{campaignAvailable?'Elige tu forma de compra':'Compra Tradicional'}</h2><p>Selecciona cómo prefieres comprar. Puedes cambiar después.</p></div><div className="mode-options" role="group" aria-label="Modalidad de compra"><button type="button" aria-pressed={!active} onClick={()=>chooseMode('normal')} className={!active?'selected':''}><span className="mode-eyebrow">OPCIÓN FLEXIBLE</span><strong>Compra Tradicional</strong><span>Financiamiento directo sin tarjeta de crédito. Hasta 12 meses sin intereses con tarjetas de crédito participantes, y regalos aplicables en ambas formas de pago.</span><span className="mode-select">{!active?'✓ Seleccionada':'Elegir esta opción'} <ArrowRight size={16}/></span></button>{campaignAvailable&&<button type="button" aria-pressed={active} onClick={()=>chooseMode('outlet')} className={active?'selected outlet-option':'outlet-option'}><span className="mode-eyebrow">PROMOCIÓN TEMPORAL</span><strong>Compra Outlet <em>Hasta 40%</em></strong><span>Descuentos en productos seleccionados en pago de contado o con tarjetas de crédito participantes en una exhibición. Sin MSI ni regalos. Oferta válida hasta el 1 de diciembre de 2026.</span><span className="mode-select">{active?'✓ Seleccionada':'Elegir esta opción'} <ArrowRight size={16}/></span></button>}</div></section>
<section id="catalogo" className="catalog-section"><div className="catalog-heading"><div><p className="overline">COLECCIÓN COMPLETA</p><h2>Encuentra tu próximo favorito</h2><a className="catalog-mode-link" href="#modalidades">{active?'Precios Outlet':'Compra Tradicional'} · Cambiar modalidad</a></div><p aria-live="polite" aria-atomic="true">{query.trim()||category!=='Todas'||subcategory!=='Todas'?`${visible.length} resultados de ${available.length} artículos`:`${available.length} artículos para explorar`}</p></div><div className="catalog-tools"><div className="store-search"><Search size={20}/><Input aria-label="Buscar productos" placeholder="Busca productos, descripciones o piezas incluidas" value={query} onChange={e=>setQuery(e.target.value)}/></div><button type="button" className="mobile-filter-toggle" onClick={()=>setShowMobileFilters(open=>!open)} aria-expanded={showMobileFilters} aria-controls="catalog-filters-advanced"><SlidersHorizontal size={18}/> {categories.length>1?'Filtros':'Opciones'}{selectedFilterCount>0?` (${selectedFilterCount})`:''} <span>{showMobileFilters?'Ocultar':'Mostrar'}</span></button><div id="catalog-filters-advanced" className={`catalog-filter-options ${showMobileFilters?'is-open':''}`}>{categories.length>1&&<div className="category-filter"><label htmlFor="store-category-filter">Categoría</label><Select value={category} onValueChange={value=>{setCategory(value);setSubcategory('Todas')}}><SelectTrigger id="store-category-filter" className="category-filter-select"><SelectValue placeholder="Todas las categorías"/></SelectTrigger><SelectContent><SelectItem value="Todas">Todas las categorías</SelectItem><SelectItem value="__none__">Sin categoría</SelectItem>{categories.filter(cat=>cat!=='Todas').map(cat=><SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select><label htmlFor="store-subcategory-filter">Subcategoría</label><Select value={subcategory} onValueChange={setSubcategory} disabled={category==='Todas'||category==='__none__'}><SelectTrigger id="store-subcategory-filter" className="category-filter-select"><SelectValue placeholder="Todas las subcategorías"/></SelectTrigger><SelectContent><SelectItem value="Todas">Todas las subcategorías</SelectItem><SelectItem value="__none__">Sin subcategoría</SelectItem>{subcategories.filter(sub=>sub!=='Todas').map(sub=><SelectItem key={sub} value={sub}>{sub}</SelectItem>)}</SelectContent></Select></div>}
<div className="catalog-display-controls">
 <div className="catalog-view-switch" role="group" aria-label="Vista de productos">
  <button type="button" aria-pressed={catalogView==='gallery'} className={catalogView==='gallery'?'selected':''} onClick={()=>setCatalogView('gallery')}><LayoutGrid size={17}/> Galería</button>
  <button type="button" aria-pressed={catalogView==='list'} className={catalogView==='list'?'selected':''} onClick={()=>setCatalogView('list')}><List size={17}/> Lista</button>
 </div>
 <label className="catalog-page-size" htmlFor="catalog-page-size">Mostrar
  <select id="catalog-page-size" value={pageSize} onChange={event=>setPageSize(Number(event.target.value) as 10|20|40)}>
   <option value={10}>10</option><option value={20}>20</option><option value={40}>40</option>
  </select>artículos por página
 </label>
</div><div className="mobile-filter-actions"><button type="button" onClick={()=>{setCategory('Todas');setSubcategory('Todas')}} disabled={!selectedFilterCount}>Limpiar filtros</button><button type="button" onClick={()=>setShowMobileFilters(false)}>Ver {visible.length} artículos</button></div></div></div>
 {error?<div className="catalog-empty">{error}</div>:loading?<div className="catalog-empty">Preparando la colección…</div>:visible.length?<><div className={`product-grid ${catalogView==='list'?'is-list':'is-gallery'}`}>{paginatedProducts.map(p=><article className="store-card" key={p.id}><button className="card-media" onClick={()=>openDetail(p)} aria-label={`Ver ${p.name}`}>{imageOf(p)?<img src={imageOf(p)} alt={p.name} loading="lazy" decoding="async"/>:<span className="media-fallback"><span>{p.category||'Sin categoría'}</span><strong>{labelFor(p.name)}</strong><small>Ver detalles</small></span>}{p.isOffer&&<em>Selección especial</em>}{(p.relatedProductIds?.length||0)>0&&<span className="card-related">+{p.relatedProductIds?.length} vinculados</span>}{active&&p.outlet&&<span className="card-discount">−{p.outlet.rate}%</span>}</button><div className="card-copy">{p.category&&<span>{p.category+(p.subcategory?' / '+p.subcategory:'')}</span>}<h3>{p.name}</h3>{active&&p.outlet?<OutletPrice item={p}/>:<p className="regular-price">{typeof p.price==='number'?money(p.price):'Consulta precio'}</p>}<div className={`warranty-chip ${p.warranty?.status==='review'?'review':''}`}>{p.isOffer?'Garantía según artículos':p.warranty?.status==='verified'?`Garantía limitada · ${p.warranty.label}`:'Garantía por confirmar'}</div><div className="card-buttons"><button onClick={()=>openDetail(p)}>Ver detalles</button><button className="card-add" onClick={()=>add(p)} aria-label={`Agregar ${p.name}`}><Plus size={20}/></button></div></div></article>)}</div><nav className="catalog-pagination" aria-label="Paginación de productos">
 <p aria-live="polite">Mostrando {(currentPage-1)*pageSize+1}–{Math.min(currentPage*pageSize,visible.length)} de {visible.length} artículos · Página {currentPage} de {totalPages}</p>
 {totalPages>1&&<div className="catalog-page-buttons">
  <button type="button" onClick={()=>goToCatalogPage(currentPage-1)} disabled={currentPage===1} aria-label="Página anterior"><ChevronLeft size={17}/> Anterior</button>
  {pageNumbers.map(number=><button type="button" key={number} className={number===currentPage?'current':''} aria-label={`Página ${number}`} aria-current={number===currentPage?'page':undefined} onClick={()=>goToCatalogPage(number)}>{number}</button>)}
  <button type="button" onClick={()=>goToCatalogPage(currentPage+1)} disabled={currentPage===totalPages} aria-label="Página siguiente">Siguiente <ChevronRight size={17}/></button>
 </div>}
</nav></>:<div className="catalog-empty">No encontramos productos con esa búsqueda.</div>}</section>
 <section id="experiencia" className="store-outro"><p className="overline">ASESORÍA PERSONALIZADA</p><h2>¿Necesitas ayuda para elegir?</h2><p>Revisa precios y formas de pago de tu selección, o solicita una demostración o mantenimiento.</p><div className="outro-actions"><button type="button" onClick={()=>setCartOpen(true)}>Mi selección <ArrowRight size={17}/></button><button type="button" className="outro-assistance" onClick={()=>{setAssistanceInterest(null);setAssistanceOpen(true)}}>Solicitar asistencia <CalendarDays size={17}/></button></div></section><footer className="store-footer"><span>Artículos de cocina</span><a href="https://wa.me/526241710903" target="_blank" rel="noopener noreferrer">Asesoría por WhatsApp · 624 171 0903</a><Link href="/privacidad">Aviso de privacidad</Link></footer>
 {justAdded&&<div className="store-toast" role="status"><Check size={18}/><span>{justAdded} agregado a tu selección.</span><button type="button" onClick={()=>{setJustAdded('');setCartOpen(true)}}>Ver selección</button><button type="button" className="store-toast-close" onClick={()=>setJustAdded('')} aria-label="Cerrar confirmación">×</button></div>}
 <Sheet open={!!detail} onOpenChange={open=>{if(!open)setDetail(null)}}><SheetContent className="product-sheet"><SheetHeader><SheetTitle className="sr-only">Detalle del producto</SheetTitle><SheetDescription className="sr-only">Fotos y contenido de este producto</SheetDescription></SheetHeader>{detail&&<div className="product-detail"><div className="detail-picture">{detail.photos.length?<><img src={detail.photos[photoIndex]?.url||detail.photos[0].url} alt={detail.name}/>{detail.photos.length>1&&<div className="picture-arrows"><button onClick={()=>setPhotoIndex((photoIndex+detail.photos.length-1)%detail.photos.length)} aria-label="Foto anterior"><ChevronLeft/></button><span>{photoIndex+1} / {detail.photos.length}</span><button onClick={()=>setPhotoIndex((photoIndex+1)%detail.photos.length)} aria-label="Foto siguiente"><ChevronRight/></button></div>}</>:<div className="detail-picture-empty">Fotografía en preparación</div>}</div><div className="detail-body"><p className="overline">{detail.category?detail.category+(detail.subcategory?' / '+detail.subcategory:''):'Artículo de cocina'}</p><h2>{detail.name}</h2>{active&&<OutletPrice item={detail}/>}<p>{detail.description||'Explora las opciones disponibles de este producto.'}</p>{!!detail.relatedProductIds?.length&&<div className="related-preview"><h3>Se agrega junto con</h3><ul>{detail.relatedProductIds.map(id=><li key={id}><Check size={15}/>{products.find(p=>p.id===id)?.name||id}</li>)}</ul><small>Estos artículos se incorporan automáticamente, con su precio individual. Puedes adquirir cualquiera de ellos por separado.</small></div>}{detail.components.length>0&&<div className="includes"><h3>¿Qué incluye?</h3><ul>{detail.components.map((part,i)=><li key={`${part.label}-${i}`}><Check size={15}/>{part.quantity>1?`${part.quantity} × `:''}{part.label}</li>)}</ul></div>}<div className="warranty-detail"><small>INFORMACIÓN DE GARANTÍA</small><strong>{detail.isOffer?'Cobertura según artículos del set':detail.warranty?.status==='verified'?detail.warranty.label:'Cobertura por confirmar'}</strong><p>{detail.isOffer?'La garantía de cada artículo depende de su modelo y componentes.':detail.warranty?.details||'Consulta la cobertura aplicable antes de comprar.'}</p><small className="warranty-note">La cobertura y sus condiciones dependen de cada artículo. Consulta los términos y documentos correspondientes con un asesor.</small></div><button className="wide-action" onClick={()=>add(detail,true)}>Agregar {detail.relatedProductIds?.length?`los ${detail.relatedProductIds.length+1} artículos`:'y ver opciones de pago'} <Plus size={18}/></button><small>El precio estimado aparece al elegir una forma de pago.</small></div></div>}</SheetContent></Sheet>
 <Sheet open={cartOpen} onOpenChange={setCartOpen}><SheetContent className="cart-sheet"><SheetHeader><SheetTitle>Mi selección</SheetTitle><SheetDescription>Selecciona artículos, conoce precios informativos y envía tu interés por WhatsApp. Sin cobros en línea.</SheetDescription></SheetHeader><div className="cart-body"><p className="cart-mode-label">Modalidad: {active?'Outlet':'Compra Tradicional'}</p>{selected.length===0?<div className="cart-empty"><ShoppingBag size={32}/><h3>Tu selección está vacía</h3><p>Elige un producto para ver tus opciones.</p><Button onClick={()=>setCartOpen(false)}>Explorar productos</Button></div>:<><div className="cart-lines">{selected.map(p=><div className="cart-line" key={p.id}><div className="cart-thumb">{imageOf(p)?<img src={imageOf(p)} alt="" loading="lazy" decoding="async"/>:<span>{p.name.slice(0,2)}</span>}</div><div><strong>{p.name}</strong><small>{p.relatedQuantity>0?`Vinculado a ${p.relatedFrom.join(', ')} · ${p.relatedQuantity} incluido(s) automáticamente`:(p.category||'Artículo de cocina')}</small>{active&&<OutletPrice item={p} quantity={p.quantity}/>}</div><div className="qty-control"><button onClick={()=>changeQty(p.id,-1)} disabled={p.directQuantity===0} title={p.directQuantity===0?'Se quitará al retirar el artículo que lo vincula':undefined} aria-label={`Quitar uno de ${p.name}`}><Minus size={15}/></button><span title={p.relatedQuantity>0?`${p.directQuantity} directo(s) + ${p.relatedQuantity} vinculado(s)`:undefined}>{p.quantity}</span><button onClick={()=>changeQty(p.id,1)} aria-label={`Agregar uno de ${p.name}`}><Plus size={15}/></button></div></div>)}</div><div className="cart-lead-fields"><h3>Tus datos de contacto</h3><p>Prepararemos un mensaje de WhatsApp con tus artículos de interés. No se realizan cobros en esta página.</p><label htmlFor="lead-name">Nombre y apellido<Input id="lead-name" value={customerName} onChange={e=>setCustomerName(e.target.value)} maxLength={180} autoComplete="name" placeholder="Tu nombre"/></label><label htmlFor="lead-phone">Teléfono<Input id="lead-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} maxLength={18} placeholder="10 dígitos"/></label><label htmlFor="lead-city">Ciudad (opcional para WhatsApp)<Select value={city||'none'} onValueChange={v=>{setCity(v==='none'?'':v)}}><SelectTrigger id="lead-city" className="store-select"><SelectValue placeholder="Elige ciudad"/></SelectTrigger><SelectContent><SelectItem value="none">Seleccionar ciudad</SelectItem>{Object.keys(colonias).map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></label>{(customerName||phone)&&!contactReady&&<small className="lead-validation">Completa nombre y teléfono de 10 dígitos.</small>}<small className="lead-privacy">Registramos tu consulta antes de abrir WhatsApp para dar seguimiento, aunque no envíes el mensaje. <Link href="/privacidad" target="_blank">Aviso de privacidad</Link>.</small></div><div className="cart-section"><h3>¿Cómo prefieres pagarlo?</h3><RadioGroup value={payment||''} onValueChange={v=>setPayment(v as Payment)} className="pay-options"><label className={payment==='cash'?'active':''}><RadioGroupItem value="cash"/> Contado <small>{hasOutlet?'Pago en una sola exhibición':'10% de descuento en los productos de tu selección'}</small></label><label className={payment==='card'?'active':''}><RadioGroupItem value="card"/> {hasOutlet?'Tarjeta de crédito':'Meses sin intereses'} <small>{hasOutlet?'Un solo pago · Sin meses sin intereses':'Con una o varias tarjetas de crédito participantes'}</small></label>{!hasOutlet&&<label className={payment==='finance'?'active':''}><RadioGroupItem value="finance"/> Financiamiento sin tarjeta <small>Anticipo y mensualidades estimadas</small></label>}</RadioGroup>{!hasOutlet&&payment==='card'&&<div className="term-options" role="group" aria-label="Plazo a meses sin intereses">{[3,6,12].map(n=><button key={n} className={months===n?'active':''} onClick={()=>setMonths(n)}>{n} meses</button>)}</div>}{!hasOutlet&&payment==='finance'&&<div className="term-options" role="group" aria-label="Plazo de financiamiento">{[12,18,24].map(n=><button key={n} className={financeMonths===n?'active':''} onClick={()=>setFinanceMonths(n)}>{n} meses</button>)}</div>}</div>
 {hasOutlet&&<p className="outlet-cart-notice">{OUTLET_NOTICE}</p>}
 {effectivePayment&&<>{allowBenefits&&giftOptions.length>0&&<div className="cart-section"><div className="section-title"><Gift size={20}/><h3>Elige un regalo sugerido</h3></div><p>{hasOutlet?'El regalo se calcula solo con los productos fuera de Outlet.':'Estos productos califican según tu selección original. Escoge uno, sin costo adicional.'}</p><div className="gift-list">{giftOptions.map(p=><button key={p.id} className={giftId===p.id?'active':''} onClick={()=>setGiftId(giftId===p.id?'':p.id)}><span>{p.name}</span>{giftId===p.id&&<Check size={18}/>}</button>)}</div></div>}{!hasOutlet&&<div className="cart-section"><h3>No te quedes con las ganas</h3><p>Agrega tu producto favorito a un precio especial.</p><Select value={additionalId||'none'} onValueChange={v=>setAdditionalId(v==='none'?'':v)}><SelectTrigger className="store-select"><SelectValue placeholder="Elegir producto adicional"/></SelectTrigger><SelectContent><SelectItem value="none">Sin producto adicional</SelectItem>{addOptions.map(p=><SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><small>Tu regalo se calcula con la selección original.</small></div>}<div className="quote-card">{quoteError&&<p role="alert">{quoteError}</p>}<span>Precio total estimado</span><strong>{quoteBusy?'Calculando…':selectedQuote?money(selectedQuote.total):'Elige una opción de pago'}</strong>{!hasOutlet&&payment==='card'&&<p>{months} mensualidades aproximadas de {money(selectedQuote?.monthly||0)}</p>}{payment==='finance'&&<><p>Anticipo: {money(selectedQuote?.down||0)}</p><p>{financeMonths} mensualidades de {money(selectedQuote?.monthly||0)}</p></>}{!hasOutlet&&payment==='cash'&&<p>Incluye el descuento de contado sobre tu selección original.</p>}</div><div className="cart-section visit"><button type="button" className="visit-toggle" onClick={()=>{setAssistanceInterest(selected[0]?{id:selected[0].id,name:selected[0].name}:null);setCartOpen(false);setAssistanceOpen(true)}}><CalendarDays size={20}/> Solicitar asistencia <span>→</span></button></div></> }<div className="lead-submit"><button type="button" disabled={!contactReady||leadBusy} onClick={()=>void whatsapp()}><MessageCircle size={18}/>{leadBusy?"Registrando consulta…":"Enviar mi interés por WhatsApp"}</button>{leadError&&<p className="lead-submission-error" role="alert">{leadError}</p>}<small>Al continuar registramos tu consulta y el mensaje preparado para darle seguimiento, aunque decidas no enviarlo. WhatsApp se abrirá para que confirmes el envío.</small></div></>}</div></SheetContent></Sheet>
 <AssistanceRequest open={assistanceOpen} onOpenChange={setAssistanceOpen} defaultName={customerName} defaultPhone={phone} interestProduct={assistanceInterest}/>
 </div>;
}
