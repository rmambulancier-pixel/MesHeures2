# MesHeures V17.0.0 — Android + PWA

MesHeures est une application de suivi du temps de travail conçue pour le **transport sanitaire**, avec un focus sur le suivi des ambulanciers : saisie terrain, décompte par quatorzaine, projection, contrôle des amplitudes et du temps de travail, suivi de la paie, import de documents et sauvegardes locales.

> **Version actuelle : V17.0.0 — versionCode Android 1700**
>
> La V17 part de la base Android réparée et validée, puis regroupe les évolutions paie, projection, contrôle légal et sauvegarde.

## Fonctionnalités V17

### 🏠 Tableau de bord
- TTE du jour
- cumul de quatorzaine
- solde avant heures supplémentaires
- alertes de conformité hiérarchisées

### ⏱️ Temps de travail
- suivi du TTE
- décompte par quatorzaine
- suivi des heures supplémentaires
- gestion des majorations
- prise en compte du planning dans les projections

### 🔮 Projection intelligente
La projection de fin de quatorzaine s'appuie en priorité sur les **journées futures réellement planifiées comme travaillées**.

Les journées futures non renseignées ne sont pas transformées artificiellement en journées travaillées. Elles sont signalées afin d'éviter une projection trompeuse.

### 💶 Paie
- moteur de calcul des heures normales et supplémentaires
- majorations 25 % / 50 % selon les règles configurées
- estimation du brut
- taux horaire personnel configurable
- **base personnelle par défaut : 14,20 € brut/h hors prime d'ancienneté**
- prime d'ancienneté traitée séparément
- comparaison entre temps calculé et éléments du bulletin lorsque les données sont disponibles

### ⚖️ Contrôle légal — transport sanitaire
Référentiel dédié au transport sanitaire et à la convention collective des transports routiers, avec contrôles notamment sur :

- amplitude
- temps de travail effectif
- limites hebdomadaires
- moyenne sur période de référence
- repos quotidien
- pauses
- heures supplémentaires
- minima conventionnels
- indemnités et éléments spécifiques applicables

Le référentiel est daté et doit être revérifié lorsque les textes évoluent.

### 📄 Bulletins, ROMI1 et OCR
- import de documents
- extraction OCR
- validation avant intégration des données extraites
- possibilité de corriger les valeurs détectées
- contrôle des incohérences avant ajout à l'historique

### 💾 Sauvegardes locales
MesHeures V17 privilégie le stockage local et le fonctionnement hors connexion.

- sauvegarde automatique locale
- points de restauration
- export complet en JSON
- import JSON versionné
- sauvegarde automatique avant import/restauration
- restauration des données locales
- fonctionnement sans compte ni serveur obligatoire

### 📤 Exports
Selon les modules disponibles :
- JSON pour sauvegarde complète
- CSV pour exploitation dans un tableur
- rapports pour contrôle et archivage

### 📱 Interface mobile
Navigation basse simplifiée :

**Accueil · Saisie · Planning · Paie · Outils**

Les fonctions secondaires sont regroupées dans Outils afin de conserver un maximum de place sur smartphone.

### 🌙 Apparence
- Clair
- Sombre
- Automatique selon le système de l'appareil

### 🔌 PWA / hors connexion
L'application embarque la PWA MesHeures dans l'APK Android et conserve ses données localement. Les bibliothèques externes ne doivent pas empêcher l'affichage initial de l'application.

## Référentiel réglementaire

La V17 intègre un référentiel de contrôle orienté **transport sanitaire / CCN des transports routiers (IDCC 0016)** et Code du travail.

Les règles sont utilisées comme aide au contrôle et à la détection d'écarts. Une situation individuelle peut dépendre du contrat de travail, d'un accord d'entreprise, du planning, des justificatifs ou d'une disposition conventionnelle particulière.

**Date de vérification du référentiel intégré dans cette version : 11/09/2026.**

## Architecture

```text
app/src/main/
├── java/com/mesheures/app/
│   └── MainActivity.java
└── assets/web/
    ├── index.html
    ├── manifest.json
    ├── sw.js
    ├── style/
    └── scripts/
        ├── app-core.js
        ├── app-ui.js
        ├── app-parser.js
        ├── app-pwa.js
        ├── app-plugins.js
        ├── app.js
        ├── app-legal.js
        ├── app-projection.js
        ├── app-backup.js
        └── app-v17.js
```

## Android

- Application ID : `com.mesheures.app`
- compileSdk : 35
- targetSdk : 35
- minSdk : 26
- Java : 17
- Gradle : 8.9
- Android Gradle Plugin : 8.7.3
- versionCode : 1700
- versionName : 17.0.0

La signature de release repose sur la clé persistante configurée dans les secrets GitHub Actions. **Le keystore privé n'est pas stocké dans le dépôt.**

## Build GitHub Actions

Le workflow :

```text
.github/workflows/build-apk.yml
```

produit l'APK Android à partir de la branche `main`.

Les secrets de signature nécessaires sont configurés dans les paramètres du dépôt. Ils ne doivent jamais être ajoutés au code source.

## Installation / mise à jour

Pour une mise à jour normale :

1. construire l'APK signée via GitHub Actions ;
2. installer la nouvelle version par-dessus l'ancienne ;
3. conserver la même clé de signature et augmenter le `versionCode`.

Une désinstallation n'est pas nécessaire pour une mise à jour signée compatible.

## Sauvegarde des données

Avant une évolution importante ou un changement de build, il est recommandé d'effectuer un **export JSON complet** depuis MesHeures. Le fichier JSON constitue une sauvegarde portable des données de l'application.

## Historique rapide

### V17.0.0
- refonte de la navigation mobile
- projection basée sur le planning futur
- moteur paie renforcé
- contrôle légal transport sanitaire
- sauvegardes et restauration JSON renforcées
- thème automatique
- sécurisation des imports OCR
- base Android réparée conservée comme référence

### V16.2.x
- stabilisation Android
- signature release persistante
- sauvegarde LocalStorage côté Android
- correctifs paie et quatorzaines

## Licence / usage

Projet personnel et outil de suivi. Les règles réglementaires affichées dans l'application constituent un **outil d'aide au contrôle** et ne constituent pas un avis juridique.
