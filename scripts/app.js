const LS='mesheures_v3';
const DEF={
  nom:'',emb:'2019-09-09',
  taux:14.02,net:0.787,
  hab:10,habT:12.9688,
  idaj:12,base:35,pl:16,
  ir:5.30,iru:9.69,irT:10.40,
  rc:420,cp:420,anc:0,
  min:false,maxAmp:14,
  anchor:'2025-05-19',
  panDeb:'11:45',panFin:'14:15',
  dimPrime:0,
  nuitDeb:'21:00',nuitFin:'06:00',nuitMaj:0,
  rcAlerte:400
};
let DB={s:{...DEF},days:{},cmp:{},periods:[],bul:{},bulletins:[],romi:{},per:{start:'2025-05-19',nb:1},exp:null};
let curDate,curMonth,curTab='jour';
let _undo=null;

const $=i=>document.getElementById(i);
const pad=n=>String(n).padStart(2,'0');
const isoOf=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today=()=>isoOf(new Date());
const dOf=s=>new Date(s+'T12:00:00');
const addD=(s,n)=>{const d=dOf(s);d.setDate(d.getDate()+n);return isoOf(d)};
const nDays=(a,b)=>Math.round((dOf(b)-dOf(a))/864e5);
const DOW=['dim','lun','mar','mer','jeu','ven','sam'];
const MON=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const dow=s=>DOW[dOf(s).getDay()];
const dowN=s=>dOf(s).getDay();
const mono=s=>{const d=dOf(s);d.setDate(d.getDate()-((d.getDay()+6)%7));return isoOf(d)};
const P=s=>{if(!s||!/^\d{1,2}:\d{2}/.test(s))return null;const[h,m]=s.split(':').map(Number);return h*60+m};
const F=m=>{if(m==null)return'—';const g=m<0;m=Math.abs(Math.round(m));return(g?'-':'')+Math.floor(m/60)+'h'+pad(m%60)};
const C2=m=>(m/60).toFixed(2);
const EUR=n=>typeof n==='number'?n.toFixed(2).replace('.',',')+' €':'—';
const short=s=>s.slice(8)+'/'+s.slice(5,7);
const shortY=s=>s.slice(8)+'/'+s.slice(5,7)+'/'+s.slice(2,4);
const esc=s=>s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'):'';
function parseNum(s){return parseFloat(s.replace(/\s/g,'').replace(',','.'))||0}
function numsOfLine(l){
  const matches=[...l.matchAll(/([\d][\d\s]*(?:[.,]\d+)?)/g)];
  return matches.map(m=>parseNum(m[0])).filter(n=>!isNaN(n)&&n>0);
}

function easterOf(y){
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,
  f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,
  i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,
  m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),
  da=((h+l-7*m+114)%31)+1;
  return new Date(y,mo-1,da,12);
}
const FC={};
function feriesY(y){
  if(FC[y])return FC[y];
  const s=new Set([y+'-01-01',y+'-05-01',y+'-05-08',y+'-07-14',y+'-08-15',y+'-11-01',y+'-11-11',y+'-12-25']);
  const e=easterOf(y);
  [1,39,50].forEach(n=>{const d=new Date(e);d.setDate(d.getDate()+n);s.add(isoOf(d))});
  return FC[y]=s;
}
const isFerie=k=>feriesY(+k.slice(0,4)).has(k);

function calcAnc(emb){
  if(!emb)return{y:0,m:0,pct:0};
  const e=dOf(emb),n=new Date();
  let y=n.getFullYear()-e.getFullYear(),mo=n.getMonth()-e.getMonth();
  if(mo<0){y--;mo+=12}
  let pct=0;
  if(y>=2)pct=Math.min(2+(y-2),12);
  return{y,m:mo,pct};
}

function save(){
  try{localStorage.setItem(LS,JSON.stringify(DB))}
  catch(e){alert('Stockage plein exportez vos données '+e.message)}
}
function load(){
  try{
    const r=JSON.parse(localStorage.getItem(LS));
    if(r){
      DB={...DB,...r};
      DB.s={...DEF,...(r.s||{})};
      DB.per={...DB.per,...(r.per||{})};
      DB.periods=r.periods||[];
      DB.bul=r.bul||{};
      DB.bulletins=r.bulletins||[];
      DB.romi=r.romi||{};
    }
  }catch(e){}
}
function gd(k){
  if(!DB.days[k])DB.days[k]={t:'REPOS',p:[]};
  if(!DB.days[k].p)DB.days[k].p=[];
  return DB.days[k];
}
function gb(s){
  if(!DB.bul[s])DB.bul[s]={p25:0,p50:0,rcOld:0,rcAcq:0};
  return DB.bul[s];
}
function setBul(f,v){gb(DB.per.start)[f]=v;save();renderPay()}

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

