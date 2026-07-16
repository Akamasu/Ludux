# Ludux

Ludux est une application desktop local-first pour conserver la memoire d'une vie de joueur.

Ce dossier contient le premier socle applicatif issu des specifications Markdown du dossier parent.

## Stack

- Electron
- React
- TypeScript strict
- Vite / electron-vite
- Tailwind CSS
- SQLite
- Prisma 7

## Demarrage

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Le mode dev lance le renderer Vite sur `http://localhost:5173` et ouvre l'application Electron.

## Commandes

```bash
npm run typecheck
npm run lint
npm run build
```

## Structure

- `src/main` : processus principal Electron, preload et IPC.
- `src/renderer` : interface React.
- `src/services` : logique metier.
- `src/database` : client Prisma.
- `src/types` : contrats partages entre Electron et React.
- `prisma` : schema et migrations SQLite.
- `userdata` : donnees locales utilisateur.
