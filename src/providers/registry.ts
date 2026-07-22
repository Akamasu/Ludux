import type { ExternalProviderDefinition } from '../types/settings'

export const EXTERNAL_PROVIDER_DEFINITIONS: ExternalProviderDefinition[] = [
  {
    provider: 'STEAM',
    label: 'Steam',
    description: 'Bibliothèque PC, temps de jeu, succès et listes publiques.',
    capabilities: ['Bibliothèque', 'Temps de jeu', 'Succès'],
  },
  {
    provider: 'XBOX',
    label: 'Xbox',
    description: 'Profil Xbox, succès et activité console ou PC.',
    capabilities: ['Profil', 'Succès', 'Activité'],
  },
  {
    provider: 'PLAYSTATION',
    label: 'PlayStation',
    description: 'Profil PSN, trophées et progression console.',
    capabilities: ['Profil', 'Trophées', 'Progression'],
  },
  {
    provider: 'NINTENDO',
    label: 'Nintendo',
    description: 'Compte Nintendo et parcours Switch renseigné manuellement.',
    capabilities: ['Profil', 'Bibliothèque', 'Manuel'],
  },
  {
    provider: 'GOG',
    label: 'GOG',
    description: 'Bibliothèque PC sans DRM et temps de jeu GOG Galaxy.',
    capabilities: ['Bibliothèque', 'Temps de jeu'],
  },
  {
    provider: 'EPIC',
    label: 'Epic Games',
    description: 'Manifests locaux Epic et jeux PC installés.',
    capabilities: ['Bibliothèque locale', 'Jeux installés'],
  },
  {
    provider: 'IGDB',
    label: 'IGDB',
    description: 'Métadonnées publiques : jaquettes, dates, studios et genres.',
    capabilities: ['Métadonnées', 'Jaquettes'],
  },
  {
    provider: 'RAWG',
    label: 'RAWG',
    description: 'Métadonnées publiques pour enrichir les fiches locales.',
    capabilities: ['Métadonnées', 'Jaquettes', 'Dates'],
  },
]