const AD=[
['2025-05-19','T','08:00','20:00',[],0],['2025-05-21','T','08:00','20:00',[],0],
['2025-05-23','T','07:20','18:30',[['12:55','13:25','ENT']],0],
['2025-05-26','T','05:40','12:50',[],0],['2025-05-27','T','07:20','19:30',[['13:25','13:55','ENT']],0],
['2025-05-28','T','09:00','19:30',[['14:15','14:45','ENT']],0],
['2025-05-29','T','08:00','15:00',[],0],['2025-05-30','T','11:00','17:40',[],0],
['2025-06-02','T','11:45','20:35',[],0],['2025-06-03','T','06:45','17:40',[['12:12','12:42','ENT']],0],
['2025-06-04','T','09:15','18:50',[['14:02','14:32','ENT']],0],
['2025-06-05','T','09:50','18:15',[['14:02','14:32','ENT']],0],
['2025-06-06','T','05:40','16:20',[['11:00','11:30','ENT']],0],
['2025-06-09','T','07:00','14:00',[],0],['2025-06-10','T','07:00','17:40',[['12:20','12:50','ENT']],0],
['2025-06-11','T','10:50','19:40',[['15:15','15:45','ENT']],0],
['2025-06-12','T','08:30','18:00',[['13:15','13:45','ENT']],0],
['2025-06-13','T','07:00','18:00',[['12:30','13:00','ENT']],0],
['2025-06-16','T','07:40','17:30',[['12:35','13:05','ENT']],0],
['2025-06-17','T','07:30','19:10',[['13:20','13:50','ENT']],0],
['2025-06-18','T','07:20','16:00',[['11:40','12:10','ENT']],0],
['2025-06-19','T','09:15','18:20',[['13:47','14:17','ENT']],0],
['2025-06-20','T','04:30','14:50',[['09:40','10:10','ENT']],0],
['2025-06-23','T','07:20','17:30',[['12:25','12:55','ENT']],0],
['2025-06-24','T','11:45','18:10',[],0],['2025-06-25','T','07:15','13:00',[],0],
['2025-06-26','T','09:20','19:30',[['14:25','14:55','ENT']],0],
['2025-06-27','T','07:30','13:50',[],0],
['2025-06-30','T','11:45','20:10',[],0],['2025-07-01','T','09:30','19:20',[['14:25','14:55','ENT']],0],
['2025-07-02','T','06:50','17:50',[['12:20','12:50','ENT']],0],
['2025-07-03','T','13:30','21:00',[],0],['2025-07-04','T','09:50','19:00',[['14:25','14:55','ENT']],0],
['2025-07-07','T','09:40','20:00',[['14:50','15:20','ENT']],0],
['2025-07-08','T','14:30','19:30',[],0],['2025-07-09','T','06:00','17:00',[['11:30','12:00','ENT']],0],
['2025-07-10','T','09:00','19:30',[['14:15','14:45','ENT']],0],
['2025-07-11','T','08:30','18:10',[['13:20','13:50','ENT']],0],
['2025-07-25','T','13:20','19:20',[],0],
['2025-07-28','T','09:20','17:50',[['13:35','14:05','ENT']],0],
['2025-07-29','T','06:30','18:15',[['12:22','12:52','ENT']],0],
['2025-07-30','T','06:45','13:00',[],0],['2025-07-31','T','06:30','18:20',[['12:25','12:55','ENT']],0],
['2025-08-01','T','06:30','17:00',[['11:45','12:15','ENT']],0],
['2025-08-04','T','09:30','18:50',[['14:10','14:40','ENT']],0],
['2025-08-05','T','07:45','13:35',[],0],['2025-08-06','T','09:40','16:15',[['12:57','13:27','ENT']],0],
['2025-08-07','T','06:15','14:35',[],0],
['2025-08-11','T','07:00','14:00',[],0],['2025-08-12','T','06:50','15:20',[['11:05','11:35','ENT']],0],
['2025-08-13','T','07:00','16:00',[['11:30','12:00','ENT']],0],
['2025-08-14','T','12:20','19:30',[],0],['2025-08-15','T','07:00','17:45',[['12:22','12:52','ENT']],1],
['2025-08-18','T','07:00','17:00',[['12:00','12:30','ENT']],0],
['2025-08-19','T','07:45','20:10',[['13:57','14:27','ENT']],0],
['2025-08-20','T','08:00','17:05',[['12:32','13:02','ENT']],0],
['2025-08-21','T','06:30','18:10',[['12:20','12:50','ENT']],0],
['2025-08-22','T','07:45','18:30',[['13:07','13:37','ENT']],0],
['2025-08-25','T','06:45','16:00',[['11:22','11:52','ENT']],0],
['2025-08-26','T','08:15','18:30',[['13:22','13:52','ENT']],0],
['2025-08-27','T','08:45','17:15',[['13:00','13:30','ENT']],0],
['2025-08-28','T','07:00','18:15',[['12:37','13:07','ENT']],0],
['2025-08-29','T','10:15','18:20',[['14:17','14:47','ENT']],0],
['2025-09-01','T','11:45','19:30',[],0],['2025-09-02','T','07:30','18:30',[['13:00','13:30','ENT']],0],
['2025-09-03','T','06:50','16:20',[['11:35','12:05','ENT']],0],
['2025-09-04','T','06:30','16:20',[['11:25','11:55','ENT']],0],
['2025-09-05','T','07:40','16:05',[['11:52','12:22','ENT']],0],
['2025-09-08','T','09:50','18:10',[['14:00','14:30','ENT']],0],
['2025-09-09','T','07:30','18:00',[['12:45','13:15','ENT']],0],
['2025-09-10','T','06:20','17:40',[['12:00','12:30','ENT']],0],
['2025-09-11','T','10:30','16:30',[['13:30','14:00','ENT']],0],
['2025-09-12','T','06:15','19:00',[['12:37','13:07','ENT']],0],
['2025-09-15','T','10:15','17:20',[['13:47','14:17','ENT']],0],
['2025-09-16','T','06:15','17:00',[['11:37','12:07','ENT']],0],
['2025-09-18','T','06:40','18:20',[['12:30','13:00','ENT']],0],
['2025-09-19','T','07:20','17:40',[['12:30','13:00','ENT']],0],
['2025-09-22','T','13:30','20:30',[],0],['2025-09-23','T','11:20','21:20',[],0],
['2025-09-24','T','09:00','19:00',[['14:00','14:30','ENT']],0],
['2025-09-25','T','06:40','18:00',[['12:20','12:50','ENT']],0],
['2025-09-26','T','11:20','19:40',[],0],
['2025-09-29','T','09:15','20:20',[['14:47','15:17','ENT']],0],
['2025-09-30','T','08:20','18:45',[['13:32','14:02','ENT']],0],
['2025-10-01','T','09:00','18:30',[['13:45','14:15','ENT']],0],
['2025-10-02','T','06:40','15:20',[['11:00','11:30','ENT']],0],
['2025-10-03','T','07:30','17:30',[['12:30','13:00','ENT']],0],
['2025-10-06','T','07:15','13:00',[],0],['2025-10-07','T','07:45','17:50',[['12:47','13:17','ENT']],0],
['2025-10-08','T','06:50','18:00',[['12:25','12:55','ENT']],0],
['2025-10-09','T','07:30','19:00',[['13:15','13:45','ENT']],0],
['2025-10-10','T','07:40','18:30',[['13:05','13:35','ENT']],0],
['2025-10-13','T','05:20','19:00',[['12:10','12:40','ENT']],0],
['2025-10-14','T','13:20','19:40',[],0],['2025-10-15','T','08:00','18:20',[['13:10','13:40','ENT']],0],
['2025-10-16','T','09:10','19:50',[['14:30','15:00','ENT']],0],
['2025-10-17','T','08:15','19:50',[['14:02','14:32','ENT']],0],
['2025-10-20','T','09:20','19:00',[['14:10','14:40','ENT']],0],
['2025-10-21','T','06:40','17:30',[['12:05','12:35','ENT']],0],
['2025-10-22','T','06:45','17:45',[['12:15','12:45','ENT']],0],
['2025-10-23','T','06:00','14:20',[['10:10','10:40','ENT']],0],
['2025-10-24','T','07:30','15:20',[['11:25','11:55','ENT']],0],
['2025-10-29','T','09:00','19:00',[['14:00','14:30','ENT']],0],
['2025-10-30','T','08:45','19:00',[['13:52','14:22','ENT']],0],
['2025-10-31','T','06:40','18:00',[['12:20','12:50','ENT']],0],
['2025-11-03','T','09:40','20:00',[['14:50','15:20','ENT']],0],
['2025-11-04','T','11:00','20:30',[],0],['2025-11-05','T','07:30','16:30',[['12:00','12:30','ENT']],0],
['2025-11-06','T','12:00','20:20',[],0],['2025-11-07','T','08:00','17:00',[['12:30','13:00','ENT']],0],
['2025-11-12','T','06:30','17:40',[['12:05','12:35','ENT']],0],
['2025-11-13','T','06:40','19:00',[['12:50','13:20','ENT']],0],
['2025-11-14','T','06:30','17:00',[['11:45','12:15','ENT']],0],
['2025-11-17','T','06:45','17:30',[['12:07','12:37','ENT']],0],
['2025-11-18','T','09:00','14:20',[['11:40','12:10','ENT']],0],
['2025-11-19','T','09:30','19:50',[['14:40','15:10','ENT']],0],
['2025-11-20','T','14:10','19:00',[],0],['2025-11-21','T','05:40','17:00',[['11:20','11:50','ENT']],0],
['2025-11-24','T','06:40','18:40',[['12:40','13:10','ENT']],0],
['2025-11-25','T','06:50','18:20',[['12:35','13:05','ENT']],0],
['2025-11-26','T','06:20','14:00',[],0],['2025-11-27','T','06:50','17:30',[['12:10','12:40','ENT']],0],
['2025-11-28','T','14:00','18:00',[],0],
['2025-12-01','T','07:30','17:30',[['12:30','13:00','ENT']],0],
['2025-12-02','T','07:15','17:00',[['12:07','12:37','ENT']],0],
['2025-12-03','T','09:20','19:30',[['14:25','14:55','ENT']],0],
['2025-12-04','T','08:30','18:30',[['13:30','14:00','ENT']],0],
['2025-12-05','T','08:40','19:50',[['14:15','14:45','ENT']],0],
['2025-12-08','T','07:40','17:20',[['12:30','13:00','ENT']],0],
['2025-12-09','T','07:30','18:50',[['13:10','13:40','ENT']],0],
['2025-12-10','T','11:45','19:50',[],0],['2025-12-11','T','08:45','14:20',[],0],
['2025-12-12','T','07:20','15:10',[['11:15','11:45','ENT']],0],
['2025-12-15','T','07:45','17:30',[['12:37','13:07','ENT']],0],
['2025-12-16','T','08:15','19:20',[['12:00','12:30','EXT']],0],
['2025-12-17','T','07:45','18:50',[['13:17','13:47','ENT']],0],
['2025-12-18','T','09:15','18:30',[['12:00','12:30','EXT']],0],
['2025-12-19','T','06:45','15:20',[['11:02','11:32','ENT']],0],
['2025-12-22','CP',null,null,[],0],['2025-12-23','CP',null,null,[],0],
['2025-12-24','CP',null,null,[],0],['2025-12-25','CP',null,null,[],0],
['2025-12-26','CP',null,null,[],0],['2025-12-27','CP',null,null,[],0],
['2025-12-29','CP',null,null,[],0],['2025-12-30','CP',null,null,[],0],
['2025-12-31','CP',null,null,[],0],['2026-01-01','CP',null,null,[],0],
['2026-01-02','CP',null,null,[],0],
['2026-01-05','T','07:20','18:10',[['12:30','13:00','EXT']],0],
['2026-01-06','T','06:50','18:20',[['12:00','12:30','EXT']],0],
['2026-01-07','T','06:30','14:40',[['12:20','12:50','EXT']],0],
['2026-01-08','T','07:15','16:30',[['13:30','14:00','EXT']],0],
['2026-01-09','T','08:30','18:20',[['13:00','13:30','ENT']],0],
['2026-01-12','T','07:30','17:20',[['13:00','13:30','ENT']],0],
['2026-01-13','T','06:30','17:40',[['11:20','11:50','EXT']],0],
['2026-01-14','T','07:30','17:30',[['12:00','12:30','ENT']],0],
['2026-01-15','T','12:45','18:20',[],0],['2026-01-16','T','08:20','18:40',[['12:00','12:30','ENT']],0],
['2026-01-19','T','07:00','17:30',[['12:15','12:45','EXT']],0],
['2026-01-20','T','08:30','19:00',[['12:00','12:30','EXT']],0],
['2026-01-21','T','07:15','17:30',[['11:00','11:30','EXT']],0],
['2026-01-22','T','10:20','18:30',[['12:00','12:30','EXT']],0],
['2026-01-23','T','08:40','17:30',[['13:00','13:30','EXT']],0],
['2026-01-26','T','10:10','17:20',[['13:30','14:00','ENT']],0],
['2026-01-27','T','08:00','12:30',[],0],['2026-01-28','T','06:40','17:30',[['13:00','13:30','EXT']],0],
['2026-01-29','T','07:40','17:20',[['12:30','13:00','ENT']],0],
['2026-01-30','T','05:30','16:15',[['13:15','13:45','ENT']],0],
['2026-02-02','T','09:30','19:00',[['13:30','14:00','EXT']],0],
['2026-02-03','T','11:30','16:50',[],0],['2026-02-04','T','07:15','17:45',[['11:20','11:50','EXT']],0],
['2026-02-05','T','08:30','13:50',[],0],['2026-02-06','T','08:10','12:20',[],0],
['2026-02-09','RC',null,null,[],0],['2026-02-10','RC',null,null,[],0],
['2026-02-11','RC',null,null,[],0],['2026-02-12','RC',null,null,[],0],
['2026-02-13','RC',null,null,[],0],
['2026-02-16','T','07:20','17:30',[['13:00','13:30','EXT']],0],
['2026-02-17','T','08:15','17:00',[['12:30','13:00','EXT']],0],
['2026-02-18','T','07:45','16:00',[['13:30','14:00','EXT']],0],
['2026-02-19','T','08:10','18:00',[['13:00','13:30','EXT']],0],
['2026-02-20','T','07:20','17:30',[['11:45','12:15','EXT']],0],
['2026-02-23','T','07:15','13:20',[],0],['2026-02-24','T','06:30','18:00',[['12:15','12:45','EXT']],0],
['2026-02-25','T','07:45','17:00',[['12:00','12:30','ENT']],0],
['2026-02-26','T','09:00','16:00',[['13:00','13:30','ENT']],0],
['2026-02-27','T','09:30','17:20',[['12:45','13:15','EXT']],0],
['2026-03-02','T','06:45','13:00',[],0],['2026-03-03','T','06:15','14:40',[['12:30','13:00','EXT']],0],
['2026-03-04','T','08:30','18:30',[['12:45','13:15','ENT']],0],
['2026-03-05','T','08:20','20:30',[['12:00','12:30','EXT']],0],
['2026-03-06','T','08:50','18:00',[['13:30','14:00','EXT']],0],
['2026-03-09','T','10:15','20:30',[['14:00','14:30','ENT']],0],
['2026-03-10','T','10:20','17:50',[['12:30','13:00','ENT']],0],
['2026-03-11','T','10:45','16:30',[['12:00','12:30','EXT']],0],
['2026-03-12','T','08:00','18:00',[['11:50','12:20','EXT']],0],
['2026-03-13','T','11:00','20:20',[],0],['2026-03-15','T','14:45','16:10',[],0],
['2026-03-16','T','08:20','17:20',[['11:00','11:30','ENT']],0],
['2026-03-17','T','07:30','18:20',[['13:30','14:00','EXT']],0],
['2026-03-18','T','06:00','16:10',[['11:20','11:50','EXT']],0],
['2026-03-19','T','09:15','18:15',[['12:15','12:45','EXT']],0],
['2026-03-20','T','10:30','18:10',[['13:00','13:30','EXT']],0],
['2026-03-23','T','08:00','17:30',[['13:15','13:45','EXT']],0],
['2026-03-24','RC',null,null,[],0],['2026-03-25','RC',null,null,[],0],
['2026-03-26','RC',null,null,[],0],['2026-03-27','RC',null,null,[],0],
['2026-03-30','T','08:15','19:40',[['13:45','14:15','EXT']],0],
['2026-03-31','RC',null,null,[],0],
['2026-04-01','MAL',null,null,[],0],['2026-04-02','MAL',null,null,[],0],
['2026-04-03','MAL',null,null,[],0],['2026-04-06','MAL',null,null,[],0],
['2026-04-07','MAL',null,null,[],0],['2026-04-08','MAL',null,null,[],0],
['2026-04-09','MAL',null,null,[],0],['2026-04-10','MAL',null,null,[],0],
['2026-04-13','MAL',null,null,[],0],['2026-04-14','MAL',null,null,[],0],
['2026-04-15','MAL',null,null,[],0],['2026-04-16','MAL',null,null,[],0],
['2026-04-17','MAL',null,null,[],0],['2026-04-20','MAL',null,null,[],0],
['2026-04-21','MAL',null,null,[],0],['2026-04-22','MAL',null,null,[],0],
['2026-04-23','MAL',null,null,[],0],['2026-04-24','MAL',null,null,[],0],
['2026-04-27','MAL',null,null,[],0],['2026-04-28','MAL',null,null,[],0],
['2026-04-29','MAL',null,null,[],0],['2026-04-30','MAL',null,null,[],0],
['2026-05-01','MAL',null,null,[],0],['2026-05-04','MAL',null,null,[],0],
['2026-05-05','MAL',null,null,[],0],['2026-05-06','MAL',null,null,[],0],
['2026-05-07','MAL',null,null,[],0],['2026-05-08','MAL',null,null,[],0],
['2026-05-11','MAL',null,null,[],0],['2026-05-12','MAL',null,null,[],0],
['2026-05-13','MAL',null,null,[],0],['2026-05-14','MAL',null,null,[],0],
['2026-05-15','MAL',null,null,[],0],['2026-05-18','MAL',null,null,[],0],
['2026-05-19','MAL',null,null,[],0],['2026-05-20','MAL',null,null,[],0],
['2026-05-21','MAL',null,null,[],0],['2026-05-22','MAL',null,null,[],0],
['2026-05-25','MAL',null,null,[],0],['2026-05-26','MAL',null,null,[],0],
['2026-05-27','MAL',null,null,[],0],['2026-05-28','MAL',null,null,[],0],
['2026-05-29','MAL',null,null,[],0],['2026-06-01','MAL',null,null,[],0],
['2026-06-02','MAL',null,null,[],0],
['2026-06-03','T','06:10','18:00',[['12:15','12:45','EXT']],0],
['2026-06-04','T','09:15','18:10',[['11:45','12:15','EXT']],0],
['2026-06-05','T','11:15','19:30',[],0],
['2026-06-08','T','08:30','17:30',[['12:00','12:30','EXT']],0],
['2026-06-09','T','08:40','17:00',[['13:30','14:00','EXT']],0],
['2026-06-10','T','08:10','17:30',[['11:00','11:30','EXT']],0],
['2026-06-11','T','10:40','19:00',[['13:45','14:15','EXT']],0],
['2026-06-12','T','07:20','18:40',[['12:30','13:00','EXT']],0],
['2026-06-15','T','05:40','17:30',[['11:00','11:30','EXT']],0],
['2026-06-16','T','08:00','16:00',[['13:45','14:15','EXT']],0],
['2026-06-17','T','09:15','19:15',[['11:30','12:00','EXT']],0],
['2026-06-18','T','07:15','18:20',[['12:50','13:20','ENT']],0],
['2026-06-19','T','10:15','17:30',[['12:15','12:45','ENT']],0],
['2026-06-22','T','12:50','17:50',[],0],['2026-06-23','T','07:00','17:30',[['14:00','14:30','EXT']],0],
['2026-06-24','T','07:30','13:00',[],0],['2026-06-25','T','07:20','17:40',[['12:30','13:00','ENT']],0],
['2026-06-26','T','07:30','16:30',[['11:45','12:15','EXT']],0],
['2026-06-29','T','12:50','17:50',[],0],['2026-06-30','T','09:20','20:10',[['12:20','12:50','ENT']],0],
['2026-07-01','T','07:30','17:30',[['12:00','12:30','EXT']],0],
['2026-07-02','T','06:50','12:00',[],0],['2026-07-03','MAL',null,null,[],0],
['2026-07-06','T','07:15','18:00',[['12:45','13:15','EXT']],0],
['2026-07-07','T','07:45','18:45',[['13:45','14:15','EXT']],0],
['2026-07-08','T','08:00','18:30',[['11:45','12:15','EXT']],0],
['2026-07-09','T','06:30','16:15',[['13:15','13:45','EXT']],0],
['2026-07-10','T','10:20','17:40',[['11:45','12:15','EXT']],0],
['2026-07-13','CP',null,null,[],0],['2026-07-14','CP',null,null,[],0],
['2026-07-15','CP',null,null,[],0],['2026-07-16','CP',null,null,[],0],
['2026-07-17','CP',null,null,[],0],['2026-07-18','CP',null,null,[],0],
['2026-07-20','CP',null,null,[],0],['2026-07-21','CP',null,null,[],0],
['2026-07-22','CP',null,null,[],0],['2026-07-23','CP',null,null,[],0],
['2026-07-24','CP',null,null,[],0],['2026-07-25','CP',null,null,[],0],
['2026-07-27','T','06:50','18:15',[['12:30','13:00','EXT']],0],
['2026-07-28','T','12:10','21:00',[],0],['2026-07-29','T','10:00','17:45',[['12:30','13:00','ENT']],0],
['2026-07-30','T','07:00','16:00',[['12:00','12:30','EXT']],0],
['2026-07-31','T','07:45','16:45',[['12:45','13:15','ENT']],0],
['2026-08-01','T','06:30','13:00',[],0],
['2026-08-03','T','08:30','16:20',[['11:15','11:45','EXT']],0],
['2026-08-04','T','10:50','18:50',[['13:15','13:45','ENT']],0],
['2026-08-05','T','12:40','19:00',[],0],['2026-08-06','T','09:00','17:40',[['13:45','14:15','EXT']],0],
['2026-08-07','T','14:00','18:20',[],0],['2026-08-08','T','06:30','14:20',[],0],
['2026-08-10','T','07:50','18:50',[['11:30','12:00','ENT']],0],
['2026-08-11','T','07:15','19:15',[['13:30','14:00','ENT']],0],
['2026-08-12','T','08:00','16:10',[['12:00','12:30','ENT']],0],
['2026-08-13','T','07:00','18:00',[['11:30','12:00','EXT']],0],
['2026-08-14','T','08:45','14:00',[['13:29','13:59','ENT']],0],
['2026-08-15','T','06:30','14:20',[],1],
['2026-08-17','T','08:45','19:00',[['11:45','12:15','EXT']],0],
['2026-08-18','T','07:40','20:20',[['12:00','12:30','ENT']],0],
['2026-08-19','T','09:20','19:20',[['13:00','13:30','EXT']],0],
['2026-08-20','T','05:40','17:40',[['13:15','13:45','ENT']],0],
['2026-08-21','RC',null,null,[],0],
['2026-08-24','T','05:45','17:10',[['12:20','12:50','ENT']],0],
['2026-08-25','T','08:30','19:30',[['14:30','15:00','EXT']],0],
['2026-08-26','T','07:00','13:50',[['12:00','12:30','EXT']],0],
['2026-08-27','T','08:20','19:00',[['14:30','15:00','EXT']],0],
['2026-08-28','T','07:00','16:00',[['14:00','14:30','EXT']],0],
['2026-08-29','T','06:30','14:20',[],0],
['2026-08-31','T','08:20','17:40',[['12:00','12:30','EXT']],0],
['2026-09-01','T','05:15','18:00',[['14:00','14:30','EXT']],0],
['2026-09-02','T','12:00','18:40',[],0],['2026-09-03','T','08:45','20:00',[['11:30','12:00','EXT']],0],
['2026-09-04','T','08:00','20:00',[],0],['2026-09-05','T','06:30','14:20',[],0],
];
const AP=['2025-05-19','2025-05-26','2025-06-02','2025-06-09','2025-06-16','2025-06-23',
'2025-06-30','2025-07-07','2025-07-14','2025-07-28','2025-08-11','2025-08-25',
'2025-09-08','2025-09-22','2025-10-06','2025-10-20','2025-11-03','2025-11-17',
'2025-12-01','2025-12-15','2025-12-29','2026-01-12','2026-01-26','2026-02-09',
'2026-02-23','2026-03-09','2026-03-23','2026-04-06','2026-04-20','2026-05-04',
'2026-05-18','2026-06-01','2026-06-15','2026-06-29','2026-07-13','2026-07-27',
'2026-08-10','2026-08-24'];

