// scripts/app-ui.js — Rendu de l'interface, graphiques et interactions utilisateur

const RG = {
  rg1: [
    ['taux', 'Taux horaire (€/h)'],
    ['net', 'Facteur conversion net'],
    ['habT', 'Taux habillage (€/h)'],
    ['dimPrime', 'Prime dimanche (€)']
  ],
  rg2: [
    ['anchor', 'Date pivot quatorzaine'],
    ['base', 'Base hebdo (h)'],
    ['pl', 'Plafond contingent HS 25% (h)'],
    ['idaj', 'Seuil amplitude IDAJ (h)'],
    ['maxAmp', 'Amplitude max légale (h)'],
    ['rcAlerte', 'Seuil alerte stock RC (h)']
  ],
  rg3: [
    ['hab', 'Temps habillage/j (min)'],
    ['panDeb', 'Début plage repas'],
    ['panFin', 'Fin plage repas'],
    ['ir', 'Montant panier IR (€)'],
    ['iru', 'Montant panier IRU (€)'],
    ['irT', 'IRU taux plein (€)'],
    ['nuitDeb', 'Début nuit'],
    ['nuitFin', 'Fin nuit'],
    ['nuitMaj', 'Majoration nuit (%)']
  ]
};

// ==================== NAVIGATION & MODALES ====================

function pushUndo(desc) {
  _undo = {
    days: JSON.stringify(DB.days),
    periods: JSON.stringify(DB.periods),
    desc
  };
}

function doUndo() {
  if (!_undo) return;
  DB.days = JSON.parse(_undo.days);
  DB.periods = JSON.parse(_undo.periods);
  _undo = null;
  save();
  renderAll();
  closeModal('undoModal');
}

function closeModal(id) {
  const el = $(id);
  if (el) el.classList.remove('on');
}

function tab(t) {
  curTab = t;
  ['home', 'jour', 'mois', 'paie', 'audit', 'bul', 'romi', 'reg'].forEach(x => {
    const s = $('s-' + x);
    const b = $('t-' + x);
    if (s) s.classList.toggle('on', x === t);
    if (b) b.classList.toggle('on', x === t);
  });
  window.scrollTo(0, 0);
  renderAll();
}

function goDay(n) {
  curDate = addD(curDate, n);
  renderDay();
}

function goToday() {
  curDate = today();
  curMonth = curDate.slice(0, 7);
  renderDay();
  window.scrollTo(0, 0);
}

function goMonth(n) {
  const d = dOf(curMonth + '-01');
  d.setMonth(d.getMonth() + n);
  curMonth = isoOf(d).slice(0, 7);
  renderMonth();
}

function goPer(n) {
  DB.per.start = addD(DB.per.start, n * 14 * DB.per.nb);
  save();
  renderPay();
}

// ==================== MODIFICATIONS DU JOUR ====================

function setD(f, v) {
  const d = gd(curDate);
  if (f === 't' && d.t !== v) pushUndo('Changement type ' + d.t + '→' + v + ' le ' + short(curDate));
  d[f] = v;
  save();
  renderDay();
}

function setP(i, f, v) {
  const d = gd(curDate);
  if (!d.p[i]) d.p[i] = { ty: 'ENT' };
  d.p[i][f] = v;
  save();
  renderDay();
}

function addP() {
  gd(curDate).p.push({ d: '', f: '', ty: 'ENT' });
  save();
  renderDay();
}

function delP(i) {
  gd(curDate).p.splice(i, 1);
  save();
  renderDay();
}

function clearDay() {
  const d = DB.days[curDate];
  if (!d || (d.t === 'REPOS' && !d.deb && !d.fin && !d.note && !d.p?.length)) return;
  if (!confirm('Effacer les données du ' + short(curDate) + ' ?')) return;
  pushUndo('Effacement du ' + short(curDate));
  DB.days[curDate] = { t: 'REPOS', p: [] };
  save();
  renderDay();
}

function dupliConfirm() {
  const prevDate = addD(curDate, -1);
  const prev = DB.days[prevDate];
  if (!prev) {
    alert('Aucune donnée à copier au ' + short(prevDate));
    return;
  }
  const d = gd(curDate);
  if (d.t !== 'REPOS' || d.deb) {
    if (!confirm('Écraser la journée en cours avec les données de la veille ?')) return;
  }
  pushUndo('Copie veille → ' + short(curDate));
  DB.days[curDate] = JSON.parse(JSON.stringify(prev));
  save();
  renderDay();
}

// ==================== RENDU VUE ACCUEIL (DASHBOARD) ====================

