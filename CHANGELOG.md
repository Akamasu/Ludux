# Changelog

Toutes les versions notables de Ludux seront documentées ici.

Le projet suit des versions de développement simples :

- `v0.1.x` : fondation technique.
- `v0.2.x` : bibliothèque personnelle.
- `v0.3.x` : chroniques, sessions et souvenirs.
- `v0.4.x` : statistiques et lecture du parcours.
- `v0.5.x` : journal transversal des chroniques.
- `v0.6.x` : identité visuelle et logo.
- `v0.7.x` : musée des jeux accomplis.
- `v0.8.x` : livre de vie et chronologie globale.
- `v0.9.x` : paramètres, sauvegardes et exports locaux.
- `v0.10.x` : notes et évaluations détaillées.
- `v0.11.x` : archivage, restauration et suppression de jeux.
- `v0.12.x` : gestion locale des DLC.
- `v0.13.x` : gestion locale des succès.
- `v0.14.x` : captures d'écran et souvenirs visuels.
- `v0.15.x` : providers externes préparés.
- `v0.16.x` : édition et suppression des chroniques.
- `v0.17.x` : import et copie locale des captures.
- `v0.18.x` : édition et suppression des sessions de jeu.
- `v0.19.x` : synchronisation Steam manuelle.
- `v0.20.x` : fichiers de configuration et guides plateformes.
- `v0.21.x` : synchronisation automatique et secrets masques.
- `v0.22.x` : stabilisation du connecteur Steam.
- `v0.23.x` : enrichissement des métadonnées via RAWG.
- `v0.24.x` : expérience immersive, navigation animée et habillage bibliothèque.
- `v0.25.x` : stockage Windows, migrations sécurisées et installateur public.
- `v0.26.x` : première ouverture guidée et interface simplifiée pour les joueurs.

## v0.26.0 - 2026-07-26

- Ajout d'un écran de première ouverture séparé de l'interface principale.
- Détection automatique de Steam, Epic Games et GOG avec chemins consultables à la demande.
- Résumé simple des connexions Steam, Epic Games, GOG, RAWG et IGDB avec les états `Prêt` ou `À configurer`.
- Accès direct aux connexions ou à l'application après la détection.
- Possibilité de relancer l'écran de détection depuis les préférences.
- Simplification des paramètres autour des connexions, de la page d'ouverture et des sauvegardes.
- Regroupement du cache, des chemins locaux et de l'historique de synchronisation dans des outils avancés repliés.
- Suppression des plateformes non prises en charge et des champs inutiles dans la vue normale.
- Epic Games et GOG utilisent désormais une action locale simple sans faux formulaire de compte.

## v0.25.1 - 2026-07-26

- La bibliothèque classe maintenant les jeux de `A` à `Z` avec un tri français naturel et stable.
- GOG lit la bibliothèque possédée depuis la base locale Galaxy en mode protégé.
- Détection complémentaire des installations GOG dans le registre Windows et les fichiers `goggame-*.info`.
- Import des jaquettes, temps de jeu et dernières activités GOG disponibles sans inclure les DLC comme jeux séparés.
- Fusion des différentes sources GOG et des jeux Ludux existants pour limiter les doublons.
- Ajout de tests unitaires et d'un test Electron natif pour la lecture de `galaxy-2.0.db`.
- Les paramètres parlent désormais de sources locales afin de refléter les fichiers, bases et registres détectés.

## v0.25.0 - 2026-07-26

- Ajout d'un installateur Windows x64 avec l'identité, le logo et les raccourcis de Ludux.
- Déplacement des données locales dans le profil Windows afin que les installations et mises à jour ne touchent plus à la bibliothèque.
- Migration automatique de l'ancien dossier `userdata` avec sauvegarde préalable et conservation des fichiers d'origine.
- Exécution des migrations SQLite embarquées au démarrage avec sauvegarde de la base avant toute évolution du schéma.
- Ajout d'un test Electron dédié aux migrations et aux sauvegardes.
- Allègement du paquet en retirant les dépendances d'interface déjà compilées et les langues Electron inutilisées.
- Correction du titre de fenêtre et des chemins du logo dans l'application installée.

## v0.24.40 - 2026-07-26

