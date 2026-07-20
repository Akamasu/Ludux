# Vision Produit Ludux

Ce document synthétise le document de conception `LUDUX` fourni le 18 juillet
2026. Il sert de repère produit pour les prochains jalons de développement.

## Essence du Projet

Ludux vient de deux idées :

- `Ludus` : le jeu ;
- `Index` : le catalogue, le classement, la trace.

Ludux doit devenir une mémoire vidéoludique personnelle : une application locale
capable de raconter le parcours d'un joueur au-delà des plateformes séparées.

Les bibliothèques existantes listent les jeux. Ludux doit aussi conserver
l'expérience : progression, temps joué, souvenirs, sessions, notes et
statistiques.

## Principes

1. Les données appartiennent à l'utilisateur.

Les données personnelles doivent rester locales : notes, journal, temps saisi,
captures, souvenirs et historiques.

2. Automatiser ce qui peut l'être.

Les informations publiques pourront être récupérées automatiquement plus tard :
jaquettes, descriptions, dates de sortie, développeurs, DLC et succès.

3. Être extensible.

L'application doit pouvoir accueillir de nouvelles plateformes, de nouveaux
services et de nouvelles fonctionnalités sans casser le socle local.

## Public Ciblé

Ludux s'adresse d'abord aux joueurs casual ou passionnés qui veulent :

- organiser leur collection ;
- suivre leur backlog ;
- garder une trace de leurs aventures ;
- analyser leurs habitudes.

Le projet vise aussi les collectionneurs souhaitant cataloguer leurs jeux
physiques, éditions, versions et supports.

## Fonctionnalités Cœur

### Bibliothèque

- Ajouter un jeu.
- Rechercher un jeu.
- Modifier un jeu.
- Supprimer ou archiver un jeu.
- Filtrer par statut, plateforme ou recherche texte.

### Fiche Jeu

Informations générales visées :

- nom ;
- image ;
- description ;
- genres ;
- développeur ;
- éditeur ;
- date de sortie.

Informations utilisateur visées :

- plateforme jouée ;
- version ;
- temps ;
- statut ;
- note ;
- commentaire ;
- journal.

Statuts :

- À jouer ;
- En cours ;
- Terminé ;
- Terminé à 100 % ;
- Abandonné ;
- En pause.

### Historique Personnel

Chaque session peut être enregistrée pour construire une chronologie :

- date ;
- jeu ;
- durée ;
- événement ;
- note.

### Statistiques

L'utilisateur doit pouvoir répondre à des questions comme :

- Quels jeux ai-je terminés ?
- Combien d'heures ai-je joué durant ma vie ?
- Quel est mon jeu le plus joué ?
- Quel jeu ai-je abandonné ?
- Quel a été mon parcours au fil des années ?

## Objectif Version 1.0

Avant les fonctionnalités plus ambitieuses, Ludux doit permettre de :

- ajouter des jeux ;
- rechercher des jeux ;
- créer une bibliothèque personnelle ;
- ajouter son temps de jeu ;
- noter ses jeux ;
- ajouter des DLC ;
- suivre les succès ;
- tenir un journal ;
- modifier et supprimer les chroniques ;
- modifier et supprimer les sessions de jeu ;
- rattacher des captures d'écran ;
- copier les captures locales dans le dossier Ludux ;
- préparer les comptes externes ;
- connecter au moins une plateforme externe de façon optionnelle ;
- lancer une première synchronisation réseau contrôlée ;
- voir des statistiques simples ;
- éviter les crashs bloquants.

## Fonctionnalités Futures

À reporter après le socle 1.0 :

- synchronisation complète Steam, Xbox, PlayStation, Nintendo ;
- import automatique depuis bibliothèques Steam, dossiers de jeux et émulateurs ;
- profil joueur ;
- réseau social ;
- partage public ;
- application mobile ;
- marketplace ;
- synchronisation console complète.

## Prochains Jalons Logiques

Les prochaines étapes les plus cohérentes avec le document de conception sont :

- Providers : brancher une première intégration réseau optionnelle.
- Bibliothèque : enrichir les fiches avec genres, développeur, éditeur et date de sortie.
- Release : préparer le packaging et les versions installables.
