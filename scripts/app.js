// app.js - Version corrigé·»e
// Point d'entré·»e principal de l'application MesHeures V2

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', () => {
    console.log('MesHeures V2 - Démarrage...');
    
    initialiserUI();
    attacherEcouteurs();
    mettreAJourAffichage();
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW enregistré:', reg.scope))
            .catch(err => console.error('SW échec:', err));
    }
    
    console.log('MesHeures V2 - Prê·»t');
});

// === FONCTIONS GLOBALES (console) ===
window.audit = function() {
    const jours = gestionDonnees.getJours();
    const resultat = audit(jours);
    console.table(resultat.details);
    console.log('Total:', formaterHeures(resultat.totalHeures), '-', 
                resultat.totalJours, 'jours');
    return resultat;
};

window.paie = function(taux = 11.50, majoration = 0.25) {
    const jours = gestionDonnees.getJours();
    const resultat = paie(jours, taux, majoration);
    console.log('Salaire brut:', formaterEuros(resultat.brut));
    console.log('D étails:', resultat.details);
    return resultat;
};

window.ajouterTest = function() {
    const aujourdHui = new Date();
    
    gestionDonnees.ajouterJour({
        date: new Date(aujourdHui),
        debut: 8 * 60,
        fin: 17 * 60,
        pause: 60,
        notes: 'Journé·»e normale'
    });
    
    gestionDonnees.ajouterJour({
        date: new Date(aujourdHui.getTime() - 86400000),
        debut: 8 * 60,
        fin: 19 * 60,
        pause: 60,
        notes: 'Avec heures sup'
    });
    
    mettreAJourAffichage();
    console.log('2 jours de test ajout é s');
};

// === DEBUG ===
window.debug = {
    afficherEtat: function() {
        console.log('=== ÉTAT APPLICATION ===');
        console.log('Jours:', gestionDonnees.getJours().length);
        console.log('Donn é es:', gestionDonnees.donnees);
        console.log('UI:', UI);
    },
    
    reset: function() {
        localStorage.removeItem('mesHeures2_donnees');
        location.reload();
    }
};