function renderHome() {
  const t = today();
  $('homeDate').textContent = dow(t).toUpperCase() + ' ' + t.slice(8) + ' ' + MON[+t.slice(5, 7) - 1] + ' ' + t.slice(0, 4);

  const rToday = cd(t);
  $('homeTodayTte').textContent = F(rToday.tte);
  const dObj = DB.days[t];
  $('homeTodayCaption').textContent = dObj && dObj.t === 'T'
    ? `Service : ${dObj.deb || '—'} → ${dObj.fin || '—'} · Pauses : ${F(rToday.pz)}`
    : 'Aujourd’hui · repos ou aucune activité saisie';

  // Statistiques 30 derniers jours
  let sumTte = 0, sumAmp = 0, travCount = 0;
  for (let i = 0; i < 30; i++) {
    const k = addD(t, -i);
    const r = cd(k);
    if (r.trav) {
      sumTte += r.tte;
      sumAmp += r.amp;
      travCount++;
    }
  }
  $('homeAvg').textContent = travCount ? F(Math.round(sumTte / travCount)) : '00h00';
  $('homeAvgSub').textContent = travCount + ' j sur 30 derniers jours';
  $('homeAvgAmp').textContent = travCount ? F(Math.round(sumAmp / travCount)) : '00h00';
  $('homeWorkSub').textContent = travCount + ' jour(s) travaillé(s)';

  // Mini-graphique 7 derniers jours
  let actHtml = '';
  for (let i = 6; i >= 0; i--) {
    const k = addD(t, -i);
    const r = cd(k);
    const isCur = k === t;
    const hPct = Math.min(100, Math.round((r.tte / 660) * 100));
    actHtml += `
      <div style="flex:1;text-align:center;cursor:pointer" onclick="curDate='${k}';tab('jour')">
        <div style="height:55px;display:flex;align-items:flex-end;justify-content:center">
          <div style="width:70%;height:${Math.max(4, hPct)}%;background:${r.tte > 600 ? 'var(--warn)' : 'var(--acc)'};border-radius:3px 3px 0 0"></div>
        </div>
        <div style="font-size:9px;color:${isCur ? 'var(--ok)' : 'var(--dim)'};margin-top:4px;font-weight:${isCur ? '700' : '400'}">${short(k)}</div>
      </div>`;
  }
  $('homeActivity').innerHTML = actHtml;

  // Alertes globales
  const diff = nDays(DB.s.anchor, t);
  const qs = addD(DB.s.anchor, Math.floor(diff / 14) * 14);
  const { Q, AL } = calcPer(qs, 1);
  const o = Q[0];
  const N = DB.s.base * 2 * 60;

  $('homeQuat').innerHTML = `
    <div style="font-size:12px;margin-bottom:4px"><b>${F(o.seuil)}</b> sur <b>${F(N)}</b></div>
    <div class="bar ${o.seuil > N ? 'bad' : o.seuil > N * 0.85 ? 'warn' : ''}"><i style="width:${Math.min(100, (o.seuil / N) * 100)}%"></i></div>
    <div class="mut" style="font-size:11px">${o.seuil >= N ? 'HS : ' + F(o.h25 + o.h50) : 'Reste ' + F(N - o.seuil) + ' avant HS'}</div>`;

  const { tot } = brutOf(calcPer(qs, 1).G);
  $('homePay').innerHTML = `<b style="font-size:18px;color:var(--ok)">${EUR(tot)}</b><div class="mut" style="font-size:11px">Brut estimé quatorzaine</div>`;

  const critAlerts = AL.filter(a => a.lvl === 'b' || a.lvl === 'w');
  $('homeAlertCount').textContent = critAlerts.length ? `(${critAlerts.length})` : '';
  $('homeAlerts').innerHTML = critAlerts.length
    ? critAlerts.slice(0, 3).map(a => `<div class="al ${a.lvl}" style="padding:6px 8px;font-size:12px;margin-bottom:4px"><b>${short(a.k)}</b> : ${esc(a.m)}</div>`).join('')
    : '<div class="al k" style="padding:6px 8px;font-size:12px">✅ Aucune anomalie sur la quatorzaine en cours</div>';
}

// ==================== RENDU VUE JOUR ====================

