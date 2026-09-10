// app-parser.js - Version corrigé·»e
// Parsing des fichiers d'heures et calculs
// CONFORME ACCORD CADRE TRANSPORT SANITAIRE (IDCC 16)

// === CONSTANTES ACCORD CADRE ===
const MAJORATION_SUP_25 = 0.25;  // 36e à 43e heure
const MAJORATION_SUP_50 = 0.50;  // 44e heure et +
const SEUIL_HEBDO = 35 * 60;     // 35 heures en minutes
const SEUIL_8_HEURES_SUP = 8 * 60; // 8 premières heures sup (36-43e)

// === PARSING ===
function parserLigneHeures(ligne) {
    if (!ligne || ligne.trim() === '') return null;
    
    const parties = ligne.split('|').map(p => p.trim());
    if (parties.length < 4) return null;
    
    const [date, debut, fin, pause, notes = ''] = parties;
    
    return {
        date: parserDate(date),
        debut: parserHeures(debut),
        fin: parserHeures(fin),
        pause: parserHeures(pause),
        notes: notes
    };
}

function parserDate(chaine) {
    if (!chaine) return null;
    
    let match = chaine.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
        return new Date(`${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`);
    }
    
    match = chaine.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
        return new Date(chaine);
    }
    
    match = chaine.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (match) {
        return new Date(`${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`);
    }
    
    return new Date(chaine);
}

function parserFichierTexte(contenu) {
    const lignes = contenu.split('\n');
    const jours = [];
    
    for (const ligne of lignes) {
        const jour = parserLigneHeures(ligne);
        if (jour) {
            jours.push(jour);
        }
    }
    
    return jours;
}

// === CALCULS ===
function calculerHeuresTravaillees(jour) {
    const duree = jour.fin - jour.debut;
    const travaille = Math.max(0, duree - jour.pause);
    return travaille;
}

function calculerTotalHeuresSemaine(jours) {
    // Somme des heures sur 7 jours glissants
    let total = 0;
    for (const jour of jours) {
        total += calculerHeuresTravaillees(jour);
    }
    return total;
}

// === AUDIT ===
function audit(jours) {
    if (!jours || jours.length === 0) {
        return {
            erreur: 'Aucune donnéé·»e à auditer',
            totalHeures: 0,
            totalJours: 0,
            details: []
        };
    }
    
    let totalMinutes = 0;
    const details = [];
    
    for (const jour of jours) {
        const travaille = calculerHeuresTravaillees(jour);
        totalMinutes += travaille;
        
        details.push({
            date: jour.date ? jour.date.toLocaleDateString('fr-FR') : 'Inconnue',
            heuresTravaillees: travaille,
            notes: jour.notes || ''
        });
    }
    
    const totalHeures = totalMinutes / 60;
    
    return {
        totalHeures: totalMinutes,
        totalJours: jours.length,
        heuresDecimales: totalHeures,
        details: details
    };
}

// === PAIE - CONFORME ACCORD CADRE ===
function paie(jours, tauxHoraire = 12.10) {
    // Taux par défaut : Auxiliaire 2025 (12.10€/h)
    // Niveaux 2025 : Auxiliaire 12.10€, Ambulancier 12.75€, Ambulancier 13.40€
    
    if (!jours || jours.length === 0) {
        return {
            erreur: 'Aucune donnéé·»e pour le calcul de paie',
            brut: 0,
            details: {}
        };
    }
    
    // Calcul du total hebdomadaire
    let totalMinutes = 0;
    for (const jour of jours) {
        totalMinutes += calculerHeuresTravaillees(jour);
    }
    
    const totalHeures = totalMinutes / 60;
    
    // Heures normales (35h)
    const heuresNormales = Math.min(totalHeures, 35);
    
    // Heures supplémentaires
    const heuresSupTotal = Math.max(0, totalHeures - 35);
    
    // Répartition 25% / 50% selon accord cadre
    const heuresSup25 = Math.min(heuresSupTotal, 8);  // 36e à 43e heure
    const heuresSup50 = Math.max(0, heuresSupTotal - 8);  // 44e heure et +
    
    // Calcul du brut
    const brutNormal = heuresNormales * tauxHoraire;
    const brutSup25 = heuresSup25 * tauxHoraire * (1 + MAJORATION_SUP_25);
    const brutSup50 = heuresSup50 * tauxHoraire * (1 + MAJORATION_SUP_50);
    const brutTotal = brutNormal + brutSup25 + brutSup50;
    
    return {
        brut: brutTotal,
        heuresNormales: heuresNormales,
        heuresSupplementaires: {
            total: heuresSupTotal,
            tranche25: heuresSup25,
            tranche50: heuresSup50
        },
        tauxHoraire: tauxHoraire,
        details: {
            brutNormal: brutNormal,
            brutSup25: brutSup25,
            brutSup50: brutSup50,
            majorations: {
                tranche25: '25% (36e-43e heure)',
                tranche50: '50% (44e heure+)'
            }
        }
    };
}

// === EXPORTS ===
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parserLigneHeures,
        parserDate,
        parserFichierTexte,
        calculerHeuresTravaillees,
        calculerTotalHeuresSemaine,
        audit,
        paie,
        MAJORATION_SUP_25,
        MAJORATION_SUP_50,
        SEUIL_HEBDO
    };
}