// app.js - Version corrigé·»e
// Point d'entré·»e principal de l'application MesHeures V2
// CONFORME ACCORD CADRE TRANSPORT SANITAIRE

// === CONSTANTES ===
// Taux horaires 2025 (accord cadre transport sanitaire)
const TAUX_AUXILIAIRE = 12.10;   // Niveau 1
const TAUX_AMBULANCIER = 12.75;  // Niveau 2
const TAUX_AMBULANCIER_3 = 13.40; // Niveau 3
const TAUX_PERSONNALISE = 14.02;  // TON TAUX

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', () => {
    console.log('MesHeures V2 - Démarrage...');
    console.log('Convention : Transport sanitaire (IDCC 16)');
    console.log('Majorations : 25% (36e-43e h) puis 50% (44e h+)');
    console.log('Ton taux : 14,02 €/h');
    
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
    console.log('Total:', formaterHeures(resultat.totalHeures), '(', 
                resultat.heuresDecimales.toFixed(2), 'h ) -', 
                resultat.totalJours, 'jours');
    return resultat;
};

window.paie = function(taux = TAUX_PERSONNALISE) {
    const jours = gestionDonnees.getJours();
    const resultat = paie(jours, taux);
    
    console.log('=== FICHE DE PAIE ===');
    console.log('Taux horaire:', taux.toFixed(2), '€');
    console.log('Brut total:', formaterEuros(resultat.brut));
    console.log('\nD étail :');
    console.table({
        'Heures normales': resultat.heuresNormales.toFixed(2) + 'h',
        'Sup 25% (36e-43e)': resultat.heuresSupplementaires.tranche25.toFixed(2) + 'h',
        'Sup 50% (44e+)': resultat.heuresSupplementaires.tranche50.toFixed(2) + 'h'
    });
    console.log('\nMontants :');
    console.table({
        'Brut normal': formaterEuros(resultat.details.brutNormal),
        'Brut sup 25%': formaterEuros(resultat.details.brutSup25),
        'Brut sup 50%': formaterEuros(resultat.details.brutSup50),
        'TOTAL': formaterEuros(resultat.brut)
    });
    
    return resultat;
};

window.ajouterTest = function() {
    const aujourdHui = new Date();
    
    // Semaine type 39h (4h sup à 25%)
    for (let i = 0; i < 5; i++) {
        const jour = new Date(aujourdHui);
        jour.setDate(jour.getDate() - aujourdHui.getDay() + 1 + i);
        
        gestionDonnees.ajouterJour({
            date: jour,
            debut: 8 * 60,
            fin: 16 * 60 + 48, // 8h48 = 39h/semaine
            pause: 60,
            notes: 'Jour ' + (i + 1)
        });
    }
    
    mettreAJourAffichage();
    console.log('Semaine de test (39h) ajout é e');
    console.log('Tape paie() pour voir le calcul avec majorations');
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