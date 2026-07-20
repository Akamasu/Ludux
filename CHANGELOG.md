# Changelog

Toutes les versions notables de Ludux seront documentees ici.

Le projet suit des versions de developpement simples :

- `v0.1.x` : fondation technique.
- `v0.2.x` : bibliotheque personnelle.
- `v0.3.x` : chroniques, sessions et souvenirs.
- `v0.4.x` : statistiques et lecture du parcours.
- `v0.5.x` : journal transversal des chroniques.
- `v0.6.x` : identite visuelle et logo.
- `v0.7.x` : musee des jeux accomplis.
- `v0.8.x` : livre de vie et chronologie globale.
- `v0.9.x` : parametres, sauvegardes et exports locaux.
- `v0.10.x` : notes et evaluations detaillees.
- `v0.11.x` : archivage, restauration et suppression de jeux.
- `v0.12.x` : gestion locale des DLC.
- `v0.13.x` : gestion locale des succes.
- `v0.14.x` : captures d'ecran et souvenirs visuels.
- `v0.15.x` : providers externes prepares.
- `v0.16.x` : edition et suppression des chroniques.
- `v0.17.x` : import et copie locale des captures.
- `v0.18.x` : edition et suppression des sessions de jeu.
- `v0.19.x` : synchronisation Steam manuelle.
- `v0.20.x` : fichiers de configuration et guides plateformes.
- `v0.21.x` : synchronisation automatique et secrets masques.
- `v0.22.x` : stabilisation du connecteur Steam.
- `v0.23.x` : enrichissement des metadonnees via RAWG.
- `v0.24.x` : experience immersive, navigation animee et habillage bibliotheque.

## v0.24.2 - 2026-07-20

- Simplification du README pour presenter Ludux avant les details de developpement.
- Ajout de la synchronisation des succes Steam publics via l'API Steam Web.
- Ajout de la detection des DLC declares sur Steam Store pour les fiches de jeu.
- Ajout d'identifiants externes sur les DLC et succes synchronises pour eviter les doublons.
- Ajout d'une limite configurable pour les appels de succes Steam avec `LUDUX_STEAM_ACHIEVEMENT_SYNC_LIMIT`.

## v0.24.1 - 2026-07-20

- Transformation du haut des fiches de jeu en volume d'archive avec couverture, page de lecture et registre.
- Ajout d'un index de volume pour les metadonnees, sessions, chroniques, DLC, succes et captures.
- Habillage des panneaux de fiche en pages d'archive coherentes avec le theme bibliotheque ancienne.
- Conservation des controles existants avec une mise en page plus lisible sur fenetre compacte.

## v0.24.0 - 2026-07-20

- Passage a une fenetre Electron sans cadre Windows natif, avec barre de titre Ludux.
- Ajout des controles reduire, agrandir/restaurer et fermer dans l'interface.
- Navigation plus fluide avec transition animee entre les pages.
- Sidebar responsive : rayonnage complet sur grand ecran, icones compactes sur fenetre reduite.
- Premiere direction visuelle "bibliotheque ancienne" : pages, dos de livres, rayonnage et accents or sobres.
- Reduction de la largeur minimale et adaptation des grands titres, compteurs et cadres sur les tailles compactes.

## v0.23.7 - 2026-07-20

- Separation des descriptions catalogue RAWG et des notes personnelles.
- Les notes personnelles ne sont plus pre-remplies avec la description publique du jeu.
- Conservation des anciennes notes courtes pour les jeux non relies a RAWG.
- Mise en forme des longues descriptions catalogue en sections et paragraphes plus lisibles.

## v0.23.6 - 2026-07-20

- Les manifests Steam `.acf` ne sont plus utilises comme source de dernier lancement.
- Les manifests restent utilises pour detecter les jeux installes, leur dossier et leur taille locale.
- La date de dernier jeu Steam vient uniquement de sources plus fiables : Steam Web API ou `localconfig.vdf`.

## v0.23.5 - 2026-07-20