function loadArchive(){
  const pd=P(DB.s.panDeb),pf=P(DB.s.panFin);
  AD.forEach(([k,ty,deb,fin,pz,fer])=>{
    const d={t:ty,p:[]};
    if(ty==='T'){
      if(deb)d.deb=deb; if(fin)d.fin=fin;
      pz.forEach(([p1,p2,pty])=>d.p.push({d:p1,f:p2,ty:pty}));
      if(fer||isFerie(k))d.fer=true;
    }
    DB.days[k]=d;
  });
  AP.forEach(s=>{if(!DB.periods.some(p=>p.start===s))DB.periods.push({start:s,nb:1});gb(s);});
  DB.periods.sort((a,b)=>a.start<b.start?-1:1);
  DB.s.anchor='2025-05-19'; DB.per={start:'2025-05-19',nb:1};
  save(); curDate='2026-09-05'; curMonth='2026-09';
  renderAll();
  alert('✅ Archive chargée '+AD.length+' journées '+AP.length+' quatorzaines');
}

function minutesNuit(a,b,S){
  const nd=P(S.nuitDeb),nf=P(S.nuitFin);
  if(!nd||!nf||!S.nuitMaj)return 0;
  let mn=0;
  for(let t=a;t<b;t++){
    if(t>=nd||t<nf)mn++;
  }
  return mn;
}
function cd(k){
  const d=DB.days[k],S=DB.s;
  const r={amp:0,tte:0,seuil:0,idaj:0,ir:0,iru:0,rc:0,fer:0,dim:0,trav:0,pz:0,nuit:0,al:[],deb:null,fin:null,t:d?d.t:null};
  if(!d)return r;
  const isDim=dowN(k)===0;
  if(d.t==='T'){
    const a=P(d.deb),b0=P(d.fin);
    if(a==null||b0==null){r.al.push({lvl:'b',m:'Horaires incomplets'});return r}
    const b=b0<=a?b0+1440:b0, br=b-a;
    const pd=P(S.panDeb),pf=P(S.panFin),panOK=a<=pd&&b>=pf;
    (d.p||[]).forEach(p=>{
      const x=P(p.d); let y=P(p.f);
      if(x!=null&&y!=null){if(y<x)y+=1440;r.pz+=y-x}
    });
    if(d.panier==='NON'){}
    else if(d.panier==='ENT')r.iru=1;
    else if(d.panier==='EXT')r.ir=1;
    else if((d.p||[]).length){(d.p||[]).forEach(p=>{if(panOK){if(p.ty==='EXT')r.ir++;else r.iru++}})}
    else if(panOK)r.ir=1;
    r.amp=br+S.hab; r.tte=br-r.pz;
    if(S.min&&r.tte<270)r.tte=270;
    r.seuil=r.tte; r.trav=1;
    r.deb=a; r.fin=b;
    r.idaj=Math.max(0,r.amp-S.idaj*60);
    if(d.fer)r.fer=r.tte;
    if(isDim)r.dim=1;
    r.nuit=minutesNuit(a,b,S);
    if(r.amp>S.maxAmp*60)r.al.push({lvl:'b',m:'Amplitude '+F(r.amp)+' > '+S.maxAmp+'h réglementaires'});
    if(r.pz===0&&r.tte>=360)r.al.push({lvl:'w',m:'Heures travaillées sans pause'});
    if(isFerie(k)&&!d.fer)r.al.push({lvl:'w',m:'Jour férié travaillé majoration non cochée'});
    if(r.tte>660)r.al.push({lvl:'w',m:'TTE élevé journée exceptionnellement longue'});
  }
  else if(d.t==='CP')r.seuil=S.cp;
  else if(d.t==='RC')r.rc=S.rc;
  else if(d.t==='NUIT'){
    const a=P(d.deb),b0=P(d.fin);
    if(a!=null&&b0!=null){
      const b=b0<=a?b0+1440:b0,br=b-a;
      (d.p||[]).forEach(p=>{const x=P(p.d);let y=P(p.f);if(x!=null&&y!=null){if(y<x)y+=1440;r.pz+=y-x}});
      r.amp=br+S.hab; r.tte=br-r.pz;
      r.seuil=r.tte; r.trav=1; r.deb=a; r.fin=b;
      r.nuit=minutesNuit(a,b,S);
    }
  }
  return r;
}

function calcPer(start,nb){
  const S=DB.s,Q=[],AL=[];
  let pk=null,pe=null;
  const G={amp:0,tte:0,seuil:0,trav:0,idaj:0,ir:0,iru:0,rc:0,fer:0,dim:0,nuit:0,nor:0,h25:0,h50:0,hab:0,ferJ:[],dimJ:[]};
  for(let q=0;q<nb;q++){
    const o={start:addD(start,q*14),w:[],amp:0,tte:0,seuil:0,trav:0,h25:0,h50:0,nor:0};
    for(let w=0;w<2;w++){
      const s={start:addD(start,q*14+w*7),amp:0,tte:0,trav:0};
      for(let i=0;i<7;i++){
        const k=addD(start,q*14+w*7+i),r=cd(k);
        s.amp+=r.amp; s.tte+=r.tte; s.trav+=r.trav;
        o.seuil+=r.seuil;
        G.idaj+=r.idaj; G.ir+=r.ir; G.iru+=r.iru;
        G.rc+=r.rc; G.fer+=r.fer; G.nuit+=r.nuit;
        if(r.fer)G.ferJ.push(k);
        if(r.dim&&DB.days[k]&&DB.days[k].t==='T'){G.dim++;G.dimJ.push(k)}
        r.al.forEach(a=>AL.push({k,...a}));
        if(r.deb!=null){
          if(pe!=null&&pk){
            const gapJours=nDays(pk,k);
            if(gapJours===1){
              const gap=1440+r.deb-pe;
              if(gap>0&&gap<660)AL.push({k,lvl:'w',m:'Repos quotidien de '+F(gap)+' seulement'});
            }
          }
          pk=k; pe=r.fin;
        }
      }
      if(s.tte>2880)AL.push({k:s.start,lvl:'b',m:'Semaine dépassant le plafond légal'});
      o.w.push(s); o.amp+=s.amp; o.tte+=s.tte; o.trav+=s.trav;
    }
    const N=S.base*120;
    o.nor=Math.min(o.seuil,N);
    o.h25=Math.min(Math.max(o.seuil-N,0),S.pl*60);
    o.h50=Math.max(o.seuil-N-S.pl*60,0);
    ['amp','tte','seuil','trav','nor','h25','h50'].forEach(x=>G[x]+=o[x]);
    Q.push(o);
  }
  G.hab=G.trav*S.hab;
  return{Q,AL,G};
}