- Les anciennes références vers des jaquettes absentes du cache retournent maintenant une réponse locale propre.
- Suppression des erreurs Electron répétées `ERR_FILE_NOT_FOUND` pendant l'affichage des images de secours.

## v0.24.39 - 2026-07-26

- Ajout d'un assistant de première ouverture avec détection locale et accès direct aux connexions utiles.
- Les pages Chroniques, Livre de Vie, Statistiques et Paramètres chargent maintenant leurs données uniquement lorsqu'elles sont ouvertes.
- La synchronisation automatique respecte un délai de fraîcheur et ne relance plus les sources déjà mises à jour récemment.
- Chargement différé des jaquettes et rendu progressif des grandes bibliothèques pour réduire les ralentissements pendant le défilement.
- Les clés RAWG et IGDB présentes dans `.env` sont reconnues comme des connexions prêtes sans exposer leurs secrets.

## v0.24.38 - 2026-07-26

- Ajout du bouton `Synchroniser ce jeu` sur les fiches pour relancer uniquement les sources utiles à un jeu précis.
- La synchronisation ciblée peut enrichir la fiche avec Steam, RAWG et IGDB sans relancer toute la file.
- Nettoyage de messages visibles pour remplacer les termes techniques `provider` par des libellés orientés utilisateur.
- Correction de petits libellés d'interface dans les paramètres.

## v0.24.37 - 2026-07-23

- Le vidage du cache restaure maintenant les jaquettes distantes connues avant de supprimer les fichiers locaux.
- Les fiches de jeu ne restent plus bloquées sur des URLs `ludux-cache://` supprimées.
- Ajout de tests pour la lecture des snapshots de cache et la détection des jaquettes locales.

## v0.24.36 - 2026-07-23

- Ajout d'un panneau `Cache d'affichage` dans les paramètres.
- Affichage du poids du cache, de sa limite, des jaquettes et des métadonnées stockées localement.
- Ajout d'une action pour vider le cache sans toucher à la base SQLite ni aux dossiers de jeux.
- Exposition de l'aperçu du cache dans l'API de paramètres et rafraîchissement automatique après nettoyage.

## v0.24.35 - 2026-07-23

- Ajout d'un cache local léger pour les jaquettes et instantanés de métadonnées synchronisés.
- Les synchronisations Steam, Epic Games, RAWG et IGDB privilégient désormais les jaquettes locales quand elles sont disponibles.
- Ajout du protocole interne `ludux-cache://` pour afficher ces médias locaux proprement dans Electron.
- Le cache reste borné : limite par image, plafond global et nettoyage automatique des anciens fichiers.

## v0.24.34 - 2026-07-23

- Ajout d'un panneau `Configuration rapide` dans les paramètres.
- Affichage simple des plateformes PC détectées, connexions enregistrées et sources prêtes à synchroniser.
- Détection Epic élargie aux dossiers de bibliothèque configurés ou standards.
- Détection GOG élargie aux bibliothèques standards sur les lecteurs Windows.
- Remplacement de plusieurs libellés techniques `providers` par des textes orientés utilisateur.

## v0.24.33 - 2026-07-23

- Affichage des sources de plateformes masquées dans la zone `Gérer` des fiches de jeu.
- Ajout d'une action `Réactiver` pour restaurer une source retirée par erreur.
- Le détail de jeu remonte désormais les sources connectées et les sources masquées séparément.
- Ajout du flux IPC/preload et d'un test pour verrouiller les sources masquées côté interface.

## v0.24.32 - 2026-07-23

- Ajout d'une mémoire locale des liens de plateformes retirés depuis une fiche de jeu.
- Les synchronisations Steam, Epic, GOG, RAWG et IGDB ne recréent plus automatiquement un lien retiré pour le même jeu.
- Les messages de synchronisation indiquent quand des liens sont volontairement ignorés.
- Ajout d'une migration Prisma dédiée et de tests pour verrouiller cette logique.

## v0.24.31 - 2026-07-23

- Simplification de l'affichage des plateformes connectées sur les fiches de jeu.
- Remplacement du panneau technique par un résumé discret et une zone `Gérer` repliée.
- Libellés plus orientés utilisateur pour ouvrir ou retirer une source liée.

## v0.24.30 - 2026-07-23