function renderDay() {
  const k = curDate;
  const d = gd(k);
  const r = cd(k);
  const isF = isFerie(k);
  const isD = dowN(k) === 0;

  $('dLbl').textContent = dow(k).toUpperCase() + ' ' + k.slice(8) + ' ' + MON[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4)
    + (isF ? ' ☀️' : '') + (isD && !isF ? ' 🔵' : '') + (k === today() ? ' • auj.' : '');

  const TYPES = { T: 'Travail', REPOS: 'Repos', NUIT: 'Nuit', RC: 'RC', CP: 'Congé', MAL: 'Maladie' };
  $('dType').innerHTML = Object.entries(TYPES).map(([x, l]) =>
    `<button class="${d.t === x ? 'on' : ''}" onclick="setD('t','${x}')">${l}</button>`).join('');

  let h = '';
  if (d.t === 'T' || d.t === 'NUIT') {
    h = `<div class="g2">
<div><label>Début</label><input type="time" value="${d.deb || ''}" onchange="setD('deb',this.value)"></div>
<div><label>Fin</label><input type="time" value="${d.fin || ''}" onchange="setD('fin',this.value)"></div>
</div>
<div style="margin-top:11px"><label>Pauses</label>`;

    const _a = P(d.deb), _b0 = P(d.fin);
    let _b = _b0;
    if (_a != null && _b != null && _b <= _a) _b += 1440;
    const _pd = P(DB.s.panDeb), _pf = P(DB.s.panFin);
    const _panOK = _a != null && _b != null && _a <= _pd && _b >= _pf;

    d.p.forEach((p, i) => {
      h += `<div class="pz"><div class="row">
<input type="time" value="${p.d || ''}" onchange="setP(${i},'d',this.value)" style="flex:1">
<input type="time" value="${p.f || ''}" onchange="setP(${i},'f',this.value)" style="flex:1">
<button class="r" onclick="delP(${i})" style="padding:8px 11px">✕</button></div>
<div class="row" style="margin-top:7px;align-items:center">
<select onchange="setP(${i},'ty',this.value)" style="flex:1">
<option value="ENT"${p.ty === 'ENT' ? ' selected' : ''}>Intérieur (IRU)</option>
<option value="EXT"${p.ty === 'EXT' ? ' selected' : ''}>Extérieur (IR)</option>
</select>
<span class="mut">${_panOK ? '🍽️ Repas validé' : '—'}</span></div></div>`;
    });

    h += `<button class="g" onclick="addP()" style="width:100%">+ Ajouter une pause</button></div>
<div style="margin-top:11px"><label>Panier repas</label>
<div class="chips">
<button class="${!d.panier ? 'on' : ''}" onclick="setD('panier',null)">Auto</button>
<button class="${d.panier === 'EXT' ? 'on' : ''}" onclick="setD('panier','EXT')">🍽️ Extérieur</button>
<button class="${d.panier === 'ENT' ? 'on' : ''}" onclick="setD('panier','ENT')">🍽️ Intérieur</button>
<button class="${d.panier === 'NON' ? 'on' : ''}" onclick="setD('panier','NON')">Aucun</button>
</div>
<div class="mut">${!d.panier ? (_panOK ? 'Auto : amplitude couvrant la plage repas → calcul automatique.' : 'Auto : le service ne couvre pas la plage de repas.') : 'Choix manuel prioritaire.'}</div>
</div>
<div style="margin-top:11px">
<label style="text-transform:none;font-size:14px;color:var(--txt)">
<input type="checkbox" ${d.fer ? 'checked' : ''} onchange="setD('fer',this.checked)"> ☀️ Jour férié travaillé (majoration 100 %)
</label></div>`;
  }

  const stateLabel = { T: 'Journée travaillée', REPOS: 'Repos', NUIT: 'Nuit', RC: 'Repos compensateur', CP: 'Congé payé', MAL: 'Maladie' }[d.t] || d.t;
  const stateClass = d.t === 'T' ? 'ok' : d.t === 'REPOS' ? 'mut' : d.t === 'NUIT' ? 'pur' : 'warn';
  $('dWork').innerHTML = `<div class="day-state ${stateClass}"><span>${stateLabel}</span>${r.al.length ? `<b>⚠️ ${r.al.length} alerte${r.al.length > 1 ? 's' : ''}</b>` : ''}</div>${h}`;
  $('dNote').value = d.note || '';

  $('dKpi').innerHTML = [
    ['Amplitude', F(r.amp)],
    ['TTE', F(r.tte)],
    ['Pauses', F(r.pz)],
    ['IDAJ', r.idaj ? F(r.idaj) : '—'],
    ['Paniers', (r.ir + r.iru) || '—'],
    ['H. nuit', r.nuit ? F(r.nuit) : '—']
  ].map(x => `<div class="kpi"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');

  $('dAl').innerHTML = r.al.map(a => `<div class="al ${a.lvl}">${esc(a.m)}</div>`).join('');

  const diff = nDays(DB.s.anchor, k);
  const qs = addD(DB.s.anchor, Math.floor(diff / 14) * 14);
  const o = calcPer(qs, 1).Q[0];
  const N = DB.s.base * 2 * 60;
  const pc = Math.min(100, (o.seuil / N) * 100);
  const barCls = pc >= 100 ? 'bar bad' : pc >= 85 ? 'bar warn' : 'bar';

  $('dQuat').innerHTML = `<div class="mut">${short(qs)} → ${short(addD(qs, 13))}</div>
<div class="${barCls}"><i style="width:${pc.toFixed(1)}%"></i></div>
<div class="row" style="justify-content:space-between">
<span><b>${F(o.seuil)}</b> / ${F(N)}</span>
<span class="mut">${o.seuil < N ? 'Reste ' + F(N - o.seuil) + ' avant HS' : '🔥 HS : ' + F(o.h25) + ' à 25% · ' + F(o.h50) + ' à 50%'}</span>
</div>`;

  renderProj(k, qs);
  if (_undo) $('undoDesc').textContent = _undo.desc;
}

function renderProj(k, qs) {
  const qEnd = addD(qs, 13);
  const today_ = today();
  if (k > qEnd || k < qs) {
    $('dProj').innerHTML = '<span class="mut">Navigue dans la quatorzaine courante pour voir la projection.</span>';
    return;
  }
  const restant = nDays(today_, qEnd);
  if (restant <= 0) {
    $('dProj').innerHTML = '<span class="mut">Quatorzaine terminée.</span>';
    return;
  }
  $('dProjLbl').textContent = short(qs) + ' → ' + short(qEnd);
  const o = calcPer(qs, 1).Q[0];
  const N = DB.s.base * 2 * 60;
  const trav = o.trav || 1;
  const moyJ = o.seuil / trav;
  const joursTravRestants = Math.round((restant * trav) / (nDays(qs, today_) + 1 || 1));
  const proj = o.seuil + joursTravRestants * moyJ;
  const projH25 = Math.min(Math.max(proj - N, 0), DB.s.pl * 60);
  const projH50 = Math.max(proj - N - DB.s.pl * 60, 0);

  $('dProj').innerHTML = `
<div class="g2">
<div class="kpi"><b>${restant}</b><span>Jours restants</span></div>
<div class="kpi ${projH50 > 0 ? 'bad' : projH25 > 0 ? 'warn' : ''}"><b>${F(Math.round(proj))}</b><span>TTE projetée</span></div>
</div>
<div class="mut" style="margin-top:6px">
Projection à rythme constant : <b>${F(Math.round(projH25))}</b> HS 25% · <b>${F(Math.round(projH50))}</b> HS 50%
<br>Marge avant HS : <b>${F(Math.max(N - o.seuil, 0))}</b>
</div>`;
}

// ==================== RENDU VUE MOIS ====================

function renderMonth() {
  const ym = curMonth;
  const [yr, mo] = ym.split('-').map(Number);
  $('mLbl').textContent = MON[mo - 1].toUpperCase() + ' ' + yr;

  const firstDate = new Date(yr, mo - 1, 1);
  const lastDate = new Date(yr, mo, 0);
  const totalDays = lastDate.getDate();

  let calHtml = ['L', 'M', 'M', 'J', 'V', 'S', 'D', 'Σ'].map(h => `<div class="h">${h}</div>`).join('');
  let startCol = (firstDate.getDay() + 6) % 7;

  for (let i = 0; i < startCol; i++) {
    calHtml += '<div class="cel off"></div>';
  }

  let curWeekTte = 0, curWeekAmp = 0;
  let mTotalTte = 0, mTotalAmp = 0, mTotalTrav = 0, mTotalPan = 0;
  const dayBars = [];
  const feriesMois = [];

  for (let d = 1; d <= totalDays; d++) {
    const k = `${yr}-${pad(mo)}-${pad(d)}`;
    const r = cd(k);
    const isNow = k === today();
    const hasErr = r.al.some(a => a.lvl === 'b');

    curWeekTte += r.tte;
    curWeekAmp += r.amp;
    mTotalTte  += r.tte;
    mTotalAmp  += r.amp;
    mTotalTrav += r.trav;
    mTotalPan  += (r.ir + r.iru);

    if (r.fer) feriesMois.push(k);
    dayBars.push({ k, tte: r.tte });

    calHtml += `
      <div class="cel ${r.t || 'REPOS'} ${isNow ? 'now' : ''} ${hasErr ? 'err' : ''}" onclick="curDate='${k}';tab('jour')">
        <div class="d">${d}</div>
        <div class="v">${r.tte ? F(r.tte) : r.t !== 'REPOS' ? r.t : ''}</div>
        <div class="ic">${(r.ir + r.iru) ? '🍽️' : ''}${r.fer ? '☀️' : ''}</div>
      </div>`;

    if ((startCol + d) % 7 === 0 || d === totalDays) {
      if (d === totalDays && (startCol + d) % 7 !== 0) {
        const fill = 7 - ((startCol + d) % 7);
        for (let f = 0; f < fill; f++) calHtml += '<div class="cel off"></div>';
      }
      calHtml += `<div class="rec"><b>${F(curWeekTte)}</b>${F(curWeekAmp)}</div>`;
      curWeekTte = 0;
      curWeekAmp = 0;
    }
  }
  $('mCal').innerHTML = calHtml;

  $('mKpi').innerHTML = [
    ['TTE Total', F(mTotalTte)],
    ['Amplitude', F(mTotalAmp)],
    ['Jours trav.', mTotalTrav],
    ['Paniers', mTotalPan]
  ].map(x => `<div class="kpi"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');

  // Graphique journalier
  const maxMoisTte = Math.max(...dayBars.map(b => b.tte), 600);
  $('mChart').innerHTML = dayBars.map(b => {
    const h = Math.round((b.tte / maxMoisTte) * 100);
    return `
      <div class="bar-w" title="${short(b.k)} : ${F(b.tte)}">
        <div class="bv ${b.tte > 660 ? 'hs' : ''}" style="height:${Math.max(2, h)}%"></div>
        <div class="bl">${b.k.slice(8)}</div>
      </div>`;
  }).join('');

  $('mDim').innerHTML = feriesMois.length
    ? feriesMois.map(k => `<div class="al w">☀️ <b>${short(k)}</b> travaillé : ${F(cd(k).tte)}</div>`).join('')
    : '<div class="al k">✅ Aucun jour férié travaillé ce mois-ci</div>';
}

// ==================== ALIAS & RENDU GLOBAL ====================

const renderPay = renderPayBase;
const renderAudit = renderAuditBase;
const renderReg = renderRegBase;

function renderAll() {
  renderHome();
  if (curTab === 'jour') renderDay();
  if (curTab === 'mois') renderMonth();
  if (curTab === 'paie') renderPay();
  if (curTab === 'audit') renderAudit();
  if (curTab === 'bul') renderBulHist();
  if (curTab === 'romi') renderRomiTab();
  if (curTab === 'reg') renderReg();

  let tot = 0;
  DB.periods.forEach(p => {
    const { AL } = calcPer(p.start, p.nb);
    tot += AL.filter(a => a.lvl === 'b').length;
  });

  const badge = $('hBadge');
  if (badge) {
    if (tot > 0) {
      badge.style.display = '';
      badge.textContent = tot;
    } else {
      badge.style.display = 'none';
    }
  }

  const auditBtn = $('t-audit');
  if (auditBtn) {
    auditBtn.querySelector('.tb')?.remove();
    if (tot > 0) {
      const sp = document.createElement('span');
      sp.className = 'tb';
      sp.textContent = tot;
      auditBtn.appendChild(sp);
    }
  }
}

function regPer() {
  const s = DB.per.start;
  const ex = DB.periods.find(p => p.start === s);
  if (ex) ex.nb = DB.per.nb;
  else DB.periods.push({ start: s, nb: DB.per.nb });
  DB.periods.sort((a, b) => (a.start < b.start ? -1 : 1));
  gb(s);
  save();
  alert('✅ Période enregistrée dans l\'audit');
  renderAll();
}

function copySum() {
  const { Q, G } = calcPer(DB.per.start, DB.per.nb);
  let t = 'MesHeures — Résumé\n';
  t += 'Période : ' + short(DB.per.start) + ' → ' + short(addD(DB.per.start, DB.per.nb * 14 - 1)) + '\n\n';
  Q.forEach((o, i) => {
    o.w.forEach((s, j) => (t += 'Sem. ' + (j + 1) + ' (' + short(s.start) + ') : Amp ' + F(s.amp) + ' · TTE ' + F(s.tte) + '\n'));
    t += '→ Q' + (i + 1) + ' : TTE ' + F(o.seuil) + ' | HS 25% ' + F(o.h25) + ' · HS 50% ' + F(o.h50) + '\n\n';
  });
  t += 'TOTAL : TTE ' + F(G.tte) + ' · Amp ' + F(G.amp) + ' · ' + G.trav + ' j · ' + (G.ir + G.iru) + ' paniers · IDAJ ' + C2(G.idaj) + 'h';
  navigator.clipboard.writeText(t).then(
    () => alert('✅ Résumé copié dans le presse-papiers !'),
    () => prompt('Copie le résumé ci-dessous :', t)
  );
}
 
