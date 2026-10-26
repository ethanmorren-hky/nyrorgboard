/* Shared table controls (RD-009, part 1): every table sorts by tapping a header, shows the same ▲/▼ and aria-sort,
   and remembers its sort on this device. Tables that already sort themselves (Ops contracts, League contracts, House
   players, Market screener, Iceberg players) keep their own logic; this fills in the rest. A table opts out with
   data-nosort; tables whose row order means something (section rows with colspan) are left alone. */
(function(){
const KEY='nyr-sort:'+location.pathname.split('/').pop()+location.hash.replace(/^#$/,'');
const load=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; } };
const save=v=>{ try{ localStorage.setItem(KEY,JSON.stringify(v)); }catch(e){} };
const st=document.createElement('style');
st.textContent=`th.nts{cursor:pointer;user-select:none}th.nts:hover{color:var(--ink,#0d1a2d)}th.nts .nta{font-size:.85em;opacity:.8}`;
document.head.appendChild(st);

function num(s){
  const t=s.replace(/[−–]/g,'-').replace(/[,\s]/g,'');
  const m=t.match(/^[+]?(-?)\$?(-?\d*\.?\d+)([MKk%]?)/);
  if(!m) return null;
  let v=parseFloat((m[1]||'')+m[2]); if(m[3]==='M') v*=1e6; else if(m[3]==='K'||m[3]==='k') v*=1e3;
  return v;
}
function own(table){ return table.querySelector('th[data-k],th[data-lk],th[data-hk],th button,th[aria-sort]:not(.nts)'); }
function idOf(table){
  if(table.id) return table.id;
  const all=[...document.querySelectorAll('table')]; return 't'+all.indexOf(table);
}
function sortBy(table,col,dir){
  const tb=table.tBodies[0]; if(!tb) return;
  const rows=[...tb.rows];
  const keyed=rows.map((r,i)=>{ const c=r.cells[col]; const s=c?c.textContent.trim():''; return {r,i,s,n:num(s)}; });
  const isNum=keyed.filter(k=>k.s&&k.s!=='–'&&k.s!=='-').every(k=>k.n!==null);
  keyed.sort((a,b)=>{
    if(isNum){ if(a.n===null) return 1; if(b.n===null) return -1; return (a.n-b.n)*dir||a.i-b.i; }
    return a.s.localeCompare(b.s)*dir||a.i-b.i;
  });
  keyed.forEach(k=>tb.appendChild(k.r));
  const ths=table.tHead.rows[table.tHead.rows.length-1].cells;
  [...ths].forEach((th,i)=>{ th.querySelector('.nta')?.remove(); th.removeAttribute('aria-sort');
    if(i===col){ th.setAttribute('aria-sort',dir>0?'ascending':'descending'); const a=document.createElement('span'); a.className='nta'; a.textContent=dir>0?' ▲':' ▼'; th.appendChild(a); } });
}
function enhance(table){
  if(table.dataset.nosort!==undefined||!table.tHead||!table.tBodies[0]||table.tHead.dataset.nt) return;   // marked on thead: pages re-render tables in place
  const H=table.tHead;
  if(own(table)) { H.dataset.nt='own'; return; }
  const body=table.tBodies[0];
  if(body.rows.length<3) return;   // still loading, or too short to need sorting; look again on the next render
  if(body.querySelector('td[colspan],th[colspan]')||table.tHead.rows.length!==1) { H.dataset.nt='skip'; return; }
  H.dataset.nt='1';
  const id=idOf(table), saved=load();
  const ths=[...table.tHead.rows[0].cells];
  ths.forEach((th,i)=>{ if(!th.textContent.trim()) return; th.classList.add('nts'); th.tabIndex=0;
    const go=()=>{ const cur=load()[id]; const dir=cur&&cur.c===i?-cur.d:(i===0?1:-1); sortBy(table,i,dir); const v=load(); v[id]={c:i,d:dir}; save(v); };
    th.addEventListener('click',e=>{ if(e.target.closest('.gtag')) return; go(); });
    th.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } }); });
  if(saved[id]&&saved[id].c<ths.length) sortBy(table,saved[id].c,saved[id].d);
}
let q=null;
function scan(){ document.querySelectorAll('table').forEach(enhance); }
function boot(){ scan(); new MutationObserver(()=>{ clearTimeout(q); q=setTimeout(scan,120); }).observe(document.body,{childList:true,subtree:true}); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
