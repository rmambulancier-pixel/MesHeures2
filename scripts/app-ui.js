// Interface et navigation — MesHeures
function pushUndo(desc){
  _undo={days:JSON.stringify(DB.days),periods:JSON.stringify(DB.periods),desc};
}

function doUndo(){
  if(!_undo)return;
  DB.days=JSON.parse(_undo.days);
  DB.periods=JSON.parse(_undo.periods);
  _undo=null;save();renderAll();
  closeModal('undoModal');
}

function closeModal(id){$('undoModal').classList.remove('on')}

function tab(t){
  curTab=t;
  ['home','jour','mois','paie','audit','bul','romi','reg'].forEach(x=>{
    $('s-'+x).classList.toggle('on',x===t);
    $('t-'+x).classList.toggle('on',x===t);
  });
  window.scrollTo(0,0);
  const mm=$('mhMoreMenu'); if(mm)mm.classList.remove('on');
  renderAll();
}

function goDay(n){curDate=addD(curDate,n);renderDay()}

function goToday(){curDate=today();curMonth=curDate.slice(0,7);renderDay();window.scrollTo(0,0)}

function setD(f,v){
  const d=gd(curDate);
  if(f==='t'&&d.t!==v)pushUndo('Changement type '+d.t+'→'+v+' le '+short(curDate));
  d[f]=v; save(); renderDay();
}

function setP(i,f,v){const d=gd(curDate);if(!d.p[i])d.p[i]={ty:'ENT'};d.p[i][f]=v;save();renderDay()}

function addP(){gd(curDate).p.push({d:'',f:'',ty:'ENT'});save();renderDay()}

function clearDay(){
  const d=DB.days[curDate];
  if(!d || (d.t==='REPOS'&&!d.deb&&!d.fin&&!d.note&&!d.p?.length)) return;
  if(!confirm('Effacer les données de cette journée ?')) return;
  pushUndo('Effacement du '+short(curDate));
  DB.days[curDate]={t:'REPOS',p:[]};
  save();renderDay();
}

function delP(i){gd(curDate).p.splice(i,1);save();renderDay()}

function dupliConfirm(){
  const prev=DB.days[addD(curDate,-1)];
  if(!prev)return alert('Rien la veille à copier.');
  const d=gd(curDate);
  if(d.t!=='REPOS'||d.deb){
    if(!confirm('Le jour courant a déjà des données. Écraser avec la veille ?'))return;
  }
  pushUndo('Copie veille → '+short(curDate));
  DB.days[curDate]=JSON.parse(JSON.stringify(prev));
  save(); renderDay();
}

