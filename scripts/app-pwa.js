// Persistance locale — MesHeures
function save(){
  try{localStorage.setItem(LS,JSON.stringify(DB))}
  catch(e){alert('Stockage plein : exportez vos données !\n'+e.message)}
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
