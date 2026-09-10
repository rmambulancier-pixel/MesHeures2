// app-parser.js - Version corrigé·»e
// Parsing des fichiers d'heures et calculs

// === PARSING ===
function parserLigneHeures(ligne) {
    // Format attendu : "Date | Début | Fin | Pause | Notes"
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
    
    // DD/MM/YYYY
    let match = chaine.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
        return new Date(`${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`);
    }
    
    // YYYY-MM-DD
    match = chaine.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
        return new Date(chaine);
    }
    
    // DD-MM-YYYY
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

function calculerHeuresSupplementaires(jour, seuilJournee = 7 * 60) {
    const travaille = calculerHeuresTravaillees(jour);
    const sup = Math.max(0, travaille - seuilJournee);
    return sup;
}

function calculerTotalHeures(jours) {
    let total = 0;
    let totalSup = 0;
    
    for (const jour of jours) {
        const travaille = calculerHeuresTravaillees(jour);
        const sup = calculerHeuresSupplementaires(jour);
        
        total += travaille;
        totalSup += sup;
    }
    
    return {
        total: total,
        supplementaires: totalSup,
        normales: total - totalSup
    };
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
    
    const stats = calculerTotalHeures(jours);
    const details = [];
    
    for (const jour of jours) {
        const travaille = calculerHeuresTravaillees(jour);
        const sup = calculerHeuresSupplementaires(jour);
        
        details.push({
            date: jour.date ? jour.date.toLocaleDateString('fr-FR') : 'Inconnue',
            heuresTravaillees: travaille,
            heuresSupplementaires: sup,
            notes: jour.notes || ''
        });
    }
    
    return {
        totalHeures: stats.total,
        totalJours: jours.length,
        heuresNormales: stats.normales,
        heuresSupplementaires: stats.supplementaires,
        details: details
    };
}

// === PAIE ===
function paie(jours, tauxHoraire = 11.50, majorationSup = 0.25) {
    if (!jours || jours.length === 0) {
        return {
            erreur: 'Aucune donnéé·»e pour le calcul de paie',
            brut: 0,
            details: {}
        };
    }
    
    const stats = calculerTotalHeures(jours);
    
    const heuresNormalesDec = stats.normales / 60;
    const heuresSupDec = stats.supplementaires / 60;
    
    const brutNormal = heuresNormalesDec * tauxHoraire;
    const brutSup = heuresSupDec * tauxHoraire * (1 + majorationSup);
    const brutTotal = brutNormal + brutSup;
    
    return {
        brut: brutTotal,
        heuresNormales: heuresNormalesDec,
        heuresSupplementaires: heuresSupDec,
        tauxHoraire: tauxHoraire,
        majorationSup: majorationSup,
        details: {
            brutNormal: brutNormal,
            brutSup: brutSup
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
        calculerHeuresSupplementaires,
        calculerTotalHeures,
        audit,
        paie
    };
}