function renderDay(){
  const k=curDate,d=gd(k),r=cd(k);
  const isF=isFerie(k),isD=dowN(k)===0;
  $('dLbl').textContent=dow(k).toUpperCase()+' '+k.slice(8)+' '+MON[+k.slice(5,7)-1]+' '+k.slice(0,4)
    +(isF?' ☀️':'')+(isD&&!isF?' 🔵':'')+(k===today()?' • auj.':'');
  const TYPES={T:'Travail',REPOS:'Repos',NUIT:'Nuit',RC:'RC',CP:'Congé',MAL:'Maladie'};
  $('dType').innerHTML=Object.entries(TYPES).map(([x,l])=>
    `<button class="${d.t===x?'on':''}" onclick="setD('t','${x}')">${l}</button>`).join('');
  let h='';
  if(d.t==='T'||d.t==='NUIT'){
    h=`<div class="g2">
<div><label>Début</label><input type="time" value="${d.deb||''}" onchange="setD('deb',this.value)"></div>
<div><label>Fin</label><input type="time" value="${d.fin||''}" onchange="setD('fin',this.value)"></div>
</div>
<div style="margin-top:11px"><label>Pauses</label>`;
    const _a=P(d.deb),_b0=P(d.fin);
    let _b=_b0;
    if(_a!=null&&_b!=null&&_b<=_a)_b+=1440;
    const _pd=P(DB.s.panDeb),_pf=P(DB.s.panFin);
    const _panOK=_a!=null&&_b!=null&&_a<=_pd&&_b>=_pf;
    d.p.forEach((p,i)=>h+=`<div class="pz"><div class="row">
<input type="time" value="${p.d||''}" onchange="setP(${i},'d',this.value)" style="flex:1">
<input type="time" value="${p.f||''}" onchange="setP(${i},'f',this.value)" style="flex:1">
<button class="r" onclick="delP(${i})" style="padding:8px 11px">✕</button></div>
<div class="row" style="margin-top:7px;align-items:center">
<select onchange="setP(${i},'ty',this.value)" style="flex:1">
<option value="ENT"${p.ty==='ENT'?' selected':''}>Intérieur (IRU)</option>
<option value="EXT"${p.ty==='EXT'?' selected':''}>Extérieur (IR)</option>
</select>
<span class="mut">${_panOK?'🍽️ panier':'—'}</span></div></div>`);
    h+=`<button class="g" onclick="addP()" style="width:100%">+ Ajouter une pause</button></div>
<div style="margin-top:11px"><label>Panier repas</label>
<div class="chips">
<button class="${!d.panier?'on':''}" onclick="setD('panier',null)">Auto</button>
<button class="${d.panier==='EXT'?'on':''}" onclick="setD('panier','EXT')">🍽️ Extérieur</button>
<button class="${d.panier==='ENT'?'on':''}" onclick="setD('panier','ENT')">🍽️ Intérieur</button>
<button class="${d.panier==='NON'?'on':''}" onclick="setD('panier','NON')">Aucun</button>
</div>
<div class="mut">${!d.panier?(_panOK?'Auto : service couvrant la plage repas → 1 panier extérieur compté sans rien saisir.':'Auto : le service ne couvre pas toute la plage repas → aucun panier.'):'Choix forcé pour cette journée.'}</div>
</div>
<div style="margin-top:11px">
<label style="text-transform:none;font-size:14px;color:var(--txt)">
<input type="checkbox" ${d.fer?'checked':''} onchange="setD('fer',this.checked)"> ☀️ Jour férié travaillé (majoration 100 %)
</label></div>`;
  }
  const stateLabel={T:'Journée travaillée',REPOS:'Repos',NUIT:'Nuit',RC:'Repos compensateur',CP:'Congé payé',MAL:'Maladie'}[d.t]||d.t;
  const stateClass=d.t==='T'?'ok':d.t==='REPOS'?'mut':d.t==='NUIT'?'pur':'warn';
  $('dWork').innerHTML=`<div class="day-state ${stateClass}"><span>${stateLabel}</span>${r.al.length?`<b>⚠️ ${r.al.length} alerte${r.al.length>1?'s':''}</b>`:''}</div>${h}`;
  $('dNote').value=d.note||'';
  $('dKpi').innerHTML=[
    ['Amplitude',F(r.amp)],['TTE',F(r.tte)],['Pauses',F(r.pz)],
    ['IDAJ',r.idaj?F(r.idaj):'—'],['Paniers',(r.ir+r.iru)||'—'],
    ['H. nuit',r.nuit?F(r.nuit):'—']
  ].map(x=>`<div class="kpi"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');
  $('dAl').innerHTML=r.al.map(a=>`<div class="al ${a.lvl}">${a.m}</div>`).join('');
  const diff=nDays(DB.s.anchor,k);
  const qs=addD(DB.s.anchor,Math.floor(diff/14)*14);
  const o=calcPer(qs,1).Q[0],N=DB.s.base*120,pc=Math.min(100,o.seuil/N*100);
  const barCls=pc>=100?'bar bad':pc>=85?'bar warn':'bar';
  $('dQuat').innerHTML=`<div class="mut">${short(qs)} → ${short(addD(qs,13))}</div>
<div class="${barCls}"><i style="width:${pc.toFixed(1)}%"></i></div>
<div class="row" style="justify-content:space-between">
<span><b>${F(o.seuil)}</b> / ${F(N)}</span>
<span class="mut">${o.seuil<N?'reste '+F(N-o.seuil)+' avant HS':'🔥 HS : '+F(o.h25)+' à 25% · '+F(o.h50)+' à 50%'}</span>
</div>`;
  renderProj(k,qs);
  if(_undo){
    $('undoDesc').textContent=_undo.desc;
  }
}

function renderProj(k,qs){
  const qEnd=addD(qs,13);
  const today_=today();
  if(k>qEnd||k<qs){$('dProj').innerHTML='<span class="mut">Navigue dans la quatorzaine courante pour voir la projection.</span>';return}
  const restant=nDays(today_,qEnd);
  if(restant<=0){$('dProj').innerHTML='<span class="mut">Quatorzaine terminée.</span>';return}
  $('dProjLbl').textContent=short(qs)+' → '+short(qEnd);
  const o=calcPer(qs,1).Q[0];
  const N=DB.s.base*120;
  const trav=o.trav||1;
  const moyJ=o.seuil/trav;
  const joursTravRestants=Math.round(restant*trav/(nDays(qs,today_)+1||1));
  const proj=o.seuil+joursTravRestants*moyJ;
  const projH25=Math.min(Math.max(proj-N,0),DB.s.pl*60);
  const projH50=Math.max(proj-N-DB.s.pl*60,0);
  $('dProj').innerHTML=`
<div class="g2">
<div class="kpi"><b>${restant}</b><span>Jours restants</span></div>
<div class="kpi ${projH50>0?'bad':projH25>0?'warn':''}"><b>${F(Math.round(proj))}</b><span>TTE projetée</span></div>
</div>
<div class="mut" style="margin-top:6px">
Projection à rythme constant : <b>${F(Math.round(projH25))}</b> HS 25% · <b>${F(Math.round(projH50))}</b> HS 50%
<br>Marge avant HS : <b>${F(Math.max(N-o.seuil,0))}</b>
</div>`;
}

function goMonth(n){const d=dOf(curMonth+'-01');d.setMonth(d.getMonth()+n);curMonth=isoOf(d).slice(0,7);renderMonth()}

function renderMonth(){
  $('mLbl').textContent=MON[+curMonth.slice(5,7)-1]+' '+curMonth.slice(0,4);
  let h=['L','M','M','J','V','S','D','Σ'].map(x=>`<div class="h">${x}</div>`).join('');
  let cur=mono(curMonth+'-01');
  const G={amp:0,tte:0,trav:0,ir:0,iru:0,idaj:0,dim:0,fer:0};
  const chartD=[];
  for(let w=0;w<6;w++){
    let wa=0,wt=0;
    for(let i=0;i<7;i++){
      const k=addD(cur,w*7+i),r=cd(k),out=k.slice(0,7)!==curMonth;
      const hasErr=r.al.some(a=>a.lvl==='b');
      if(!out){
        wa+=r.amp;wt+=r.tte;
        G.amp+=r.amp;G.tte+=r.tte;G.trav+=r.trav;
        G.ir+=r.ir;G.iru+=r.iru;G.idaj+=r.idaj;
        G.dim+=r.dim;G.fer+=r.fer;
        if(r.tte>0)chartD.push({k,v:r.tte,hs:false});
      }
      const ic=[]
      if(DB.days[k]?.fer)ic.push('☀️');
      else if(isFerie(k))ic.push('·');
      if(r.ir+r.iru)ic.push('🍽️');
      if(r.nuit)ic.push('🌙');
      if(r.dim&&r.trav)ic.push('🔵');
      h+=`<div class="cel ${r.t||''} ${out?'off':''} ${k===today()?'now':''} ${hasErr&&!out?'err':''}"
onclick="curDate='${k}';tab('jour')">
<div class="d">${+k.slice(8)}</div>
<div class="v">${r.tte?F(r.tte):(r.t==='RC'?'RC':r.t==='CP'?'CP':r.t==='MAL'?'AM':r.t==='NUIT'?'🌙':'')}</div>
<div class="ic">${ic.join('')}</div>
</div>`;
    }
    h+=`<div class="rec">${wt?'<span style="font-size:9px">'+F(wa)+'</span><b>'+F(wt)+'</b>':''}</div>`;
    if(addD(cur,w*7+7).slice(0,7)!==curMonth&&w>=3)break;
  }
  $('mCal').innerHTML=h;
  $('mKpi').innerHTML=[
    ['Amplitude',F(G.amp)],['TTE',F(G.tte)],['Jours trav.',G.trav],
    ['Paniers',G.ir+G.iru],['Dimanches',G.dim],['Fériés trav.',G.fer?'oui':'—']
  ].map(x=>`<div class="kpi"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');
  const BARZONE=68; // px disponibles au-dessus du libellé de jour, dans une .chart de 92px
  const max=Math.max(...chartD.map(x=>x.v),1);
  $('mChart').innerHTML=chartD.map(x=>{
    const px=Math.max(2,(x.v/max*BARZONE)).toFixed(1);
    return `<div class="bar-w"><div class="bv${x.hs?' hs':''}" style="height:${px}px" title="${short(x.k)} ${F(x.v)}"></div><div class="bl">${+x.k.slice(8)}</div></div>`;
  }).join('');
  let dimH='';
  const m=curMonth;
  for(let i=1;i<=31;i++){
    const k=m+'-'+pad(i);
    if(k.slice(0,7)!==m)break;
    try{dOf(k)}catch(e){break}
    const r=cd(k);
    if(r.dim&&r.trav)dimH+=`<div class="al w">🔵 ${shortY(k)} dimanche travaillé${DB.s.dimPrime?' — prime '+EUR(DB.s.dimPrime):''}  · ${F(r.tte)}</div>`;
    if(r.fer&&DB.days[k]?.t==='T')dimH+=`<div class="al w">☀️ ${shortY(k)} férié travaillé · ${F(r.tte)} · maj. 100% = ${EUR(r.tte/60*DB.s.taux)}</div>`;
  }
  $('mDim').innerHTML=dimH||'<span class="mut">Aucun dimanche ni férié travaillé ce mois.</span>';
}

function goPer(n){
  DB.per.start=addD(DB.per.start,n*14*DB.per.nb);
  save();renderPay();
}

function regPer(){
  const s=DB.per.start;
  const ex=DB.periods.find(p=>p.start===s);
  if(ex)ex.nb=DB.per.nb;
  else DB.periods.push({start:s,nb:DB.per.nb});
  DB.periods.sort((a,b)=>a.start<b.start?-1:1);
  gb(s);save();
  alert('✅ Période enregistrée dans l\'audit');renderAll();
}

function renderPay(){
  const S=DB.s,st=DB.per.start,nb=DB.per.nb,B=gb(st);
  $('pS').value=st;$('pN').value=nb;
  $('pP25').value=B.p25??'';$('pP50').value=B.p50??'';
  $('pRC').value=B.rcOld??'';$('pRCA').value=B.rcAcq??'';
  $('pLbl').textContent=short(st)+' → '+short(addD(st,nb*14-1));
  const off=((nDays(S.anchor,st)%14)+14)%14;
  const reg=DB.periods.some(p=>p.start===st);
  $('pAlign').innerHTML=(off===0
    ?'<div class="al k">✅ Période alignée sur tes quatorzaines</div>'
    :'<div class="al w">⚠️ Décalage de '+off+' jour(s) — les HS peuvent être faussées. Ajuste la date de début.</div>')
    +(reg?'<div class="al i">📌 Période enregistrée dans l\'audit</div>':'');
  const{Q,AL,G}=calcPer(st,nb);
  $('pKpi').innerHTML=[
    ['Amplitude',F(G.amp)],['TTE',F(G.tte)],
    ['HS 25 %',F(G.h25),G.h25>0?'warn':''],
    ['HS 50 %',F(G.h50),G.h50>0?'bad':''],
    ['Jours trav.',G.trav],['Paniers',G.ir+G.iru],
    ['Dimanches',G.dim],['IDAJ',C2(G.idaj)+' h']
  ].map(x=>`<div class="kpi ${x[2]||''}"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');
  let h='<tr><th>Détail</th><th class="n">Ampl.</th><th class="n">TTE</th><th class="n">Norm.</th><th class="n">HS 25%</th><th class="n">HS 50%</th></tr>';
  Q.forEach((o,i)=>{
    o.w.forEach((s,j)=>h+=`<tr><td>Sem. ${j+1} — ${short(s.start)}</td><td class="n">${F(s.amp)}</td><td class="n">${F(s.tte)}</td><td class="n mut" colspan="3">${s.trav} j</td></tr>`);
    h+=`<tr class="q"><td>Quatorzaine ${i+1}</td><td class="n">${F(o.amp)}</td><td class="n">${F(o.seuil)}</td><td class="n">${F(o.nor)}</td><td class="n">${F(o.h25)}</td><td class="n">${F(o.h50)}</td></tr>`;
  });
  h+=`<tr class="t"><td>TOTAL</td><td class="n">${F(G.amp)}</td><td class="n">${F(G.tte)}</td><td class="n">${F(G.nor)}</td><td class="n">${F(G.h25)}</td><td class="n">${F(G.h50)}</td></tr>`;
  $('pTab').innerHTML=h;
  $('pAlCount').textContent=AL.length?AL.length+' alerte(s)':'';
  $('pAl').innerHTML=AL.length
    ?AL.map(a=>`<div class="al ${a.lvl}"><b>${short(a.k)}</b> — ${esc(a.m)}</div>`).join('')
    :'<div class="al k">✅ Aucune anomalie détectée sur cette période</div>';
  const{L,tot,panIR,panIRU,panIRUT}=brutOf(G);
  $('pBrut').innerHTML='<tr><th>Élément</th><th class="n">Qté</th><th class="n">Taux</th><th class="n">Montant</th></tr>'
    +L.map(x=>`<tr><td>${esc(x[0])}</td><td class="n">${x[1]}</td><td class="n mut">${x[2]}</td><td class="n">${EUR(x[3])}</td></tr>`).join('')
    +`<tr class="t"><td>Brut soumis à cotisations</td><td colspan="2"></td><td class="n">${EUR(tot)}</td></tr>`
    +`<tr><td>Net estimé</td><td colspan="2" class="n mut">× ${S.net}</td><td class="n">${EUR(tot*S.net)}</td></tr>`
    +`<tr><td>IR (${G.ir} repas ext.)</td><td colspan="2" class="n mut">${S.ir} €/repas</td><td class="n">+ ${EUR(panIR)}</td></tr>`
    +`<tr><td>IRU brut (${G.iru} repas int.)</td><td colspan="2" class="n mut">${S.iru} €</td><td class="n">+ ${EUR(panIRU)}</td></tr>`
    +`<tr><td>IRU taux plein (${G.iru} repas)</td><td colspan="2" class="n mut">${S.irT} €</td><td class="n">(${EUR(panIRUT)} si taux plein)</td></tr>`
    +`<tr class="t"><td>Total versé estimé</td><td colspan="2"></td><td class="n">${EUR(tot*S.net+panIR+panIRU)}</td></tr>`;
  const d25=Math.max(G.h25/60-(B.p25||0),0),d50=Math.max(G.h50/60-(B.p50||0),0);
  const acq=d25*1.25+d50*1.5,sol=(B.rcOld||0)+acq;
  const perdu=d25*S.taux*1.25+d50*S.taux*1.5;
  const ec=B.rcAcq!=null?acq-B.rcAcq:null;
  $('pRcOut').innerHTML=`<table>
<tr><th>Type</th><th class="n">Dues calc.</th><th class="n">Payées</th><th class="n">→ RC</th><th class="n">× majo.</th></tr>
<tr><td>HS 25 %</td><td class="n">${C2(G.h25)}</td><td class="n">${B.p25!=null?B.p25.toFixed(2):'—'}</td><td class="n">${d25.toFixed(2)}</td><td class="n">${(d25*1.25).toFixed(2)}</td></tr>
<tr><td>HS 50 %</td><td class="n">${C2(G.h50)}</td><td class="n">${B.p50!=null?B.p50.toFixed(2):'—'}</td><td class="n">${d50.toFixed(2)}</td><td class="n">${(d50*1.5).toFixed(2)}</td></tr>
<tr class="t"><td>RC acquis ce mois</td><td colspan="3"></td><td class="n">${acq.toFixed(2)} h</td></tr>
<tr class="t"><td>Solde RC cumulé</td><td colspan="3"></td><td class="n">${sol.toFixed(2)} h</td></tr>
</table>
${ec!==null?`<div class="al ${Math.abs(ec)<0.1?'k':'b'}" style="margin-top:9px">
${Math.abs(ec)<0.1?'✅ RC bulletin conforme au calcul':'🚩 Écart RC : <b>'+ec.toFixed(2)+' h</b> = '+EUR(Math.abs(ec)*S.taux)+'</div>'}
</div>`:''}
<div class="al ${sol*S.taux>1500?'w':'i'}" style="margin-top:9px">
💰 Valeur RC non payé : <b>${EUR(perdu)}</b> brut · Solde total : <b>${EUR(sol*S.taux)}</b>
</div>
${sol>S.rcAlerte?`<div class="al b" style="margin-top:6px">🚨 Solde RC > ${S.rcAlerte}h — risque de perte ! Demandez la prise ou le paiement.</div>`:''}`;
  let c='<tr><th>Semaine</th><th class="n">TTE calculé</th><th class="n">TTE bulletin</th><th class="n">Écart</th></tr>';
  Q.forEach(o=>o.w.forEach(s=>{
    const v=DB.cmp[s.start]||'',e=v?P(v)-s.tte:null;
    c+=`<tr><td>${short(s.start)}</td><td class="n">${F(s.tte)}</td>
<td class="n"><input type="time" value="${v}" onchange="DB.cmp['${s.start}']=this.value;save();renderPay()" style="width:100px"></td>
<td class="n ${e===null?'':e===0?'ok':'bad'}">${e===null?'—':e===0?'✓':F(e)}</td></tr>`;
  }));
  $('pCmp').innerHTML=c;
}

function renderAudit(){
  if(!DB.periods.length){
    ['aTab','aKpi','aAnn','aRc'].forEach(id=>$(id).innerHTML='');
    $('aFer').innerHTML=$('aAl').innerHTML='<div class="al i">Aucune période enregistrée.</div>';
    return;
  }
  const S=DB.s;
  let T={tte:0,h25:0,h50:0,acq:0,dec:0,ecart:0,fer:[],dim:[],trav:0,nor:0},AA=[];
  let h='<tr><th>Période</th><th class="n">TTE</th><th class="n">HS25</th><th class="n">HS50</th><th class="n">RC calc.</th><th class="n">RC bull.</th><th class="n">Écart</th></tr>';
  const byYear={};
  DB.periods.forEach(p=>{
    const{G,AL}=calcPer(p.start,p.nb),B=gb(p.start);
    const d25=Math.max(G.h25/60-(B.p25||0),0),d50=Math.max(G.h50/60-(B.p50||0),0),acq=d25*1.25+d50*1.5;
    const ec=B.rcAcq!=null?acq-B.rcAcq:null;
    T.tte+=G.tte;T.h25+=G.h25;T.h50+=G.h50;T.acq+=acq;
    T.dec+=B.rcAcq||0;T.trav+=G.trav;T.nor+=G.nor;
    if(ec!==null)T.ecart+=ec;
    G.ferJ.forEach(k=>T.fer.push(k));
    G.dimJ?.forEach(k=>T.dim.push(k));
    AL.forEach(a=>AA.push(a));
    const y=p.start.slice(0,4);
    if(!byYear[y])byYear[y]={tte:0,h25:0,h50:0,trav:0,nor:0};
    byYear[y].tte+=G.tte;byYear[y].h25+=G.h25;byYear[y].h50+=G.h50;byYear[y].trav+=G.trav;byYear[y].nor+=G.nor;
    h+=`<tr><td><a href="#" onclick="DB.per={start:'${p.start}',nb:${p.nb}};save();tab('paie');return false" style="color:var(--blue)">${short(p.start)}→${short(addD(p.start,p.nb*14-1))}</a></td>
<td class="n">${F(G.tte)}</td><td class="n">${C2(G.h25)}</td><td class="n">${C2(G.h50)}</td>
<td class="n">${acq.toFixed(2)}</td><td class="n">${B.rcAcq!=null?B.rcAcq.toFixed(2):'—'}</td>
<td class="n ${ec===null?'':Math.abs(ec)<0.1?'ok':'bad'}">${ec===null?'—':Math.abs(ec)<0.1?'✓':ec.toFixed(2)}</td></tr>`;
  });
  h+=`<tr class="t"><td>TOTAL</td><td class="n">${F(T.tte)}</td><td class="n">${C2(T.h25)}</td><td class="n">${C2(T.h50)}</td><td class="n">${T.acq.toFixed(2)}</td><td class="n">${T.dec.toFixed(2)}</td><td class="n ${Math.abs(T.ecart)<0.1?'ok':'bad'}">${T.ecart.toFixed(2)}</td></tr>`;
  $('aTab').innerHTML=h;
  $('aKpi').innerHTML=[
    ['Périodes',DB.periods.length],['Jours travaillés',T.trav],
    ['TTE total',F(T.tte)],['HS 25 %',C2(T.h25)],['HS 50 %',C2(T.h50)],
    ['RC généré',T.acq.toFixed(2)+' h'],
    ['Valeur RC',EUR(T.acq*S.taux)],
    ['Écart bulletins',EUR(Math.abs(T.ecart)*S.taux),Math.abs(T.ecart)>0.5?'bad':'']
  ].map(x=>`<div class="kpi ${x[2]||''}"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');
  let ay='<tr><th>Année</th><th class="n">Jours</th><th class="n">TTE</th><th class="n">HS 25%</th><th class="n">HS 50%</th><th class="n">Brut estimé</th></tr>';
  Object.entries(byYear).sort().forEach(([y,v])=>{
    const brt=v.nor/60*S.taux+(v.h25/60*S.taux*1.25)+(v.h50/60*S.taux*1.5);
    ay+=`<tr><td><b>${y}</b></td><td class="n">${v.trav}</td><td class="n">${F(v.tte)}</td><td class="n">${C2(v.h25)}</td><td class="n">${C2(v.h50)}</td><td class="n">${EUR(brt)}</td></tr>`;
  });
  $('aAnn').innerHTML=ay;
  $('aFer').innerHTML=(T.fer.length?T.fer.map(k=>{const r=cd(k);
    return `<div class="al w">☀️ <b>${shortY(k)}</b> — ${F(r.tte)} → maj. 100% = <b>${EUR(r.tte/60*S.taux)}</b></div>`}).join('')
    +`<div class="al i">Total fériés : <b>${EUR(T.fer.reduce((a,k)=>a+cd(k).tte/60*S.taux,0))}</b></div>`
    :'<div class="al k">✅ Aucun férié travaillé</div>')
    +(T.dim.length?T.dim.map(k=>`<div class="al w">🔵 <b>${shortY(k)}</b> dimanche travaillé</div>`).join(''):'');
  const rcSol=T.acq-T.dec;
  const barPct=Math.min(100,rcSol/S.rcAlerte*100);
  $('aRc').innerHTML=`<div class="kpis">
<div class="kpi"><b>${T.acq.toFixed(2)} h</b><span>RC généré total</span></div>
<div class="kpi"><b>${T.dec.toFixed(2)} h</b><span>RC pris / payé</span></div>
<div class="kpi ${rcSol>S.rcAlerte?'bad':rcSol>S.rcAlerte*0.6?'warn':''}"><b>${rcSol.toFixed(2)} h</b><span>Solde RC</span></div>
<div class="kpi ${rcSol>S.rcAlerte?'bad':''}"><b>${EUR(rcSol*S.taux)}</b><span>Valeur RC</span></div>
</div>
<div class="${rcSol>S.rcAlerte?'bar bad':'bar warn'}" style="margin-top:9px"><i style="width:${barPct.toFixed(1)}%"></i></div>
${rcSol>S.rcAlerte?`<div class="al b" style="margin-top:6px">🚨 Solde RC élevé (${rcSol.toFixed(1)}h / seuil ${S.rcAlerte}h) — risque de perdre des heures !</div>`:''}`;
  const crit=AA.filter(a=>a.lvl==='b');
  $('aAl').innerHTML=AA.length
    ?(crit.length?crit:AA).slice(0,50).map(a=>`<div class="al ${a.lvl}"><b>${shortY(a.k)}</b> — ${esc(a.m)}</div>`).join('')
    +(AA.length>50?`<div class="mut">… et ${AA.length-50} autres anomalies</div>`:'')
    :'<div class="al k">✅ Aucune anomalie sur les périodes enregistrées</div>';
}

function renderReg(){
  for(const g in RG)$(g).innerHTML=RG[g].map(([k,l])=>{
    const ty=['anchor','panDeb','panFin','nuitDeb','nuitFin'].includes(k)?
      (k==='anchor'?'date':'time'):'number';
    return `<div><label>${l}</label><input type="${ty}" step="any" value="${DB.s[k]??''}" onchange="DB.s['${k}']=this.type==='number'?parseFloat(this.value)||0:this.value;save();renderAll()"></div>`;
  }).join('');
  $('rMin').checked=DB.s.min;
  $('rNom').value=DB.s.nom||'';
  $('rEmb').value=DB.s.emb||'';
  $('rAnc').value=DB.s.anc||0;
  const anc=calcAnc(DB.s.emb||DEF.emb);
  $('rAncCalc').textContent=`${anc.y} ans ${anc.m} mois → taux CCN : ${anc.pct}% (auto)`;
  $('rBk').innerHTML=DB.exp?'Dernier export : <b>'+DB.exp+'</b>':'<span style="color:var(--warn)">⚠️ Aucune sauvegarde</span>';
}

function mhToggleMore(){
  let menu=$('mhMoreMenu');
  if(!menu) return;
  menu.classList.toggle('on');
}
function ensureMobileMore(){
  let menu=$('mhMoreMenu');
  if(!menu){
    menu=document.createElement('div');menu.id='mhMoreMenu';menu.className='mh-more-menu';
    menu.innerHTML=`<div class="more-title">Autres sections</div>
      <button onclick="tab('bul');mhToggleMore()">🧾 <span>Bulletin</span></button>
      <button onclick="tab('romi');mhToggleMore()">📋 <span>ROMI1</span></button>
      <button onclick="tab('reg');mhToggleMore()">⚙️ <span>Réglages</span></button>`;
    document.body.appendChild(menu);
    document.addEventListener('click',e=>{if(!menu.contains(e.target)&&e.target.id!=='mhMore')menu.classList.remove('on')});
  }
  const more=$('mhMore');
  if(more)more.style.display=curTab==='home'?'none':'';
}

function ensureMobileNav(){
  let nav=$('mhBottomNav');
  if(!nav){
    nav=document.createElement('nav');
    nav.id='mhBottomNav';nav.className='mh-bottom-nav';nav.setAttribute('aria-label','Navigation principale');
    nav.innerHTML=`
      <button data-tab="home" onclick="tab('home')"><span>⌂</span><b>Accueil</b></button>
      <button data-tab="jour" onclick="tab('jour')"><span>◷</span><b>Jour</b></button>
      <button data-tab="mois" onclick="tab('mois')"><span>▦</span><b>Mois</b></button>
      <button data-tab="paie" onclick="tab('paie')"><span>€</span><b>Paie</b></button>
      <button data-tab="audit" onclick="tab('audit')"><span>⌁</span><b>Audit</b></button>`;
    document.body.appendChild(nav);
  }
  nav.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===curTab));
}