- Ajout d'un panneau de liens providers sur les fiches de jeu.
- Détection des correspondances source douteuses avec badge `À vérifier`.
- Ajout d'une action `Délier` pour retirer un mauvais lien provider sans supprimer les données locales du jeu.
- Affichage des identifiants externes, titres source et dates de synchronisation.

## v0.24.29 - 2026-07-22

- Correction des événements de synchronisation affichés comme encore en cours après réussite.
- Les anciennes lignes `En cours` sont masquées dès qu'un état final plus récent existe pour le même provider.
- Les futures synchronisations mettent à jour leur événement de départ au lieu d'ajouter une ligne obsolète.

## v0.24.28 - 2026-07-22

- Ajout d'un panneau d'activité de synchronisation dans les paramètres.
- Affichage de la file active Steam, Epic, GOG, RAWG et IGDB dans l'ordre réel d'exécution.
- Affichage des derniers événements de synchronisation enregistrés avec statut, message et heure.

## v0.24.27 - 2026-07-22

- Cleanup général du code et des docs après les intégrations Steam, Epic, GOG, RAWG et IGDB.
- Suppression d'un ancien composant placeholder inutilisé.
- Réduction des exports internes inutiles et correction de textes visibles sans accents.
- Mise à jour des guides providers pour refléter les synchronisations réellement actives.

## v0.24.26 - 2026-07-22

- Synchronisation globale réordonnée : Steam, Epic et GOG importent les jeux avant RAWG et IGDB.
- Les nouveaux jeux locaux peuvent être enrichis dès le même `Synchroniser tout`.
- Ajout de tests pour verrouiller l'ordre des providers et éviter les doublons dans la file de synchronisation.

## v0.24.25 - 2026-07-22

- Protection IGDB contre les correspondances trop éloignées.
- Les enrichissements IGDB sont ignorés quand aucun candidat suffisamment proche n'est trouvé.
- Ajout de tests pour éviter les faux positifs de recherche catalogue.

## v0.24.24 - 2026-07-22

- Validation réelle du setup IGDB avec les identifiants locaux.
- Recherche IGDB plus robuste avec sélection du meilleur candidat parmi plusieurs résultats.
- Correction d'un cas où IGDB pouvait choisir un titre proche mais incorrect.

## v0.24.23 - 2026-07-22

- Ajout du provider IGDB pour enrichir les fiches avec jaquettes, dates, studios, éditeurs et genres.
- Authentification IGDB via le flux Twitch OAuth client credentials.
- Synchronisation IGDB depuis `.env` ou depuis les identifiants enregistrés dans les paramètres.
- Affichage de la source IGDB sur les fiches de jeu enrichies.

## v0.24.22 - 2026-07-22

- Import local GOG depuis les fichiers `goggame-*.info`.
- Création ou liaison automatique des jeux GOG installés dans la bibliothèque Ludux.
- Activation de GOG dans `Synchroniser tout` quand une bibliothèque locale est détectée.
- Mise à jour de l'écran Paramètres pour les providers locaux Epic et GOG.

## v0.24.21 - 2026-07-22

- Import de la bibliothèque Epic depuis le cache local du launcher quand les manifests `.item` sont absents.
- Lecture de `LauncherInstalled.dat` et des apps gérées Epic pour récupérer des titres propres.
- Récupération des jaquettes Epic disponibles dans le cache local.
- Filtrage des DLC, add-ons, packs et outils Unreal/Epic pour éviter de polluer la bibliothèque.

## v0.24.20 - 2026-07-22

- Import local Epic Games depuis les manifests `.item`.
- Création ou liaison automatique des jeux Epic installés dans la bibliothèque Ludux.
- Activation de la synchronisation Epic locale sans clé API quand les manifests sont détectés.
- Préparation de l'intégration Epic/EOS officielle pour une future connexion compte.

## v0.24.19 - 2026-07-22

- Ajout d'un diagnostic des plateformes locales dans les paramètres.
- Détection en lecture seule des chemins Steam, Epic Games et GOG.
- Lecture des manifests Epic `.item` et des fichiers GOG `goggame-*.info` pour préparer les futures synchronisations.
- Affichage des chemins, fichiers détectés et états locaux sans dépendre de la configuration d'une seule machine.
- Ajout de tests dédiés aux détections locales Epic et GOG.

## v0.24.18 - 2026-07-22

