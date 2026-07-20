import { useCallback, useEffect, useState } from 'react'
import type {
  AddAvailableDlcInput,
  AvailableDlcListItem,
  CreateAchievementInput,
  CreateChronicleInput,
  CreateDlcInput,
  CreatePlaySessionInput,
  CreateScreenshotInput,
  DeleteAchievementInput,
  DeleteChronicleInput,
  DeleteDlcInput,
  DeletePlaySessionInput,
  DeleteScreenshotInput,
  GameDetail,
  GameListItem,
  ImportScreenshotFileInput,
  UpdateAchievementInput,
  UpdateChronicleInput,
  UpdateDlcInput,
  UpdateGameInput,
  UpdatePlaySessionInput,
  UpdateReviewInput,
  UpdateScreenshotInput,
} from '../../types/game'

function sortChroniclesByDate<T extends { date: string }>(chronicles: T[]) {
  return [...chronicles].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  )
}

function sortSessionsByStart<T extends { start: string }>(sessions: T[]) {
  return [...sessions].sort(
    (left, right) =>
      new Date(right.start).getTime() - new Date(left.start).getTime(),
  )
}

function detailFromListItem(game: GameListItem): GameDetail {
  return {
    ...game,
    description: null,
    personalNote: null,
    developer: null,
    publisher: null,
    releaseDate: null,
    website: null,
    metadataSources: [],
    review: null,
    dlcs: [],
    achievements: [],
    screenshots: [],
    chronicles: [],
    sessions: [],
  }
}

