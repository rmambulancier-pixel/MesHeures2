// app-ui.js - Version corrigé·»e
// Gestion de l'interface utilisateur

// === ÉLÉ·È·MENTS DOM ===
const UI = {
    containerPrincipal: null,
    formulaire: null,
    resultats: null,
    inputDate: null,
    inputDebut: null,
    inputFin: null,
    inputPause: null,
    inputNotes: null,
    btnAjouter: null,
    btnAudit: null,
    btnPaie: null,
    btnReset: null,
    btnExporter: null,
    affichageTotalHeures: null,
    affichageTotalJours: null,
    affichageBrut: null,
    listeJours: null
};

// === CONSTANTES ===
const TAUX_PERSONNALISE = 14.02;

// === INITIALISATION ===
function initialiserUI() {
    UI.containerPrincipal = document.getElementById('container-principal');
    UI.formulaire = document.getElementById('formulaire');
    UI.resultats = document.getElementById('resultats');
    UI.inputDate = document.getElementById('input-date');
    UI.inputDebut = document.getElementById('input-debut');
    UI.inputFin = document.getElementById('input-fin');
    UI.inputPause = document.getElementById('input-pause');
    UI.inputNotes = document.getElementById('input-notes');
    UI.btnAjouter = document.getElementById('btn-ajouter');
    UI.btnAudit = document.getElementById('btn-audit');
    UI.btnPaie = document.getElementById('btn-paie');
    UI.btnReset = document.getElementById('btn-reset');
    UI.btnExporter = document.getElementById('btn-exporter');
    UI.affichageTotalHeures = document.getElementById('total-heures');
    UI.affichageTotalJours = document.getElementById('total-jours');
    UI.affichageBrut = document.getElementById('total-brut');
    UI.listeJours = document.getElementById('liste-jours');
    
    if (UI.inputDate) {
        UI.inputDate.valueAsDate = new Date();
    }
    
    // Mettre à jour l'affichage du taux
    mettreAJourAffichageTaux();
}

function mettreAJourAffichageTaux() {
    const footer = document.querySelector('footer p');
    if (footer) {
        footer.innerHTML = `MesHeures V2 - <small>Taux : <strong>${TAUX_PERSONNALISE.toFixed(2)} €/h</strong> | Majorations 25%/50%</small>`;
    }
}

// === AFFICHAGE ===
function afficherMessage(message, type = 'info') {
    const div = document.createElement('div');
    div.className = `message message-${type}`;
    div.textContent = message;
    
    if (UI.containerPrincipal) {
        UI.containerPrincipal.insertBefore(div, UI.containerPrincipal.firstChild);
        setTimeout(() => div.remove(), 3000);
    }
}

function mettreAJourAffichage() {
    const jours = gestionDonnees.getJours();
    
    if (UI.affichageTotalJours) {
        UI.affichageTotalJours.textContent = jours.length;
    }
    
    if (UI.affichageTotalHeures && UI.affichageBrut) {
        let totalMinutes = 0;
        for (const jour of jours) {
            totalMinutes += calculerHeuresTravaillees(jour);
        }
        UI.affichageTotalHeures.textContent = formaterHeures(totalMinutes);
        
        const resultatPaie = paie(jours, TAUX_PERSONNALISE);
        UI.affichageBrut.textContent = formaterEuros(resultatPaie.brut);
    }
    
    if (UI.listeJours) {
        UI.listeJours.innerHTML = '';
        
        for (const jour of jours.slice().reverse()) {
            const travaille = calculerHeuresTravaillees(jour);
            const li = document.createElement('li');
            li.className = 'jour-item';
            
            const dateStr = jour.date ? jour.date.toLocaleDateString('fr-FR') : 'Inconnue';
            li.innerHTML = `
                <span class="date">${dateStr}</span>
                <span class="heures">${formaterHeures(travaille)}</span>
                <span class="notes">${jour.notes || ''}</span>
            `;
            UI.listeJours.appendChild(li);
        }
    }
}