function brutOf(G){
  const S=DB.s,T=S.taux,L=[];
  const anc=calcAnc(S.emb);
  const ancPct=S.anc||anc.pct;
  L.push(['Heures normales',F(G.nor),T.toFixed(2)+' €/h',G.nor/60*T]);
  if(G.h25)L.push(['HS 25 %',F(G.h25),(T*1.25).toFixed(2)+' €/h',G.h25/60*T*1.25]);
  if(G.h50)L.push(['HS 50 %',F(G.h50),(T*1.5).toFixed(2)+' €/h',G.h50/60*T*1.5]);
  if(G.fer)L.push(['Majoration fériés 100 %',F(G.fer),T.toFixed(2)+' €/h',G.fer/60*T]);
  if(G.rc)L.push(['Repos compensateur',F(G.rc),T.toFixed(2)+' €/h',G.rc/60*T]);
  if(G.hab)L.push(['Habillage/déshabillage',C2(G.hab)+' h',S.habT.toFixed(4)+' €/h',G.hab/60*S.habT]);
  if(G.idaj)L.push(['IDAJ (dépassement amplitude)',C2(G.idaj)+' h',T.toFixed(2)+' €/h',G.idaj/60*T]);
  if(G.dim&&S.dimPrime)L.push(['Prime dimanche',G.dim+' dim.',S.dimPrime.toFixed(2)+' €/dim.',G.dim*S.dimPrime]);
  if(G.nuit&&S.nuitMaj)L.push(['Majoration heures de nuit',C2(G.nuit)+' h',(S.nuitMaj)+'%',G.nuit/60*T*S.nuitMaj/100]);
  const sub=L.reduce((a,x)=>a+x[3],0);
  if(ancPct)L.push(["Prime d'ancienneté",ancPct+' %','sur brut',sub*ancPct/100]);
  const tot=L.reduce((a,x)=>a+x[3],0);
  const panIR=G.ir*S.ir, panIRU=G.iru*S.iru, panIRUT=G.iru*S.irT;
  return{L,tot,panIR,panIRU,panIRUT};
}

function tab(t){
  curTab=t;
  ['jour','mois','paie','audit','bul','romi','reg'].forEach(x=>{
    $('s-'+x).classList.toggle('on',x===t);
    $('t-'+x).classList.toggle('on',x===t);
  });
  window.scrollTo(0,0);
  renderAll();
}
function goDay(n){curDate=addD(curDate,n);renderDay()}
function goToday(){curDate=today();curMonth=curDate.slice(0,7);renderDay();window.scrollTo(0,0)}
function setD(f,v){
  const d=gd(curDate);
  if(f==='t'&&d.t!==v)pushUndo('Changement type '+d.t+' '+v+' le '+short(curDate));
  d[f]=v; save(); renderDay();
}
function setP(i,f,v){const d=gd(curDate);if(!d.p[i])d.p[i]={ty:'ENT'};d.p[i][f]=v;save();renderDay()}
function addP(){gd(curDate).p.push({d:'',f:'',ty:'ENT'});save();renderDay()}
function delP(i){gd(curDate).p.splice(i,1);save();renderDay()}
function dupliConfirm(){
  const prev=DB.days[addD(curDate,-1)];
  if(!prev)return alert('Rien la veille à copier');
  const d=gd(curDate);
  if(d.t!=='REPOS'||d.deb){
    if(!confirm('Le jour courant a déjà des données écraser avec la veille'))return;
  }
  pushUndo('Copie veille '+short(curDate));
  DB.days[curDate]=JSON.parse(JSON.stringify(prev));
  save(); renderDay();
}

function renderDay(){
  const k=curDate,d=gd(k),r=cd(k);
  const isF=isFerie(k),isD=dowN(k)===0;
  $('dLbl').textContent=dow(k).toUpperCase()+' '+k.slice(8)+' '+MON[+k.slice(5,7)-1]+' '+k.slice(0,4)
    +(isF?' ☀️':'')+(isD&&!isF?' 🔵':'')+(k===today()?' auj':'');
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
<option value="ENT"${p.ty==='ENT'?' selected':''}>Intérieur</option>
<option value="EXT"${p.ty==='EXT'?' selected':''}>Extérieur</option>
</select>
<span class="mut">${_panOK?'🍽️ panier':''}</span></div></div>`);
    h+=`<button class="g" onclick="addP()" style="width:100%">Ajouter une pause</button></div>
<div style="margin-top:11px"><label>Panier repas</label>
<div class="chips">
<button class="${!d.panier?'on':''}" onclick="setD('panier',null)">Auto</button>
<button class="${d.panier==='EXT'?'on':''}" onclick="setD('panier','EXT')">🍽️ Extérieur</button>
<button class="${d.panier==='ENT'?'on':''}" onclick="setD('panier','ENT')">🍽️ Intérieur</button>
<button class="${d.panier==='NON'?'on':''}" onclick="setD('panier','NON')">Aucun</button>
</div>
<div class="mut">${!d.panier?(_panOK?'Auto service couvrant la plage repas':'Auto le service ne couvre pas la plage repas'):'Choix forcé pour cette journée'}</div>
</div>
<div style="margin-top:11px">
<label style="text-transform:none;font-size:14px;color:var(--txt)">
<input type="checkbox" ${d.fer?'checked':''} onchange="setD('fer',this.checked)"> ☀️ Jour férié travaillé
</label></div>`;
  }
  $('dWork').innerHTML=h;
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
  $('dQuat').innerHTML=`<div class="mut">${short(qs)} ${short(addD(qs,13))}</div>
<div class="${barCls}"><i style="width:${pc.toFixed(1)}%"></i></div>
<div class="row" style="justify-content:space-between">
<span><b>${F(o.seuil)}</b> / ${F(N)}</span>
<span class="mut">${o.seuil<N?'reste '+F(N-o.seuil)+' avant HS':'🔥 HS '+F(o.h25)+' à 25% '+F(o.h50)+' à 50%'}</span>
</div>`;
  renderProj(k,qs);
  if(_undo){
    $('undoDesc').textContent=_undo.desc;
  }
}

function renderProj(k,qs){
  const qEnd=addD(qs,13);
  const today_=today();
  if(k>qEnd||k<qs){$('dProj').innerHTML='<span class="mut">Navigue dans la quatorzaine courante pour voir la projection</span>';return}
  const restant=nDays(today_,qEnd);
  if(restant<=0){$('dProj').innerHTML='<span class="mut">Quatorzaine terminée</span>';return}
  $('dProjLbl').textContent=short(qs)+' '+short(qEnd);
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
Projection à rythme constant <b>${F(Math.round(projH25))}</b> HS 25% <b>${F(Math.round(projH50))}</b> HS 50%
<br>Marge avant HS <b>${F(Math.max(N-o.seuil,0))}</b>
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
      else if(isFerie(k))ic.push('');
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
    ['Amplitude',F(G.amp)],['TTE',F(G.tte)],['Jours trav',G.trav],
    ['Paniers',G.ir+G.iru],['Dimanches',G.dim],['Fériés trav',G.fer?'oui':'—']
  ].map(x=>`<div class="kpi"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');
  const BARZONE=68;
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
    if(r.dim&&r.trav)dimH+=`<div class="al w">🔵 ${shortY(k)} dimanche travaillé${DB.s.dimPrime?' prime '+EUR(DB.s.dimPrime):''} ${F(r.tte)}</div>`;
    if(r.fer&&DB.days[k]?.t==='T')dimH+=`<div class="al w">☀️ ${shortY(k)} férié travaillé ${F(r.tte)} maj 100% ${EUR(r.tte/60*DB.s.taux)}</div>`;
  }
  $('mDim').innerHTML=dimH||'<span class="mut">Aucun dimanche ni férié travaillé ce mois</span>';
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
  alert('✅ Période enregistrée dans audit');renderAll();
}
function renderPay(){
  const S=DB.s,st=DB.per.start,nb=DB.per.nb,B=gb(st);
  $('pS').value=st;$('pN').value=nb;
  $('pP25').value=B.p25;$('pP50').value=B.p50;
  $('pRC').value=B.rcOld;$('pRCA').value=B.rcAcq;
  $('pLbl').textContent=short(st)+' '+short(addD(st,nb*14-1));
  const off=((nDays(S.anchor,st)%14)+14)%14;
  const reg=DB.periods.some(p=>p.start===st);
  $('pAlign').innerHTML=(off===0
    ?'<div class="al k">✅ Période alignée sur tes quatorzaines</div>'
    :'<div class="al w">⚠️ Décalage de '+off+' jours les HS peuvent être faussées Ajuste la date de début</div>')
    +(reg?'<div class="al i">📌 Période enregistrée dans audit</div>':'');
  const{Q,AL,G}=calcPer(st,nb);
  $('pKpi').innerHTML=[
    ['Amplitude',F(G.amp)],['TTE',F(G.tte)],
    ['HS 25 %',F(G.h25),G.h25>0?'warn':''],
    ['HS 50 %',F(G.h50),G.h50>0?'bad':''],
    ['Jours trav',G.trav],['Paniers',G.ir+G.iru],
    ['Dimanches',G.dim],['IDAJ',C2(G.idaj)+' h']
  ].map(x=>`<div class="kpi ${x[2]||''}"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');
  let h='<tr><th>Détail</th><th class="n">Ampl</th><th class="n">TTE</th><th class="n">Norm</th><th class="n">HS 25%</th><th class="n">HS 50%</th></tr>';
  Q.forEach((o,i)=>{
    o.w.forEach((s,j)=>h+=`<tr><td>Sem ${j+1} ${short(s.start)}</td><td class="n">${F(s.amp)}</td><td class="n">${F(s.tte)}</td><td class="n mut" colspan="3">${s.trav} j</td></tr>`);
    h+=`<tr class="q"><td>Quatorzaine ${i+1}</td><td class="n">${F(o.amp)}</td><td class="n">${F(o.seuil)}</td><td class="n">${F(o.nor)}</td><td class="n">${F(o.h25)}</td><td class="n">${F(o.h50)}</td></tr>`;
  });
  h+=`<tr class="t"><td>TOTAL</td><td class="n">${F(G.amp)}</td><td class="n">${F(G.tte)}</td><td class="n">${F(G.nor)}</td><td class="n">${F(G.h25)}</td><td class="n">${F(G.h50)}</td></tr>`;
  $('pTab').innerHTML=h;
  $('pAlCount').textContent=AL.length?AL.length+' alertes':'';
  $('pAl').innerHTML=AL.length
    ?AL.map(a=>`<div class="al ${a.lvl}"><b>${short(a.k)}</b> ${esc(a.m)}</div>`).join('')
    :'<div class="al k">✅ Aucune anomalie détectée sur cette période</div>';
  const{L,tot,panIR,panIRU,panIRUT}=brutOf(G);
  $('pBrut').innerHTML='<tr><th>Élément</th><th class="n">Qté</th><th class="n">Taux</th><th class="n">Montant</th></tr>'
    +L.map(x=>`<tr><td>${esc(x[0])}</td><td class="n">${x[1]}</td><td class="n mut">${x[2]}</td><td class="n">${EUR(x[3])}</td></tr>`).join('')
    +`<tr class="t"><td>Brut soumis à cotisations</td><td colspan="2"></td><td class="n">${EUR(tot)}</td></tr>`
    +`<tr><td>Net estimé</td><td colspan="2" class="n mut">x ${S.net}</td><td class="n">${EUR(tot*S.net)}</td></tr>`
    +`<tr><td>IR repas ext</td><td colspan="2" class="n mut">${S.ir} €</td><td class="n">${EUR(panIR)}</td></tr>`
    +`<tr><td>IRU brut repas int</td><td colspan="2" class="n mut">${S.iru} €</td><td class="n">${EUR(panIRU)}</td></tr>`
    +`<tr><td>IRU taux plein repas</td><td colspan="2" class="n mut">${S.irT} €</td><td class="n">${EUR(panIRUT)}</td></tr>`
    +`<tr class="t"><td>Total versé estimé</td><td colspan="2"></td><td class="n">${EUR(tot*S.net+panIR+panIRU)}</td></tr>`;
  const d25=Math.max(G.h25/60-B.p25,0),d50=Math.max(G.h50/60-B.p50,0);
  const acq=d25*1.25+d50*1.5,sol=B.rcOld+acq;
  const perdu=d25*S.taux*1.25+d50*S.taux*1.5;
  const ec=B.rcAcq?acq-B.rcAcq:null;
  $('pRcOut').innerHTML=`<table>
<tr><th>Type</th><th class="n">Dues calc</th><th class="n">Payées</th><th class="n">RC</th><th class="n">majo</th></tr>
<tr><td>HS 25 %</td><td class="n">${C2(G.h25)}</td><td class="n">${B.p25.toFixed(2)}</td><td class="n">${d25.toFixed(2)}</td><td class="n">${(d25*1.25).toFixed(2)}</td></tr>
<tr><td>HS 50 %</td><td class="n">${C2(G.h50)}</td><td class="n">${B.p50.toFixed(2)}</td><td class="n">${d50.toFixed(2)}</td><td class="n">${(d50*1.5).toFixed(2)}</td></tr>
<tr class="t"><td>RC acquis ce mois</td><td colspan="3"></td><td class="n">${acq.toFixed(2)} h</td></tr>
<tr class="t"><td>Solde RC cumulé</td><td colspan="3"></td><td class="n">${sol.toFixed(2)} h</td></tr>
</table>
${ec!==null?`<div class="al ${Math.abs(ec)<0.1?'k':'b'}" style="margin-top:9px">
${Math.abs(ec)<0.1?'✅ RC bulletin conforme au calcul':'🚩 Écart RC <b>'+ec.toFixed(2)+' h</b> '+EUR(Math.abs(ec)*S.taux)+'</div>'}
</div>`:''}
<div class="al ${sol*S.taux>1500?'w':'i'}" style="margin-top:9px">
💰 Valeur RC non payé <b>${EUR(perdu)}</b> brut Solde total <b>${EUR(sol*S.taux)}</b>
</div>
${sol>S.rcAlerte?`<div class="al b" style="margin-top:6px">🚨 Solde RC élevé risque de perte</div>`:''}`;
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
    $('aFer').innerHTML=$('aAl').innerHTML='<div class="al i">Aucune période enregistrée</div>';
    return;
  }
  const S=DB.s;
  let T={tte:0,h25:0,h50:0,acq:0,dec:0,ecart:0,fer:[],dim:[],trav:0,nor:0},AA=[];
  let h='<tr><th>Période</th><th class="n">TTE</th><th class="n">HS25</th><th class="n">HS50</th><th class="n">RC calc</th><th class="n">RC bull</th><th class="n">Écart</th></tr>';
  const byYear={};
  DB.periods.forEach(p=>{
    const{G,AL}=calcPer(p.start,p.nb),B=gb(p.start);
    const d25=Math.max(G.h25/60-B.p25,0),d50=Math.max(G.h50/60-B.p50,0),acq=d25*1.25+d50*1.5;
    const ec=B.rcAcq?acq-B.rcAcq:null;
    T.tte+=G.tte;T.h25+=G.h25;T.h50+=G.h50;T.acq+=acq;
    T.dec+=B.rcAcq||0;T.trav+=G.trav;T.nor+=G.nor;
    if(ec!==null)T.ecart+=ec;
    G.ferJ.forEach(k=>T.fer.push(k));
    G.dimJ?.forEach(k=>T.dim.push(k));
    AL.forEach(a=>AA.push(a));
    const y=p.start.slice(0,4);
    if(!byYear[y])byYear[y]={tte:0,h25:0,h50:0,trav:0,nor:0};
    byYear[y].tte+=G.tte;byYear[y].h25+=G.h25;byYear[y].h50+=G.h50;byYear[y].trav+=G.trav;byYear[y].nor+=G.nor;
    h+=`<tr><td><a href="#" onclick="DB.per={start:'${p.start}',nb:${p.nb}};save();tab('paie');return false" style="color:var(--blue)">${short(p.start)}${short(addD(p.start,p.nb*14-1))}</a></td>
<td class="n">${F(G.tte)}</td><td class="n">${C2(G.h25)}</td><td class="n">${C2(G.h50)}</td>
<td class="n">${acq.toFixed(2)}</td><td class="n">${B.rcAcq?B.rcAcq.toFixed(2):'—'}</td>
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
    return `<div class="al w">☀️ <b>${shortY(k)}</b> ${F(r.tte)} maj 100% <b>${EUR(r.tte/60*S.taux)}</b></div>`}).join('')
    +`<div class="al i">Total fériés <b>${EUR(T.fer.reduce((a,k)=>a+cd(k).tte/60*S.taux,0))}</b></div>`
    :'<div class="al k">✅ Aucun férié travaillé</div>')
    +(T.dim.length?T.dim.map(k=>`<div class="al w">🔵 <b>${shortY(k)}</b> dimanche travaillé</div>`).join(''):'');
  const rcSol=T.acq-T.dec;
  const barPct=Math.min(100,rcSol/S.rcAlerte*100);
  $('aRc').innerHTML=`<div class="kpis">
<div class="kpi"><b>${T.acq.toFixed(2)} h</b><span>RC généré total</span></div>
<div class="kpi"><b>${T.dec.toFixed(2)} h</b><span>RC pris payé</span></div>
<div class="kpi ${rcSol>S.rcAlerte?'bad':rcSol>S.rcAlerte*0.6?'warn':''}"><b>${rcSol.toFixed(2)} h</b><span>Solde RC</span></div>
<div class="kpi ${rcSol>S.rcAlerte?'bad':''}"><b>${EUR(rcSol*S.taux)}</b><span>Valeur RC</span></div>
</div>
<div class="${rcSol>S.rcAlerte?'bar bad':'bar warn'}" style="margin-top:9px"><i style="width:${barPct.toFixed(1)}%"></i></div>
${rcSol>S.rcAlerte?`<div class="al b" style="margin-top:6px">🚨 Solde RC élevé risque de perdre des heures</div>`:''}`;
  const crit=AA.filter(a=>a.lvl==='b');
  $('aAl').innerHTML=AA.length
    ?(crit.length?crit:AA).slice(0,50).map(a=>`<div class="al ${a.lvl}"><b>${shortY(a.k)}</b> ${esc(a.m)}</div>`).join('')
    +(AA.length>50?`<div class="mut">et autres anomalies</div>`:'')
    :'<div class="al k">✅ Aucune anomalie sur les périodes enregistrées</div>';
}

