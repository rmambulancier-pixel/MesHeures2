
## V15.1.1
MesHeures V15.1.1 regroupe le dashboard, le calendrier intelligent, la synthèse paie, l’audit renforcé, le rapprochement bulletin, les statistiques historiques et le centre de sauvegarde/restauration. Le moteur de calcul historique reste inchangé.
# MesHeures — refonte technique

Cette version conserve l'interface et les règles de calcul de la base fournie, mais sépare le JavaScript en responsabilités claires.

- `scripts/app-core.js` : constantes, état applicatif et calculs métier (TTE, quatorzaines, paie).
- `scripts/app-pwa.js` : persistance locale.
- `scripts/app-ui.js` : navigation, édition des journées et rendu de l'interface.
- `scripts/app-parser.js` : imports/analyse bulletins, PDF, Excel et ROMI.
- `scripts/app.js` : orchestration et initialisation.

Les scripts sont chargés dans cet ordre dans `index.html`, avec `defer`, afin de préserver les handlers inline existants.

## Vérification effectuée

- Syntaxe JavaScript validée avec `node --check` sur les 5 fichiers.
- Smoke test du moteur de calcul : TTE, amplitude et calcul de période cohérents sur une journée de test.
- Aucune dépendance supplémentaire n'est requise.
