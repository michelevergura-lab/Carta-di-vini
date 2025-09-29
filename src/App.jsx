import React, { useEffect, useReducer, useState } from "react";

/* ================= ErrorBoundary (ripristino stabile) ================= */
class ErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state={hasError:false}; }
  static getDerivedStateFromError(){ return {hasError:true}; }
  componentDidCatch(err,info){ console.error("Cantina crash:", err, info); }
  render(){ return this.state.hasError ? (
    <div style={{padding:12,background:'#fff0f0',color:'#7B1E3A'}}>Si è verificato un errore. Ricarica la pagina.</div>
  ) : this.props.children; }
}

/* ================= Costanti & Tema ================= */
const STORAGE_KEY = "cantina-app-v1";
const COLORS = ["Rosso","Bianco","Rosè"]; // iniziali maiuscole
const STYLES = ["Secco","Dolce"];
const TYPES  = ["Fermo","Frizzante","Spumante"];
const COLOR_HEX = { Rosso:'#dc2626', Bianco:'#16a34a', Rosè:'#ec4899' };
const THEME = { bg:'#F5F0E1', card:'#ffffff', text:'#2B2B2B', accent:'#6B2737', line:'rgba(0,0,0,.08)', primary:'#C9A227' };

/* ================= Storage sicuro ================= */
const canStore=()=>{ try{ if(typeof window==='undefined')return false; const k='__t'; localStorage.setItem(k,'1'); localStorage.removeItem(k); return true;}catch{return false}};
const HAS_LS = canStore();
const safeLoad = ()=>{ if(!HAS_LS) return {wines:[]}; try{const r=localStorage.getItem(STORAGE_KEY); return r?{wines:(JSON.parse(r).wines||[]).map(w=>({...w}))}:{wines:[]};}catch{return {wines:[]}} };
const safeSave = (s)=>{ if(!HAS_LS) return; try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }catch{} };

/* ================= Reducer (immutabile) ================= */
function reducer(state, action){
  switch(action.type){
    case 'ADD': return { ...state, wines:[...state.wines, {...action.w}] };
    case 'UPDATE': return { ...state, wines: state.wines.map(x=> x.id===action.w.id? {...action.w}: x) };
    default: return state;
  }
}

/* ================= Utils ================= */
const uid = ()=> Math.random().toString(36).slice(2);
const norm = (v,opts)=>{ const s=(v||'').toLowerCase(); return opts.find(o=>o.toLowerCase()===s)||'' };
const normRating = v=>{ const n=Number(v); return Number.isFinite(n)? Math.max(0,Math.min(5,Math.round(n))):0 };
const matchesQuery = (w,q)=>{ const s=(q||'').trim().toLowerCase(); if(!s) return true; return [w.name,w.producer,w.region,w.appellation,w.grapes,w.notes,w.color,w.style,w.type,w.vintage,w.organic?'BIO':'']
  .filter(Boolean).join(' ').toLowerCase().includes(s); };
const passesQuick = (w,f)=> (!f.color||w.color===f.color) && (!f.style||w.style===f.style) && (!f.type||w.type===f.type) && (!f.organic || (f.organic==='BIO'?!!w.organic:!w.organic));
const sorter = (key,dir)=> (a,b)=>{const av=a[key]??''; const bv=b[key]??''; const A=(typeof av==='number')?av:String(av).toLowerCase(); const B=(typeof bv==='number')?bv:String(bv).toLowerCase(); const c=A<B?-1:A>B?1:0; return dir==='asc'?c:-c;};

/* ================= Icona grappolo + rating ================= */
const Grape=({filled,size=16})=> (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill={filled?'#7c3aed':'none'} stroke={filled?'#7c3aed':'#6b7280'} strokeWidth="1.6">
    <circle cx="12" cy="5" r="2.2"/><circle cx="9" cy="8.5" r="2.2"/><circle cx="15" cy="8.5" r="2.2"/><circle cx="12" cy="12" r="2.2"/>
  </svg>
);
const Rating=({value=0,onChange,readOnly})=> (
  <span>{[1,2,3,4,5].map(n=> (
    <button key={n} type="button" onClick={()=>!readOnly&&onChange?.(n)} style={{background:'transparent',border:'none',padding:0,cursor:readOnly?'default':'pointer'}} aria-label={`Valuta ${n}`}>
      <Grape filled={n<=normRating(value)} />
    </button>))}
  </span>
);