const RG={
  rg1:[['taux','Taux horaire (€)'],['net','Coef brut net'],['dimPrime','Prime dimanche (€)']],
  rg2:[['base','Base hebdo (h)'],['pl','Plafond HS 25%'],['anchor','Ancrage quatorzaine'],['rc','Durée RC (min)'],['cp','Durée CP (min)'],['maxAmp','Alerte amplitude (h)'],['rcAlerte','Seuil alerte RC (h)']],
  rg3:[['hab','Habillage (min jour)'],['habT','Taux habillage (€ h)'],['idaj','Seuil IDAJ (h)'],['ir','IR pause ext (€)'],['iru','IRU taux réduit (€)'],['irT','IRU taux plein (€)'],['panDeb','Plage repas début'],['panFin','Plage repas fin'],['nuitDeb','Nuit début'],['nuitFin','Nuit fin'],['nuitMaj','Majoration nuit (%)']]
};
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
  $('rAncCalc').textContent=`${anc.y} ans ${anc.m} mois taux CCN ${anc.pct}% (auto)`;
  $('rBk').innerHTML=DB.exp?'Dernier export <b>'+DB.exp+'</b>':'<span style="color:var(--warn)">⚠️ Aucune sauvegarde</span>';
}
function renderAll(){
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

const PDF_WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js';
let _wset=false;

function parseBulFile(file){
  const out=$('bulOut');
  if(!file)return;
  const lib=window.pdfjsLib||window['pdfjs-dist/build/pdf'];
  if(!lib){out.innerHTML='<div class="al b">❌ PDF.js non chargé Recharge la page en ligne ou colle le texte</div>';return}
  if(!_wset){lib.GlobalWorkerOptions.workerSrc=PDF_WORKER;_wset=true;}
  out.innerHTML='<div class="al i">⏳ Lecture du bulletin en cours</div>';
  const reader=new FileReader();
  reader.onload=async e=>{
    try{
      const pdf=await lib.getDocument({data:new Uint8Array(e.target.result)}).promise;
      let text='';
      for(let p=1;p<=pdf.numPages;p++){
        const pg=await pdf.getPage(p),ct=await pg.getTextContent();
        let line='',py=null,px=null;
        ct.items.forEach(it=>{
          const x=it.transform[4],y=it.transform[5];
          if(py!=null&&Math.abs(y-py)>2){text+=line+'\n';line=''}
          else if(px!=null&&x-px>(it.height||10)*0.22)line+=' ';
          line+=it.str;py=y;px=x+(it.width||0);
        });
        text+=line+'\n';
      }
      $('bulTxt').value=text;
      parseBulletin();
    }catch(err){out.innerHTML='<div class="al b">❌ Erreur lecture PDF '+esc(err.message)+'</div>';}
  };
  reader.onerror=()=>{out.innerHTML='<div class="al b">❌ Fichier illisible</div>'};
  reader.readAsArrayBuffer(file);
  $('fbul').value='';
}

function parseBulletin(){
  const raw=$('bulTxt').value;
  if(!raw.trim()){$('bulOut').innerHTML='<div class="al w">Colle abord le texte du bulletin</div>';return}
  const t=raw.replace(/\u00a0/g,' ').replace(/\r/g,'\n');
  const lines=t.split('\n').map(l=>l.trim()).filter(l=>l);
  const S=DB.s;
  const bul={};

  const moisNoms={janvier:'01',février:'02',mars:'03',avril:'04',mai:'05',juin:'06',
    juillet:'07',août:'08',aout:'08',septembre:'09',octobre:'10',novembre:'11',décembre:'12',decembre:'12'};
  for(const l of lines){
    const m=l.match(/[Pp][ée]riode\s*:?\s*([A-Za-zÀ-ÿ]+)\s+(\d{4})/i);
    if(m){
      const mn=moisNoms[m[1].toLowerCase()];
      if(mn)bul.mois=m[2]+'-'+mn;
      break;
    }
    const m2=l.match(/(\d{2})-(\d{4})/);
    if(m2&&!bul.mois)bul.mois=m2[2]+'-'+m2[1];
  }

  for(const l of lines){
    if(/Monsieur|Madame/i.test(l)){bul.nom=l.replace(/Monsieur|Madame/gi,'').trim();break}
  }

  for(const l of lines){
    const m=l.match(/(\d+)\s+ans?\s+et\s+(\d+)\s+mois?/i);
    if(m){bul.ancienneteTxt=m[0];break}
  }

  for(const l of lines){
    const ns=numsOfLine(l);
    if(/salaire de base/i.test(l)&&ns.length>=3){
      bul.hNorm=ns[0];
      bul.taux=ns[1];
      bul.montNorm=ns[ns.length-1];
    }
    else if(/suppl[ée]?mentaires?\s*25/i.test(l)){
      const ns2=numsOfLine(l.replace(/25\s*%/ig,''));
      if(ns2.length>=3){bul.hs25H=ns2[0];bul.hs25T=ns2[1];bul.hs25M=ns2[ns2.length-1];}
    }
    else if(/suppl[ée]?mentaires?\s*50/i.test(l)){
      const ns2=numsOfLine(l.replace(/50\s*%/ig,''));
      if(ns2.length>=3){bul.hs50H=ns2[0];bul.hs50T=ns2[1];bul.hs50M=ns2[ns2.length-1];}
    }
    else if(/habillage/i.test(l)&&!/prime/i.test(l)&&ns.length>=2){
      bul.habH=ns[0];
      bul.habT=ns.length>=3?ns[1]:S.habT;
      bul.habM=ns[ns.length-1];
    }
    else if(/d[eé]passement.*amplitude|IDAJ/i.test(l)){
      const clean=l.replace(/100\s*%/g,'').trim();
      const ns2=numsOfLine(clean);
      if(ns2.length>=2){
        bul.idajH=ns2[0];
        bul.idajM=ns2[ns2.length-1];
      }
    }
    else if(/^salaire brut/i.test(l)&&ns.length>=1){
      bul.brut=ns[ns.length-1];
    }
    else if(/repas\s+unique/i.test(l)&&ns.length>=2){
      bul.iruN=ns[0];
      bul.iruT=ns.length>=3?ns[1]:S.iru;
      bul.iruM=ns[ns.length-1];
    }
    else if(/indemnit[eé]\s+de\s+repas(?!\s+unique)/i.test(l)&&!/unique/i.test(l)){
      if(ns.length>=2&&!bul.irN){
        bul.irN=ns[0];
        bul.irT=ns[1];
        bul.irM=ns[ns.length-1];
      } else if(ns.length>=2&&bul.irN&&!bul.irTPlein){
        bul.irTPlein=ns[1];
        bul.irMPlein=ns[ns.length-1];
      }
    }
    else if(/net\s+(?:à\s+payer|pay[eé])\s+avant/i.test(l)&&ns.length>=1){
      bul.netAvant=ns[ns.length-1];
    }
    else if(/^net\s+pay[eé]/i.test(l)&&ns.length>=1){
      bul.net=ns[ns.length-1];
    }
    else if(/RC\s+cumul[eé]/i.test(l)&&ns.length>=2){
      bul.rcAvant=ns[0];
      bul.rcApres=ns[ns.length-1];
    }
    else if(/cong[eé]s?\s+pay[eé]s?\s+ann[eé]e\s+N[^-]/i.test(l)&&ns.length>=1){
      bul.cpN={acquis:ns[0],pris:ns.length>1?ns[1]:0,solde:ns.length>2?ns[2]:0};
    }
  }

  for(const l of lines){
    const m=l.match(/net\s+pay[eé]\s*:\s*([\d\s,.]+)\s*euros?/i);
    if(m){bul.net=parseNum(m[1]);break}
  }

  bul.importedAt=new Date().toLocaleDateString('fr-FR');
  const moisKey=bul.mois||('inconnu-'+Date.now());
  const existing=DB.bulletins.findIndex(b=>b.mois===moisKey);
  if(existing>=0)DB.bulletins[existing]=bul;else DB.bulletins.push(bul);
  DB.bulletins.sort((a,b)=>(a.mois||'')>(b.mois||'')?1:-1);
  save();
  afficherBulletin(bul);
  renderBulHist();
}

function afficherBulletin(bul){
  const S=DB.s;
  $('bulResultCard').style.display='';
  $('bulMois').textContent=bul.mois||'';

  let calcTTE=0,calcH25=0,calcH50=0,calcIR=0,calcIRU=0,calcIDAJ=0,calcHab=0,calcFer=0,calcTrav=0,calcDim=0;
  const mKey=bul.mois;

  if(mKey&&/^\d{4}-\d{2}$/.test(mKey)){
    const yr=+mKey.slice(0,4),mo=+mKey.slice(5,7);
    const first=mKey+'-01';
    const lastDate=new Date(yr,mo,0);
    const last=isoOf(lastDate);

    let cur=first;
    while(cur<=last){
      const r=cd(cur);
      calcTTE   +=r.tte;
      calcIR    +=r.ir;
      calcIRU   +=r.iru;
      calcIDAJ  +=r.idaj;
      calcTrav  +=r.trav;
      if(r.fer)  calcFer+=r.tte;
      if(r.dim&&r.trav) calcDim++;
      cur=addD(cur,1);
    }
    calcHab=calcTrav*S.hab;

    const anchor=S.anchor;
    const diffFirst=nDays(anchor,first);
    let qStart=addD(anchor,Math.floor(diffFirst/14)*14);
    if(qStart>first)qStart=addD(qStart,-14);

    let qc=qStart;
    while(qc<=last){
      const qEnd=addD(qc,13);
      if(qc<=last&&qEnd>=first){
        const{Q}=calcPer(qc,1);
        const o=Q[0];
        const overlapStart=qc<first?first:qc;
        const overlapEnd=qEnd>last?last:qEnd;
        const jQuat=nDays(qc,qEnd)+1;
        const jOverlap=nDays(overlapStart,overlapEnd)+1;
        const ratio=jOverlap/jQuat;
        calcH25+=o.h25*ratio;
        calcH50+=o.h50*ratio;
      }
      qc=addD(qc,14);
      if(nDays(qStart,qc)>90)break;
    }
  }

  const rows=[];

  function addRow(label,bv,cv,unit,info){
    if(bv==null||isNaN(bv))return;
    const tol=unit==='€'?0.50:unit==='€/h'?0.01:0.20;
    const d=bv-cv;
    const ok=Math.abs(d)<=tol;
    rows.push({label,bul:bv,calc:cv,diff:d,ok,unit,info:info||''});
  }

  const calcNorm=Math.max(calcTTE-calcH25-calcH50,0)/60;
  addRow('Heures normales',bul.hNorm,calcNorm,'h','Base 35h CP RC');
  if(bul.hs25H!=null)addRow('HS 25%',bul.hs25H,calcH25/60,'h','Heures au dela des 70h');
  if(bul.hs50H!=null)addRow('HS 50%',bul.hs50H,calcH50/60,'h','Heures au dela du plafond HS 25%');
  if(bul.habH!=null)addRow('Habillage',bul.habH,calcHab/60,'h','Jours multipliés par temps habillage');
  if(bul.idajH!=null)addRow('IDAJ',bul.idajH,calcIDAJ/60,'h','Dépassement amplitude');
  if(bul.irN!=null)addRow('Paniers IR',bul.irN,calcIR,'repas','Pause extérieure');
  if(bul.iruN!=null)addRow('Paniers IRU',bul.iruN,calcIRU,'repas','Pause intérieure');
  if(bul.taux!=null)addRow('Taux horaire',bul.taux,S.taux,'€/h','');
  if(bul.brut!=null){
    const calcBrut=
      calcNorm*S.taux
      +(calcH25/60)*S.taux*1.25
      +(calcH50/60)*S.taux*1.5
      +(calcHab/60)*S.habT
      +(calcIDAJ/60)*S.taux
      +calcFer/60*S.taux
      +(calcDim*S.dimPrime||0);
    addRow('Salaire brut',bul.brut,calcBrut,'€','');
  }
  if(bul.net!=null){
    const calcNet=(bul.brut||0)*S.net+(calcIR*S.ir)+(calcIRU*S.irT);
    addRow('Net estimé',bul.net,calcNet,'€','Brut mutiplié par net plus paniers');
  }

  const anomalies=rows.filter(r=>!r.ok);
  $('bulKpi').innerHTML=[
    ['Mois',bul.mois||'?'],
    ['Net payé',bul.net!=null?EUR(bul.net):'?',bul.net?'':'warn'],
    ['Brut',bul.brut!=null?EUR(bul.brut):'?',bul.brut?'':'warn'],
    ['HS 25%',bul.hs25H!=null?bul.hs25H.toFixed(2)+' h':'?',bul.hs25H?'warn':''],
    ['Écarts',anomalies.length,anomalies.length>0?'bad':''],
    ['Ancienneté',bul.ancienneteTxt||'?']
  ].map(x=>`<div class="kpi ${x[2]||''}"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');

  let tab='<tr><th>Élément</th><th class="n">Bulletin</th><th class="n">Calculé</th><th class="n">Écart</th><th></th></tr>';
  rows.forEach(r=>{
    const fmt=(v,u)=>{
      if(u==='€')return EUR(v);
      if(u==='€/h')return v.toFixed(4)+' €/h';
      if(u==='repas')return v.toFixed(0)+' repas';
      return v.toFixed(2)+' h';
    };
    const dAbs=Math.abs(r.diff);
    const dFmt=(r.diff>0?'+':'-')+fmt(dAbs,r.unit);
    tab+=`<tr title="${esc(r.info)}">
<td>${esc(r.label)}</td>
<td class="n">${fmt(r.bul,r.unit)}</td>
<td class="n">${fmt(r.calc,r.unit)}</td>
<td class="n ${r.ok?'ok':'bad'}">${r.ok?'✓':dFmt}</td>
<td>${r.ok?'✅':'🚩'}</td>
</tr>`;
  });
  $('bulTab').innerHTML=tab;

  let al='';
  if(anomalies.length===0){
    al='<div class="al k">✅ Aucun écart significatif le bulletin semble conforme à nos calculs</div>';
  } else {
    al=`<div class="al b">🚩 <b>${anomalies.length} écarts détectés</b></div>`;
    anomalies.forEach(r=>{
      const fmt=(v,u)=>u==='€'?EUR(v):(v.toFixed(u==='repas'?0:2)+' '+(u==='repas'?'repas':u));
      const sens=r.diff>0?'bulletin SUPÉRIEUR':'bulletin INFÉRIEUR';
      const ecart=fmt(Math.abs(r.diff),r.unit);
      al+=`<div class="al b">🚩 <b>${esc(r.label)}</b> ${sens} de <b>${ecart}</b>
<br><span class="mut">Bulletin ${fmt(r.bul,r.unit)} Calculé ${fmt(r.calc,r.unit)}${r.info?' info '+esc(r.info):''}</span></div>`;
    });
    al+=`<div class="al w" style="margin-top:6px">
⚠️ Un écart peut venir un arrondi un jour non saisi ou une vraie erreur employeur<br>
Tolérance appliquée 0,20h pour les durées 0,50€ pour les montants 0,01€ pour les taux
</div>`;
  }

  if(bul.ancienneteTxt){
    const ancCalc=calcAnc(S.emb||DEF.emb);
    const ok2=ancCalc.y===parseInt(bul.ancienneteTxt)||bul.ancienneteTxt.includes(ancCalc.y+' an');
    al+=`<div class="al ${ok2?'i':'w'}">
👤 Ancienneté bulletin <b>${bul.ancienneteTxt}</b>
Calculée depuis le ${S.emb} <b>${ancCalc.y} ans ${ancCalc.m} mois</b>
taux CCN auto <b>${ancCalc.pct}%</b>
</div>`;
  }

  if(bul.rcAvant!=null&&bul.rcApres!=null){
    al+=`<div class="al i">⏱️ RC bulletin avant <b>${bul.rcAvant.toFixed(2)}h</b> après <b>${bul.rcApres.toFixed(2)}h</b> acquis ce mois <b>${(bul.rcApres-bul.rcAvant).toFixed(2)}h</b></div>`;
  }

  if(bul.cpN){
    al+=`<div class="al i">🏖️ CP année N Acquis <b>${bul.cpN.acquis}</b> Pris <b>${bul.cpN.pris}</b> Solde <b>${bul.cpN.solde}</b></div>`;
  }

  $('bulAl').innerHTML=al;
  $('bulOut').innerHTML='<div class="al k">✅ Bulletin analysé avec succès</div>';
}

function renderBulHist(){
  if(!DB.bulletins||!DB.bulletins.length){
    $('bulHist').innerHTML='<div class="al i">Aucun bulletin importé pour instant</div>';
    return;
  }
  let h='<table><tr><th>Mois</th><th class="n">Brut</th><th class="n">Net</th><th class="n">HS 25%</th><th class="n">HS 50%</th><th></th></tr>';
  DB.bulletins.forEach((b,i)=>{
    h+=`<tr>
<td><a href="#" onclick="afficherBulletin(DB.bulletins[${i}]);$('bulResultCard').style.display='';return false" style="color:var(--blue)">${b.mois||'?'}</a></td>
<td class="n">${b.brut?EUR(b.brut):'?'}</td>
<td class="n">${b.net?EUR(b.net):'?'}</td>
<td class="n">${b.hs25H!=null?b.hs25H.toFixed(2)+' h':'—'}</td>
<td class="n">${b.hs50H!=null?b.hs50H.toFixed(2)+' h':'—'}</td>
<td><button class="r" style="padding:4px 8px;font-size:11px" onclick="DB.bulletins.splice(${i},1);save();renderBulHist()">✕</button></td>
</tr>`;
  });
  h+='</table>';
  $('bulHist').innerHTML=h;
}

const RM_FIELDS=[
  ['tteH','TTE période (h)'],['joursPresence','Jours de présence'],['hsPeriodeH','H supp période (h)'],
  ['tteAnneeH','TTE cumul année (h)'],['hsAnneeH','H supp cumul année (h)'],['joursAnnee','Jours présence année'],
  ['cpN1Solde','CP N1 solde (j)'],['cpNAcquis','CP N acquis (j)'],['cpNPris','CP N pris (j)'],['cpNSolde','CP N solde (j)'],
  ['rcAvant','RC solde antérieur (h)'],['rcAcquis','RC acquis ce mois (h)'],['rcSolde','RC solde cumulé (h)'],
  ['salaireBaseH','Salaire de base (h)'],['depAmplH','Dépassement amplitude (h)'],
  ['hs125EligH','HS 125% éligibles (h)'],['hs125PayeesH','HS 125% payées (h)'],
  ['hs150EligH','HS 150% éligibles (h)'],['hs150PayeesH','HS 150% payées (h)'],
  ['primeAncPct','Prime ancienneté (%)'],['habillageMontant','Habillage déshabillage (€)'],
  ['indemniteRepasN','Indemnité de repas (nb)'],['indemniteRepasUniqueN','Indemnité repas unique (nb)']
];
let romiTmp={};
let _tessWorker=null;

async function getTessWorker(){
  if(_tessWorker)return _tessWorker;
  _tessWorker=await Tesseract.createWorker('fra');
  return _tessWorker;
}

async function pdfPageImages(file){
  const lib=window.pdfjsLib||window['pdfjs-dist/build/pdf'];
  if(!lib)throw new Error('PDF.js non chargé vérifie ta connexion et réessaie');
  if(!_wset){lib.GlobalWorkerOptions.workerSrc=PDF_WORKER;_wset=true;}
  const buf=await file.arrayBuffer();
  const pdf=await lib.getDocument({data:new Uint8Array(buf)}).promise;
  const canvases=[];
  for(let p=1;p<=pdf.numPages;p++){
    const pg=await pdf.getPage(p);
    const vp=pg.getViewport({scale:2.2});
    const canvas=document.createElement('canvas');
    canvas.width=vp.width;canvas.height=vp.height;
    await pg.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
    canvases.push(canvas);
  }
  return canvases;
}

async function parseRomiFile(file){
  const out=$('romiOcrOut');
  if(!file)return;
  out.innerHTML='<div class="al i">⏳ Lecture OCR en cours temps de télécharger le moteur de langue française</div>';
  try{
    const worker=await getTessWorker();
    let fullText='';
    const isPdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name);
    const sources=isPdf?await pdfPageImages(file):[file];
    for(const src of sources){
      const{data}=await worker.recognize(src);
      fullText+=data.text+'\n';
    }
    $('romiRawTxt').value=fullText;
    const found=extractRomiFields(fullText);
    const rejected=found._rejected||0;
    delete found._rejected;
    romiTmp={...romiTmp,...found,_loaded:true};
    renderRomiTab();
    const n=Object.keys(found).filter(k=>k!=='start'&&k!=='end').length;
    out.innerHTML=`<div class="al k">✅ OCR terminé ${n} champs pré-remplis automatiquement${rejected?' <span style="color:var(--warn)">'+rejected+' valeurs jugées aberrantes ont été ignorées OCR probablement mal lu à compléter à la main</span>':''} Vérifie chaque valeur ci-dessous avant enregistrer</div>`;
  }catch(err){
    out.innerHTML='<div class="al b">❌ OCR impossible '+esc(err.message)+' Renseigne les champs manuellement ci-dessous ou recopie le texte du document dans la zone de vérification puis relance analyse</div>';
  }
  $('fromi').value='';
}

function numsOfLineStrict(l){
  return [...l.matchAll(/\d+(?:[.,]\d+)?/g)].map(m=>parseNum(m[0])).filter(n=>!isNaN(n)&&n>0);
}
function cap(v,max){return(v!=null&&v<=max)?v:undefined}

function extractRomiFields(raw){
  const t=raw.replace(/\u00a0/g,' ');
  const lines=t.split('\n').map(l=>l.trim()).filter(l=>l);
  const f={};let rejected=0;
  const setCapped=(obj,key,val,max)=>{const c=cap(val,max);if(c!=null)obj[key]=c;else rejected++;};
  const per=t.match(/du\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\s+au\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  if(per){
    f.start=per[3]+'-'+pad(+per[2])+'-'+pad(+per[1]);
    f.end=per[6]+'-'+pad(+per[5])+'-'+pad(+per[4]);
  }
  for(const l of lines){
    const noSlash=!/\//.test(l);
    const ns=numsOfLineStrict(l);
    if(/T\.?\s*T\.?\s*E\.?/i.test(l)&&noSlash&&ns.length>=2){setCapped(f,'tteH',ns[0],400);setCapped(f,'tteAnneeH',ns[1],3000);}
    else if(/jours?\s+de\s+pr[eé]sence/i.test(l)&&ns.length>=2){setCapped(f,'joursPresence',ns[0],31);setCapped(f,'joursAnnee',ns[1],366);}
    else if(/heures?\s+suppl[eé]mentaires?/i.test(l)&&noSlash&&!/125|150/.test(l)&&ns.length>=2){setCapped(f,'hsPeriodeH',ns[0],200);setCapped(f,'hsAnneeH',ns[1],1000);}
    else if(/ann[eé]e\s*N-1/i.test(l)&&ns.length>=1){setCapped(f,'cpN1Solde',ns[0],60);}
    else if(/ann[eé]e\s*N\b/i.test(l)&&!/N-1/i.test(l)&&ns.length>=1){
      setCapped(f,'cpNSolde',ns[ns.length-1],60);
      if(ns.length>=2)setCapped(f,'cpNAcquis',ns[1],31);
      if(ns.length>=3)setCapped(f,'cpNPris',ns[2],31);
    }
    else if(/RC\s+cumul[eé]/i.test(l)&&ns.length>=2){
      setCapped(f,'rcAvant',ns[0],1000);setCapped(f,'rcAcquis',ns[1],200);setCapped(f,'rcSolde',ns[ns.length-1],1000);
    }
    else if(/salaire\s+de\s+base/i.test(l)&&ns.length>=1){setCapped(f,'salaireBaseH',ns[0],400);}
    else if(/amplitude/i.test(l)&&ns.length>=1){setCapped(f,'depAmplH',ns[0],100);}
    else if(/125\s*%/.test(l)&&ns.length>=1){setCapped(f,'hs125EligH',ns[0],200);if(ns.length>=2)setCapped(f,'hs125PayeesH',ns[1],200);}
    else if(/150\s*%/.test(l)&&ns.length>=1){setCapped(f,'hs150EligH',ns[0],200);if(ns.length>=2)setCapped(f,'hs150PayeesH',ns[1],200);}
    else if(/anciennet[eé]/i.test(l)&&ns.length>=1){setCapped(f,'primeAncPct',ns[0],20);}
    else if(/habillage/i.test(l)&&ns.length>=1){setCapped(f,'habillageMontant',ns[ns.length-1],500);}
    else if(/repas\s+unique/i.test(l)&&ns.length>=1){setCapped(f,'indemniteRepasUniqueN',ns[0],31);}
    else if(/indemnit[eé]\s+de\s+repas/i.test(l)&&!/unique/i.test(l)&&ns.length>=1){setCapped(f,'indemniteRepasN',ns[0],31);}
  }
  f._rejected=rejected;
  return f;
}


function renderRomiTab(){
  const keys=Object.keys(DB.romi).sort();
  const last=keys.length?DB.romi[keys[keys.length-1]]:null;
  if(!romiTmp._loaded&&last){romiTmp={...last};romiTmp._loaded=true}
  $('rmStart').value=romiTmp.start||'';
  $('rmStart').onchange=e=>{romiTmp.start=e.target.value};
  $('rmEnd').value=romiTmp.end||'';
  $('rmEnd').onchange=e=>{romiTmp.end=e.target.value};
  $('rmFields').innerHTML=RM_FIELDS.map(([k,l])=>
    `<div><label>${l}</label><input type="number" step="0.01" value="${romiTmp[k]??0}" oninput="romiTmp['${k}']=parseFloat(this.value)||0"></div>`
  ).join('');
  renderRomiHist();
  if(last)afficherRomi(last);
}

function saveRomi(){
  const start=$('rmStart').value,end=$('rmEnd').value;
  if(!start||end===''){$('romiOut').innerHTML='<div class="al w">Renseigne au moins le début et la fin de période</div>';return}
  const entry={...romiTmp,start,end,importedAt:new Date().toLocaleDateString('fr-FR')};
  delete entry._loaded;delete entry._rejected;
  DB.romi[start]=entry;
  save();
  $('romiOut').innerHTML='<div class="al k">✅ Relevé ROMI1 enregistré</div>';
  afficherRomi(entry);
  renderRomiHist();
  romiTmp={_loaded:true};
  $('romiRawTxt').value='';
  $('romiOcrOut').innerHTML='';
  renderRomiTab();
}

function loadRomi(start){
  const e=DB.romi[start];if(!e)return;
  romiTmp={...e,_loaded:true};
  renderRomiTab();
  window.scrollTo(0,0);
}
function deleteRomi(start){
  delete DB.romi[start];save();renderRomiTab();
}

function afficherRomi(e){
  $('romiResultCard').style.display='';
  $('romiPerLbl').textContent=short(e.start)+' '+short(e.end);
  const rcNonPaye=Math.max((e.hs125EligH||0)-(e.hs125PayeesH||0),0)+Math.max((e.hs150EligH||0)-(e.hs150PayeesH||0),0);
  $('romiKpi').innerHTML=[
    ['TTE période',e.tteH?F(e.tteH*60):'—'],
    ['Jours présence',e.joursPresence||'—'],
    ['RC solde cumulé',e.rcSolde?e.rcSolde.toFixed(2)+' h':'—',e.rcSolde>DB.s.rcAlerte?'bad':''],
    ['HS converties en RC',rcNonPaye?rcNonPaye.toFixed(2)+' h':'0 h',rcNonPaye>0?'warn':''],
    ['Prime ancienneté',e.primeAncPct?e.primeAncPct+' %':'—'],
    ['Valeur RC',EUR(rcNonPaye*DB.s.taux)]
  ].map(x=>`<div class="kpi ${x[2]||''}"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');

  let al='';
  if(rcNonPaye>0.05){
    al+=`<div class="al b">🚩 <b>${rcNonPaye.toFixed(2)} h</b> heures supplémentaires converties en repos compensateur au lieu être payées
<br><span class="mut">Article CCN cette conversion nécessite une demande écrite du salarié Sans cette demande tu peux exiger le paiement en espèces du stock de RC correspondant</span></div>`;
  } else {
    al+='<div class="al k">✅ Aucune conversion HS RC détectée sur ce relevé</div>';
  }
  const keys=Object.keys(DB.romi).sort();
  const idx=keys.indexOf(e.start);
  if(idx>0){
    const prev=DB.romi[keys[idx-1]];
    if(prev.rcSolde!=null&&e.rcAvant!=null){
      const ec=e.rcAvant-prev.rcSolde;
      if(Math.abs(ec)>0.1)al+=`<div class="al w">⚠️ Le solde RC antérieur de ce relevé ${e.rcAvant.toFixed(2)} h ne correspond pas au solde cumulé du relevé précédent ${prev.rcSolde.toFixed(2)} h écart de ${ec.toFixed(2)} h</div>`;
    }
  }
  if(e.primeAncPct!=null){
    const anc=calcAnc(DB.s.emb||DEF.emb);
    if(e.primeAncPct!==anc.pct)al+=`<div class="al w">⚠️ Prime ancienneté du relevé ${e.primeAncPct} % calculée depuis le ${DB.s.emb} ${anc.y} ans ${anc.m} mois ${anc.pct} % attendu</div>`;
  }
  if(e.start&&e.end){
    let calcTte=0,cur=e.start;
    while(cur<=e.end){calcTte+=cd(cur).tte;cur=addD(cur,1)}
    if(calcTte>0&&e.tteH){
      const ec=e.tteH-calcTte/60;
      al+=`<div class="al ${Math.abs(ec)<0.3?'k':'i'}">${Math.abs(ec)<0.3?'✅':'ℹ️'} TTE app sur la même période <b>${F(calcTte)}</b> vs ROMI1 <b>${e.tteH.toFixed(2)} h</b>${Math.abs(ec)>=0.3?' écart '+ec.toFixed(2)+' h':''}</div>`;
    }
  }
  $('romiAl').innerHTML=al;
}

function renderRomiHist(){
  const keys=Object.keys(DB.romi).sort();
  if(!keys.length){$('romiHist').innerHTML='<div class="al i">Aucun relevé ROMI1 enregistré pour instant</div>';return}
  let h='<table><tr><th>Période</th><th class="n">TTE</th><th class="n">RC solde</th><th></th></tr>';
  keys.forEach(k=>{
    const e=DB.romi[k];
    h+=`<tr><td><a href="#" onclick="loadRomi('${k}');return false" style="color:var(--blue)">${short(e.start)}${short(e.end)}</a></td>
<td class="n">${e.tteH?e.tteH.toFixed(2)+' h':'—'}</td>
<td class="n">${e.rcSolde?e.rcSolde.toFixed(2)+' h':'—'}</td>
<td><button class="r" style="padding:4px 8px;font-size:11px" onclick="deleteRomi('${k}')">✕</button></td></tr>`;
  });
  h+='</table>';
  $('romiHist').innerHTML=h;
}

const RX_PER=/P[ée]riode du (\d{1,2})\/(\d{1,2})\/(\d{4}) au (\d{1,2})\/(\d{1,2})\/(\d{4})/gi;
const RX_DAY=/(\d{1,2}) (Lun|Mar|Mer|Jeu|Ven|Sam|Dim) ((?:(?!\d{1,2} (?:Lun|Mar|Mer|Jeu|Ven|Sam|Dim) |Semaine \d|Total quatorzaine|DATE TYPE|Avertissement|P[ée]riode du).)*)/g;
const RX_HOR=/(\d{1,2}:\d{2}) ?- ?(\d{1,2}:\d{2})/;
const RX_PZ=/(\d{1,2}:\d{2})-(\d{1,2}:\d{2}) ?\([^)]*\b(ENT|EXT)\b[^)]*\)/g;

