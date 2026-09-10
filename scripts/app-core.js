// scripts/app-core.js — Moteur métier & calculs conventionnels (CCNTR Ambulances)

const LS = 'mesheures_v3';

const DEF = {
  nom: '',
  emb: '2019-09-09',
  taux: 14.02,
  net: 0.787,
  hab: 10,          // indemnité habillage en minutes par jour travaillé
  habT: 12.9688,    // taux horaire habillage
  idaj: 12,         // seuil amplitude journalière en heures
  base: 35,         // base hebdo en heures (70h / quatorzaine)
  pl: 16,           // plafond contingent HS 25 % en heures (8h/semaine -> 16h/quatorzaine)
  ir: 5.30,         // indemnité repas unique
  iru: 9.69,        // repas unique spécial / extérieur
  irT: 10.40,       // plafond URSSAF
  rc: 420,          // durée forfaitaire RC (7h = 420m)
  cp: 420,          // durée forfaitaire CP (7h = 420m)
  anc: 0,           // surchage manuelle prime ancienneté (%)
  min: false,       // garantie TTE minimale 4h30 (270m)
  maxAmp: 14,       // amplitude max légale journalière
  anchor: '2025-05-19', // date pivot quatorzaines
  panDeb: '11:45',
  panFin: '14:15',
  dimPrime: 0,
  nuitDeb: '21:00',
  nuitFin: '06:00',
  nuitMaj: 0,       // pourcentage majoration nuit
  rcAlerte: 400
};

let DB = {
  s: { ...DEF },
  days: {},
  cmp: {},
  periods: [],
  bul: {},
  bulletins: [],
  romi: {},
  per: { start: '2025-05-19', nb: 1 },
  exp: null
};

let curDate = '';
let curMonth = '';
let curTab = 'jour';
let _undo = null;

// Utilitaires de base
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => isoOf(new Date());
const dOf = s => new Date(`${s}T12:00:00`);
const addD = (s, n) => {
  const d = dOf(s);
  d.setDate(d.getDate() + n);
  return isoOf(d);
};
const nDays = (a, b) => Math.round((dOf(b) - dOf(a)) / 864e5);

const DOW = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
const MON = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const dow = s => DOW[dOf(s).getDay()];
const dowN = s => dOf(s).getDay();
const mono = s => {
  const d = dOf(s);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoOf(d);
};

// Conversions temporelles
const P = s => {
  if (!s || !/^\d{1,2}:\d{2}/.test(s)) return null;
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

const F = m => {
  if (m == null) return '—';
  const sign = m < 0 ? '-' : '';
  const abs = Math.abs(Math.round(m));
  return `${sign}${Math.floor(abs / 60)}h${pad(abs % 60)}`;
};

const C2 = m => (m / 60).toFixed(2);
const EUR = n => (typeof n === 'number' ? `${n.toFixed(2).replace('.', ',')} €` : '—');
const short = s => `${s.slice(8)}/${s.slice(5, 7)}`;
const shortY = s => `${s.slice(8)}/${s.slice(5, 7)}/${s.slice(2, 4)}`;
const esc = s => (s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '');

function parseNum(s) {
  if (!s) return 0;
  return parseFloat(String(s).replace(/\s/g, '').replace(',', '.')) || 0;
}

function numsOfLine(l) {
  const matches = [...l.matchAll(/([\d][\d\s]*(?:[.,]\d+)?)/g)];
  return matches.map(m => parseNum(m[0])).filter(n => !isNaN(n) && n > 0);
}

// Persistance
function save() {
  try {
    localStorage.setItem(LS, JSON.stringify(DB));
  } catch (e) {
    console.error('Erreur sauvegarde localStorage', e);
  }
}

function loadDB() {
  try {
    const raw = localStorage.getItem(LS);
    if (raw) {
      const data = JSON.parse(raw);
      DB = {
        ...DB,
        ...data,
        s: { ...DEF, ...(data.s || {}) },
        per: { ...DB.per, ...(data.per || {}) }
      };
    }
  } catch (e) {
    console.error('Erreur chargement localStorage', e);
  }
}

// Fériés légaux français
function easterOf(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mo = Math.floor((h + l - 7 * m + 114) / 31);
  const da = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, mo - 1, da, 12);
}

const FC = {};
function feriesY(y) {
  if (FC[y]) return FC[y];
  const s = new Set([
    `${y}-01-01`, `${y}-05-01`, `${y}-05-08`,
    `${y}-07-14`, `${y}-08-15`, `${y}-11-01`,
    `${y}-11-11`, `${y}-12-25`
  ]);
  const e = easterOf(y);
  [1, 39, 50].forEach(n => {
    const d = new Date(e);
    d.setDate(d.getDate() + n);
    s.add(isoOf(d));
  });
  return (FC[y] = s);
}
const isFerie = k => feriesY(+k.slice(0, 4)).has(k);