- Correction de la derniere aventure affichee sur l'accueil : elle utilise maintenant la derniere session jouee reelle.
- Arret de la creation de sessions Steam datees du moment de synchronisation quand Steam ne fournit pas de date de dernier lancement.
- Nettoyage automatique des anciennes sessions Steam synchronisees sans date fiable au prochain passage de synchronisation.
- Ajout d'un test de regression pour eviter les fausses sessions Steam datees.

## v0.23.4 - 2026-07-20

- Chargement explicite de `.env` au demarrage du main process Electron.
- Verification facilitee des cles providers comme `RAWG_API_KEY` et `STEAM_WEB_API_KEY`.
- Correction des requetes Steam Store `appdetails` pour recuperer les jaquettes un AppID a la fois.
- Validation reelle des jaquettes Steam Store sur les jeux qui n'avaient pas d'image CDN classique.

## v0.23.3 - 2026-07-20

- Ajout d'un fallback visuel robuste quand une jaquette distante ne charge pas.
- Utilisation des metadonnees publiques Steam Store pour recuperer des jaquettes officielles plus fiables.
- Remplacement prudent des anciennes URLs Steam generees automatiquement sans ecraser les jaquettes personnalisees.
- Application du fallback aux cartes Bibliotheque, Musee, Chroniques et Livre de Vie.
- Ajout de tests Vitest pour les metadonnees Steam Store.

## v0.23.2 - 2026-07-20

- Correction du parsing des fichiers Steam locaux contenant des valeurs vides.
- Conservation correcte des chemins Windows avec antislashs simples dans les fichiers `.vdf` et `.acf`.
- Lecture locale Steam plus tolerante : un fichier Steam invalide est ignore sans bloquer toute la synchronisation.
- Ajout de tests de regression pour les chemins Windows et les valeurs vides Steam.

## v0.23.1 - 2026-07-20

- Ajout de la lecture locale des bibliotheques Steam via `libraryfolders.vdf`.
- Ajout du parsing des manifests `appmanifest_*.acf` pour les jeux installes.
- Ajout de la lecture de `localconfig.vdf` pour le dernier lancement et le temps local quand disponible.
- Fusion des donnees Steam Web API avec les donnees locales avant import.
- Synchronisation Steam manuelle possible sans cle API si des manifests locaux sont trouves.
- Ajout des variables `LUDUX_STEAM_ROOT_PATH` et `LUDUX_STEAM_LIBRARY_PATHS`.
- Ajout de tests Vitest pour les fichiers Steam locaux.

## v0.23.0 - 2026-07-20

- Ajout du provider RAWG avec recherche par titre et lecture des details de jeu.
- Ajout de l'enrichissement manuel des fiches locales depuis les parametres.
- Ajout des metadonnees manquantes : description, jaquette, date de sortie, developpeur, editeur et site officiel.
- Conservation des champs deja renseignes manuellement dans Ludux.
- Ajout de liens `ExternalGame` RAWG pour memoriser les correspondances.
- Ajout des tests Vitest du provider RAWG.
- Ajout du guide `docs/providers/RAWG_SETUP.md`.

## v0.22.6 - 2026-07-20

- Alignement de la version `package.json` avec le jalon applicatif pour que les parametres affichent la vraie version.
- Affichage de la version sous la forme `v0.22.6` dans les parametres.
- Suppression de la carte redondante `Page ouverte`.

## v0.22.5 - 2026-07-20

- Passage du preload Electron en build CommonJS `.cjs` pour conserver le sandbox par defaut.
- Ajout du script global `npm run check`.
- Ignorance complete de `userdata/` pour eviter de versionner les donnees locales, exports, sauvegardes et logs.
- Documentation de la strategie Steam publique : cle utilisateur en dev/local, backend Ludux Connect pour une v1 distribuee.

## v0.22.4 - 2026-07-20

- Activation de `sandbox: false` pour permettre au preload ESM `preload.mjs` d'exposer `window.ludux`.
- Ajout du smoke test `npm run smoke:electron-preload`.
- Verification automatisee que `window.ludux.settings.getOverview` est disponible dans Electron.

## v0.22.3 - 2026-07-20