function parsePdfFile(file){
  const out=$('impOut');if(!file)return;
  const lib=window.pdfjsLib||window['pdfjs-dist/build/pdf'];
  if(!lib){out.innerHTML='<div class="al b">❌ PDF.js non chargé</div>';return}
  if(!_wset){lib.GlobalWorkerOptions.workerSrc=PDF_WORKER;_wset=true;}
  out.innerHTML='<div class="al i">⏳ Lecture du PDF AmbuTrack</div>';
  const reader=new FileReader();
  reader.onload=async e=>{
    try{
      const pdf=await lib.getDocument({data:new Uint8Array(e.target.result)}).promise;
      let text='';
      for(let p=1;p<=pdf.numPages;p++){
        const pg=await pdf.getPage(p),ct=await pg.getTextContent();
        let line='',py=null,px=null;
        ct.items.forEach(it=>{
          const x=it.transform[4],y=it.transform[5];
          if(py!=null&&Math.abs(y-py)>2){text+=line+'\n';line=''}
          else if(px!=null&&x-px>(it.height||10)*0.22)line+=' ';
          line+=it.str;py=y;px=x+(it.width||0);
        });
        text+=line+'\n';
      }
      if(!text.trim()){out.innerHTML='<div class="al b">❌ Aucun texte extrait</div>';return}
      $('impTxt').value=text;parsePDF();
    }catch(err){out.innerHTML='<div class="al b">❌ '+esc(err.message)+'</div>';}
  };
  reader.onerror=()=>{out.innerHTML='<div class="al b">❌ Fichier illisible</div>'};
  reader.readAsArrayBuffer(file);$('fpdf').value='';
}

