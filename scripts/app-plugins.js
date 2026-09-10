/* MesHeures Extensions — V16
   Format .mhplugin = JSON declaratif : manifest + html + css + script optionnel.
   Les extensions sont isolees dans un iframe sandbox et communiquent via postMessage.
*/
const MH_PLUGIN_KEY='mesheures_plugins_v1';
const MH_PLUGIN_FORMAT='MesHeures Plugin';
const MH_BUILTIN_PLUGINS=[{
  id:'mes-droits-demo',name:'Mes Droits',version:'1.0.0',author:'MesHeures',builtin:true,
  description:'Exemple d’extension : consulte rapidement les paliers d’ancienneté et les contrôles utiles.',
  permissions:['snapshot'],
  html:`<div class="mhx"><div class="eyebrow">MESHEURES · EXTENSION</div><h2>⚖️ Mes Droits</h2><p>Cette extension de démonstration montre comment un module peut lire les données autorisées de MesHeures.</p><div id="out" class="box">Chargement…</div><button onclick="parent.postMessage({type:'mhx-request',action:'snapshot'},'*')">Actualiser</button></div>`,
  css:`body{font:15px system-ui;background:#0d1117;color:#e6edf3;margin:0;padding:18px}.mhx{max-width:600px;margin:auto}.eyebrow{font-size:10px;letter-spacing:1.5px;color:#7f8b99;font-weight:800}h2{margin:6px 0 8px}.box{background:#161b22;border:1px solid #30363d;border-radius:14px;padding:14px;margin:14px 0}.mut{color:#8b949e;font-size:12px}button{background:#238636;color:#fff;border:0;border-radius:10px;padding:10px 14px;font-weight:700}`,
  script:`window.addEventListener('message',e=>{if(e.data?.type!=='mhx-data')return;const s=e.data.snapshot||{};document.getElementById('out').innerHTML='<b>'+((s.ancPct??0)+'%')+'</b> d’ancienneté · <span class="mut">'+(s.trav??0)+' jour(s) travaillé(s) · '+(s.tte??'00h00')+' TTE ce mois</span>';});parent.postMessage({type:'mhx-request',action:'snapshot'},'*');`
}];
let MH_PLUGINS=[];
function mhLoadPlugins(){try{MH_PLUGINS=JSON.parse(localStorage.getItem(MH_PLUGIN_KEY)||'[]')}catch(e){MH_PLUGINS=[]}}
function mhSavePlugins(){localStorage.setItem(MH_PLUGIN_KEY,JSON.stringify(MH_PLUGINS));}
function mhAllPlugins(){return [...MH_BUILTIN_PLUGINS,...MH_PLUGINS.filter(p=>!MH_BUILTIN_PLUGINS.some(b=>b.id===p.id))]}
function mhPluginSnapshot(){
  const m=mhMonthStats(curMonth||today().slice(0,7));
  const anc=calcAnc(DB.s.emb||DEF.emb);
  return {version:MH_V,month:curMonth,trav:m.trav,tte:F(m.tte),amp:F(m.amp),nuit:C2(m.nuit)+' h',alerts:m.alerts.length,ancPct:anc.pct,ancYears:anc.y,ancMonths:anc.m};
}
function mhPluginFrame(p){
  const html=p.html||'<p>Extension sans interface.</p>',css=p.css||'',script=p.script||'';
  const safeScript=script.replace(/<\/script/gi,'<\\/script');
  const src=`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}<script>${safeScript}</script></body></html>`;
  const b64=btoa(unescape(encodeURIComponent(src)));
  return `<iframe class="mhx-frame" sandbox="allow-scripts" title="${esc(p.name)}" src="data:text/html;base64,${b64}"></iframe>`;
}
function mhRenderPlugins(){
  const host=$('mhPluginList');if(!host)return;
  const list=mhAllPlugins();
  host.innerHTML=list.map(p=>`<div class="mh-plugin-card"><div class="mh-plugin-top"><div class="mh-plugin-icon">🧩</div><div class="mh-plugin-info"><b>${esc(p.name)}</b><small>v${esc(p.version)} · ${esc(p.author||'Inconnu')}${p.builtin?' · officiel':''}</small></div><label class="mh-plugin-toggle"><input type="checkbox" ${p.enabled===false?'':'checked'} onchange="mhTogglePlugin('${esc(p.id)}',this.checked)"><span></span></label></div><p>${esc(p.description||'Aucune description.')}</p><div class="mh-plugin-perms">${(p.permissions||[]).map(x=>`<span>${esc(x)}</span>`).join('')}</div>${p.enabled===false?'':'<div class="mh-plugin-body">'+mhPluginFrame(p)+'</div>'}${!p.builtin?`<button class="r" onclick="mhRemovePlugin('${esc(p.id)}')">Désinstaller</button>`:''}</div>`).join('');
}
function mhTogglePlugin(id,on){
  const p=MH_PLUGINS.find(x=>x.id===id);if(p){p.enabled=on;mhSavePlugins();mhRenderPlugins()}
}
function mhRemovePlugin(id){if(!confirm('Désinstaller cette extension ?'))return;MH_PLUGINS=MH_PLUGINS.filter(x=>x.id!==id);mhSavePlugins();mhRenderPlugins()}
function mhImportPlugin(input){
  const f=input?.files?.[0];if(!f)return;
  const reader=new FileReader();reader.onload=()=>{try{
    const p=JSON.parse(reader.result);if(p.format!==MH_PLUGIN_FORMAT||!p.manifest?.id)throw new Error('Format .mhplugin invalide.');
    const m=p.manifest;if(!/^[a-z0-9._-]{3,60}$/.test(m.id))throw new Error('Identifiant d’extension invalide.');
    if(!Array.isArray(m.permissions))m.permissions=[];
    const allowed=['snapshot'];m.permissions=m.permissions.filter(x=>allowed.includes(x));
    const clean={id:m.id,name:String(m.name||m.id).slice(0,80),version:String(m.version||'1.0.0').slice(0,20),author:String(m.author||'Inconnu').slice(0,80),description:String(m.description||'').slice(0,240),permissions:m.permissions,html:String(p.html||'').slice(0,50000),css:String(p.css||'').slice(0,30000),script:String(p.script||'').slice(0,50000),enabled:true};
    MH_PLUGINS=MH_PLUGINS.filter(x=>x.id!==clean.id);MH_PLUGINS.push(clean);mhSavePlugins();mhRenderPlugins();alert('✅ Extension installée : '+clean.name);
  }catch(e){alert('❌ Extension refusée : '+e.message)}finally{input.value=''}};reader.readAsText(f);
}
window.addEventListener('message',e=>{
  if(e.data?.type!=='mhx-request')return;
  if(e.data.action==='snapshot' && e.source){e.source.postMessage({type:'mhx-data',snapshot:mhPluginSnapshot()},'*')}
});
mhLoadPlugins();