/* ================= App ================= */
export default function App(){
  const [state,dispatch] = useReducer(reducer,{wines:[]},safeLoad);
  const [query,setQuery] = useState('');
  const [filters,setFilters] = useState({color:'',style:'',type:'',organic:''}); // SOLO filtri rapidi
  const [sort,setSort] = useState({key:'name',dir:'asc'});
  const [form,setForm]   = useState({ id:'', name:'', vintage:'', region:'', appellation:'', producer:'', color:'', style:'', type:'', grapes:'', organic:false, rating:0, notes:'' });
  const [edit,setEdit] = useState(null);
  useEffect(()=>safeSave(state),[state]);

  const list = [...state.wines]
    .filter(w=>matchesQuery(w,query))
    .filter(w=>passesQuick(w,filters))
    .sort(sorter(sort.key,sort.dir));

  function save(){
    if(!form.name.trim()) return;
    const w={ id:uid(), name:form.name.trim(), vintage:String(form.vintage||'').trim(), region:form.region.trim(), appellation:form.appellation.trim(), producer:form.producer.trim(), color:norm(form.color,COLORS), style:norm(form.style,STYLES), type:norm(form.type,TYPES), grapes:form.grapes.trim(), organic:!!form.organic, rating:normRating(form.rating), notes:form.notes };
    dispatch({type:'ADD', w});
    setForm({ id:'', name:'', vintage:'', region:'', appellation:'', producer:'', color:'', style:'', type:'', grapes:'', organic:false, rating:0, notes:''});
  }
  function startEdit(w){ setEdit({...w}); }
  function applyEdit(){ if(!edit) return; dispatch({type:'UPDATE', w:{...edit, color:norm(edit.color,COLORS), style:norm(edit.style,STYLES), type:norm(edit.type,TYPES), rating:normRating(edit.rating)}}); setEdit(null); }

  function exportCSV(){
    const header=["Nome","Annata","Regione","Denominazione","Azienda","Colore","Stile","Tipo","BIO","Valutazione","Vitigni","Note"];
    const rows=list.map(w=>[w.name,w.vintage,w.region,w.appellation,w.producer,w.color,w.style,w.type,w.organic?'BIO':'',w.rating,w.grapes,(w.notes||'').replace(/\n/g,' ')]);
    const csv='\uFEFF'+[header,...rows].map(r=>r.map(c=>`"${String(c??'').replace(/"/g,'""')}"`).join(';')).join('\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})); a.setAttribute('download','catalogo_vini.csv'); document.body.appendChild(a); a.click(); a.remove();
  }

  const th=(k,label)=> <th onClick={()=> setSort(s=> s.key===k?{key:k,dir:s.dir==='asc'?'desc':'asc'}:{key:k,dir:'asc'})} style={{textAlign:'left',cursor:'pointer',padding:'6px 8px',borderBottom:`1px solid ${THEME.line}`}}>{label}{sort.key===k?(sort.dir==='asc'?' ↑':' ↓'):''}</th>;
  const td=(c,strong)=> <td style={{padding:'6px 8px',borderBottom:`1px solid ${THEME.line}`,fontWeight:strong?600:400,whiteSpace:'nowrap',textOverflow:'ellipsis',overflow:'hidden'}}>{c}</td>;

  return (
    <ErrorBoundary>
      <div style={{minHeight:'100vh',background:THEME.bg,color:THEME.text,fontFamily:'ui-sans-serif, system-ui',padding:12}}>
        {/* Barra comandi */}
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cerca (Nome, Azienda, Regione, Denominazione, Vitigni, Note, Annata, Colore/Stile/Tipo/BIO)" style={{flex:1,minWidth:240,padding:8,border:'1px solid '+THEME.line,borderRadius:8,background:'#fff'}}/>
          <select value={filters.color} onChange={e=>setFilters(f=>({...f,color:e.target.value}))} style={{padding:8,border:'1px solid '+THEME.line,borderRadius:8,background:'#fff'}}>
            <option value="">Colore</option>{COLORS.map(x=><option key={x} value={x}>{x}</option>)}
          </select>
          <select value={filters.style} onChange={e=>setFilters(f=>({...f,style:e.target.value}))} style={{padding:8,border:'1px solid '+THEME.line,borderRadius:8,background:'#fff'}}>
            <option value="">Stile</option>{STYLES.map(x=><option key={x} value={x}>{x}</option>)}
          </select>
          <select value={filters.type}  onChange={e=>setFilters(f=>({...f,type:e.target.value}))}  style={{padding:8,border:'1px solid '+THEME.line,borderRadius:8,background:'#fff'}}>
            <option value="">Tipo</option>{TYPES.map(x=><option key={x} value={x}>{x}</option>)}
          </select>
          <select value={filters.organic} onChange={e=>setFilters(f=>({...f,organic:e.target.value}))} style={{padding:8,border:'1px solid '+THEME.line,borderRadius:8,background:'#fff'}}>
            <option value="">BIO</option><option value="BIO">BIO</option><option value="NO">Non BIO</option>
          </select>
          <button onClick={()=>setFilters({color:'',style:'',type:'',organic:''})} style={{padding:'8px 10px',border:'1px solid '+THEME.line,borderRadius:8,background:'#fff'}}>Reset</button>
          <button onClick={exportCSV} style={{padding:'8px 10px',border:'none',borderRadius:8,background:THEME.primary,color:'#000'}}>Export CSV</button>
        </div>

        {/* Form aggiunta / modifica */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8,marginTop:10,background:THEME.card,padding:8,borderRadius:8,border:'1px solid '+THEME.line}}>
          {['name','vintage','region','appellation','producer','color','style','type','grapes'].map((k)=> (
            k==='color'? (
              <select key={k} value={(edit?edit:form)[k]||''} onChange={e=> (edit? setEdit(v=>({...v,[k]:e.target.value})): setForm(v=>({...v,[k]:e.target.value})))} style={{padding:8,border:'1px solid '+THEME.line,borderRadius:8}}>
                <option value="">Colore</option>{COLORS.map(x=><option key={x} value={x}>{x}</option>)}
              </select>
            ) : k==='style'? (
              <select key={k} value={(edit?edit:form)[k]||''} onChange={e=> (edit? setEdit(v=>({...v,[k]:e.target.value})): setForm(v=>({...v,[k]:e.target.value})))} style={{padding:8,border:'1px solid '+THEME.line,borderRadius:8}}>
                <option value="">Stile</option>{STYLES.map(x=><option key={x} value={x}>{x}</option>)}
              </select>
            ) : k==='type'? (
              <select key={k} value={(edit?edit:form)[k]||''} onChange={e=> (edit? setEdit(v=>({...v,[k]:e.target.value})): setForm(v=>({...v,[k]:e.target.value})))} style={{padding:8,border:'1px solid '+THEME.line,borderRadius:8}}>
                <option value="">Tipo</option>{TYPES.map(x=><option key={x} value={x}>{x}</option>)}
              </select>
            ) : (
              <input key={k} value={(edit?edit:form)[k]||''} onChange={e=> (edit? setEdit(v=>({...v,[k]:e.target.value})): setForm(v=>({...v,[k]:e.target.value})))} placeholder={k==='name'?'Nome vino':k.charAt(0).toUpperCase()+k.slice(1)} style={{padding:8,border:'1px solid '+THEME.line,borderRadius:8}}/>
            )
          ))}
          <label style={{display:'flex',alignItems:'center',gap:6}}>
            <input type="checkbox" checked={(edit?edit:form).organic||false} onChange={e=> (edit? setEdit(v=>({...v,organic:e.target.checked})): setForm(v=>({...v,organic:e.target.checked})))} /> Biologico
          </label>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span>Valutazione:</span>
            <Rating value={(edit?edit:form).rating||0} onChange={n=> (edit? setEdit(v=>({...v,rating:n})): setForm(v=>({...v,rating:n})))} />
          </div>
          <textarea value={(edit?edit:form).notes||''} onChange={e=> (edit? setEdit(v=>({...v,notes:e.target.value})): setForm(v=>({...v,notes:e.target.value})))} placeholder="Note" style={{gridColumn:'1/-1',padding:8,border:'1px solid '+THEME.line,borderRadius:8}}/>
          {!edit ? (
            <button onClick={save} style={{padding:'8px 12px',border:'none',borderRadius:8,background:THEME.primary,color:'#000'}}>Salva vino</button>
          ) : (
            <div style={{display:'flex',gap:8}}>
              <button onClick={applyEdit} style={{padding:'8px 12px',border:'none',borderRadius:8,background:THEME.primary,color:'#000'}}>Salva modifiche</button>
              <button onClick={()=>setEdit(null)} style={{padding:'8px 12px',border:'1px solid '+THEME.line,borderRadius:8,background:'#fff'}}>Annulla</button>
            </div>
          )}
        </div>

        {/* Tabella */}
        <div style={{marginTop:12,overflowX:'auto',background:THEME.card,border:'1px solid '+THEME.line,borderRadius:8}}>
          <table style={{width:'100%',fontSize:14,minWidth:960}}>
            <thead style={{position:'sticky',top:0,background:'rgba(245,240,225,.8)'}}>
              <tr>
                {th('name','Nome')}{th('vintage','Annata')}{th('region','Regione')}{th('appellation','Denominazione')}{th('producer','Azienda')}{th('color','Colore')}{th('style','Stile')}{th('type','Tipo')}{th('organic','Bio')}{th('rating','Valutazione')}{th('grapes','Vitigni')}
              </tr>
            </thead>
            <tbody>
              {list.map(w=> (
                <tr key={w.id} onClick={()=>startEdit(w)} style={{cursor:'pointer'}}>
                  {td(w.name,true)}
                  {td(w.vintage||'—')}
                  {td(w.region||'—')}
                  {td(w.appellation||'—')}
                  {td(w.producer||'—')}
                  {td(w.color? <span style={{color:COLOR_HEX[w.color],fontWeight:600}}>{w.color}</span> : '—')}
                  {td(w.style||'—')}
                  {td(w.type||'—')}
                  {td(w.organic?'✓':'—')}
                  {td(w.rating>0? <Rating value={w.rating} readOnly/> : '—')}
                  {td(w.grapes||'—')}
                </tr>
              ))}
              {list.length===0 && (<tr><td colSpan={11} style={{textAlign:'center',padding:10,color:THEME.accent}}>Nessun vino trovato.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </ErrorBoundary>
  );
}