function parsePDF(){
  const out=$('impOut'),raw=$('impTxt').value;
  if(!raw.trim()){out.innerHTML='<div class="al w">Colle abord le texte</div>';return}
  const t=raw.replace(/\u00a0/g,' ').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
  RX_PER.lastIndex=0;
  const marks=[...t.matchAll(RX_PER)];
  if(!marks.length){out.innerHTML='<div class="al b">❌ Ligne Période introuvable</div>';return}
  pushUndo('Import PDF AmbuTrack');
  let html='',tot=0,allFer=[];
  marks.forEach((m,i)=>{
    const blk=t.slice(m.index,i+1<marks.length?marks[i+1].index:t.length);
    const st=m[3]+'-'+pad(+m[2])+'-'+pad(+m[1]),en=m[6]+'-'+pad(+m[5])+'-'+pad(+m[4]);
    const R=parseBlock(blk,st,en);tot+=R.n;R.fer.forEach(k=>allFer.push(k));
    html+=`<div class="al ${R.n?'k':'b'}"><b>${shortY(st)} ${shortY(en)}</b> ${R.n} journées</div>`;
    if(R.warn.length)html+='<div class="al w">⚠️ '+R.warn.join(' ')+'</div>';
  });
  save();
  out.innerHTML=`<div class="al k"><b>✅ ${tot} journées importées</b></div>`+html
    +(allFer.length?'<div class="al w">☀️ Fériés '+allFer.map(shortY).join(' ')+'</div>':'');
  if(tot){curDate=marks[0][3]+'-'+pad(+marks[0][2])+'-'+pad(+marks[0][1]);curMonth=curDate.slice(0,7)}
  renderAll();
}
function parseBlock(b,st,en){
  const S=DB.s,pd=P(S.panDeb),pf=P(S.panFin);
  RX_DAY.lastIndex=0;const rows=[...b.matchAll(RX_DAY)];
  const rep={T:0,REPOS:0,RC:0,CP:0,MAL:0},fer=[],warn=[];
  let cur=st,n=0;
  rows.forEach(r=>{
    const dn=+r[1];let g=0;
    while(+cur.slice(8)!==dn&&g<45){cur=addD(cur,1);g++}
    if(g>=45){warn.push('jour '+dn+' non replacé');return}
    const k=cur,txt=r[3];cur=addD(cur,1);
    let ty='REPOS';
    if(/REPOS ?COMP/i.test(txt))ty='RC';
    else if(/TRAVAIL/i.test(txt))ty='T';
    else if(/CONG[EÉ]/i.test(txt))ty='CP';
    else if(/MALAD|ACCID|\bAT\b/i.test(txt))ty='MAL';
    const d={t:ty,p:[]};
    if(ty==='T'){
      RX_HOR.lastIndex=0;const hh=txt.match(RX_HOR);
      if(hh){d.deb=hh[1];d.fin=hh[2]}else warn.push(short(k)+' horaires illisibles');
      const a=P(d.deb),z=P(d.fin);RX_PZ.lastIndex=0;
      [...txt.matchAll(RX_PZ)].forEach(p=>d.p.push({d:p[1],f:p[2],ty:p[3]}));
      if(isFerie(k)){d.fer=true;fer.push(k)}
    }
    rep[ty]++;DB.days[k]=d;n++;
  });
  if(n){
    const days=nDays(st,en)+1,nb=Math.max(1,Math.round(days/14));
    const ex=DB.periods.find(p=>p.start===st);
    if(ex)ex.nb=nb;else DB.periods.push({start:st,nb});
    DB.periods.sort((a,b)=>a.start<b.start?-1:1);gb(st);DB.per={start:st,nb};
  }
  return{n,rep,fer,warn};
}