// Calcul ancienneté conforme CCNTR Ambulances
function calcAnc(emb) {
  if (!emb) return { y: 0, m: 0, pct: 0 };
  const e = dOf(emb);
  const n = new Date();
  let y = n.getFullYear() - e.getFullYear();
  let mo = n.getMonth() - e.getMonth();
  if (mo < 0) {
    y--;
    mo += 12;
  }
  let pct = 0;
  if (y >= 15) pct = 8;
  else if (y >= 10) pct = 6;
  else if (y >= 5) pct = 4;
  else if (y >= 2) pct = 2;
  return { y, m: mo, pct };
}

// Calcul des heures de nuit (21h - 6h)
function minutesNuit(a, b, S) {
  const nd = P(S.nuitDeb);
  const nf = P(S.nuitFin);
  if (nd == null || nf == null) return 0;
  let mn = 0;
  for (let t = a; t < b; t++) {
    const tm = t % 1440;
    if (tm >= nd || tm < nf) mn++;
  }
  return mn;
}

// Calcul de la journée
function cd(k) {
  const d = DB.days[k];
  const S = DB.s;
  const r = {
    amp: 0, tte: 0, seuil: 0, idaj: 0, ir: 0, iru: 0,
    rc: 0, fer: 0, dim: 0, trav: 0, pz: 0, nuit: 0,
    al: [], deb: null, fin: null, finAbs: null, t: d ? d.t : null
  };
  if (!d) return r;

  const isDim = dowN(k) === 0;

  if (d.t === 'T' || d.t === 'NUIT') {
    const a = P(d.deb);
    const b0 = P(d.fin);
    if (a == null || b0 == null) {
      r.al.push({ lvl: 'b', m: 'Horaires incomplets' });
      return r;
    }
    const b = b0 <= a ? b0 + 1440 : b0;
    const br = b - a;

    (d.p || []).forEach(p => {
      const x = P(p.d);
      let y = P(p.f);
      if (x != null && y != null) {
        if (y < x) y += 1440;
        r.pz += y - x;
      }
    });

    const pd = P(S.panDeb);
    const pf = P(S.panFin);
    const panOK = a <= pd && b >= pf;

    if (d.panier === 'NON') {
      // Forcé sans panier
    } else if (d.panier === 'ENT') {
      r.iru = 1;
    } else if (d.panier === 'EXT') {
      r.ir = 1;
    } else if (panOK && (d.p || []).length) {
      const hasEnt = (d.p || []).some(p => p.ty === 'ENT');
      if (hasEnt) r.iru = 1;
      else r.ir = 1;
    } else if (panOK) {
      r.ir = 1;
    }

    r.amp = br + S.hab;
    r.tte = Math.max(0, br - r.pz);
    if (S.min && r.tte < 270) r.tte = 270;

    r.seuil = r.tte;
    r.trav = 1;
    r.deb = a;
    r.fin = b;
    r.finAbs = b;

    r.idaj = Math.max(0, r.amp - S.idaj * 60);
    if (d.fer) r.fer = r.tte;
    if (isDim) r.dim = 1;

    r.nuit = minutesNuit(a, b, S);

    if (r.amp > S.maxAmp * 60) {
      r.al.push({ lvl: 'b', m: `Amplitude ${F(r.amp)} > ${S.maxAmp}h réglementaires` });
    }
    if (r.pz === 0 && r.tte >= 360) {
      r.al.push({ lvl: 'w', m: '≥ 6h travaillées sans pause — 20 min dues (art. L3121-16)' });
    }
    if (isFerie(k) && !d.fer) {
      r.al.push({ lvl: 'w', m: 'Jour férié travaillé — majoration non cochée' });
    }
    if (r.tte > 660) {
      r.al.push({ lvl: 'w', m: 'TTE > 11h — journée exceptionnellement longue' });
    }
  } else if (d.t === 'CP') {
    r.seuil = S.cp;
  } else if (d.t === 'RC') {
    r.rc = S.rc;
  }

  return r;
}