// === ÉCOUTEURS ===
function attacherEcouteurs() {
    if (UI.btnAjouter) {
        UI.btnAjouter.addEventListener('click', ajouterJour);
    }
    
    if (UI.btnAudit) {
        UI.btnAudit.addEventListener('click', lancerAudit);
    }
    
    if (UI.btnPaie) {
        UI.btnPaie.addEventListener('click', lancerPaie);
    }
    
    if (UI.btnReset) {
        UI.btnReset.addEventListener('click', () => {
            if (confirm('Voulez-vous vraiment tout effacer ?')) {
                gestionDonnees.reset();
                mettreAJourAffichage();
                afficherMessage('Donné·»es réinitialisé·»es', 'success');
            }
        });
    }
    
    if (UI.btnExporter) {
        UI.btnExporter.addEventListener('click', exporterDonnees);
    }
}

// === ACTIONS ===
function ajouterJour() {
    const date = UI.inputDate ? new Date(UI.inputDate.value) : new Date();
    const debut = parserHeures(UI.inputDebut ? UI.inputDebut.value : '');
    const fin = parserHeures(UI.inputFin ? UI.inputFin.value : '');
    const pause = parserHeures(UI.inputPause ? UI.inputPause.value : '0');
    const notes = UI.inputNotes ? UI.inputNotes.value : '';
    
    if (debut === 0 || fin === 0) {
        afficherMessage('Veuillez remplir les heures de début et de fin', 'error');
        return;
    }
    
    const jour = { date, debut, fin, pause, notes };
    gestionDonnees.ajouterJour(jour);
    
    afficherMessage('Jour ajouté avec succè·»s', 'success');
    mettreAJourAffichage();
    
    if (UI.inputDebut) UI.inputDebut.value = '';
    if (UI.inputFin) UI.inputFin.value = '';
    if (UI.inputPause) UI.inputPause.value = '0';
    if (UI.inputNotes) UI.inputNotes.value = '';
}

function lancerAudit() {
    const jours = gestionDonnees.getJours();
    const resultat = audit(jours);
    
    if (resultat.erreur) {
        afficherMessage(resultat.erreur, 'error');
        return;
    }
    
    afficherMessage(
        `Audit : ${resultat.totalJours} jours, ${formaterHeures(resultat.totalHeures)} travaill é es (${resultat.heuresDecimales.toFixed(2)}h)`,
        'success'
    );
    
    console.log('Audit complet:', resultat);
}

function lancerPaie() {
    const jours = gestionDonnees.getJours();
    const resultat = paie(jours, TAUX_PERSONNALISE);
    
    if (resultat.erreur) {
        afficherMessage(resultat.erreur, 'error');
        return;
    }
    
    const sup = resultat.heuresSupplementaires;
    afficherMessage(
        `Paie (à¹¡14,02 €/h) : ${formaterEuros(resultat.brut)} brut\n` +
        `  • ${resultat.heuresNormales.toFixed(2)}h normales (${formaterEuros(resultat.details.brutNormal)})\n` +
        `  • ${sup.tranche25.toFixed(2)}h sup à 25% (${formaterEuros(resultat.details.brutSup25)})\n` +
        `  • ${sup.tranche50.toFixed(2)}h sup à 50% (${formaterEuros(resultat.details.brutSup50)})`,
        'success'
    );
    
    console.log('=== FICHE DE PAIE ===');
    console.log('Taux horaire : 14,02 €');
    console.log('Brut total :', formaterEuros(resultat.brut));
    console.log('\nD étail :');
    console.table({
        'Heures normales': resultat.heuresNormales.toFixed(2) + 'h',
        'Sup 25% (36e-43e)': sup.tranche25.toFixed(2) + 'h',
        'Sup 50% (44e+)': sup.tranche50.toFixed(2) + 'h'
    });
    console.log('\nMontants :');
    console.table({
        'Brut normal': formaterEuros(resultat.details.brutNormal),
        'Brut sup 25%': formaterEuros(resultat.details.brutSup25),
        'Brut sup 50%': formaterEuros(resultat.details.brutSup50),
        'TOTAL': formaterEuros(resultat.brut)
    });
}

function exporterDonnees() {
    const jours = gestionDonnees.getJours();
    const contenu = JSON.stringify(jours, null, 2);
    
    const blob = new Blob([contenu], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `mesheures-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    afficherMessage('Donné·»es exporté·»es', 'success');
}

// === EXPORTS ===
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        UI,
        initialiserUI,
        afficherMessage,
        mettreAJourAffichage,
        attacherEcouteurs,
        TAUX_PERSONNALISE
    };
}