- Réduction massive des appels Steam Store grâce au batching des détails d'applications.
- Suppression de la double requête DLC par jeu pendant la synchronisation Steam globale.
- Chargement des DLC disponibles uniquement à l'ouverture du cadre ou via le bouton de rafraîchissement.
- Protection contre les réponses Steam Store `429` avec cooldown, cache local et arrêt des fallbacks agressifs.
- Ajout de tests pour le batching Steam Store et le comportement anti-rafale sur les DLC.

## v0.24.17 - 2026-07-22

- Affichage compact et repliable des DLC disponibles et suivis sur les fiches de jeu.
- Catégorisation simple des DLC par extensions, cosmétiques, packs, médias, objets et autres.
- Ajout des dates d'obtention et de complétion des DLC, modifiables depuis chaque ligne suivie.
- Conservation des dates DLC lors des fusions et synchronisations Steam.

## v0.24.16 - 2026-07-22

- Renommage automatique des DLC Steam restés en fallback `Steam DLC <id>` dès que le catalogue fournit le vrai nom.
- Fusion/masquage des bundles Steam qui doublonnent un DLC principal, par exemple les `Premium Bundle`.
- Réparation des doublons DLC lors du rafraîchissement du catalogue ou de la synchronisation Steam.
- Prise en charge des dates DLC Steam fournies sous forme de timestamp.

## v0.24.15 - 2026-07-22

- Retrait de la vue Armoire ancienne dans la bibliothèque.
- Passage de la vue grille comme affichage par défaut.
- Adaptation des jaquettes aux cartes de jeux avec un ratio plus stable.
- Ajout des jaquettes en fond atténué dans la vue liste.
- Allègement des fiches de jeu avec rendu différé des grands panneaux et chargement progressif des sessions de timeline.

## v0.24.14 - 2026-07-22

- Suppression des rafraîchissements automatiques différés qui faisaient remonter les pages.
- Stabilisation des hooks Chroniques, Livre de Vie et Statistiques pour éviter les refetchs en cascade en mode Electron.
- Décalage de la synchronisation automatique après l'ouverture de la fenêtre pour alléger le chargement initial.
- Réduction des états de chargement inutiles pendant les refreshs de bibliothèque.

## v0.24.13 - 2026-07-22

- Affichage des genres sur les cartes, les lignes et les fiches de jeu.
- Ajout d'un champ `Genres` dans les informations personnelles d'une fiche.
- Protection des corrections manuelles contre les futures synchronisations RAWG.
- Validation IPC des listes de genres envoyées depuis l'interface.

## v0.24.12 - 2026-07-22

- Ajout de genres structurés dans la base locale avec liaison aux jeux.
- Synchronisation des genres RAWG en plus des métadonnées déjà récupérées.
- Utilisation des genres réels dans le rayonnage avant le fallback par titre ou collection.
- Inclusion des genres dans les exports JSON Ludux.

## v0.24.11 - 2026-07-22

- Fusion des catégories de l'armoire en un rayonnage unique regroupant tous les jeux.
- Conservation du code couleur par genre avec une légende intégrée au style Ludux.
- Remplacement du sous-titre Steam par une phrase compatible avec plusieurs plateformes.
- Nettoyage de la barre latérale avec retrait du logo et de la mention `Rayonnage local`.

## v0.24.10 - 2026-07-22

- Adaptation de la longueur des livres de l'armoire selon la taille du titre.
- Titres longs affichés dans des volumes plus larges pour réduire les coupures et améliorer la lecture.
- Conservation d'une colonne pleine largeur sur petite fenêtre pour éviter les débordements.

## v0.24.9 - 2026-07-22

- Inversion de l'ordre des rayons de l'armoire ancienne pour parcourir les catégories dans l'autre sens.
- Remplacement des dos de livres verticaux par des volumes horizontaux pour rendre les titres plus lisibles.
- Grille de rayons plus souple afin de mieux tenir dans les fenêtres étroites ou larges.

## v0.24.8 - 2026-07-22

