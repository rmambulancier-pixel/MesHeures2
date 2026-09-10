// app-core.js - Version corrigé·»e
// Fonctions utilitaires et gestion des données

// === CONSTANTES ===
const TAUX_HORAIRE = 11.50; // SMIC horaire brut
const HEURES_MENSUELLES = 151.67;

// === UTILITAIRES ===
function formaterHeures(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h${m.toString().padStart(2, '0')}`;
}

function formaterEuros(montant) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(montant);
}

function parserHeures(chaine) {
    // Supporte : "8h30", "8:30", "8.5", "8h"
    if (!chaine) return 0;
    
    const match = chaine.match(/(\d+)[h.:](\d+)?/);
    if (match) {
        const heures = parseInt(match[1]);
        const minutes = match[2] ? parseInt(match[2]) : 0;
        return heures * 60 + minutes;
    }
    
    const decimal = parseFloat(chaine);
    if (!isNaN(decimal)) {
        return Math.round(decimal * 60);
    }
    
    return 0;
}

// === GESTION DES DONNÉ·È·ES ===
class GestionDonnees {
    constructor() {
        this.donnees = {
            jours: [],
            parametres: {
                tauxHoraire: TAUX_HORAIRE,
                heuresMensuelles: HEURES_MENSUELLES
            }
        };
        this.charger();
    }
    
    charger() {
        try {
            const sauvegarde = localStorage.getItem('mesHeures2_donnees');
            if (sauvegarde) {
                this.donnees = JSON.parse(sauvegarde);
            }
        } catch (e) {
            console.error('Erreur chargement données:', e);
        }
    }
    
    sauvegarder() {
        try {
            localStorage.setItem('mesHeures2_donnees', JSON.stringify(this.donnees));
        } catch (e) {
            console.error('Erreur sauvegarde données:', e);
        }
    }
    
    ajouterJour(jour) {
        this.donnees.jours.push(jour);
        this.sauvegarder();
    }
    
    getJours() {
        return this.donnees.jours;
    }
    
    reset() {
        this.donnees.jours = [];
        this.sauvegarder();
    }
}

// === INSTANCE GLOBALE ===
const gestionDonnees = new GestionDonnees();

// === EXPORTS ===
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formaterHeures,
        formaterEuros,
        parserHeures,
        GestionDonnees,
        gestionDonnees,
        TAUX_HORAIRE,
        HEURES_MENSUELLES
    };
}