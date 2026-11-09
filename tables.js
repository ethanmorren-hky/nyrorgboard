/* Shared table controls (RD-009): every table sorts by tapping a header, shows the same ▲/▼ and aria-sort,
   and remembers its sort on this device. Part 2: filter chips on longer tables with a position/team/status column,
   and window.nyrNums(), the "Show the numbers" table pages put under each chart. Tables that already sort themselves (Ops contracts, League contracts, House
   players, Market screener, Iceberg players) keep their own logic; this fills in the rest. A table opts out with
   data-nosort (data-nochips for chips, on tables that already filter the full list themselves); tables whose row order means something (section rows with colspan) are left alone. */
(function(){
const KEY='nyr-sort:'+location.pathname.split('/').pop()+location.hash.replace(/^#$/,'');
const load=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; } };
const save=v=>{ try{ localStorage.setItem(KEY,JSON.stringify(v)); }catch(e){} };
const st=document.createElement('style');
st.textContent=`th.nts{cursor:pointer;user-select:none}th.nts:hover{color:var(--ink,#0d1a2d)}th.nts .nta{font-size:.85em;opacity:.8}
.ntchips{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0 6px;font-size:12px;color:var(--muted,#6d7b90)}
.ntchips button{all:unset;cursor:pointer;font-size:12px;font-weight:600;padding:3px 9px;border-radius:999px;border:1px solid var(--line,#d6dee9);color:var(--ink,#0d1a2d)}
.ntchips button[aria-pressed="true"]{background:var(--ink,#0d1a2d);color:var(--board,#fff);border-color:var(--ink,#0d1a2d)}
.ntchips button:focus-visible{outline:2px solid var(--blue,#0038a8);outline-offset:2px}@media (pointer:coarse){.ntchips button{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px}}
tr.ntf-hide{display:none}
details.nn{margin-top:6px;border-top:1px solid var(--line-2,var(--line,#e3e8ef))}
details.nn>summary{cursor:pointer;padding:8px 2px;font-size:13px;font-weight:600;color:var(--blue,#0038a8)}
details.nn .nnw{overflow-x:auto;max-height:360px;overflow-y:auto}
details.nn table{width:100%;border-collapse:collapse;font-size:12.5px}
details.nn th,details.nn td{padding:4px 8px;border-bottom:1px solid var(--line-2,var(--line,#e3e8ef));text-align:left;white-space:nowrap}
details.nn th{position:sticky;top:0;background:var(--board,#fff);font-weight:600;color:var(--ink-2,var(--muted,#3a4a60))}
details.nn td.r,details.nn th.r{text-align:right;font-family:var(--f-mono,ui-monospace,monospace)}`;
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
/* filter chips: one row of chips on tables with 8+ rows and a short-list column (position, team, status, grade,
   league, type). Position groups into F / D / G. Works alongside a page's own sort: rows are hidden, never removed. */
const CHIPCOL=/^(pos|position|team|status|grade|league|type)$/i;
const posGrp=v=>/G/.test(v)?'G':/D/.test(v)?'D':'F';
function chips(table){
  if(table.dataset.nochips!==undefined||!table.tHead||!table.tBodies[0]) return;
  const body=table.tBodies[0], rows=[...body.rows].filter(r=>!r.querySelector('td[colspan]'));
  const prev=table.previousElementSibling, has=prev&&prev.classList.contains('ntchips')?prev:null;
  if(rows.length<8){ if(has) has.remove(); return; }
  const head=table.tHead.rows[table.tHead.rows.length-1]; if(!head) return;
  const id=idOf(table);
  let col=-1, key=null, vals=null;
  [...head.cells].some((th,i)=>{ const c=th.cloneNode(true); c.querySelectorAll('.gtag,.nta').forEach(x=>x.remove()); const t=c.textContent.replace(/[▲▼]/g,'').trim(); if(!CHIPCOL.test(t)) return false;   // header text without glossary tags
    const pos=/^pos/i.test(t), get=r=>{ const c=r.cells[i]; const x=c?c.textContent.trim():''; return pos&&x?posGrp(x):x; };
    const set=[...new Set(rows.map(get).filter(Boolean))]; if(set.length<2||set.length>6) return false;
    col=i; key=t; vals=pos?['F','D','G'].filter(v=>set.includes(v)):set.sort(); table._ntget=get; return true; });
  if(col<0){ if(has) has.remove(); return; }
  const saved=load()['f:'+id], cur=saved&&saved.k===key&&vals.includes(saved.v)?saved.v:'';
  const sig=key+'|'+vals.join(',')+'|'+cur;
  let bar=has;
  if(!bar||bar.dataset.sig!==sig){
    if(!bar){ bar=document.createElement('div'); bar.className='ntchips'; bar.dataset.noglossary=''; table.parentNode.insertBefore(bar,table); }
    bar.dataset.sig=sig; bar.setAttribute('role','group'); bar.setAttribute('aria-label','Filter by '+key);
    bar.innerHTML=`<span>${key}</span>`+['',...vals].map(v=>`<button type="button" data-v="${v}" aria-pressed="${v===cur}">${v||'All'}</button>`).join('');
    bar.onclick=e=>{ const b=e.target.closest('button'); if(!b) return; const v=load(); v['f:'+id]={k:key,v:b.dataset.v}; save(v); chips(table); };
  }
  rows.forEach(r=>r.classList.toggle('ntf-hide',!!cur&&table._ntget(r)!==cur));
}
/* "Show the numbers" under a chart: nyrNums(chartEl, key, columns, rows[, summary]). columns are [label, 'r' for
   right-aligned numbers]; rows are arrays of display text. The table sits right after the chart element, keeps its
   open/closed state across re-renders, and sorts like every other table. nyrNumsHTML() returns the same as a string. */
const NNOPEN={};
function nnHTML(key,cols,rows,summary){
  const e=v=>String(v??'–').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  return `<details class="nn raw" data-nn="${e(key)}"${NNOPEN[key]?' open':''}><summary>${e(summary||'Show the numbers')}</summary><div class="nnw"><table><thead><tr>${cols.map(c=>`<th${c[1]==='r'?' class="r"':''}>${e(c[0])}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((v,i)=>`<td${cols[i]&&cols[i][1]==='r'?' class="r"':''}>${e(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
}
document.addEventListener('toggle',e=>{ const d=e.target; if(d.matches&&d.matches('details.nn')) NNOPEN[d.dataset.nn]=d.open; },true);
window.nyrNumsHTML=(key,cols,rows,summary)=>rows&&rows.length?nnHTML(key,cols,rows,summary):'';
window.nyrNums=function(el,key,cols,rows,summary){
  if(typeof el==='string') el=document.querySelector(el); if(!el) return;
  const owner=el.id||key; let nx=el.nextElementSibling; if(!(nx&&nx.matches('details.nn')&&nx.dataset.nnOwner===owner)) nx=null;
  if(!rows||!rows.length){ if(nx) nx.remove(); return; }
  const t=document.createElement('div'); t.innerHTML=nnHTML(key,cols,rows,summary); const d=t.firstChild; d.dataset.nnOwner=owner;
  if(nx) nx.replaceWith(d); else el.insertAdjacentElement('afterend',d);
};

(window.__nnq||[]).forEach(a=>window.nyrNums(...a)); window.__nnq=[];

let q=null;
function scan(){ document.querySelectorAll('table').forEach(t=>{ enhance(t); chips(t); }); }
function boot(){ scan(); new MutationObserver(()=>{ clearTimeout(q); q=setTimeout(scan,120); }).observe(document.body,{childList:true,subtree:true}); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