- Correction du chemin du preload Electron pour charger `preload.mjs`.
- Retablissement de l'API `window.ludux` dans la fenetre Electron.
- Correction du faux message indiquant que les providers etaient reserves a Electron alors que la fenetre Electron etait deja ouverte.

## v0.22.2 - 2026-07-20

- Ajout de `@electron/rebuild` pour reconstruire `better-sqlite3` avec l'ABI Electron.
- Ajout du script `npm run rebuild:electron` dans le `postinstall`.
- Ajout du smoke test `npm run smoke:electron-sqlite`.
- Clarification du message affiche quand l'interface est ouverte dans le navigateur au lieu de la fenetre Electron.
- Ajout du diagnostic `NODE_MODULE_VERSION` dans le guide Steam.

## v0.22.1 - 2026-07-20

- Ajout d'un retour visuel directement dans le panneau Steam apres enregistrement ou erreur.
- Ajout d'une validation locale du SteamID64 avant l'appel IPC.
- Ajout d'un libelle de bouton explicite pendant l'enregistrement ou la synchronisation.

## v0.1.0 - 2026-07-16

- Initialisation du depot Ludux.
- Ajout du socle Electron, React, TypeScript et Vite.
- Ajout du schema SQLite/Prisma initial et du client de base locale.
- Ajout des premiers contrats IPC securises entre main process et renderer.
- Ajout de la premiere interface avec accueil, bibliotheque et navigation.

## v0.2.0 - 2026-07-16

- Initialisation de l'application Electron, React, TypeScript et Vite.
- Ajout du schema SQLite/Prisma initial.
- Ajout de l'IPC securise entre renderer et main process.
- Creation de l'accueil Ludux.
- Creation de la page Bibliotheque avec ajout de jeux, recherche, filtres et vues grille/liste.
- Ajout du fonctionnement local-first avec donnees utilisateur ignorees par Git.

## v0.3.0 - 2026-07-16

- Ajout d'une fiche detail pour chaque jeu.
- Ouverture d'un jeu depuis l'accueil ou la bibliotheque.
- Edition du titre, du statut et de la note personnelle.
- Ajout de chroniques personnelles avec emotion.
- Ajout de sessions de jeu avec duree, plateforme et commentaire.
- Affichage d'une timeline "Mon histoire" combinant souvenirs et sessions.

## v0.4.0 - 2026-07-17

- Ajout d'une vraie page Statistiques.
- Calcul local des jeux possedes, jeux termines, temps joue, sessions et chroniques.
- Ajout des repartitions par statut, plateforme, emotion et activite mensuelle.
- Exposition des statistiques via le service library, IPC Electron et preload securise.

## v0.5.0 - 2026-07-18

- Remplacement du placeholder Chroniques par un journal consultable.
- Ajout d'une liste transversale des souvenirs, triee par date.
- Ajout de filtres par jeu, emotion et favoris, avec recherche textuelle.
- Ajout d'un panneau de lecture et d'un raccourci vers la fiche du jeu associe.
- Exposition des chroniques via le service library, IPC Electron et preload securise.

## v0.6.0 - 2026-07-18

- Integration du logo Ludux fourni dans les assets publics.
- Application de la palette sombre #0F1117, cartes #181B23, violet #7C5CFF et bleu #4F7CFF.
- Remplacement des anciens accents verts par l'identite violet/bleu.
- Harmonisation des boutons, etats actifs, formulaires, tuiles et panneaux de contenu.
- Ajout du logo dans la sidebar et l'accueil.

## v0.7.0 - 2026-07-18

- Remplacement du placeholder Musee par une galerie des jeux termines.
- Ajout des statistiques de musee : jeux termines, 100 %, temps expose et piece majeure.
- Ajout de filtres par accomplissement, recherche et tri par recence, temps joue ou titre.
- Ajout d'une vitrine de cartes ouvrant directement la fiche du jeu associe.

## v0.8.0 - 2026-07-18