function excelDate(v){
  if(v==null||v==='')return null;
  if(v instanceof Date)return isoOf(v);
  if(typeof v==='number')return isoOf(new Date(Math.round((v-25569)*86400*1000)));
  const s=String(v).trim();
  let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return m[1]+'-'+pad(+m[2])+'-'+pad(+m[3]);
  m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(m)return m[3]+'-'+pad(+m[2])+'-'+pad(+m[1]);
  return null;
}
function parseExcel(file){
  const out=$('impOut');if(!file)return;
  if(typeof XLSX==='undefined'){out.innerHTML='<div class="al b">❌ XLSX non chargé</div>';return}
  const reader=new FileReader();
  reader.onload=function(e){
    let wb;
    try{wb=XLSX.read(e.target.result,{type:'array',cellDates:true})}
    catch(err){out.innerHTML='<div class="al b">❌ Fichier Excel invalide</div>';return}
    const wsName=wb.SheetNames.includes('Gardes')?'Gardes':wb.SheetNames[0];
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[wsName],{defval:''});
    if(!rows.length){out.innerHTML='<div class="al b">❌ Aucune ligne</div>';return}
    const S=DB.s,pdMin=P(S.panDeb),pfMin=P(S.panFin);
    const rep={T:0,REPOS:0,RC:0,CP:0,MAL:0},fer=[],warnNuit=[],warnH=[],dates=[];
    let iru=0,n=0;
    pushUndo('Import Excel');
    rows.forEach(row=>{
      const k=excelDate(row['Date']);if(!k)return;
      const type=String(row['Type']||'').trim();if(!type)return;
      let ty='REPOS';
      if(/travail/i.test(type))ty='T';
      else if(/repos ?comp/i.test(type))ty='RC';
      else if(/repos/i.test(type))ty='REPOS';
      else if(/cong[eé]/i.test(type))ty='CP';
      else if(/malad|accid|\bAT\b/i.test(type))ty='MAL';
      else return;
      const d={t:ty,p:[]};
      if(ty==='T'){
        const nuit=String(row['Nuit']||'').trim();
        const deb=String(row['Début']||'').trim(),fin=String(row['Fin']||'').trim();
        if(nuit&&deb==='00:00'&&fin==='00:00'){warnNuit.push(k);return}
        if(!/^\d{1,2}:\d{2}$/.test(deb)||!/^\d{1,2}:\d{2}$/.test(fin)){warnH.push(k);return}
        d.deb=deb;d.fin=fin;
        const sa=P(deb);let sb=P(fin);if(sb<=sa)sb+=1440;
        const panOK=sa<=pdMin&&sb>=pfMin;
        const pz=String(row['Pauses']||'').trim();
        if(pz&&pz!=='-'){
          const pm=pz.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):?(\d{2})$/);
          if(pm){const pS=pad(+pm[1])+':'+pm[2],pE=pad(+pm[3])+':'+pm[4];
            d.p.push({d:pS,f:pE,ty:'ENT'});if(panOK)iru++;}
        }
        if(isFerie(k)){d.fer=true;fer.push(k)}
      }
      const note=String(row['Note']||'').trim();if(note)d.note=note;
      DB.days[k]=d;rep[ty]++;n++;dates.push(k);
    });
    if(!n){out.innerHTML='<div class="al b">❌ Aucune journée exploitable</div>';return}
    dates.sort();const first=dates[0],last=dates[dates.length-1];
    let qs=addD(S.anchor,Math.floor(nDays(S.anchor,first)/14)*14),nbPer=0;
    while(qs<=last){if(!DB.periods.some(p=>p.start===qs)){DB.periods.push({start:qs,nb:1});nbPer++}gb(qs);qs=addD(qs,14);}
    DB.periods.sort((a,b)=>a.start<b.start?-1:1);
    DB.per={start:DB.periods[DB.periods.length-1].start,nb:1};save();
    out.innerHTML=`<div class="al k"><b>✅ ${n} journées importées</b> du ${shortY(first)} au ${shortY(last)}</div>`
      +(iru?`<div class="al w">🍽️ ${iru} pauses IRU par défaut Corrige si repas dehors</div>`:'')
      +(fer.length?'<div class="al w">☀️ Fériés '+fer.map(shortY).join(' ')+'</div>':'')
      +(warnNuit.length?'<div class="al b">🌙 '+warnNuit.length+' nuits à corriger manuellement</div>':'')
      +(warnH.length?'<div class="al w">⚠️ Horaires illisibles '+warnH.map(shortY).join(' ')+'</div>':'');
    curDate=last;curMonth=last.slice(0,7);renderAll();
  };
  reader.readAsArrayBuffer(file);$('fx').value='';
}

function expo(){
  DB.exp=new Date().toLocaleDateString('fr-FR');save();
  const b=new Blob([JSON.stringify(DB,null,1)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);
  a.download='mesheures-'+today()+'.json';a.click();renderReg();
}
function impo(i){
  const f=i.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=e=>{
    try{
      const j=JSON.parse(e.target.result);
      if(!j.days)throw new Error('Pas de données journalières');
      pushUndo('Import JSON');
      DB={...DB,...j};DB.s={...DEF,...(j.s||{})};
      DB.periods=j.periods||[];DB.bul=j.bul||{};DB.bulletins=j.bulletins||[];DB.romi=j.romi||{};
      save();renderAll();alert('✅ Import réussi');
    }catch(x){alert('Fichier illisible '+x.message)}
  };
  r.readAsText(f);i.value='';
}
function wipe(){
  if(confirm('⚠️ Effacer TOUTES les données Exportez abord vos données ')){
    localStorage.removeItem(LS);location.reload();
  }
}
function copySum(){
  const{Q,G}=calcPer(DB.per.start,DB.per.nb);
  let t='MesHeures Résumé\n';
  t+='Période '+short(DB.per.start)+' '+short(addD(DB.per.start,DB.per.nb*14-1))+'\n\n';
  Q.forEach((o,i)=>{
    o.w.forEach((s,j)=>t+='Sem '+(j+1)+' '+short(s.start)+' Amp '+F(s.amp)+' TTE '+F(s.tte)+'\n');
    t+='Q'+(i+1)+' TTE '+F(o.seuil)+' HS 25% '+F(o.h25)+' HS 50% '+F(o.h50)+'\n\n';
  });
  t+='TOTAL TTE '+F(G.tte)+' Amp '+F(G.amp)+' '+G.trav+' j '+(G.ir+G.iru)+' paniers IDAJ '+C2(G.idaj)+'h';
  navigator.clipboard.writeText(t).then(()=>alert('✅ Résumé copié '),()=>prompt('Copie ',t));
}

load();
curDate=today();curMonth=curDate.slice(0,7);
if(!Object.keys(DB.days).length){
  loadArchive();
}else{
  renderDay();renderReg();
}

let _tx=null;
document.addEventListener('touchstart',e=>{_tx=e.touches[0].clientX},{passive:true});
document.addEventListener('touchend',e=>{
  if(_tx===null)return;
  const dx=e.changedTouches[0].clientX-_tx;
  _tx=null;
  if(Math.abs(dx)<80)return;
  if(curTab==='jour'){dx<0?goDay(1):goDay(-1)}
  else if(curTab==='mois'){dx<0?goMonth(1):goMonth(-1)}
});
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