- Découverte automatique du dossier Steam via le registre Windows, les variables système et les chemins standards.
- Conservation des chemins Steam `.env` comme overrides optionnels, plus comme configuration obligatoire.
- Élargissement du conteneur principal pour éviter les grands vides latéraux sur les fenêtres larges.
- Barre de filtres de la bibliothèque plus souple, avec sélecteur de vue moins comprimé.
- Rafraîchissement de la bibliothèque, du Livre de Vie et des statistiques après `Synchroniser tout` et après la synchronisation automatique au démarrage.
- Clarification des résumés Steam dans le Livre de Vie sous le titre `Temps Steam synchronisé`.

## v0.24.7 - 2026-07-20

- Lecture des collections Steam modernes depuis `cloud-storage-namespace-1.json`.
- Synchronisation des collections visibles dans Steam comme rayons de l'armoire ancienne.
- Nettoyage des espaces de tri Steam dans les noms de collections et exclusion de la collection `Masqués`.
- Remplacement des anciennes liaisons de collections Steam synchronisées quand un jeu change de rayon.

## v0.24.6 - 2026-07-20

- Synchronisation des catégories Steam locales depuis les fichiers de configuration Steam.
- Tri de l'armoire ancienne par catégories Steam quand elles existent, avec fallback par genre pour les jeux non classés.
- Remplacement du libellé `Feuillet` par le nombre de jeux affichés sur la page et le total filtré.

## v0.24.5 - 2026-07-20

- Ajout d'une vue `Armoire ancienne` dans la bibliothèque, activée par défaut.
- Regroupement visuel des jeux en rayons thématiques avec livres verticaux et couleurs par genre.
- Ajout d'une pagination animée entre les feuillets de rayons.
- Conservation des vues grille et liste existantes via le sélecteur d'affichage.
- Ajustements responsive pour garder l'armoire lisible en fenêtre compacte.
- Nettoyage de libellés français visibles dans la bibliothèque, le musée, les statistiques et les archives.

## v0.24.4 - 2026-07-20

- Ajout du bouton `Synchroniser tout` pour lancer tous les providers configurés en une action.
- Synchronisation automatique des providers configurés au lancement de Ludux.
- Préférence donnée aux descriptions et métadonnées françaises quand Steam Store les fournit.
- Correction du catalogue DLC Steam : Ludux utilise désormais l'endpoint `dlcforapp` avant le fallback `appdetails`, ce qui évite le refus `403` rencontré sur certains jeux.
- Passe de nettoyage sur les libellés et messages français affichés dans l'application.

## v0.24.3 - 2026-07-20

- Ajout d'une liste de DLC disponibles depuis Steam Store directement dans les fiches de jeu.
- Ajout manuel en un clic des DLC Steam détectés, marqués comme possédés dans Ludux.
- Synchronisation DLC Steam plus robuste : les erreurs partielles de Steam Store ne vident plus toute la détection.
- Requêtes Steam Store localisées en français quand les données existent.

## v0.24.2 - 2026-07-20

- Simplification du README pour présenter Ludux avant les détails de développement.
- Ajout de la synchronisation des succès Steam publics via l'API Steam Web.
- Ajout de la détection des DLC déclarés sur Steam Store pour les fiches de jeu.
- Ajout d'identifiants externes sur les DLC et succès synchronisés pour éviter les doublons.
- Ajout d'une limite configurable pour les appels de succès Steam avec `LUDUX_STEAM_ACHIEVEMENT_SYNC_LIMIT`.

## v0.24.1 - 2026-07-20

- Transformation du haut des fiches de jeu en volume d'archive avec couverture, page de lecture et registre.
- Ajout d'un index de volume pour les métadonnées, sessions, chroniques, DLC, succès et captures.
- Habillage des panneaux de fiche en pages d'archive cohérentes avec le thème bibliothèque ancienne.
- Conservation des contrôles existants avec une mise en page plus lisible sur fenêtre compacte.

## v0.24.0 - 2026-07-20

- Passage à une fenêtre Electron sans cadre Windows natif, avec barre de titre Ludux.
- Ajout des contrôles réduire, agrandir/restaurer et fermer dans l'interface.
- Navigation plus fluide avec transition animée entre les pages.
- Sidebar responsive : rayonnage complet sur grand écran, icônes compactes sur fenêtre réduite.
- Première direction visuelle "bibliothèque ancienne" : pages, dos de livres, rayonnage et accents or sobres.
- Réduction de la largeur minimale et adaptation des grands titres, compteurs et cadres sur les tailles compactes.

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