- Remplacement du placeholder Livre de Vie par une chronologie globale.
- Fusion des sessions de jeu et des chroniques dans une timeline annuelle et mensuelle.
- Ajout des compteurs, de la recherche, du filtre par type de moment et du filtre par jeu.
- Ajout d'un raccourci vers la fiche du jeu associe depuis chaque moment.
- Exposition des evenements via le service library, IPC Electron et preload securise.

## v0.9.0 - 2026-07-18

- Remplacement du placeholder Parametres par un centre de controle local.
- Ajout de l'aperçu de la base SQLite, des dossiers d'exports et de sauvegardes.
- Ajout d'une sauvegarde locale de la base dans `userdata/backups`.
- Ajout d'un export JSON complet de la bibliotheque avec jeux, sessions, chroniques, DLC, succes et collections.
- Ajout de l'ouverture du dossier local depuis l'application.
- Ajout d'une preference persistante pour choisir la page d'ouverture.

## v0.10.0 - 2026-07-18

- Ajout d'une evaluation personnelle detaillee sur les fiches de jeux.
- Ajout de la note sur 10, de l'avis, des points forts, des points faibles et du souvenir principal.
- Ajout du marquage coup de coeur sur une evaluation.
- Persistance des evaluations via le modele Review existant, le service game, l'IPC Electron et le preload securise.
- Remontee automatique de la note dans les cartes de bibliotheque et du musee.

## v0.11.0 - 2026-07-18

- Ajout de l'archivage d'un jeu depuis sa fiche detail.
- Ajout d'une liste des jeux archives dans les parametres.
- Ajout de la restauration d'un jeu archive vers la bibliotheque active.
- Ajout de la suppression definitive d'un jeu archive avec confirmation.
- Exposition des actions via le service game, l'IPC Electron et le preload securise.

## v0.12.0 - 2026-07-18

- Ajout d'une gestion locale simple des DLC depuis les fiches de jeux.
- Ajout de la creation d'un DLC avec nom, date de sortie, possession et completion.
- Ajout des compteurs de DLC, DLC possedes et DLC termines.
- Ajout des actions rapides pour marquer un DLC possede ou termine.
- Ajout de la suppression d'un DLC avec confirmation.
- Exposition des actions via le service game, l'IPC Electron et le preload securise.

## v0.13.0 - 2026-07-18

- Ajout d'une gestion locale manuelle des succes depuis les fiches de jeux.
- Ajout de la creation d'un succes avec nom, description, fournisseur et etat debloque.
- Ajout des compteurs de succes, succes debloques et succes restants.
- Ajout des actions rapides pour marquer un succes debloque ou verrouille.
- Ajout de la suppression d'un succes avec confirmation.
- Exposition des actions via le service game, l'IPC Electron et le preload securise.

## v0.14.0 - 2026-07-18

- Ajout d'une galerie de souvenirs visuels depuis les fiches de jeux.
- Ajout de la creation d'une capture avec chemin local ou URL, description et chronique liee.
- Ajout de compteurs pour les captures, les images liees a une chronique et la derniere capture.
- Ajout d'une conversion des chemins locaux Windows en sources `file:///` affichables dans Electron.
- Ajout de la modification rapide de la chronique liee a une capture.
- Ajout de la suppression d'une capture avec confirmation.
- Exposition des actions via le service game, l'IPC Electron et le preload securise.

## v0.15.0 - 2026-07-20

- Ajout d'un registre local de providers externes : Steam, Xbox, PlayStation, Nintendo, GOG, Epic, IGDB et RAWG.
- Ajout d'un panneau Providers externes dans les parametres.
- Ajout de l'enregistrement local d'un identifiant externe, d'un nom affiche et d'un indice token.
- Ajout d'un etat de synchronisation prepare sans appel reseau obligatoire.
- Ajout de la suppression d'une connexion provider avec confirmation.
- Exposition des actions via le service settings, l'IPC Electron et le preload securise.

## v0.16.0 - 2026-07-20

- Ajout de l'edition inline des chroniques depuis la timeline des fiches de jeux.
- Ajout de la modification du titre, du contenu, de la date, de l'emotion et du favori.
- Ajout de la suppression d'une chronique avec confirmation.
- Conservation des captures liees avec retrait automatique du lien a la chronique supprimee.
- Mise a jour des chroniques dans les hooks renderer et rafraichissement des vues derivees.
- Exposition des actions via le service game, l'IPC Electron et le preload securise.