// Calcul de la période / quatorzaine
function calcPer(start, nb) {
  const S = DB.s;
  const Q = [];
  const AL = [];
  let lastEndTimestamp = null;

  const G = {
    amp: 0, tte: 0, seuil: 0, trav: 0, idaj: 0,
    ir: 0, iru: 0, rc: 0, fer: 0, dim: 0, nuit: 0,
    nor: 0, h25: 0, h50: 0, hab: 0, ferJ: [], dimJ: []
  };

  for (let q = 0; q < nb; q++) {
    const o = {
      start: addD(start, q * 14),
      w: [],
      amp: 0,
      tte: 0,
      seuil: 0,
      trav: 0,
      h25: 0,
      h50: 0,
      nor: 0
    };

    for (let w = 0; w < 2; w++) {
      const s = {
        start: addD(start, q * 14 + w * 7),
        amp: 0,
        tte: 0,
        trav: 0
      };

      for (let i = 0; i < 7; i++) {
        const k = addD(start, q * 14 + w * 7 + i);
        const r = cd(k);

        s.amp += r.amp;
        s.tte += r.tte;
        s.trav += r.trav;
        o.seuil += r.seuil;

        G.idaj += r.idaj;
        G.ir += r.ir;
        G.iru += r.iru;
        G.rc += r.rc;
        G.fer += r.fer;
        G.nuit += r.nuit;

        if (r.fer) G.ferJ.push(k);
        if (r.dim && DB.days[k] && DB.days[k].t === 'T') {
          G.dim++;
          G.dimJ.push(k);
        }

        r.al.forEach(a => AL.push({ k, ...a }));

        if (r.deb != null) {
          const currentStartTimestamp = dOf(k).getTime() + (r.deb - 720) * 60000;
          if (lastEndTimestamp != null) {
            const restMin = Math.round((currentStartTimestamp - lastEndTimestamp) / 60000);
            if (restMin > 0 && restMin < 660) {
              AL.push({
                k,
                lvl: 'w',
                m: `Repos quotidien de ${F(restMin)} seulement (11h requises entre deux postes)`
              });
            }
          }
          lastEndTimestamp = dOf(k).getTime() + (r.fin - 720) * 60000;
        }
      }

      if (s.tte > 2880) {
        AL.push({ k: s.start, lvl: 'b', m: `Semaine à ${F(s.tte)} — plafond légal 48h dépassé` });
      }

      o.w.push(s);
      o.amp += s.amp;
      o.tte += s.tte;
      o.trav += s.trav;
    }

    // Base quatorzaine : base hebdo * 2 semaines en minutes (ex: 35 * 2 * 60 = 4200 min)
    const baseQuatorzaineMin = S.base * 2 * 60;
    const contingent25Min = S.pl * 60;

    o.nor = Math.min(o.seuil, baseQuatorzaineMin);
    o.h25 = Math.min(Math.max(o.seuil - baseQuatorzaineMin, 0), contingent25Min);
    o.h50 = Math.max(o.seuil - baseQuatorzaineMin - contingent25Min, 0);

    ['amp', 'tte', 'seuil', 'trav', 'nor', 'h25', 'h50'].forEach(x => (G[x] += o[x]));
    Q.push(o);
  }

  G.hab = G.trav * S.hab;
  return { Q, AL, G };
}

// Calcul des lignes du brut estimé
function brutOf(G) {
  const S = DB.s;
  const T = S.taux;
  const L = [];
  const anc = calcAnc(S.emb);
  const ancPct = S.anc || anc.pct;

  L.push(['Heures normales', F(G.nor), `${T.toFixed(2)} €/h`, (G.nor / 60) * T]);

  if (G.h25) {
    L.push(['HS 25 %', F(G.h25), `${(T * 1.25).toFixed(2)} €/h`, (G.h25 / 60) * T * 1.25]);
  }
  if (G.h50) {
    L.push(['HS 50 %', F(G.h50), `${(T * 1.5).toFixed(2)} €/h`, (G.h50 / 60) * T * 1.5]);
  }
  if (G.fer) {
    L.push(['Majoration fériés 100 %', F(G.fer), `${T.toFixed(2)} €/h`, (G.fer / 60) * T]);
  }
  if (G.rc) {
    L.push(['Repos compensateur', F(G.rc), `${T.toFixed(2)} €/h`, (G.rc / 60) * T]);
  }
  if (G.hab) {
    L.push(['Habillage/déshabillage', `${C2(G.hab)} h`, `${S.habT.toFixed(4)} €/h`, (G.hab / 60) * S.habT]);
  }
  if (G.idaj) {
    L.push(['IDAJ (dépassement amplitude)', `${C2(G.idaj)} h`, `${T.toFixed(2)} €/h`, (G.idaj / 60) * T]);
  }
  if (G.dim && S.dimPrime) {
    L.push(['Prime dimanche', `${G.dim} dim.`, `${S.dimPrime.toFixed(2)} €/dim.`, G.dim * S.dimPrime]);
  }
  if (G.nuit && S.nuitMaj) {
    L.push(['Majoration heures de nuit', `${C2(G.nuit)} h`, `${S.nuitMaj} %`, (G.nuit / 60) * T * (S.nuitMaj / 100)]);
  }

  const sub = L.reduce((a, x) => a + x[3], 0);
  if (ancPct) {
    L.push(["Prime d'ancienneté", `${ancPct} %`, 'sur brut', (sub * ancPct) / 100]);
  }

  const tot = L.reduce((a, x) => a + x[3], 0);
  const panIR = G.ir * S.ir;
  const panIRU = G.iru * S.iru;
  const panIRUT = G.iru * S.irT;

  return { L, tot, panIR, panIRU, panIRUT };
}

// Initialisation au chargement
loadDB();