function renderAll(){
  ensureMobileMore();
  ensureMobileNav();
  renderHome();
  if(curTab==='jour')renderDay();
  if(curTab==='mois')renderMonth();
  if(curTab==='paie')renderPay();
  if(curTab==='audit')renderAudit();
  if(curTab==='bul')renderBulHist();
  if(curTab==='romi')renderRomiTab();
  if(curTab==='reg')renderReg();
  let tot=0;
  DB.periods.forEach(p=>{const{AL}=calcPer(p.start,p.nb);tot+=AL.filter(a=>a.lvl==='b').length});
  const badge=$('hBadge');
  if(tot>0){badge.style.display='';badge.textContent=tot}else badge.style.display='none';
  $('t-audit').querySelector('.tb')?.remove();
  if(tot>0){const sp=document.createElement('span');sp.className='tb';sp.textContent=tot;$('t-audit').appendChild(sp)}
}

function copySum(){
  const{Q,G}=calcPer(DB.per.start,DB.per.nb);
  let t='MesHeures — Résumé\n';
  t+='Période : '+short(DB.per.start)+' → '+short(addD(DB.per.start,DB.per.nb*14-1))+'\n\n';
  Q.forEach((o,i)=>{
    o.w.forEach((s,j)=>t+='Sem. '+(j+1)+' ('+short(s.start)+') : Amp '+F(s.amp)+' · TTE '+F(s.tte)+'\n');
    t+='→ Q'+(i+1)+' : TTE '+F(o.seuil)+' | HS 25% '+F(o.h25)+' · HS 50% '+F(o.h50)+'\n\n';
  });
  t+='TOTAL : TTE '+F(G.tte)+' · Amp '+F(G.amp)+' · '+G.trav+' j · '+(G.ir+G.iru)+' paniers · IDAJ '+C2(G.idaj)+'h';
  navigator.clipboard.writeText(t).then(()=>alert('✅ Résumé copié !'),()=>prompt('Copie :',t));
}