export function useGameDetail(
  gameId: string | null,
  fallbackGame: GameListItem | null,
  onChanged: () => Promise<void>,
) {
  const [detail, setDetail] = useState<GameDetail | null>(null)
  const [availableDlc, setAvailableDlc] = useState<AvailableDlcListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAvailableDlc, setIsLoadingAvailableDlc] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!gameId) {
      setDetail(null)
      return
    }

    const api = window.ludux

    if (!api) {
      setDetail(fallbackGame ? detailFromListItem(fallbackGame) : null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setDetail(await api.games.getById(gameId))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [fallbackGame, gameId])

  const loadAvailableDlc = useCallback(async () => {
    if (!gameId) {
      setAvailableDlc([])
      return
    }

    const api = window.ludux

    if (!api) {
      setAvailableDlc([])
      return
    }

    setIsLoadingAvailableDlc(true)

    try {
      setAvailableDlc(await api.games.listAvailableDlc(gameId))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
      setAvailableDlc([])
    } finally {
      setIsLoadingAvailableDlc(false)
    }
  }, [gameId])

  const updateGame = useCallback(
    async (input: UpdateGameInput) => {
      const api = window.ludux
      setIsSaving(true)
      setError(null)

      try {
        if (!api) {
          setDetail((current) =>
            current
              ? {
                  ...current,
                  title: input.title ?? current.title,
                  status: input.status ?? current.status,
                  description: input.description ?? current.description,
                  personalNote:
                    input.personalNote === undefined
                      ? current.personalNote
                      : input.personalNote,
                  coverUrl: input.coverUrl ?? current.coverUrl,
                  developer: input.developer ?? current.developer,
                  publisher: input.publisher ?? current.publisher,
                  website: input.website ?? current.website,
                }
              : current,
          )
          return
        }

        setDetail(await api.games.update(input))
        await onChanged()
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
      } finally {
        setIsSaving(false)
      }
    },
    [onChanged],
  )

  const createChronicle = useCallback(
    async (input: CreateChronicleInput) => {
      const api = window.ludux
      setIsSaving(true)
      setError(null)

      try {
        if (!api) {
          setDetail((current) =>
            current
              ? {
                  ...current,
                  lastChronicleTitle: input.title,
                  chronicles: [
                    {
                      id: crypto.randomUUID(),
                      title: input.title,
                      content: input.content,
                      date: input.date ?? new Date().toISOString(),
                      emotion: input.emotion ?? null,
                      favorite: false,
                    },
                    ...current.chronicles,
                  ],
                }
              : current,
          )
          return
        }

        setDetail(await api.games.createChronicle(input))
        await onChanged()
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
      } finally {
        setIsSaving(false)
      }
    },
    [onChanged],
  )

  const updateChronicle = useCallback(
    async (input: UpdateChronicleInput) => {
      const api = window.ludux
      setIsSaving(true)
      setError(null)

      try {
        if (!api) {
          setDetail((current) => {
            if (!current) {
              return current
            }

            const chronicles = sortChroniclesByDate(
              current.chronicles.map((chronicle) =>
                chronicle.id === input.id
                  ? {
                      ...chronicle,
                      title: input.title ?? chronicle.title,
                      content: input.content ?? chronicle.content,
                      emotion:
                        input.emotion === undefined
                          ? chronicle.emotion
                          : input.emotion,
                      date: input.date ?? chronicle.date,
                      favorite: input.favorite ?? chronicle.favorite,
                    }
                  : chronicle,
              ),
            )
            const updatedChronicle = chronicles.find(
              (chronicle) => chronicle.id === input.id,
            )

            return {
              ...current,
              lastChronicleTitle: chronicles[0]?.title ?? null,
              chronicles,
              screenshots: current.screenshots.map((screenshot) =>
                screenshot.chronicleId === input.id
                  ? {
                      ...screenshot,
                      chronicleTitle: updatedChronicle?.title ?? screenshot.chronicleTitle,
                    }
                  : screenshot,
              ),
            }
          })
          return
        }

        setDetail(await api.games.updateChronicle(input))
        await onChanged()
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
      } finally {
        setIsSaving(false)
      }
    },
    [onChanged],
  )

  const deleteChronicle = useCallback(
    async (input: DeleteChronicleInput) => {
      const api = window.ludux
      setIsSaving(true)
      setError(null)

      try {
        if (!api) {
          setDetail((current) => {
            if (!current) {
              return current
            }

            const chronicles = current.chronicles.filter(
              (chronicle) => chronicle.id !== input.id,
            )

            return {
              ...current,
              lastChronicleTitle: chronicles[0]?.title ?? null,
              chronicles,
              screenshots: current.screenshots.map((screenshot) =>
                screenshot.chronicleId === input.id
                  ? {
                      ...screenshot,
                      chronicleId: null,
                      chronicleTitle: null,
                    }
                  : screenshot,
              ),
            }
          })
          return
        }

        setDetail(await api.games.deleteChronicle(input))
        await onChanged()
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
      } finally {
        setIsSaving(false)
      }
    },
    [onChanged],
  )

  const updateReview = useCallback(
    async (input: UpdateReviewInput) => {
      const api = window.ludux
      setIsSaving(true)
      setError(null)

      try {
        if (!api) {
          setDetail((current) =>
            current
              ? {
                  ...current,
                  rating: input.rating,
                  review: {
                    id: current.review?.id ?? crypto.randomUUID(),
                    rating: input.rating,
                    content: input.content ?? null,
                    strengths: input.strengths ?? null,
                    weaknesses: input.weaknesses ?? null,
                    mainMemory: input.mainMemory ?? null,
                    favorite: input.favorite ?? current.review?.favorite ?? false,
                    createdAt: current.review?.createdAt ?? new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                }
              : current,
          )
          return
        }

        setDetail(await api.games.updateReview(input))
        await onChanged()
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
      } finally {
        setIsSaving(false)
      }
    },
    [onChanged],
  )

  const createDlc = useCallback(
    async (input: CreateDlcInput) => {
      const api = window.ludux
      setIsSaving(true)
      setError(null)

      try {
        if (!api) {
          setDetail((current) =>
            current
              ? {
                  ...current,
                  dlcs: [
                    ...current.dlcs,
                    {
                      id: crypto.randomUUID(),
                      name: input.name,
                      releaseDate: input.releaseDate ?? null,
                      owned: input.completed ? true : input.owned ?? false,
                      completed: input.completed ?? false,
                    },
                  ],
                }
              : current,
          )
          return
        }

        setDetail(await api.games.createDlc(input))
        await loadAvailableDlc()
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
      } finally {
        setIsSaving(false)
      }
    },
    [loadAvailableDlc],
  )

  const addAvailableDlc = useCallback(
    async (input: AddAvailableDlcInput) => {
      const api = window.ludux
      setIsSaving(true)
      setError(null)

      try {
        if (!api) {
          setError('Ajout de DLC Steam disponible dans la version Electron.')
          return
        }

        setDetail(await api.games.addAvailableDlc(input))
        await loadAvailableDlc()
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
      } finally {
        setIsSaving(false)
      }
    },
    [loadAvailableDlc],
  )

  const updateDlc = useCallback(async (input: UpdateDlcInput) => {
    const api = window.ludux
    setIsSaving(true)
    setError(null)

    try {
      if (!api) {
        setDetail((current) =>
          current
            ? {
                ...current,
                dlcs: current.dlcs.map((dlc) =>
                  dlc.id === input.id
                    ? {
                        ...dlc,
                        name: input.name ?? dlc.name,
                        releaseDate:
                          input.releaseDate === undefined
                            ? dlc.releaseDate
                            : input.releaseDate,
                        owned: input.completed ? true : input.owned ?? dlc.owned,
                        completed:
                          input.owned === false ? false : input.completed ?? dlc.completed,
                      }
                    : dlc,
                ),
              }
            : current,
        )
        return
      }

      setDetail(await api.games.updateDlc(input))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
    } finally {
      setIsSaving(false)
    }
  }, [])

  const deleteDlc = useCallback(async (input: DeleteDlcInput) => {
    const api = window.ludux
    setIsSaving(true)
    setError(null)

    try {
      if (!api) {
        setDetail((current) =>
          current
            ? {
                ...current,
                dlcs: current.dlcs.filter((dlc) => dlc.id !== input.id),
              }
            : current,
        )
        return
      }

      setDetail(await api.games.deleteDlc(input))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
    } finally {
      setIsSaving(false)
    }
  }, [])

  const createAchievement = useCallback(async (input: CreateAchievementInput) => {
    const api = window.ludux
    setIsSaving(true)
    setError(null)

    try {
      if (!api) {
        const unlocked = input.unlocked ?? false

        setDetail((current) =>
          current
            ? {
                ...current,
                achievements: [
                  ...current.achievements,
                  {
                    id: crypto.randomUUID(),
                    name: input.name,
                    description: input.description ?? null,
                    iconUrl: input.iconUrl ?? null,
                    provider: input.provider ?? null,
                    unlocked,
                    unlockDate: unlocked
                      ? input.unlockDate ?? new Date().toISOString()
                      : null,
                  },
                ],
              }
            : current,
        )
        return
      }

      setDetail(await api.games.createAchievement(input))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
    } finally {
      setIsSaving(false)
    }
  }, [])

  const updateAchievement = useCallback(async (input: UpdateAchievementInput) => {
    const api = window.ludux
    setIsSaving(true)
    setError(null)

    try {
      if (!api) {
        setDetail((current) =>
          current
            ? {
                ...current,
                achievements: current.achievements.map((achievement) => {
                  if (achievement.id !== input.id) {
                    return achievement
                  }

                  const unlocked = input.unlocked ?? achievement.unlocked
                  const unlockDate =
                    input.unlocked === false
                      ? null
                      : input.unlockDate === undefined
                        ? achievement.unlockDate
                        : input.unlockDate

                  return {
                    ...achievement,
                    name: input.name ?? achievement.name,
                    description:
                      input.description === undefined
                        ? achievement.description
                        : input.description,
                    iconUrl:
                      input.iconUrl === undefined ? achievement.iconUrl : input.iconUrl,
                    provider:
                      input.provider === undefined ? achievement.provider : input.provider,
                    unlocked,
                    unlockDate:
                      unlocked && !unlockDate ? new Date().toISOString() : unlockDate,
                  }
                }),
              }
            : current,
        )
        return
      }

      setDetail(await api.games.updateAchievement(input))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
    } finally {
      setIsSaving(false)
    }
  }, [])

  const deleteAchievement = useCallback(async (input: DeleteAchievementInput) => {
    const api = window.ludux
    setIsSaving(true)
    setError(null)

    try {
      if (!api) {
        setDetail((current) =>
          current
            ? {
                ...current,
                achievements: current.achievements.filter(
                  (achievement) => achievement.id !== input.id,
                ),
              }
            : current,
        )
        return
      }

      setDetail(await api.games.deleteAchievement(input))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
    } finally {
      setIsSaving(false)
    }
  }, [])

  const createScreenshot = useCallback(async (input: CreateScreenshotInput) => {
    const api = window.ludux
    setIsSaving(true)
    setError(null)

    try {
      if (!api) {
        setDetail((current) => {
          const linkedChronicle = current?.chronicles.find(
            (chronicle) => chronicle.id === input.chronicleId,
          )

          return current
            ? {
                ...current,
                screenshots: [
                  {
                    id: crypto.randomUUID(),
                    path: input.path,
                    description: input.description ?? null,
                    createdAt: new Date().toISOString(),
                    chronicleId: linkedChronicle?.id ?? null,
                    chronicleTitle: linkedChronicle?.title ?? null,
                  },
                  ...current.screenshots,
                ],
              }
            : current
        })
        return
      }

      setDetail(await api.games.createScreenshot(input))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
    } finally {
      setIsSaving(false)
    }
  }, [])

  const importScreenshotFile = useCallback(async (input: ImportScreenshotFileInput) => {
    const api = window.ludux
    setIsSaving(true)
    setError(null)

    try {
      if (!api) {
        setError('Import de fichier disponible dans la version Electron.')
        return
      }

      setDetail(await api.games.importScreenshotFile(input))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
    } finally {
      setIsSaving(false)
    }
  }, [])

  const updateScreenshot = useCallback(async (input: UpdateScreenshotInput) => {
    const api = window.ludux
    setIsSaving(true)
    setError(null)

    try {
      if (!api) {
        setDetail((current) =>
          current
            ? {
                ...current,
                screenshots: current.screenshots.map((screenshot) => {
                  if (screenshot.id !== input.id) {
                    return screenshot
                  }

                  const linkedChronicle =
                    input.chronicleId && input.chronicleId.length > 0
                      ? current.chronicles.find(
                          (chronicle) => chronicle.id === input.chronicleId,
                        )
                      : null

                  return {
                    ...screenshot,
                    path: input.path ?? screenshot.path,
                    description:
                      input.description === undefined
                        ? screenshot.description
                        : input.description,
                    chronicleId:
                      input.chronicleId === undefined
                        ? screenshot.chronicleId
                        : linkedChronicle?.id ?? null,
                    chronicleTitle:
                      input.chronicleId === undefined
                        ? screenshot.chronicleTitle
                        : linkedChronicle?.title ?? null,
                  }
                }),
              }
            : current,
        )
        return
      }

      setDetail(await api.games.updateScreenshot(input))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
    } finally {
      setIsSaving(false)
    }
  }, [])

  const deleteScreenshot = useCallback(async (input: DeleteScreenshotInput) => {
    const api = window.ludux
    setIsSaving(true)
    setError(null)

    try {
      if (!api) {
        setDetail((current) =>
          current
            ? {
                ...current,
                screenshots: current.screenshots.filter(
                  (screenshot) => screenshot.id !== input.id,
                ),
              }
            : current,
        )
        return
      }

      setDetail(await api.games.deleteScreenshot(input))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
    } finally {
      setIsSaving(false)
    }
  }, [])

  const createPlaySession = useCallback(
    async (input: CreatePlaySessionInput) => {
      const api = window.ludux
      setIsSaving(true)
      setError(null)

      try {
        if (!api) {
          setDetail((current) =>
            current
              ? {
                  ...current,
                  totalMinutes: current.totalMinutes + input.durationMinutes,
                  sessions: [
                    {
                      id: crypto.randomUUID(),
                      start: input.start ?? new Date().toISOString(),
                      end: null,
                      durationMinutes: input.durationMinutes,
                      note: input.note ?? null,
                      platformName: input.platformName ?? null,
                    },
                    ...current.sessions,
                  ],
                }
              : current,
          )
          return
        }

        setDetail(await api.games.createPlaySession(input))
        await onChanged()
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
      } finally {
        setIsSaving(false)
      }
    },
    [onChanged],
  )

  const updatePlaySession = useCallback(
    async (input: UpdatePlaySessionInput) => {
      const api = window.ludux
      setIsSaving(true)
      setError(null)

      try {
        if (!api) {
          setDetail((current) => {
            const sessionToUpdate = current?.sessions.find(
              (session) => session.id === input.id,
            )

            if (!current || !sessionToUpdate) {
              return current
            }

            const nextDuration =
              input.durationMinutes ?? sessionToUpdate.durationMinutes

            return {
              ...current,
              totalMinutes:
                current.totalMinutes - sessionToUpdate.durationMinutes + nextDuration,
              sessions: sortSessionsByStart(
                current.sessions.map((session) =>
                  session.id === input.id
                    ? {
                        ...session,
                        start: input.start ?? session.start,
                        durationMinutes: nextDuration,
                        note:
                          input.note === undefined ? session.note : input.note,
                        platformName:
                          input.platformName === undefined
                            ? session.platformName
                            : input.platformName,
                      }
                    : session,
                ),
              ),
            }
          })
          return
        }

        setDetail(await api.games.updatePlaySession(input))
        await onChanged()
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
      } finally {
        setIsSaving(false)
      }
    },
    [onChanged],
  )

  const deletePlaySession = useCallback(
    async (input: DeletePlaySessionInput) => {
      const api = window.ludux
      setIsSaving(true)
      setError(null)

      try {
        if (!api) {
          setDetail((current) => {
            const sessionToDelete = current?.sessions.find(
              (session) => session.id === input.id,
            )

            if (!current) {
              return current
            }

            return {
              ...current,
              totalMinutes:
                current.totalMinutes - (sessionToDelete?.durationMinutes ?? 0),
              sessions: current.sessions.filter(
                (session) => session.id !== input.id,
              ),
            }
          })
          return
        }

        setDetail(await api.games.deletePlaySession(input))
        await onChanged()
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
      } finally {
        setIsSaving(false)
      }
    },
    [onChanged],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    void loadAvailableDlc()
  }, [loadAvailableDlc])

  return {
    availableDlc,
    detail,
    error,
    isLoading,
    isLoadingAvailableDlc,
    isSaving,
    refresh,
    loadAvailableDlc,
    updateGame,
    updateReview,
    createDlc,
    addAvailableDlc,
    updateDlc,
    deleteDlc,
    createAchievement,
    updateAchievement,
    deleteAchievement,
    createScreenshot,
    importScreenshotFile,
    updateScreenshot,
    deleteScreenshot,
    createChronicle,
    updateChronicle,
    deleteChronicle,
    createPlaySession,
    updatePlaySession,
    deletePlaySession,
  }
}
