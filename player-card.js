/* One player card (RD-005), opened from any page: Contract, Stats, Impact and Value tabs, percentile bars for his
   position on top, and "Trade for" / "Compare" that feed the Ops Board trade builder. Data: league.json (contract, bio,
   box-score stats), market.json (value), iceberg.json (impact, percentiles), form.json (recent form), loaded only when a card first opens.
   Open with NYRCard.open(ppOrNhlId) or any element with data-card="<pp or NHL id>". */
(function(){
const V=(document.currentScript&&new URL(document.currentScript.src,location.href).searchParams.get('v'))||'';
const q=u=>fetch(u+(V?`?v=${V}`:'')).then(r=>r.ok?r.json():null).catch(()=>null);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>v==null?'–':(Math.abs(v)>=1e6?`$${(v/1e6).toFixed(2)}M`:`$${Math.round(v/1e3)}K`);
const smoney=v=>v==null?'–':(v>=0?'+':'−')+money(Math.abs(v));
let L=null, M=null, IB=null, IBi=null, FM=null, LN=null;
function join(d){   // RD-002 join, for pages that don't define nyrLoad
  if(!d||!d.joinFields||!L) return d; const by=new Map(L.players.map(p=>[p.pp,p])), F=d.joinFields;
  for(const r of d.players||[]){ const m=r._j; if(!m) continue; const p=by.get(r.pp); if(p) F.forEach((k,i)=>{ if(m&(1<<i)) r[k]=p[k]; }); delete r._j; }
  delete d.joinFields; return d;
}
const league=()=>L?Promise.resolve(L):(window.NYR_LEAGUE||q('data/league.json')).then(d=>(L=d));
const market=()=>M?Promise.resolve(M):league().then(()=>window.nyrLoad?nyrLoad('market'):q('data/market.json').then(join)).then(d=>(M=d));
const lines=()=>LN?Promise.resolve(LN):q('data/lines.json').then(d=>(LN=d||{mates:{},none:1}));   // RD-014 linemates
const form=()=>FM?Promise.resolve(FM):q('data/form.json').then(d=>(FM=d||{players:{},none:1}));   // RD-011c recent form
/* RD-003 step 2: the card reads one small shard (data/card/<NHL id % 32>.json: his Iceberg rows and percentile bars,
   worked out at build time from the whole league) instead of all of iceberg.json. iceberg.json stays as the fallback. */
const SH=new Set(), PC={};
function icebergFull(){ return q('data/iceberg.json').then(d=>{ IB=d?{...d,full:1}:{players:{},goalies:{},pmetrics:[],none:1}; IBi={}; if(d){ for(const [y,teams] of Object.entries(d.players||{})) for(const rows of Object.values(teams)) for(const r of rows) (IBi[r.id]??={})[y]=r;
  for(const [y,teams] of Object.entries(d.goalies||{})) for(const rows of Object.values(teams)) for(const r of rows) (IBi[r.id]??={})[y]={...r,_g:1}; } return IB; }); }
function iceberg(id){
  if(IB&&(IB.full||IB.none)) return Promise.resolve(IB);
  const n=id==null?0:Number(id)%32; if(SH.has(n)) return Promise.resolve(IB);
  return q(`data/card/${n}.json`).then(d=>{ if(!d) return IB&&!IB.full?IB:icebergFull();
    IB=IB||{pmetrics:d.meta.pmetrics||[],gmetrics:d.meta.gmetrics||[]}; IBi=IBi||{}; SH.add(n);
    for(const [k,r] of Object.entries(d.p)){ IBi[k]=r.rows; if(r.pc) PC[k]=r.pc; } return IB; });
}
const ibReady=p=>!!IB&&(IB.full||IB.none||SH.has(Number(p.nhlId)%32)||!p.nhlId);

const css=`.pc-dlg{border:0;padding:0;width:min(720px,100vw - 16px);max-height:calc(100vh - 32px);border-radius:12px;background:var(--board,#fff);color:var(--ink,#0d1a2d);box-shadow:0 12px 48px rgba(0,0,0,.3);font-family:var(--f-body,system-ui)}
.pc-dlg::backdrop{background:rgba(8,17,31,.45)}
.pc-hd{display:flex;gap:14px;align-items:center;padding:16px 18px 10px;border-bottom:1px solid var(--line,#d6dee9)}
.pc-hd img{width:72px;height:72px;border-radius:50%;background:var(--board-2,#f6f8fb);object-fit:cover}
.pc-hd h2{font-family:var(--f-display,system-ui);font-size:26px;margin:0;line-height:1.05}
.pc-bio{color:var(--ink-2,#44546c);font-size:13px;margin-top:2px}
.pc-x{margin-left:auto;align-self:flex-start;border:0;background:none;font-size:24px;line-height:1;color:var(--muted,#6d7b90);cursor:pointer}
.pc-bars{padding:10px 18px 4px;display:grid;gap:6px}
.pc-bar{display:grid;grid-template-columns:minmax(120px,38%) 1fr 42px;gap:8px;align-items:center;font-size:13px}
.pc-bar .tr{height:10px;border-radius:5px;background:var(--line-2,#e6ebf2);overflow:hidden}.pc-bar .fl{height:100%;border-radius:5px}
.pc-bar .v{font-family:var(--f-mono,monospace);font-size:12px;text-align:right}
.pc-note{color:var(--muted,#6d7b90);font-size:12px;padding:0 18px 8px}
.pc-note+details.nn,.pc-form+details.nn{margin:0 18px 8px}
.pc-sec{padding:4px 18px 4px;font-size:13px}.pc-sec>b{display:block;margin-bottom:4px}.pc-sec .pc-note{padding:2px 0 6px}
.pc-mates{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;margin-bottom:3px}.pc-mates .pc-bio{min-width:64px}
.pc-mate{font-family:var(--f-mono,ui-monospace,monospace);font-size:12px;color:var(--ink-2,#44546c)}
.pc-mlink{all:unset;cursor:pointer;font-family:var(--f-body,system-ui);font-weight:600;font-size:13px;color:var(--blue,#0038a8)}.pc-mlink:hover{text-decoration:underline}
@media (pointer:coarse){.pc-mlink{display:inline-flex;align-items:center;min-height:44px}}
.pc-form{display:grid;grid-template-columns:minmax(120px,38%) 1fr;gap:8px;align-items:center;padding:4px 18px 6px;font-size:13px}
.pc-form svg{width:100%;height:46px;display:block}.pc-form .fs{font-size:12px;color:var(--muted,#6d7b90)}
.pc-tag{display:inline-block;margin-left:6px;padding:0 6px;border-radius:4px;font:700 10px/16px var(--f-body,system-ui);text-transform:uppercase;letter-spacing:.04em;color:#fff;vertical-align:1px}
.pc-tag.hot{background:var(--good,#18794e)}.pc-tag.cold{background:var(--bad,#c62828)}
.pc-tabs{display:flex;gap:4px;padding:6px 14px 0;border-bottom:1px solid var(--line,#d6dee9)}
.pc-tabs button{border:0;background:none;padding:8px 10px;font:600 14px var(--f-body,system-ui);color:var(--muted,#6d7b90);border-bottom:2px solid transparent;cursor:pointer}
.pc-tabs button[aria-selected="true"]{color:var(--blue,#0038a8);border-bottom-color:var(--blue,#0038a8)}
.pc-body{padding:12px 18px 6px;overflow:auto;max-height:46vh}
.pc-kv{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:0;font-size:14px}.pc-kv dt{color:var(--muted,#6d7b90)}.pc-kv dd{margin:0}
.pc-body table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}.pc-body th,.pc-body td{padding:5px 6px;text-align:right;border-bottom:1px solid var(--line-2,#e6ebf2)}
.pc-body th:first-child,.pc-body td:first-child{text-align:left}.pc-body th{color:var(--muted,#6d7b90);font-weight:600;font-size:12px}
.pc-ft{display:flex;gap:8px;flex-wrap:wrap;padding:10px 18px 16px;border-top:1px solid var(--line,#d6dee9)}
.pc-ft button,.pc-ft a{border:1px solid var(--line,#d6dee9);background:var(--board,#fff);color:var(--ink,#0d1a2d);border-radius:8px;padding:7px 12px;font:600 13px var(--f-body,system-ui);cursor:pointer;text-decoration:none}
.pc-mv{align-items:center;padding-bottom:4px}.pc-mv+.pc-ft{border-top:0;padding-top:6px}.pc-mv .pc-bio{min-width:52px}
.pc-ft .pri{background:var(--blue,#0038a8);border-color:var(--blue,#0038a8);color:#fff}
.pc-cmp input{width:100%;padding:8px 10px;border:1px solid var(--line,#d6dee9);border-radius:8px;background:var(--board,#fff);color:inherit;font:inherit}
.pc-cmp ul{list-style:none;margin:4px 0 0;padding:0;max-height:180px;overflow:auto}.pc-cmp li{padding:6px 8px;cursor:pointer;border-radius:6px}.pc-cmp li:hover{background:var(--blue-soft,#e3ebfb)}
.grade{font-weight:700}
.pc-star{border:0;background:none;cursor:pointer;font-size:22px;line-height:1;margin-left:8px;color:var(--warn,#b7791f);vertical-align:2px;padding:0}
.pc-star[aria-pressed="false"]{color:var(--muted,#6d7b90)}
@media (max-width:560px){.pc-dlg{width:100vw;max-height:100vh;border-radius:0}.pc-bar{grid-template-columns:44% 1fr 38px}}`;
const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

const dlg=document.createElement('dialog'); dlg.className='pc-dlg'; dlg.setAttribute('aria-labelledby','pc-name');
document.addEventListener('DOMContentLoaded',()=>document.body.appendChild(dlg)); if(document.body) document.body.appendChild(dlg);
dlg.addEventListener('click',e=>{ if(e.target===dlg) dlg.close(); });

const BARS={F:['xgfPct','relXgf','ixg60','p160','cfPct','ent60','carryPct'],D:['xgfPct','relXgf','cfPct','p160','exPoss','denRate'],G:['gsax60','svPct','hdSvPct']};
const LOWER=new Set(['xga60']);
const GLAB={gsax60:'Saved above expected / 60',svPct:'Save %',hdSvPct:'High-danger save %'};
function labOf(k){ const m=(IB&&IB.pmetrics||[]).find(x=>x.k===k); return GLAB[k]||(m?m.lab:k); }
function srcOf(k){ const m=(IB&&IB.pmetrics||[]).find(x=>x.k===k); return m?m.src:'MP'; }
function grpOf(p){ return p.group==='G'||/G/.test(p.pos||'')?'G':p.group==='D'||/D/.test(p.pos||'')?'D':'F'; }
function seasonRow(id){ const rows=IBi&&IBi[id]; if(!rows) return null; const ys=Object.keys(rows).sort().reverse();
  for(const y of ys){ const r=rows[y]; if(r._g? r.toi>=600 : r.toi>=300) return [y,r]; } return ys.length?[ys[0],rows[ys[0]]]:null; }
function pctiles(p){
  if(IB&&!IB.full){ return PC[String(p.nhlId)]||null; }
  const g=grpOf(p), sr=seasonRow(p.nhlId); if(!sr) return null; const [y,me]=sr;
  const pool=[]; const src=g==='G'?IB.goalies[y]:IB.players[y];
  for(const rows of Object.values(src||{})) for(const r of rows){ if(g==='G'?r.toi>=300:(r.toi>=150&&(r.pos==='D')===(g==='D'))) pool.push(r); }
  const out=[];
  for(const k of BARS[g]){
    const v=me[k]; if(v==null) continue;
    if(srcOf(k)==='A3Z'&&(me.zgp||0)<3) continue;   // tracked numbers need a few tracked games
    const vals=pool.map(r=>r[k]).filter(x=>x!=null); if(vals.length<20) continue;
    const below=vals.filter(x=>LOWER.has(k)?x>v:x<v).length; out.push({k,v,p:Math.round(100*below/vals.length)});
  }
  return {y,out,n:pool.length};
}
const fmt=(k,v)=>v==null?'–':k==='relXgf'?(v>=0?'+':'')+(v*100).toFixed(1)+' pts':/Pct$|^svPct|^hdSvPct|^carryPct|^exPoss|^denRate/.test(k)?(v*100).toFixed(1)+'%':Math.abs(v)<10?v.toFixed(2):v.toFixed(1);
const col=p=>p>=67?'var(--good,#18794e)':p>=34?'var(--mid,#c3ccd8)':'var(--bad,#c62828)';
const seasonLbl=y=>`${y}-${String(+y+1).slice(2)}`;

let cur=null, tab='contract', cmp=null;
/* RD-011b watchlist: starred players, kept in this browser (localStorage nyr-watch, a list of player keys). Pages
   listen for the nyr-watch event to refresh their Watchlist filters. */
const WK='nyr-watch';
const wlist=()=>{ try{ return JSON.parse(localStorage.getItem(WK)||'[]'); }catch(e){ return []; } };
const wset=a=>{ try{ localStorage.setItem(WK,JSON.stringify(a)); }catch(e){} dispatchEvent(new CustomEvent('nyr-watch')); };
const watched=pp=>wlist().includes(pp);
function toggleWatch(pp){ const a=wlist(), i=a.indexOf(pp); if(i>=0) a.splice(i,1); else a.push(pp); wset(a); }
window.NYRWatch={list:wlist,has:watched,toggle:toggleWatch};
function render(){
  const p=cur.p, mq=cur.m, g=grpOf(p);
  const pc=ibReady(p)?pctiles(p):null;
  const bars=pc&&pc.out.length?pc.out.map(b=>`<div class="pc-bar"><span>${esc(labOf(b.k))}</span><div class="tr"><div class="fl" style="width:${Math.max(2,b.p)}%;background:${col(b.p)}"></div></div><span class="v">${b.p}</span></div>`).join(''):'';
  const note=IB&&IB.none?'Impact data is not available here.':ibReady(p)?(pc&&pc.out.length?`Percentile vs league ${g==='G'?'goalies':g==='D'?'defensemen':'forwards'}, ${seasonLbl(pc.y)}, 5v5 (MoneyPuck${pc.out.some(b=>srcOf(b.k)==='A3Z')?'; entries and exits tracked by All Three Zones':''}).`:'Not enough NHL ice time for percentiles yet.'):'Loading percentiles…';
  dlg.innerHTML=`<div class="pc-hd">${p.headshot?`<img src="${esc(p.headshot)}" alt="" loading="lazy">`:''}<div><h2 id="pc-name">${esc(p.name)}<button class="pc-star" data-a="star" aria-pressed="${watched(p.pp)}" title="${watched(p.pp)?'On your watchlist (this browser)':'Add to your watchlist (saved in this browser)'}">${watched(p.pp)?'★':'☆'}</button></h2>
    <div class="pc-bio">${esc(p.team||'')} · ${esc(p.pos||'')}${p.num?` · #${p.num}`:''}${p.age?` · ${p.age} yrs`:''}${p.shoots?` · ${g==='G'?'catches':'shoots'} ${esc(p.shoots)}`:''}</div></div>
    <button class="pc-x" aria-label="Close">×</button></div>
    <div class="pc-bars">${bars}</div><div class="pc-note">${note}</div>${pc&&pc.out.length&&window.nyrNumsHTML?nyrNumsHTML('card-bars',[['Stat'],['Value','r'],['Percentile','r']],pc.out.map(b=>[labOf(b.k),fmt(b.k,b.v),b.p])):''}
    ${formStrip(p)}${mateList(p)}
    <div class="pc-tabs" role="tablist">${[['contract','Contract'],['stats','Stats'],['impact','Impact'],['value','Value']].map(([k,l])=>`<button role="tab" data-t="${k}" aria-selected="${tab===k}">${l}</button>`).join('')}</div>
    <div class="pc-body">${body(p,mq,g)}</div>
    ${(()=>{ const mv=moves(p), tr=p.team!=='NYR'&&p.team!=='HFD'; return tr||mv.length?`<div class="pc-ft pc-mv"><span class="pc-bio">Moves</span>${tr?`<button class="pri" data-a="trade">Trade for</button>`:''}${mv.map(([t,l])=>`<button data-move="${t}">${esc(l)}</button>`).join('')}</div>`:''; })()}
    <div class="pc-ft"><button data-a="compare">Compare</button><button data-a="link" title="Copy a link that opens this card">Copy link</button>${full(p)}</div>`;
  dlg.querySelector('.pc-x').onclick=()=>dlg.close();
  dlg.querySelectorAll('.pc-tabs button').forEach(b=>b.onclick=()=>{ tab=b.dataset.t; render(); });
  dlg.querySelector('[data-a="compare"]').onclick=()=>{ tab='compare'; render(); };
  dlg.querySelectorAll('[data-full]').forEach(b=>b.onclick=()=>goFull(b.dataset.full,p));
  const tb=dlg.querySelector('[data-a="trade"]'); if(tb) tb.onclick=()=>tradeFor(p.pp);
  dlg.querySelector('[data-a="star"]').onclick=()=>{ toggleWatch(p.pp); render(); };
  dlg.querySelector('[data-a="link"]').onclick=e=>copyLink(p,e.currentTarget);
  dlg.querySelectorAll('[data-mate]').forEach(b=>b.onclick=()=>open(b.dataset.mate));
  dlg.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>goMove(b.dataset.move,p.pp));
  const inp=dlg.querySelector('.pc-cmp input'); if(inp){ inp.focus(); inp.oninput=()=>listCmp(inp.value); }
}
/* RD-014: most used 5v5 linemates (Rangers games, from NHL shift charts) */
function mateList(p){
  if(!LN||LN.none) return ''; const m=p.nhlId&&LN.mates[String(p.nhlId)]; if(!m) return '';
  const by=new Map(L.players.filter(x=>x.nhlId).map(x=>[x.nhlId,x])), g=grpOf(p);
  const nmr=id=>{ const x=by.get(id); return x?x.name.split(' ').slice(-1)[0]:'#'+id; }, nm=id=>esc(nmr(id));
  const cf=(a,b)=>a+b?Math.round(100*a/(a+b))+'%':'–';
  const grp=(lab,l)=>l&&l.length?`<div class="pc-mates"><span class="pc-bio">${lab}</span>${l.map(x=>`<span class="pc-mate" title="${x[1]} min together at 5v5 · goals ${x[2]}-${x[3]} · shot attempts ${x[4]}-${x[5]}"><button class="pc-mlink" data-mate="${x[0]}">${nm(x[0])}</button> ${Math.round(x[1])}m</span>`).join('')}</div>`:'';
  const rows=[...(m.F||[]),...(m.D||[])];
  return `<div class="pc-sec"><b>Most used linemates</b>${g==='F'?grp('Forwards',m.F)+grp('D',m.D):grp('Partners',m.D)+grp('Forwards',m.F)}
    <div class="pc-note">5v5 minutes together in ${LN.games} Rangers games${LN.skipped?` (${LN.skipped} skipped: no NHL shift data)`:''}. Shifts: NHL.com.</div>`+
    (window.nyrNumsHTML?nyrNumsHTML('card-mates',[['Teammate'],['5v5 min','r'],['GF-GA','r'],['CF%','r']],rows.map(x=>[nmr(x[0]),x[1],`${x[2]}-${x[3]}`,cf(x[4],x[5])]),'Show the numbers (linemates)'):'')+`</div>`;
}
/* RD-011c: last 10 games this season as bars, season average as a dashed line, Hot/Cold against his usual level */
function formStrip(p){
  if(!FM||FM.none) return ''; const f=p.nhlId&&FM.players[String(p.nhlId)]; if(!f) return '';
  const vs=f.g.map(x=>x[1]), lo=Math.min(0,...vs,f.avg), hi=Math.max(0,...vs,f.avg), sp=(hi-lo)||1, W=200, H=46, n=10, bw=W/n;
  const y=v=>2+(H-4)*(1-(v-lo)/sp), unit=FM.unit[f.k], d=s=>`${+s.slice(0,2)}/${+s.slice(2)}`;
  let svg=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Last ${vs.length} games, ${unit}">`;
  svg+=`<line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line,#d6dee9)"/>`;
  f.g.forEach((x,i)=>{ const v=x[1], t=y(Math.max(v,0)), b=y(Math.min(v,0)); svg+=`<rect x="${(n-f.g.length+i)*bw+2}" y="${t}" width="${bw-4}" height="${Math.max(1,b-t)}" rx="1.5" fill="${v>=0?'var(--blue,#0038a8)':'var(--bad,#c62828)'}" opacity=".85"><title>${d(x[0])}: ${v}</title></rect>`; });
  svg+=`<line x1="0" x2="${W}" y1="${y(f.avg)}" y2="${y(f.avg)}" stroke="var(--ink-2,#44546c)" stroke-dasharray="4 3"/></svg>`;
  const tag=f.tag?`<span class="pc-tag ${f.tag}" title="Last ${f.g.length} games ${f.tag==='hot'?'well above':'well below'} his usual level">${f.tag}</span>`:'';
  return `<div class="pc-form"><span>Recent form${tag}<br><span class="fs">Last ${f.g.length} games, ${unit} · dashed: season avg</span></span>${svg}</div>
    <div class="pc-note">Last ${f.g.length} avg ${f.m10} · season ${f.avg} (${f.n} GP)${f.usual!=null?` · usual ${f.usual}`:''}. Game data: MoneyPuck.com.</div>`+
    (window.nyrNumsHTML?nyrNumsHTML('card-form',[['Date'],[unit,'r']],f.g.map(x=>[d(x[0]),x[1]]).reverse(),'Show the numbers (recent games)'):'');
}
function body(p,mq,g){
  if(tab==='contract'){
    const cby=(p.capByYear||[]), ss=(L.seasons||[]);
    return `<dl class="pc-kv"><dt>Cap hit</dt><dd>${money(p.capHit)}${p.aav&&p.aav!==p.capHit?` (AAV ${money(p.aav)})`:''}</dd>
      <dt>Expires</dt><dd>${p.expiry?`${p.expiry} · ${esc(p.expiryStatus||'')}`:'–'}</dd>
      <dt>Clauses</dt><dd>${p.nmc?'NMC':''}${p.nmc&&p.ntc?' + ':''}${p.ntc?esc(p.ntc):''}${!p.nmc&&!p.ntc?'None':''}</dd>
      ${mq&&mq.signed?`<dt>Signed</dt><dd>${esc(mq.signed)}${mq.signAge?`, age ${mq.signAge}`:''}${mq.term?` · ${esc(mq.term)}`:''}</dd>`:''}
      ${p.retainedNote?`<dt>Retained</dt><dd>${esc(p.retainedNote)}</dd>`:''}
      ${p.elc?'<dt>Type</dt><dd>Entry-level</dd>':''}${p.waiverExempt?'<dt>Waivers</dt><dd>Exempt</dd>':''}
      ${mq&&mq.ext?`<dt>Extension</dt><dd>${money(mq.ext.capHit)} × ${esc(mq.ext.term||'')} from ${seasonLbl(mq.ext.start)}</dd>`:''}</dl>
      ${cby.some(Boolean)?`<table><thead><tr><th>Season</th><th>Cap hit</th></tr></thead><tbody>${cby.map((v,i)=>v?`<tr><td>${esc(ss[i]||'')}</td><td>${money(v)}</td></tr>`:'').join('')}</tbody></table>`:''}`;
  }
  if(tab==='stats'){
    const S=p.stats||{}, ys=Object.keys(S).sort().reverse(); if(!ys.length) return '<p>No NHL stats on record.</p>';
    const lbl=y=>`${y.slice(0,4)}-${y.slice(6)}`;
    if(g==='G') return `<table><thead><tr><th>Season</th><th>GP</th><th>W</th><th>L</th><th>OTL</th><th>Sv%</th><th>GAA</th><th>SO</th></tr></thead><tbody>${ys.map(y=>{ const s=S[y]; return `<tr><td>${lbl(y)}${s.team?` ${esc(s.team)}`:''}</td><td>${s.gp??'–'}</td><td>${s.w??'–'}</td><td>${s.l??'–'}</td><td>${s.otl??'–'}</td><td>${s.svPct!=null?s.svPct.toFixed(3):'–'}</td><td>${s.gaa??'–'}</td><td>${s.so??'–'}</td></tr>`; }).join('')}</tbody></table>`;
    return `<table><thead><tr><th>Season</th><th>GP</th><th>G</th><th>A</th><th>P</th><th>+/−</th><th>PIM</th><th>SOG</th><th>TOI</th></tr></thead><tbody>${ys.map(y=>{ const s=S[y]; return `<tr><td>${lbl(y)}${s.team?` ${esc(s.team)}`:''}</td><td>${s.gp??'–'}</td><td>${s.g??'–'}</td><td>${s.a??'–'}</td><td>${s.p??'–'}</td><td>${s.pm??'–'}</td><td>${s.pim??'–'}</td><td>${s.sog??'–'}</td><td>${s.toi??'–'}</td></tr>`; }).join('')}</tbody></table>`;
  }
  if(tab==='impact'){
    if(!ibReady(p)) return '<p>Loading…</p>';
    const rows=IBi[p.nhlId]||IBi[String(p.nhlId)]; if(!rows) return '<p>No 5v5 impact data for him yet.</p>';
    const ys=Object.keys(rows).sort().reverse();
    const ks=g==='G'?['gp','toi','gsax','gsax60','svPct','xsvPct','hdSvPct']:(IB.pmetrics||[]).map(m=>m.k).filter(k=>ys.some(y=>rows[y][k]!=null));
    return `<table><thead><tr><th>Stat</th>${ys.map(y=>`<th>${seasonLbl(y)}</th>`).join('')}</tr></thead><tbody>${ks.map(k=>`<tr><td>${esc(GLAB[k]||labOf(k))}</td>${ys.map(y=>`<td>${fmt(k,rows[y][k])}</td>`).join('')}</tr>`).join('')}</tbody></table>
      <p class="pc-note" style="padding:6px 0 0">Same numbers as The Iceberg's player table. Tracked columns cover only games All Three Zones tracked.</p>`;
  }
  if(tab==='value'){
    if(!mq) return '<p>Not priced on The Market (no NHL contract or too little play).</p>';
    return `<dl class="pc-kv"><dt>Market price</dt><dd>${money(mq.price)} (${mq.pricePct}% of cap)</dd><dt>Cap hit</dt><dd>${money(mq.capHit)}</dd>
      <dt>Contract surplus</dt><dd>${smoney(mq.surplus)} over the deal · <span class="grade">${esc(mq.grade||'–')}</span></dd>
      <dt>Impact</dt><dd>${mq.gar82} goals above replacement / 82</dd>
      ${mq.marketAtSigning?`<dt>Market when signed</dt><dd>${money(mq.marketAtSigning)}</dd>`:''}
      ${mq.win?`<dt>Win value (Iceberg)</dt><dd>${money(mq.win.value)} · ${mq.win.pctile}th percentile</dd>`:''}
      ${mq.mv?`<dt>Price move</dt><dd>${mq.mv.d30>=0?'▲':'▼'}${Math.abs(mq.mv.d30)}% in 30 days</dd>`:''}</dl>
      <p class="pc-note" style="padding:8px 0 0"><a href="market.html#${encodeURIComponent(mq.pp)}">Full quote on The Market</a></p>`;
  }
  if(tab==='compare'){
    if(!cmp) return `<div class="pc-cmp"><input type="search" placeholder="Compare with… type a name" aria-label="Compare with"><ul></ul></div>`;
    const a=cur, b=cmp, rowsC=[['Team',x=>esc(x.p.team)],['Age',x=>x.p.age??'–'],['Cap hit',x=>money(x.p.capHit)],['Expires',x=>x.p.expiry?`${x.p.expiry} ${esc(x.p.expiryStatus||'')}`:'–'],
      ['Market price',x=>x.m?money(x.m.price):'–'],['Surplus',x=>x.m?smoney(x.m.surplus):'–'],['Grade',x=>x.m?esc(x.m.grade||'–'):'–'],['Impact (GAR/82)',x=>x.m?x.m.gar82:'–']];
    const pa=pctiles(a.p), pb=pctiles(b.p); const ks=[...new Set([...(pa?.out||[]),...(pb?.out||[])].map(x=>x.k))];
    const pv=(pc,k)=>{ const x=pc?.out.find(o=>o.k===k); return x?x.p:'–'; };
    return `<table><thead><tr><th></th><th>${esc(a.p.name)}</th><th>${esc(b.p.name)}</th></tr></thead><tbody>${rowsC.map(([l,f])=>`<tr><td>${l}</td><td>${f(a)}</td><td>${f(b)}</td></tr>`).join('')}
      ${ks.map(k=>`<tr><td>${esc(labOf(k))} (pctl)</td><td>${pv(pa,k)}</td><td>${pv(pb,k)}</td></tr>`).join('')}</tbody></table>
      <p class="pc-note" style="padding:6px 0 0"><a href="#" data-a="cmp-clear">Compare someone else</a></p>`;
  }
  return '';
}
function listCmp(v){
  const ul=dlg.querySelector('.pc-cmp ul'); const s=v.trim().toLowerCase(); if(s.length<2){ ul.innerHTML=''; return; }
  const hits=L.players.filter(x=>x.name.toLowerCase().includes(s)&&x.pp!==cur.p.pp).slice(0,12);
  ul.innerHTML=hits.map(x=>`<li data-pp="${esc(x.pp)}">${esc(x.name)} <span class="pc-bio">${esc(x.team)} · ${esc(x.pos)} · ${money(x.capHit)}</span></li>`).join('');
  ul.querySelectorAll('li').forEach(li=>li.onclick=()=>{ const p=L.players.find(x=>x.pp===li.dataset.pp); cmp={p,m:M&&M.players.find(x=>x.pp===p.pp)}; render(); iceberg(p.nhlId).then(()=>{ if(cmp&&cmp.p===p) render(); }); });
}
dlg.addEventListener('click',e=>{ const a=e.target.closest('[data-a="cmp-clear"]'); if(a){ e.preventDefault(); cmp=null; render(); } });
/* "Full view": the page's own detailed panel for this player (Ops side panel, House profile, Market quote) */
function full(p){
  const org=p.team==='NYR'||p.team==='HFD';
  const b=[org?['ops','Ops Board']:null,org&&p.nhlId?['house','The House']:null,cur.m?['market','The Market']:null].filter(Boolean);
  return b.length?`<span class="pc-bio" style="align-self:center;margin-left:auto">Full view:</span>`+b.map(([k,l])=>`<button data-full="${k}">${l}</button>`).join(''):'';
}
function goFull(k,p){
  const here=location.pathname.split('/').pop()||'index.html';
  if(k==='market'){ if(here==='market.html'&&typeof window.select==='function'){ dlg.close(); window.select(p.pp); } else location.href='market.html#'+encodeURIComponent(p.pp); return; }
  if(window.nyrFull){ dlg.close(); window.nyrFull[k](k==='ops'?p.pp:p.nhlId); return; }
  location.href='index.html#'+(k==='ops'?'player='+encodeURIComponent(p.pp):'house-player='+p.nhlId);
}
/* RD-011a: roster moves. On the Ops Board the page says which moves apply in the current scenario (nyrMoves); elsewhere
   the card works them out from league.json and links to index.html#move=<type>:<pp>, which opens the form there. */
function moves(p){
  if(typeof window.nyrMoves==='function'){ const m=window.nyrMoves(p.pp); if(m) return m; }
  if(p.team==='NYR'){ const m=p.where==='roster'?[['assign','Assign to Hartford'],['ir','Move to IR'],['ltir','Move to LTIR']]:[['recall','Recall']]; if(p.capHit) m.push(['buyout','Buy out']); return m; }
  return p.unsigned?[['sign','Sign']]:p.waiverExempt?[]:[['claim','Waiver claim']];
}
function goMove(type,pp){
  if(typeof window.nyrMove==='function'){ dlg.close(); window.nyrMove(type,pp); return; }
  location.href='index.html#move='+type+':'+encodeURIComponent(pp);
}
/* shareable link: this page with ?player=<key>; opening it shows the card straight away */
function copyLink(p,btn){
  const u=new URL(location.href); u.hash=''; u.search=''; u.searchParams.set('player',p.pp); const url=u.toString();
  const done=ok=>{ btn.textContent=ok?'Link copied':'Copy failed'; setTimeout(()=>{ btn.textContent='Copy link'; },1800); };
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(()=>done(true),()=>fallback());
  else fallback();
  function fallback(){ const t=document.createElement('textarea'); t.value=url; t.style.position='fixed'; t.style.opacity='0'; dlg.appendChild(t); t.select(); let ok=false; try{ ok=document.execCommand('copy'); }catch(e){} t.remove(); done(ok); }
}
function tradeFor(pp){
  if(typeof window.tradeForPP==='function'){ dlg.close(); window.tradeForPP(pp); return; }
  location.href='index.html#trade='+encodeURIComponent(pp);
}
async function open(key){
  await league(); if(!L) return;
  const p=L.players.find(x=>x.pp===key||String(x.nhlId)===String(key)); if(!p) return;
  cur={p,m:null}; tab='contract'; cmp=null; render(); if(!dlg.open) dlg.showModal();
  market().then(d=>{ if(cur&&cur.p===p){ cur.m=d&&d.players.find(x=>x.pp===p.pp)||null; render(); } });
  iceberg(p.nhlId).then(()=>{ if(cur&&cur.p===p) render(); });
  form().then(()=>{ if(cur&&cur.p===p) render(); });
  lines().then(()=>{ if(cur&&cur.p===p) render(); });
}
document.addEventListener('click',e=>{ const el=e.target.closest('[data-card]'); if(!el) return; e.preventDefault(); e.stopPropagation(); open(el.dataset.card); },true);
window.NYRCard={open};
{ const k=new URLSearchParams(location.search).get('player'); if(k){ const go=()=>open(k); if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',go); else go(); } }
})();