## v0.17.0 - 2026-07-20

- Ajout d'un bouton d'import de fichier dans les souvenirs visuels.
- Ajout d'un selecteur Electron limite aux fichiers image.
- Copie automatique des captures importees dans `userdata/media/screenshots/<gameId>`.
- Generation d'un nom de fichier stable avec horodatage et nom source nettoye.
- Creation automatique de la capture apres copie, avec description et chronique liee.
- Conservation de l'ajout manuel par chemin ou URL pour les images externes.
- Exposition de l'import via le service game, l'IPC Electron et le preload securise.

## v0.18.0 - 2026-07-20

- Ajout de l'edition inline des sessions depuis la timeline des fiches de jeux.
- Ajout de la modification de la date, de la duree, de la plateforme et du commentaire.
- Ajout de la suppression d'une session avec confirmation.
- Recalcul automatique du temps total apres modification ou suppression.
- Mise a jour des statistiques derivees apres changement de session.
- Exposition des actions via le service game, l'IPC Electron et le preload securise.
- Mise a jour de la vision produit pour une premiere version publique connectee.

## v0.19.0 - 2026-07-20

- Ajout d'une synchronisation Steam manuelle depuis les parametres.
- Ajout d'un adaptateur Steam base sur `IPlayerService/GetOwnedGames`.
- Import automatique des jeux Steam manquants avec jaquette Steam et plateforme Steam.
- Liaison des jeux importes ou reconnus par titre avec leur AppID Steam.
- Synchronisation du temps total Steam dans une session dediee par jeu.
- Ajout du modele `ExternalGame` pour eviter les doublons lors des prochaines synchronisations.
- Ajout des etats de synchronisation `SYNCING`, `SYNCED` et `ERROR`.
- Rafraichissement de la bibliotheque, des statistiques et du Livre de Vie apres synchronisation.

## v0.20.0 - 2026-07-20

- Ajout de `.env.example` avec les variables attendues pour Steam, RAWG, IGDB et les plateformes partenaires.
- Ajout du guide `docs/providers/PLATFORM_REQUIREMENTS.md`.
- Ajout du guide `docs/providers/STEAM_SETUP.md`.
- Ajout des liens officiels utiles pour recuperer les cles, comptes developpeur et acces.
- Ajout du fallback `STEAM_WEB_API_KEY` pour eviter de stocker la cle Steam dans la base locale.
- Mise a jour du panneau Steam pour indiquer l'usage possible de `.env`.

## v0.21.0 - 2026-07-20

- Ajout d'une synchronisation Steam automatique au demarrage de l'application.
- Ajout d'un intervalle automatique configurable via `LUDUX_AUTO_SYNC_INTERVAL_MINUTES`.
- Ajout d'un garde-fou contre les synchronisations automatiques concurrentes.
- Chiffrement des secrets de connexion via `safeStorage` quand Electron le permet.
- Conservation retrocompatible des anciennes cles Steam deja enregistrees.
- Suppression de l'exposition des secrets dans l'overview renderer.
- Ajout d'un indicateur `hasToken` pour afficher l'existence d'une cle sans reveler sa valeur.
- Mise a jour du panneau Steam pour conserver une cle existante si le champ reste vide.

## v0.22.0 - 2026-07-20

- Ajout d'une validation stricte du SteamID64 avant enregistrement et synchronisation.
- Ajout d'une construction d'URL Steam centralisee et testable.
- Ajout d'un timeout reseau pour eviter une synchronisation bloquee.
- Ajout de messages d'erreur explicites pour cle refusee, service absent, limite de requetes et indisponibilite Steam.
- Ajout d'un message dedie lorsqu'aucun jeu Steam n'est recu.
- Ajout d'une aide de saisie SteamID64 dans les parametres.
- Ajout de tests Vitest pour le parsing, l'URL, la validation SteamID64 et les erreurs HTTP.
