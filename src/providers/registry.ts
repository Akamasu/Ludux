import type { ExternalProviderDefinition } from '../types/settings'

export const EXTERNAL_PROVIDER_DEFINITIONS: ExternalProviderDefinition[] = [
  {
    provider: 'STEAM',
    label: 'Steam',
    description: 'Bibliotheque PC, temps de jeu, succes et listes publiques.',
    capabilities: ['Bibliotheque', 'Temps de jeu', 'Succes'],
  },
  {
    provider: 'XBOX',
    label: 'Xbox',
    description: 'Profil Xbox, succes et activite console ou PC.',
    capabilities: ['Profil', 'Succes', 'Activite'],
  },
  {
    provider: 'PLAYSTATION',
    label: 'PlayStation',
    description: 'Profil PSN, trophees et progression console.',
    capabilities: ['Profil', 'Trophees', 'Progression'],
  },
  {
    provider: 'NINTENDO',
    label: 'Nintendo',
    description: 'Compte Nintendo et parcours Switch renseigne manuellement.',
    capabilities: ['Profil', 'Bibliotheque', 'Manuel'],
  },
  {
    provider: 'GOG',
    label: 'GOG',
    description: 'Bibliotheque PC sans DRM et temps de jeu GOG Galaxy.',
    capabilities: ['Bibliotheque', 'Temps de jeu'],
  },
  {
    provider: 'EPIC',
    label: 'Epic Games',
    description: 'Bibliotheque Epic et jeux PC possedes.',
    capabilities: ['Bibliotheque', 'PC'],
  },
  {
    provider: 'IGDB',
    label: 'IGDB',
    description: 'Metadonnees publiques : jaquettes, dates, studios et genres.',
    capabilities: ['Metadonnees', 'Jaquettes'],
  },
  {
    provider: 'RAWG',
    label: 'RAWG',
    description: 'Metadonnees publiques pour enrichir les fiches locales.',
    capabilities: ['Metadonnees', 'Jaquettes', 'Dates'],
  },
]
