// Persistance locale robuste — MesHeures V15.3

function save() {
  try {
    localStorage.setItem(LS, JSON.stringify(DB));
  } catch (err) {
    console.error('Erreur quota localStorage :', err);
    // Notification non bloquante si l'élément d'alerte existe
    const out = $('pAl') || $('dAl');
    if (out) {
      out.innerHTML = '<div class="al b">🚨 <b>Espace de stockage local saturé</b>. Exportez immédiatement vos données en JSON depuis l\'onglet Réglages.</div>';
    }
  }
}

function loadDB() {
  try {
    const raw = localStorage.getItem(LS);
    if (!raw) return false;

    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return false;

    // Fusion avec préservation stricte des valeurs par défaut
    DB = {
      ...DB,
      ...data,
      s: { ...DEF, ...(data.s || {}) },
      per: { ...DB.per, ...(data.per || {}) },
      days: data.days || {},
      periods: Array.isArray(data.periods) ? data.periods : [],
      bul: data.bul || {},
      bulletins: Array.isArray(data.bulletins) ? data.bulletins : [],
      romi: data.romi || {},
      cmp: data.cmp || {}
    };
    return true;
  } catch (err) {
    console.error('Corruption détectée sur le localStorage :', err);
    // Sauvegarde brute de sécurité avant réinitialisation
    const corrupted = localStorage.getItem(LS);
    if (corrupted) {
      localStorage.setItem(LS + '_corrupted_' + Date.now(), corrupted);
    }
    return false;
  }
}

// Alias de rétrocompatibilité pour les appels historiques
const load = loadDB;