/* ═══════════════════════════════════════════════
   V10 — TABLEAU DE BORD
═══════════════════════════════════════════════ */
function renderHome(){
  const now=today(),m=now.slice(0,7),month=mhMonthStats?mhMonthStats(m):null;
  const diff=nDays(DB.s.anchor,now),qs=addD(DB.s.anchor,Math.floor(diff/14)*14);
  const qData=calcPer(qs,1),q=qData.Q[0],qG=qData.G;
  const todayData=gd(now)||{t:'REPOS'},todayR=cd(now);
  const N=DB.s.base*120,pc=N?Math.min(100,q.seuil/N*100):0;
  $('homeDate').textContent=shortY(now)+' · '+dow(now).toUpperCase()+' · '+MON[+m.slice(5)-1];
  $('homeTodayTte').textContent=F(todayR.tte);
  $('homeTodayCaption').textContent=todayData.t==='T'
    ?'Journée travaillée · amplitude '+F(todayR.amp)
    :todayData.t==='NUIT'?'Nuit · '+F(todayR.tte)
    :'Aujourd’hui · '+(todayData.t==='CP'?'Congé payé':todayData.t==='RC'?'Repos compensateur':todayData.t==='MAL'?'Maladie':'aucune journée travaillée');

  const days=[];let sum7=0;
  for(let i=6;i>=0;i--){const k=addD(now,-i),r=cd(k);days.push({k,r});sum7+=r.tte}
  const max=Math.max(1,...days.map(x=>x.r.tte));
  $('homeMiniChart').innerHTML=days.map(x=>{
    const h=x.r.tte?Math.max(10,Math.round(x.r.tte/max*100)):5;
    const cls=x.k===now?'today':'';
    return `<div class="mini-day"><i class="${cls}" style="height:${h}%"></i><span>${dOf(x.k).getDate()}</span></div>`;
  }).join('');

  const avg=month&&month.trav?month.tte/month.trav:0,avgAmp=month&&month.trav?month.amp/month.trav:0;
  $('homeAvg').textContent=F(Math.round(avg));
  $('homeAvgSub').textContent=month&&month.trav?month.trav+' jour'+(month.trav>1?'s':'')+' travaillé'+(month.trav>1?'s':''):'Aucune journée';
  $('homeAvgAmp').textContent=F(Math.round(avgAmp));
  $('homeWorkSub').textContent=(month?.trav||0)+' jour'+((month?.trav||0)>1?'s':'')+' travaillé'+((month?.trav||0)>1?'s':'');
  $('homePeriod').textContent='7 derniers jours · '+F(sum7);

  $('homeActivity').innerHTML=days.map(x=>{
    const d=dOf(x.k),label=['dim','lun','mar','mer','jeu','ven','sam'][d.getDay()],r=x.r;
    const state=r.t==='T'?'work':r.t==='NUIT'?'night':r.t==='CP'?'leave':r.t==='RC'?'rest':'empty';
    return `<button class="activity-day ${state}" onclick="mhOpenDay('${x.k}')"><b>${label}</b><strong>${r.tte?F(r.tte):'—'}</strong><small>${d.getDate()}/${d.getMonth()+1}</small></button>`;
  }).join('');

  $('homeQuat').innerHTML=`<div class="big-inline"><b>${F(q.seuil)}</b><span>${short(qs)} → ${short(addD(qs,13))}</span></div><div class="dash-progress"><i style="width:${pc.toFixed(1)}%"></i></div><div class="dash-muted">${q.seuil<N?'Marge avant HS : <b>'+F(N-q.seuil)+'</b>':'🔥 Seuil atteint'}</div>`;
  const br=brutOf(qG);
  $('homePay').innerHTML=`<div class="pay-big">${EUR(br.tot)}</div><div class="dash-muted">Brut estimé · quatorzaine courante</div><div class="pay-lines"><div><span>Normal</span><b>${F(q.nor)}</b></div><div><span>HS 25 %</span><b>${F(q.h25)}</b></div><div><span>HS 50 %</span><b>${F(q.h50)}</b></div></div>`;

  const alerts=(month?.alerts||[]).slice().sort((a,b)=>(a.lvl==='b'?0:1)-(b.lvl==='b'?0:1));
  const hard=alerts.filter(a=>a.lvl==='b').length,warn=alerts.filter(a=>a.lvl==='w').length;
  $('homeAlertCount').textContent=alerts.length?alerts.length+' alerte'+(alerts.length>1?'s':''):'OK';
  $('homeAlertCount2').textContent=alerts.length?hard+' critique'+(hard>1?'s':'')+' · '+warn+' attention'+(warn>1?'s':''):'aucune';
  $('homeAlerts').innerHTML=alerts.length?alerts.slice(0,5).map(a=>`<button class="dash-alert ${a.lvl}" onclick="mhOpenDay('${a.k}')"><span>${a.lvl==='b'?'🔴':'🟠'}</span><div><b>${shortY(a.k)}</b><small>${esc(a.m)}</small></div><em>›</em></button>`).join(''):'<div class="dash-ok">✓ Aucun point critique détecté ce mois-ci.</div>';
}
