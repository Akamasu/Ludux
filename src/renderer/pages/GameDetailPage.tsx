import {
  Archive,
  ArrowLeft,
  BookOpen,
  BookText,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  ExternalLink,
  FolderOpen,
  ImagePlus,
  Pencil,
  Plus,
  Puzzle,
  RefreshCw,
  Save,
  Star,
  Trash2,
  Trophy,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  EMOTION_LABELS,
  EMOTION_VALUES,
  GAME_STATUS_LABELS,
  GAME_STATUS_VALUES,
  type AchievementListItem,
  type AddAvailableDlcInput,
  type AvailableDlcListItem,
  type ChronicleListItem,
  type CreateAchievementInput,
  type CreateChronicleInput,
  type CreateDlcInput,
  type CreatePlaySessionInput,
  type CreateScreenshotInput,
  type DeleteAchievementInput,
  type DeleteChronicleInput,
  type DeleteDlcInput,
  type DeletePlaySessionInput,
  type DeleteScreenshotInput,
  type DlcListItem,
  type Emotion,
  type GameDetail,
  type GameStatus,
  type ImportScreenshotFileInput,
  type PlaySessionListItem,
  type ScreenshotListItem,
  type UpdateAchievementInput,
  type UpdateChronicleInput,
  type UpdateDlcInput,
  type UpdateGameInput,
  type UpdatePlaySessionInput,
  type UpdateReviewInput,
  type UpdateScreenshotInput,
} from '../../types/game'
import { GameCover } from '../components/library/GameCover'
import { GameGenreChips } from '../components/library/GameGenreChips'
import { Button } from '../components/ui/Button'
import {
  formatGameDescription,
  isGameDescriptionHeading,
} from '../utils/gameDescription'
import { formatDate, formatHours } from '../utils/formatters'

interface GameDetailPageProps {
  detail: GameDetail | null
  availableDlc: AvailableDlcListItem[]
  error: string | null
  isLoading: boolean
  isLoadingAvailableDlc: boolean
  isSaving: boolean
  onBack: () => void
  onAddAvailableDlc: (input: AddAvailableDlcInput) => Promise<void>
  onArchiveGame: (gameId: string) => Promise<void>
  onCreateAchievement: (input: CreateAchievementInput) => Promise<void>
  onCreateChronicle: (input: CreateChronicleInput) => Promise<void>
  onCreateDlc: (input: CreateDlcInput) => Promise<void>
  onCreatePlaySession: (input: CreatePlaySessionInput) => Promise<void>
  onCreateScreenshot: (input: CreateScreenshotInput) => Promise<void>
  onDeleteAchievement: (input: DeleteAchievementInput) => Promise<void>
  onDeleteChronicle: (input: DeleteChronicleInput) => Promise<void>
  onDeleteDlc: (input: DeleteDlcInput) => Promise<void>
  onDeletePlaySession: (input: DeletePlaySessionInput) => Promise<void>
  onDeleteScreenshot: (input: DeleteScreenshotInput) => Promise<void>
  onImportScreenshotFile: (input: ImportScreenshotFileInput) => Promise<void>
  onRefreshAvailableDlc: () => Promise<void>
  onUpdateAchievement: (input: UpdateAchievementInput) => Promise<void>
  onUpdateChronicle: (input: UpdateChronicleInput) => Promise<void>
  onUpdateDlc: (input: UpdateDlcInput) => Promise<void>
  onUpdateGame: (input: UpdateGameInput) => Promise<void>
  onUpdatePlaySession: (input: UpdatePlaySessionInput) => Promise<void>
  onUpdateReview: (input: UpdateReviewInput) => Promise<void>
  onUpdateScreenshot: (input: UpdateScreenshotInput) => Promise<void>
}

const TIMELINE_SESSION_BATCH_SIZE = 30

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function screenshotSource(path: string) {
  const value = path.trim()

  if (/^(https?:|blob:|data:|file:)/i.test(value)) {
    return value
  }

  if (/^[a-z]:[\\/]/i.test(value)) {
    return encodeURI(`file:///${value.replace(/\\/g, '/')}`)
  }

  if (value.startsWith('\\\\')) {
    return encodeURI(`file:${value.replace(/\\/g, '/')}`)
  }

  if (value.startsWith('/')) {
    return encodeURI(`file://${value}`)
  }

  return value
}

function externalHref(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function websiteLabel(value: string) {
  try {
    return new URL(externalHref(value)).hostname.replace(/^www\./, '')
  } catch {
    return 'Site officiel'
  }
}

function normalizeGenreValues(genres: string[]) {
  return Array.from(
    new Set(
      genres
        .map((genre) => genre.trim().replace(/\s+/g, ' '))
        .filter((genre) => genre.length > 0),
    ),
  ).sort((left, right) => left.localeCompare(right, 'fr-FR'))
}

function parseGenreText(value: string) {
  return normalizeGenreValues(value.split(/[,;\n]/))
}

function genreSignature(genres: string[]) {
  return normalizeGenreValues(genres)
    .map((genre) => genre.toLocaleLowerCase('fr-FR'))
    .join('|')
}

function GameDescription({ description }: { description: string | null }) {
  const blocks = formatGameDescription(description)

  if (blocks.length === 0) {
    return (
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500">
        Aucune description catalogue pour le moment.
      </p>
    )
  }

  return (
    <div className="mt-3 max-w-3xl space-y-3 text-sm leading-6 text-zinc-400">
      {blocks.map((block, index) =>
        isGameDescriptionHeading(block) ? (
          <p
            key={`${block}-${index}`}
            className="pt-1 text-xs font-semibold uppercase text-[#A797FF]"
          >
            {block.replace(/:$/, '')}
          </p>
        ) : (
          <p key={`${block.slice(0, 24)}-${index}`}>{block}</p>
        ),
      )}
    </div>
  )
}

function ArchiveInfoRow({
  label,
  value,
  title,
}: {
  label: string
  value: string
  title?: string
}) {
  return (
    <div className="grid gap-1 border-b border-white/10 py-3 last:border-b-0">
      <dt className="text-xs font-medium uppercase text-zinc-600">{label}</dt>
      <dd className="truncate text-sm font-medium text-zinc-100" title={title ?? value}>
        {value}
      </dd>
    </div>
  )
}

function GameArchiveHero({
  detail,
  isSaving,
  onArchiveGame,
  onBack,
}: {
  detail: GameDetail
  isSaving: boolean
  onArchiveGame: () => void
  onBack: () => void
}) {
  return (
    <header className="game-book-spread overflow-hidden rounded-lg border border-[#C9A646]/20 bg-[#181B23]">
      <div className="flex flex-col gap-3 border-b border-[#C9A646]/15 bg-[#0F1117]/45 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Button className="w-full sm:w-auto" type="button" variant="secondary" onClick={onBack}>
          <ArrowLeft size={17} aria-hidden="true" />
          Bibliothèque
        </Button>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="inline-flex items-center gap-2 rounded-lg border border-[#C9A646]/20 bg-[#C9A646]/10 px-3 py-2 text-xs font-medium text-[#E9DFA8]">
            <BookOpen size={15} aria-hidden="true" />
            Volume Ludux
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={onArchiveGame}
            disabled={isSaving}
          >
            <Archive size={17} aria-hidden="true" />
            Archiver
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="book-cover-panel p-5">
          <div className="volume-cover relative mx-auto aspect-[3/4] w-full max-w-[230px] overflow-hidden rounded-lg border border-[#C9A646]/25 bg-[#11141B]">
            <GameCover
              title={detail.title}
              coverUrl={detail.coverUrl}
              className="rounded-lg"
              initialClassName="text-6xl text-[#D8D0FF]"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pb-4 pt-12">
              <p className="line-clamp-2 text-sm font-semibold text-white">{detail.title}</p>
              <p className="mt-1 text-xs text-[#E9DFA8]">
                {GAME_STATUS_LABELS[detail.status]}
              </p>
            </div>
          </div>

          <div className="mx-auto mt-4 grid w-full max-w-[230px] grid-cols-2 gap-2 text-xs text-zinc-400">
            <div className="rounded-lg border border-white/10 bg-[#0F1117]/80 px-3 py-2">
              <p className="text-zinc-600">Temps</p>
              <p className="mt-1 font-medium text-white">{formatHours(detail.totalMinutes)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#0F1117]/80 px-3 py-2">
              <p className="text-zinc-600">Note</p>
              <p className="mt-1 font-medium text-white">
                {detail.review ? `${detail.review.rating}/10` : 'Non noté'}
              </p>
            </div>
          </div>
        </aside>

        <div className="archive-page p-5 sm:p-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#7C5CFF]/30 bg-[#7C5CFF]/10 px-3 py-1 text-xs font-medium text-[#D8D0FF]">
                <Bookmark size={14} aria-hidden="true" />
                {GAME_STATUS_LABELS[detail.status]}
              </p>
              <h1 className="mt-4 break-words text-3xl font-semibold text-white sm:text-4xl">
                {detail.title}
              </h1>
              <GameGenreChips className="mt-4" genres={detail.genres} maxVisible={6} />
              <GameDescription description={detail.description} />

              {detail.metadataSources.length > 0 ? (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {detail.metadataSources.map((source) => (
                    <a
                      key={source.provider}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0F1117]/80 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-[#7C5CFF]/50 hover:text-white"
                      title={
                        source.lastSyncedAt
                          ? `Synchronisé le ${formatDate(source.lastSyncedAt)}`
                          : undefined
                      }
                    >
                      <ExternalLink size={13} aria-hidden="true" />
                      Source {source.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            <aside className="chapter-index rounded-lg border border-[#C9A646]/15 bg-[#0F1117]/70 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-[#E9DFA8]">
                    Registre
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Index du volume</p>
                </div>
                <BookText size={18} className="text-[#C9A646]" aria-hidden="true" />
              </div>
              <dl>
                {detail.releaseDate ? (
                  <ArchiveInfoRow label="Sortie" value={formatDate(detail.releaseDate)} />
                ) : null}
                {detail.developer ? (
                  <ArchiveInfoRow
                    label="Développeur"
                    value={detail.developer}
                    title={detail.developer}
                  />
                ) : null}
                {detail.publisher ? (
                  <ArchiveInfoRow
                    label="Éditeur"
                    value={detail.publisher}
                    title={detail.publisher}
                  />
                ) : null}
                {detail.website ? (
                  <div className="grid gap-1 border-b border-white/10 py-3 last:border-b-0">
                    <dt className="text-xs font-medium uppercase text-zinc-600">Site</dt>
                    <dd>
                      <a
                        href={externalHref(detail.website)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-[#C9D6FF] transition hover:text-white"
                        title={detail.website}
                      >
                        <span className="truncate">{websiteLabel(detail.website)}</span>
                        <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    </dd>
                  </div>
                ) : null}
                <ArchiveInfoRow label="Chroniques" value={String(detail.chronicles.length)} />
                <ArchiveInfoRow label="Sessions" value={String(detail.sessions.length)} />
                <ArchiveInfoRow label="DLC" value={String(detail.dlcs.length)} />
                <ArchiveInfoRow label="Succès" value={String(detail.achievements.length)} />
                <ArchiveInfoRow label="Captures" value={String(detail.screenshots.length)} />
                <ArchiveInfoRow
                  label="Note perso"
                  value={detail.personalNote ? 'Redigee' : 'Vide'}
                />
              </dl>
            </aside>
          </div>
        </div>
      </div>
    </header>
  )
}

export function GameDetailPage({
  availableDlc,
  detail,
  error,
  isLoading,
  isLoadingAvailableDlc,
  isSaving,
  onAddAvailableDlc,
  onBack,
  onArchiveGame,
  onCreateAchievement,
  onCreateChronicle,
  onCreateDlc,
  onCreatePlaySession,
  onCreateScreenshot,
  onDeleteAchievement,
  onDeleteChronicle,
  onDeleteDlc,
  onDeletePlaySession,
  onDeleteScreenshot,
  onImportScreenshotFile,
  onRefreshAvailableDlc,
  onUpdateAchievement,
  onUpdateChronicle,
  onUpdateDlc,
  onUpdateGame,
  onUpdatePlaySession,
  onUpdateReview,
  onUpdateScreenshot,
}: GameDetailPageProps) {
  if (isLoading) {
    return (
      <div className="grid flex-1 place-items-center text-sm text-zinc-500">
        Chargement du chapitre...
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="flex flex-1 items-center">
        <section className="rounded-lg border border-dashed border-white/15 bg-[#181B23] p-8">
          <h1 className="text-2xl font-semibold text-white">Jeu introuvable</h1>
          <p className="mt-2 text-sm text-zinc-500">Ce chapitre n'existe plus dans la bibliothèque.</p>
          <Button className="mt-5" type="button" onClick={onBack}>
            <ArrowLeft size={17} aria-hidden="true" />
            Retour
          </Button>
        </section>
      </div>
    )
  }

  const currentDetail = detail

  async function handleArchiveGame() {
    const confirmed = window.confirm(
      `Archiver "${currentDetail.title}" ? Vous pourrez le restaurer depuis les paramètres.`,
    )

    if (confirmed) {
      await onArchiveGame(currentDetail.id)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <GameArchiveHero
        detail={detail}
        isSaving={isSaving}
        onArchiveGame={handleArchiveGame}
        onBack={onBack}
      />

      {error ? (
        <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <GameEditPanel detail={detail} isSaving={isSaving} onUpdateGame={onUpdateGame} />
        <ReviewPanel detail={detail} isSaving={isSaving} onUpdateReview={onUpdateReview} />
      </section>

      <DlcPanel
        availableDlc={availableDlc}
        detail={detail}
        isLoadingAvailableDlc={isLoadingAvailableDlc}
        isSaving={isSaving}
        onAddAvailableDlc={onAddAvailableDlc}
        onCreateDlc={onCreateDlc}
        onDeleteDlc={onDeleteDlc}
        onRefreshAvailableDlc={onRefreshAvailableDlc}
        onUpdateDlc={onUpdateDlc}
      />

      <AchievementPanel
        detail={detail}
        isSaving={isSaving}
        onCreateAchievement={onCreateAchievement}
        onDeleteAchievement={onDeleteAchievement}
        onUpdateAchievement={onUpdateAchievement}
      />

      <ScreenshotPanel
        detail={detail}
        isSaving={isSaving}
        onCreateScreenshot={onCreateScreenshot}
        onDeleteScreenshot={onDeleteScreenshot}
        onImportScreenshotFile={onImportScreenshotFile}
        onUpdateScreenshot={onUpdateScreenshot}
      />

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <SessionForm detail={detail} isSaving={isSaving} onCreatePlaySession={onCreatePlaySession} />
        <ChronicleForm detail={detail} isSaving={isSaving} onCreateChronicle={onCreateChronicle} />
      </section>

      <section>
        <Timeline
          detail={detail}
          isSaving={isSaving}
          onDeleteChronicle={onDeleteChronicle}
          onDeletePlaySession={onDeletePlaySession}
          onUpdateChronicle={onUpdateChronicle}
          onUpdatePlaySession={onUpdatePlaySession}
        />
      </section>
    </div>
  )
}

interface DetailChildProps {
  detail: GameDetail
  isSaving: boolean
}

function GameEditPanel({
  detail,
  isSaving,
  onUpdateGame,
}: DetailChildProps & {
  onUpdateGame: (input: UpdateGameInput) => Promise<void>
}) {
  const [title, setTitle] = useState(detail.title)
  const [status, setStatus] = useState<GameStatus>(detail.status)
  const [genresText, setGenresText] = useState(detail.genres.join(', '))
  const [personalNote, setPersonalNote] = useState(detail.personalNote ?? '')

  useEffect(() => {
    setTitle(detail.title)
    setStatus(detail.status)
    setGenresText(detail.genres.join(', '))
    setPersonalNote(detail.personalNote ?? '')
  }, [detail])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextGenres = parseGenreText(genresText)
    const genresChanged = genreSignature(nextGenres) !== genreSignature(detail.genres)

    await onUpdateGame({
      id: detail.id,
      title,
      status,
      personalNote,
      ...(genresChanged ? { genres: nextGenres } : {}),
    })
  }

  return (
    <form className="archive-panel rounded-lg border border-[#C9A646]/15 bg-[#181B23] p-5" onSubmit={handleSubmit}>
      <h2 className="text-lg font-semibold text-white">Informations personnelles</h2>
      <div className="mt-5 grid gap-3">
        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Titre</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
          />
        </label>
        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Statut</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as GameStatus)}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
          >
            {GAME_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {GAME_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Genres</span>
          <input
            value={genresText}
            onChange={(event) => setGenresText(event.target.value)}
            placeholder="Action, RPG, Aventure..."
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C5CFF]"
          />
          <p className="mt-2 text-xs leading-5 text-zinc-600">
            Séparez les genres par une virgule. Une modification manuelle protège ces genres des futures synchronisations RAWG.
          </p>
          <GameGenreChips className="mt-3" compact genres={parseGenreText(genresText)} maxVisible={6} />
        </label>
        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Note personnelle</span>
          <textarea
            value={personalNote}
            onChange={(event) => setPersonalNote(event.target.value)}
            rows={4}
            className="w-full resize-none rounded-lg border border-white/10 bg-[#0F1117] px-3 py-3 text-sm leading-6 text-white outline-none transition focus:border-[#7C5CFF]"
          />
        </label>
      </div>
      <Button className="mt-4" type="submit" disabled={isSaving || title.trim().length === 0}>
        <Save size={17} aria-hidden="true" />
        Enregistrer
      </Button>
    </form>
  )
}

function ReviewPanel({
  detail,
  isSaving,
  onUpdateReview,
}: DetailChildProps & {
  onUpdateReview: (input: UpdateReviewInput) => Promise<void>
}) {
  const [rating, setRating] = useState(String(detail.review?.rating ?? detail.rating ?? 8))
  const [content, setContent] = useState(detail.review?.content ?? '')
  const [strengths, setStrengths] = useState(detail.review?.strengths ?? '')
  const [weaknesses, setWeaknesses] = useState(detail.review?.weaknesses ?? '')
  const [mainMemory, setMainMemory] = useState(detail.review?.mainMemory ?? '')
  const [favorite, setFavorite] = useState(detail.review?.favorite ?? false)

  useEffect(() => {
    setRating(String(detail.review?.rating ?? detail.rating ?? 8))
    setContent(detail.review?.content ?? '')
    setStrengths(detail.review?.strengths ?? '')
    setWeaknesses(detail.review?.weaknesses ?? '')
    setMainMemory(detail.review?.mainMemory ?? '')
    setFavorite(detail.review?.favorite ?? false)
  }, [detail])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await onUpdateReview({
      gameId: detail.id,
      rating: Number(rating),
      content,
      strengths,
      weaknesses,
      mainMemory,
      favorite,
    })
  }

  return (
    <form className="archive-panel rounded-lg border border-[#C9A646]/15 bg-[#181B23] p-5" onSubmit={handleSubmit}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Évaluation personnelle</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Note, avis et souvenir principal pour garder une vraie trace.
          </p>
        </div>
        <button
          type="button"
          aria-label="Coup de coeur"
          aria-pressed={favorite}
          title="Coup de coeur"
          onClick={() => setFavorite((current) => !current)}
          className={`grid h-11 w-11 place-items-center rounded-lg border transition ${
            favorite
              ? 'border-[#C9A646]/60 bg-[#C9A646]/15 text-[#F1DA7A]'
              : 'border-white/10 bg-[#0F1117] text-zinc-500 hover:text-white'
          }`}
        >
          <Star size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-5 grid gap-4">
        <label>
          <span className="mb-2 flex items-center justify-between gap-4 text-xs font-medium text-zinc-500">
            <span>Note</span>
            <span className="rounded-lg bg-[#7C5CFF]/10 px-3 py-1 text-[#D8D0FF]">
              {rating}/10
            </span>
          </span>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={rating}
            onChange={(event) => setRating(event.target.value)}
            className="w-full accent-[#7C5CFF]"
          />
        </label>

        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Avis</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={4}
            placeholder="Ce que ce jeu vous laisse comme impression..."
            className="w-full resize-none rounded-lg border border-white/10 bg-[#0F1117] px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C5CFF]"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-xs font-medium text-zinc-500">Points forts</span>
            <textarea
              value={strengths}
              onChange={(event) => setStrengths(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-white/10 bg-[#0F1117] px-3 py-3 text-sm leading-6 text-white outline-none transition focus:border-[#7C5CFF]"
            />
          </label>
          <label>
            <span className="mb-2 block text-xs font-medium text-zinc-500">Points faibles</span>
            <textarea
              value={weaknesses}
              onChange={(event) => setWeaknesses(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-white/10 bg-[#0F1117] px-3 py-3 text-sm leading-6 text-white outline-none transition focus:border-[#7C5CFF]"
            />
          </label>
        </div>

        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Souvenir principal</span>
          <input
            value={mainMemory}
            onChange={(event) => setMainMemory(event.target.value)}
            placeholder="Le moment que vous associez au jeu..."
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C5CFF]"
          />
        </label>
      </div>

      <Button className="mt-4" type="submit" disabled={isSaving}>
        <Save size={17} aria-hidden="true" />
        Enregistrer l'avis
      </Button>
    </form>
  )
}

type DlcCategoryId = 'expansion' | 'cosmetic' | 'pack' | 'media' | 'item' | 'other'

interface DlcCategoryDefinition {
  id: DlcCategoryId
  label: string
  description: string
}

const dlcCategoryDefinitions: DlcCategoryDefinition[] = [
  {
    id: 'expansion',
    label: 'Extensions et quêtes',
    description: 'Contenu jouable, chapitres, missions et campagnes.',
  },
  {
    id: 'cosmetic',
    label: 'Cosmétiques',
    description: 'Skins, costumes, apparences, gestes, voix et décorations.',
  },
  {
    id: 'pack',
    label: 'Packs et bonus',
    description: 'Bundles, kits, pass, bonus et éditions spéciales.',
  },
  {
    id: 'media',
    label: 'Bandes-son et artbooks',
    description: 'Musiques, OST, livres numériques et contenus media.',
  },
  {
    id: 'item',
    label: 'Objets',
    description: 'Objets, armes, armures, matériaux et consommables.',
  },
  {
    id: 'other',
    label: 'Autres',
    description: 'DLC non classés automatiquement.',
  },
]

function normalizeDlcCategoryText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('fr-FR')
}

function categorizeDlcName(name: string): DlcCategoryId {
  const value = normalizeDlcCategoryText(name)

  if (
    /\b(expansion|extension|quest|quete|mission|scenario|story|chapter|chapitre|campaign|campagne|iceborne|sunbreak|erdtree)\b/.test(
      value,
    )
  ) {
    return 'expansion'
  }

  if (/\b(soundtrack|ost|music|musique|artbook|art book|wallpaper|bande[- ]son)\b/.test(value)) {
    return 'media'
  }

  if (
    /\b(layered|costume|skin|outfit|hairstyle|coiffure|sticker|gesture|emote|pose|voice|voix|pendant|face paint|makeup|decor|decoration|stamp|avatar|profile|palico|handler)\b/.test(
      value,
    )
  ) {
    return 'cosmetic'
  }

  if (/\b(bundle|pack|kit|deluxe|pass|voucher|bonus|edition)\b/.test(value)) {
    return 'pack'
  }

  if (/\b(item|objet|weapon|arme|armor|armure|material|materiau|charm|consumable|supply)\b/.test(value)) {
    return 'item'
  }

  return 'other'
}

function groupDlcByCategory<TDlc extends { name: string }>(dlcs: TDlc[]) {
  const groups = new Map<DlcCategoryId, TDlc[]>()

  for (const dlc of dlcs) {
    const category = categorizeDlcName(dlc.name)
    groups.set(category, [...(groups.get(category) ?? []), dlc])
  }

  return dlcCategoryDefinitions
    .map((definition) => ({
      definition,
      items: (groups.get(definition.id) ?? []).sort((left, right) =>
        left.name.localeCompare(right.name, 'fr-FR'),
      ),
    }))
    .filter((group) => group.items.length > 0)
}

function createDefaultExpandedDlcCategories(
  groups: ReturnType<typeof groupDlcByCategory>,
  totalCount: number,
) {
  if (totalCount > 8) {
    return new Set<DlcCategoryId>()
  }

  return new Set(groups.map((group) => group.definition.id))
}

function dateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : ''
}

function DlcDisclosure({
  badge,
  children,
  count,
  description,
  isOpen,
  onToggle,
  title,
}: {
  badge?: ReactNode
  children: ReactNode
  count: number
  description: string
  isOpen: boolean
  onToggle: () => void
  title: string
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0F1117]">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 p-3 text-left"
      >
        <span className="flex min-w-0 items-center gap-3">
          <ChevronDown
            size={17}
            aria-hidden="true"
            className={`shrink-0 text-zinc-500 transition ${isOpen ? '' : '-rotate-90'}`}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-white">{title}</span>
            <span className="mt-1 block truncate text-xs text-zinc-500">{description}</span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {badge}
          <span className="rounded-lg bg-white/7 px-2.5 py-1 text-xs font-medium text-zinc-300">
            {count}
          </span>
        </span>
      </button>
      {isOpen ? <div className="border-t border-white/10 p-3">{children}</div> : null}
    </div>
  )
}

function AvailableDlcRow({
  dlc,
  isDisabled,
  onAdd,
}: {
  dlc: AvailableDlcListItem
  isDisabled: boolean
  onAdd: (dlc: AvailableDlcListItem) => void
}) {
  return (
    <article className="grid grid-cols-[56px_1fr] gap-3 rounded-lg border border-white/10 bg-[#121620] p-2.5 sm:grid-cols-[64px_1fr_auto]">
      <div className="h-11 overflow-hidden rounded-md border border-white/10 bg-[#181B23]">
        <GameCover title={dlc.name} coverUrl={dlc.coverUrl} initialClassName="text-xl" />
      </div>
      <div className="min-w-0">
        <h4 className="truncate text-sm font-medium text-white">{dlc.name}</h4>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span>Steam</span>
          {dlc.releaseDate ? <span>{formatDate(dlc.releaseDate)}</span> : null}
        </div>
      </div>
      <Button
        type="button"
        variant={dlc.added ? 'secondary' : 'primary'}
        onClick={() => onAdd(dlc)}
        disabled={isDisabled || dlc.added}
        className="col-span-2 h-9 px-3 sm:col-span-1"
      >
        {dlc.added ? <CheckCircle2 size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
        {dlc.added ? 'Ajouté' : 'Ajouter'}
      </Button>
    </article>
  )
}

function TrackedDlcRow({
  dlc,
  isSaving,
  onDelete,
  onUpdate,
}: {
  dlc: DlcListItem
  isSaving: boolean
  onDelete: (dlc: DlcListItem) => void
  onUpdate: (input: UpdateDlcInput) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(dlc.name)
  const [releaseDate, setReleaseDate] = useState(dateInputValue(dlc.releaseDate))
  const [owned, setOwned] = useState(dlc.owned)
  const [ownedAt, setOwnedAt] = useState(dateInputValue(dlc.ownedAt))
  const [completed, setCompleted] = useState(dlc.completed)
  const [completedAt, setCompletedAt] = useState(dateInputValue(dlc.completedAt))

  useEffect(() => {
    setName(dlc.name)
    setReleaseDate(dateInputValue(dlc.releaseDate))
    setOwned(dlc.owned)
    setOwnedAt(dateInputValue(dlc.ownedAt))
    setCompleted(dlc.completed)
    setCompletedAt(dateInputValue(dlc.completedAt))
  }, [dlc])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextOwned = completed ? true : owned
    await onUpdate({
      gameId: '',
      id: dlc.id,
      name,
      releaseDate: releaseDate || null,
      owned: nextOwned,
      ownedAt: nextOwned ? ownedAt || null : null,
      completed,
      completedAt: completed ? completedAt || null : null,
    })
    setIsEditing(false)
  }

  async function quickUpdate(patch: Pick<UpdateDlcInput, 'owned' | 'ownedAt' | 'completed' | 'completedAt'>) {
    await onUpdate({
      gameId: '',
      id: dlc.id,
      ...patch,
    })
  }

  if (isEditing) {
    return (
      <article className="rounded-lg border border-[#7C5CFF]/35 bg-[#121620] p-3">
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_150px_150px_150px]">
            <label>
              <span className="mb-1.5 block text-xs text-zinc-500">Nom</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-10 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs text-zinc-500">Sortie</span>
              <input
                type="date"
                value={releaseDate}
                onChange={(event) => setReleaseDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs text-zinc-500">Obtention</span>
              <input
                type="date"
                value={ownedAt}
                onChange={(event) => setOwnedAt(event.target.value)}
                disabled={!owned && !completed}
                className="h-10 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition disabled:text-zinc-600 focus:border-[#7C5CFF]"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs text-zinc-500">Terminé le</span>
              <input
                type="date"
                value={completedAt}
                onChange={(event) => setCompletedAt(event.target.value)}
                disabled={!completed}
                className="h-10 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition disabled:text-zinc-600 focus:border-[#7C5CFF]"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={owned}
                onChange={(event) => {
                  setOwned(event.target.checked)

                  if (!event.target.checked) {
                    setOwnedAt('')
                    setCompleted(false)
                    setCompletedAt('')
                  }
                }}
                className="accent-[#7C5CFF]"
              />
              Possédé
            </label>
            <label className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={completed}
                onChange={(event) => {
                  setCompleted(event.target.checked)

                  if (event.target.checked) {
                    setOwned(true)
                  } else {
                    setCompletedAt('')
                  }
                }}
                className="accent-[#7C5CFF]"
              />
              Terminé
            </label>
            <Button type="submit" disabled={isSaving || name.trim().length === 0} className="h-10">
              <Save size={16} aria-hidden="true" />
              Enregistrer
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIsEditing(false)} disabled={isSaving} className="h-10">
              Annuler
            </Button>
          </div>
        </form>
      </article>
    )
  }

  return (
    <article className="grid gap-3 rounded-lg border border-white/10 bg-[#121620] p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <h3 className="truncate text-sm font-medium text-white">{dlc.name}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          {dlc.releaseDate ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/7 px-2.5 py-1 text-zinc-300">
              <CalendarDays size={14} aria-hidden="true" />
              Sortie {formatDate(dlc.releaseDate)}
            </span>
          ) : null}
          {dlc.owned ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F7CFF]/10 px-2.5 py-1 text-[#C9D6FF]">
              <Download size={14} aria-hidden="true" />
              {dlc.ownedAt ? `Obtenu ${formatDate(dlc.ownedAt)}` : 'Possédé'}
            </span>
          ) : null}
          {dlc.completed ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#7C5CFF]/10 px-2.5 py-1 text-[#D8D0FF]">
              <CheckCircle2 size={14} aria-hidden="true" />
              {dlc.completedAt ? `Terminé ${formatDate(dlc.completedAt)}` : 'Terminé'}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-[#0F1117] px-2.5 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={dlc.owned}
            onChange={(event) =>
              quickUpdate({
                owned: event.target.checked,
                ownedAt: event.target.checked ? dlc.ownedAt : null,
                ...(event.target.checked ? {} : { completed: false, completedAt: null }),
              })
            }
            disabled={isSaving}
            className="accent-[#7C5CFF]"
          />
          Possédé
        </label>
        <label className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-[#0F1117] px-2.5 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={dlc.completed}
            onChange={(event) =>
              quickUpdate({
                completed: event.target.checked,
                completedAt: event.target.checked ? dlc.completedAt : null,
                ...(event.target.checked ? { owned: true } : {}),
              })
            }
            disabled={isSaving}
            className="accent-[#7C5CFF]"
          />
          Terminé
        </label>
        <Button type="button" variant="secondary" aria-label={`Modifier ${dlc.name}`} title="Modifier" onClick={() => setIsEditing(true)} disabled={isSaving} className="h-9 px-3">
          <Pencil size={15} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-label={`Supprimer ${dlc.name}`}
          title="Supprimer"
          onClick={() => onDelete(dlc)}
          disabled={isSaving}
          className="h-9 border-rose-400/30 bg-rose-400/10 px-3 text-rose-100 hover:border-rose-300/60 hover:bg-rose-400/15"
        >
          <Trash2 size={15} aria-hidden="true" />
        </Button>
      </div>
    </article>
  )
}

function DlcPanel({
  availableDlc,
  detail,
  isLoadingAvailableDlc,
  isSaving,
  onAddAvailableDlc,
  onCreateDlc,
  onDeleteDlc,
  onRefreshAvailableDlc,
  onUpdateDlc,
}: DetailChildProps & {
  availableDlc: AvailableDlcListItem[]
  isLoadingAvailableDlc: boolean
  onAddAvailableDlc: (input: AddAvailableDlcInput) => Promise<void>
  onCreateDlc: (input: CreateDlcInput) => Promise<void>
  onDeleteDlc: (input: DeleteDlcInput) => Promise<void>
  onRefreshAvailableDlc: () => Promise<void>
  onUpdateDlc: (input: UpdateDlcInput) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [releaseDate, setReleaseDate] = useState('')
  const [owned, setOwned] = useState(false)
  const [ownedAt, setOwnedAt] = useState('')
  const [completed, setCompleted] = useState(false)
  const [completedAt, setCompletedAt] = useState('')
  const [isAvailableOpen, setIsAvailableOpen] = useState(false)
  const [isManualFormOpen, setIsManualFormOpen] = useState(false)
  const [hasRequestedAvailableDlc, setHasRequestedAvailableDlc] = useState(false)
  const trackedDlcGroups = useMemo(() => groupDlcByCategory(detail.dlcs), [detail.dlcs])
  const availableDlcGroups = useMemo(() => groupDlcByCategory(availableDlc), [availableDlc])
  const [expandedTrackedCategories, setExpandedTrackedCategories] = useState(
    () => createDefaultExpandedDlcCategories(trackedDlcGroups, detail.dlcs.length),
  )
  const [expandedAvailableCategories, setExpandedAvailableCategories] = useState(
    () => createDefaultExpandedDlcCategories(availableDlcGroups, availableDlc.length),
  )
  const completedCount = detail.dlcs.filter((dlc) => dlc.completed).length
  const ownedCount = detail.dlcs.filter((dlc) => dlc.owned).length
  const trackedDateCount = detail.dlcs.filter((dlc) => dlc.ownedAt || dlc.completedAt).length
  const availableToAddCount = availableDlc.filter((dlc) => !dlc.added).length

  useEffect(() => {
    setExpandedTrackedCategories(
      createDefaultExpandedDlcCategories(trackedDlcGroups, detail.dlcs.length),
    )
  }, [detail.dlcs.length, detail.id, trackedDlcGroups])

  useEffect(() => {
    setExpandedAvailableCategories(
      createDefaultExpandedDlcCategories(availableDlcGroups, availableDlc.length),
    )
  }, [availableDlc.length, availableDlcGroups])

  useEffect(() => {
    setIsAvailableOpen(false)
    setHasRequestedAvailableDlc(false)
  }, [detail.id])

  function toggleTrackedCategory(categoryId: DlcCategoryId) {
    setExpandedTrackedCategories((current) => {
      const next = new Set(current)

      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }

      return next
    })
  }

  function toggleAvailableCategory(categoryId: DlcCategoryId) {
    setExpandedAvailableCategories((current) => {
      const next = new Set(current)

      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }

      return next
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextOwned = completed ? true : owned
    await onCreateDlc({
      gameId: detail.id,
      name,
      releaseDate: releaseDate || undefined,
      owned: nextOwned,
      ownedAt: nextOwned ? ownedAt || null : null,
      completed,
      completedAt: completed ? completedAt || null : null,
    })

    setName('')
    setReleaseDate('')
    setOwned(false)
    setOwnedAt('')
    setCompleted(false)
    setCompletedAt('')
    setIsManualFormOpen(false)
  }

  async function handleDeleteDlc(dlc: DlcListItem) {
    const confirmed = window.confirm(`Supprimer le DLC "${dlc.name}" ?`)

    if (confirmed) {
      await onDeleteDlc({
        gameId: detail.id,
        id: dlc.id,
      })
    }
  }

  async function handleAddAvailableDlc(dlc: AvailableDlcListItem) {
    await onAddAvailableDlc({
      gameId: detail.id,
      provider: dlc.provider,
      externalId: dlc.externalId,
    })
  }

  async function requestAvailableDlc() {
    setHasRequestedAvailableDlc(true)
    await onRefreshAvailableDlc()
  }

  function toggleAvailableDlcPanel() {
    const nextIsOpen = !isAvailableOpen
    setIsAvailableOpen(nextIsOpen)

    if (nextIsOpen && !hasRequestedAvailableDlc && !isLoadingAvailableDlc) {
      void requestAvailableDlc()
    }
  }

  async function handleUpdateDlc(input: UpdateDlcInput) {
    await onUpdateDlc({
      ...input,
      gameId: detail.id,
    })
  }

  return (
    <section className="archive-panel deferred-panel rounded-lg border border-[#C9A646]/15 bg-[#181B23] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">DLC</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Extensions détectées via Steam, classées par type et suivies manuellement.
          </p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#7C5CFF]/10 text-[#D8D0FF]">
          <Puzzle size={18} aria-hidden="true" />
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-white/10 bg-[#121620] p-3">
          <p className="text-xs text-zinc-500">DLC</p>
          <p className="mt-1 text-xl font-semibold text-white">{detail.dlcs.length}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#121620] p-3">
          <p className="text-xs text-zinc-500">Possédés</p>
          <p className="mt-1 text-xl font-semibold text-white">{ownedCount}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#121620] p-3">
          <p className="text-xs text-zinc-500">Terminés</p>
          <p className="mt-1 text-xl font-semibold text-white">{completedCount}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#121620] p-3">
          <p className="text-xs text-zinc-500">Dates suivies</p>
          <p className="mt-1 text-xl font-semibold text-white">{trackedDateCount}</p>
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-white/10 bg-[#121620]">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <button
            type="button"
            aria-expanded={isAvailableOpen}
            onClick={toggleAvailableDlcPanel}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <ChevronDown
              size={18}
              aria-hidden="true"
              className={`shrink-0 text-zinc-500 transition ${isAvailableOpen ? '' : '-rotate-90'}`}
            />
            <span className="min-w-0">
              <span className="block font-semibold text-white">DLC disponibles</span>
              <span className="mt-1 block truncate text-sm text-zinc-500">
                {availableToAddCount > 0
                  ? `${availableToAddCount} à ajouter sur ${availableDlc.length} détecté(s).`
                  : `${availableDlc.length} détecté(s) depuis Steam Store.`}
              </span>
            </span>
          </button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void requestAvailableDlc()}
            disabled={isSaving || isLoadingAvailableDlc}
            aria-label="Rafraîchir les DLC disponibles"
            title="Rafraîchir"
            className="h-10 px-3"
          >
            <RefreshCw
              size={16}
              aria-hidden="true"
              className={isLoadingAvailableDlc ? 'animate-spin' : undefined}
            />
          </Button>
        </div>

        {isAvailableOpen ? (
          <div className="border-t border-white/10 p-4">
            {isLoadingAvailableDlc ? (
              <p className="rounded-lg border border-dashed border-white/15 bg-[#0F1117] p-4 text-sm text-zinc-500">
                Recherche des DLC Steam...
              </p>
            ) : availableDlc.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/15 bg-[#0F1117] p-4 text-sm text-zinc-500">
                Aucun DLC Steam disponible pour cette fiche.
              </p>
            ) : (
              <div className="grid gap-3">
                {availableDlcGroups.map((group) => (
                  <DlcDisclosure
                    key={group.definition.id}
                    count={group.items.length}
                    description={group.definition.description}
                    isOpen={expandedAvailableCategories.has(group.definition.id)}
                    onToggle={() => toggleAvailableCategory(group.definition.id)}
                    title={group.definition.label}
                  >
                    <div className="grid gap-2 lg:grid-cols-2">
                      {group.items.map((dlc) => (
                        <AvailableDlcRow
                          key={`${dlc.provider}-${dlc.externalId}`}
                          dlc={dlc}
                          isDisabled={isSaving || isLoadingAvailableDlc}
                          onAdd={handleAddAvailableDlc}
                        />
                      ))}
                    </div>
                  </DlcDisclosure>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="mb-5 rounded-lg border border-white/10 bg-[#121620]">
        <button
          type="button"
          aria-expanded={isManualFormOpen}
          onClick={() => setIsManualFormOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-4 p-4 text-left"
        >
          <span className="flex min-w-0 items-center gap-3">
            <ChevronDown
              size={18}
              aria-hidden="true"
              className={`shrink-0 text-zinc-500 transition ${isManualFormOpen ? '' : '-rotate-90'}`}
            />
            <span>
              <span className="block font-semibold text-white">Ajouter un DLC manuel</span>
              <span className="mt-1 block text-sm text-zinc-500">
                Nom, date de sortie, date d'obtention et date de complétion.
              </span>
            </span>
          </span>
          <Plus size={17} className="shrink-0 text-[#D8D0FF]" aria-hidden="true" />
        </button>

        {isManualFormOpen ? (
          <form className="grid gap-3 border-t border-white/10 p-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_150px_150px_150px]">
              <label>
                <span className="sr-only">Nom du DLC</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nom du DLC"
                  className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C5CFF]"
                />
              </label>
              <label>
                <span className="sr-only">Date de sortie du DLC</span>
                <input
                  type="date"
                  value={releaseDate}
                  onChange={(event) => setReleaseDate(event.target.value)}
                  className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
                />
              </label>
              <label>
                <span className="sr-only">Date d'obtention du DLC</span>
                <input
                  type="date"
                  value={ownedAt}
                  onChange={(event) => setOwnedAt(event.target.value)}
                  disabled={!owned && !completed}
                  className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition disabled:text-zinc-600 focus:border-[#7C5CFF]"
                />
              </label>
              <label>
                <span className="sr-only">Date de complétion du DLC</span>
                <input
                  type="date"
                  value={completedAt}
                  onChange={(event) => setCompletedAt(event.target.value)}
                  disabled={!completed}
                  className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition disabled:text-zinc-600 focus:border-[#7C5CFF]"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={owned}
                  onChange={(event) => {
                    setOwned(event.target.checked)

                    if (!event.target.checked) {
                      setOwnedAt('')
                      setCompleted(false)
                      setCompletedAt('')
                    }
                  }}
                  className="accent-[#7C5CFF]"
                />
                Possédé
              </label>
              <label className="flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={completed}
                  onChange={(event) => {
                    setCompleted(event.target.checked)

                    if (event.target.checked) {
                      setOwned(true)
                    } else {
                      setCompletedAt('')
                    }
                  }}
                  className="accent-[#7C5CFF]"
                />
                Terminé
              </label>
              <Button type="submit" disabled={isSaving || name.trim().length === 0}>
                <Download size={17} aria-hidden="true" />
                Ajouter
              </Button>
            </div>
          </form>
        ) : null}
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white">DLC suivis</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Catégories simples, lignes compactes et édition complète par DLC.
            </p>
          </div>
          {detail.dlcs.length > 8 ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setExpandedTrackedCategories(
                    new Set(trackedDlcGroups.map((group) => group.definition.id)),
                  )
                }
                className="h-9 px-3"
              >
                Tout ouvrir
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setExpandedTrackedCategories(new Set())}
                className="h-9 px-3"
              >
                Tout fermer
              </Button>
            </div>
          ) : null}
        </div>

        {detail.dlcs.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-white/15 bg-[#121620] p-4 text-sm text-zinc-500">
            Aucun DLC détecté ou renseigné pour ce jeu.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {trackedDlcGroups.map((group) => {
              const groupOwnedCount = group.items.filter((dlc) => dlc.owned).length
              const groupCompletedCount = group.items.filter((dlc) => dlc.completed).length

              return (
                <DlcDisclosure
                  key={group.definition.id}
                  badge={
                    groupOwnedCount > 0 || groupCompletedCount > 0 ? (
                      <span className="hidden rounded-lg bg-[#7C5CFF]/10 px-2.5 py-1 text-xs text-[#D8D0FF] sm:inline-flex">
                        {groupOwnedCount} possede(s) / {groupCompletedCount} termine(s)
                      </span>
                    ) : null
                  }
                  count={group.items.length}
                  description={group.definition.description}
                  isOpen={expandedTrackedCategories.has(group.definition.id)}
                  onToggle={() => toggleTrackedCategory(group.definition.id)}
                  title={group.definition.label}
                >
                  <div className="grid gap-2">
                    {group.items.map((dlc) => (
                      <TrackedDlcRow
                        key={dlc.id}
                        dlc={dlc}
                        isSaving={isSaving}
                        onDelete={handleDeleteDlc}
                        onUpdate={handleUpdateDlc}
                      />
                    ))}
                  </div>
                </DlcDisclosure>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
function AchievementPanel({
  detail,
  isSaving,
  onCreateAchievement,
  onDeleteAchievement,
  onUpdateAchievement,
}: DetailChildProps & {
  onCreateAchievement: (input: CreateAchievementInput) => Promise<void>
  onDeleteAchievement: (input: DeleteAchievementInput) => Promise<void>
  onUpdateAchievement: (input: UpdateAchievementInput) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [provider, setProvider] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [unlockDate, setUnlockDate] = useState(todayInputValue())
  const unlockedCount = detail.achievements.filter((achievement) => achievement.unlocked).length
  const lockedCount = detail.achievements.length - unlockedCount

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await onCreateAchievement({
      gameId: detail.id,
      name,
      description,
      provider,
      unlocked,
      unlockDate: unlocked ? unlockDate || undefined : undefined,
    })

    setName('')
    setDescription('')
    setProvider('')
    setUnlocked(false)
    setUnlockDate(todayInputValue())
  }

  async function handleToggleAchievement(
    achievement: AchievementListItem,
    nextUnlocked: boolean,
  ) {
    await onUpdateAchievement({
      gameId: detail.id,
      id: achievement.id,
      unlocked: nextUnlocked,
      unlockDate: nextUnlocked
        ? achievement.unlockDate ?? new Date().toISOString()
        : null,
    })
  }

  async function handleDeleteAchievement(achievement: AchievementListItem) {
    const confirmed = window.confirm(`Supprimer le succès "${achievement.name}" ?`)

    if (confirmed) {
      await onDeleteAchievement({
        gameId: detail.id,
        id: achievement.id,
      })
    }
  }

  return (
    <section className="archive-panel deferred-panel rounded-lg border border-[#C9A646]/15 bg-[#181B23] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Succès</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Objectifs Steam synchronisés ou accomplissements suivis manuellement.
          </p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#4F7CFF]/10 text-[#C9D6FF]">
          <Trophy size={18} aria-hidden="true" />
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-[#121620] p-3">
          <p className="text-xs text-zinc-500">Succès</p>
          <p className="mt-1 text-xl font-semibold text-white">{detail.achievements.length}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#121620] p-3">
          <p className="text-xs text-zinc-500">Débloqués</p>
          <p className="mt-1 text-xl font-semibold text-white">{unlockedCount}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#121620] p-3">
          <p className="text-xs text-zinc-500">Restants</p>
          <p className="mt-1 text-xl font-semibold text-white">{lockedCount}</p>
        </div>
      </div>

      <form className="grid gap-3" onSubmit={handleSubmit}>
        <div className="grid gap-3 xl:grid-cols-[1fr_180px_180px]">
          <label>
            <span className="sr-only">Nom du succès</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nom du succès"
              className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C5CFF]"
            />
          </label>
          <label>
            <span className="sr-only">Fournisseur du succès</span>
            <input
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              placeholder="Steam, Xbox..."
              className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C5CFF]"
            />
          </label>
          <label>
            <span className="sr-only">Date de déblocage</span>
            <input
              type="date"
              value={unlockDate}
              onChange={(event) => setUnlockDate(event.target.value)}
              disabled={!unlocked}
              className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition disabled:text-zinc-600 focus:border-[#7C5CFF]"
            />
          </label>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1fr_auto]">
          <label>
            <span className="sr-only">Description du succès</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Condition, souvenir ou note associee..."
              className="w-full resize-none rounded-lg border border-white/10 bg-[#0F1117] px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C5CFF]"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3 xl:items-start">
            <label className="flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={unlocked}
                onChange={(event) => {
                  setUnlocked(event.target.checked)

                  if (event.target.checked && unlockDate.length === 0) {
                    setUnlockDate(todayInputValue())
                  }
                }}
                className="accent-[#7C5CFF]"
              />
              Débloqué
            </label>
            <Button type="submit" disabled={isSaving || name.trim().length === 0}>
              <Trophy size={17} aria-hidden="true" />
              Ajouter
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-5 space-y-3">
        {detail.achievements.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/15 bg-[#121620] p-4 text-sm text-zinc-500">
            Aucun succès synchronisé ou renseigné pour ce jeu.
          </p>
        ) : (
          detail.achievements.map((achievement) => (
            <article
              key={achievement.id}
              className="grid gap-4 rounded-lg border border-white/10 bg-[#121620] p-4 xl:grid-cols-[1fr_auto]"
            >
              <div className="min-w-0">
                <h3 className="truncate font-medium text-white">{achievement.name}</h3>
                {achievement.description ? (
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {achievement.description}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  {achievement.provider ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/7 px-2.5 py-1 text-zinc-300">
                      {achievement.provider}
                    </span>
                  ) : null}
                  {achievement.unlocked ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#7C5CFF]/10 px-2.5 py-1 text-[#D8D0FF]">
                      <CheckCircle2 size={14} aria-hidden="true" />
                      Débloqué
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/7 px-2.5 py-1 text-zinc-400">
                      Verrouille
                    </span>
                  )}
                  {achievement.unlockDate ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F7CFF]/10 px-2.5 py-1 text-[#C9D6FF]">
                      <CalendarDays size={14} aria-hidden="true" />
                      {formatDate(achievement.unlockDate)}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={achievement.unlocked}
                    onChange={(event) =>
                      handleToggleAchievement(achievement, event.target.checked)
                    }
                    disabled={isSaving}
                    className="accent-[#7C5CFF]"
                  />
                  Débloqué
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  aria-label={`Supprimer ${achievement.name}`}
                  title="Supprimer"
                  onClick={() => handleDeleteAchievement(achievement)}
                  disabled={isSaving}
                  className="h-10 border-rose-400/30 bg-rose-400/10 text-rose-100 hover:border-rose-300/60 hover:bg-rose-400/15"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </Button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

function ScreenshotPanel({
  detail,
  isSaving,
  onCreateScreenshot,
  onDeleteScreenshot,
  onImportScreenshotFile,
  onUpdateScreenshot,
}: DetailChildProps & {
  onCreateScreenshot: (input: CreateScreenshotInput) => Promise<void>
  onDeleteScreenshot: (input: DeleteScreenshotInput) => Promise<void>
  onImportScreenshotFile: (input: ImportScreenshotFileInput) => Promise<void>
  onUpdateScreenshot: (input: UpdateScreenshotInput) => Promise<void>
}) {
  const [path, setPath] = useState('')
  const [description, setDescription] = useState('')
  const [chronicleId, setChronicleId] = useState('')
  const linkedCount = detail.screenshots.filter((screenshot) => screenshot.chronicleId).length
  const lastScreenshot = detail.screenshots[0] ?? null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await onCreateScreenshot({
      gameId: detail.id,
      path,
      description,
      chronicleId: chronicleId || undefined,
    })

    setPath('')
    setDescription('')
    setChronicleId('')
  }

  async function handleImportFile() {
    await onImportScreenshotFile({
      gameId: detail.id,
      description,
      chronicleId: chronicleId || undefined,
    })

    setDescription('')
    setChronicleId('')
  }

  async function handleChronicleChange(screenshot: ScreenshotListItem, value: string) {
    await onUpdateScreenshot({
      gameId: detail.id,
      id: screenshot.id,
      chronicleId: value || null,
    })
  }

  async function handleDeleteScreenshot(screenshot: ScreenshotListItem) {
    const confirmed = window.confirm('Supprimer cette capture ?')

    if (confirmed) {
      await onDeleteScreenshot({
        gameId: detail.id,
        id: screenshot.id,
      })
    }
  }

  return (
    <section className="archive-panel deferred-panel rounded-lg border border-[#C9A646]/15 bg-[#181B23] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Souvenirs visuels</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Captures et images locales rattachees a ce jeu.
          </p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#7C5CFF]/10 text-[#D8D0FF]">
          <ImagePlus size={18} aria-hidden="true" />
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-[#121620] p-3">
          <p className="text-xs text-zinc-500">Captures</p>
          <p className="mt-1 text-xl font-semibold text-white">{detail.screenshots.length}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#121620] p-3">
          <p className="text-xs text-zinc-500">Liees</p>
          <p className="mt-1 text-xl font-semibold text-white">{linkedCount}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#121620] p-3">
          <p className="text-xs text-zinc-500">Dernière</p>
          <p className="mt-1 truncate text-xl font-semibold text-white">
            {lastScreenshot ? formatDate(lastScreenshot.createdAt) : '-'}
          </p>
        </div>
      </div>

      <form className="grid gap-3" onSubmit={handleSubmit}>
        <div className="grid gap-3 xl:grid-cols-[1fr_240px_auto_auto]">
          <label>
            <span className="sr-only">Chemin de la capture</span>
            <input
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="Chemin local ou URL de l'image"
              className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C5CFF]"
            />
          </label>
          <label>
            <span className="sr-only">Chronique liée</span>
            <select
              value={chronicleId}
              onChange={(event) => setChronicleId(event.target.value)}
              className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
            >
              <option value="">Aucune chronique</option>
              {detail.chronicles.map((chronicle) => (
                <option key={chronicle.id} value={chronicle.id}>
                  {chronicle.title}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={isSaving || path.trim().length === 0}>
            <ImagePlus size={17} aria-hidden="true" />
            Ajouter lien
          </Button>
          <Button type="button" onClick={handleImportFile} disabled={isSaving}>
            <FolderOpen size={17} aria-hidden="true" />
            Importer
          </Button>
        </div>

        <label>
          <span className="sr-only">Description de la capture</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Pourquoi cette image merite de rester dans votre parcours..."
            className="w-full resize-none rounded-lg border border-white/10 bg-[#0F1117] px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C5CFF]"
          />
        </label>
      </form>

      <div className="mt-5">
        {detail.screenshots.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/15 bg-[#121620] p-4 text-sm text-zinc-500">
            Aucune capture renseignée pour ce jeu.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {detail.screenshots.map((screenshot) => (
              <article
                key={screenshot.id}
                className="overflow-hidden rounded-lg border border-white/10 bg-[#121620]"
              >
                <ScreenshotPreview screenshot={screenshot} />
                <div className="grid gap-3 p-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/7 px-2.5 py-1 text-zinc-300">
                        <CalendarDays size={14} aria-hidden="true" />
                        {formatDate(screenshot.createdAt)}
                      </span>
                      {screenshot.chronicleTitle ? (
                        <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-[#4F7CFF]/10 px-2.5 py-1 text-[#C9D6FF]">
                          <BookText size={14} aria-hidden="true" />
                          <span className="truncate">{screenshot.chronicleTitle}</span>
                        </span>
                      ) : null}
                    </div>
                    {screenshot.description ? (
                      <p className="mt-3 text-sm leading-6 text-zinc-400">
                        {screenshot.description}
                      </p>
                    ) : null}
                    <p className="mt-3 truncate text-xs text-zinc-600" title={screenshot.path}>
                      {screenshot.path}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="min-w-[200px] flex-1">
                      <span className="sr-only">Changer la chronique liée</span>
                      <select
                        value={screenshot.chronicleId ?? ''}
                        onChange={(event) =>
                          handleChronicleChange(screenshot, event.target.value)
                        }
                        disabled={isSaving}
                        className="h-10 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
                      >
                        <option value="">Aucune chronique</option>
                        {detail.chronicles.map((chronicle) => (
                          <option key={chronicle.id} value={chronicle.id}>
                            {chronicle.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button
                      type="button"
                      variant="secondary"
                      aria-label="Supprimer la capture"
                      title="Supprimer"
                      onClick={() => handleDeleteScreenshot(screenshot)}
                      disabled={isSaving}
                      className="h-10 border-rose-400/30 bg-rose-400/10 text-rose-100 hover:border-rose-300/60 hover:bg-rose-400/15"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function ScreenshotPreview({ screenshot }: { screenshot: ScreenshotListItem }) {
  const [hasFailed, setHasFailed] = useState(false)

  useEffect(() => {
    setHasFailed(false)
  }, [screenshot.path])

  if (hasFailed) {
    return (
      <div className="grid aspect-video place-items-center bg-[#0F1117] p-4 text-center text-sm text-zinc-500">
        Image indisponible
      </div>
    )
  }

  return (
    <img
      src={screenshotSource(screenshot.path)}
      alt={screenshot.description ?? screenshot.chronicleTitle ?? 'Capture Ludux'}
      decoding="async"
      draggable={false}
      loading="lazy"
      onError={() => setHasFailed(true)}
      className="aspect-video w-full bg-[#0F1117] object-cover"
    />
  )
}

function splitDurationMinutes(durationMinutes: number) {
  return {
    hours: String(Math.floor(durationMinutes / 60)),
    minutes: String(durationMinutes % 60),
  }
}

function durationFromInputs(hours: string, minutes: string) {
  return Number(hours || 0) * 60 + Number(minutes || 0)
}

function isPositiveDuration(durationMinutes: number) {
  return Number.isFinite(durationMinutes) && durationMinutes > 0
}

function SessionForm({
  detail,
  isSaving,
  onCreatePlaySession,
}: DetailChildProps & {
  onCreatePlaySession: (input: CreatePlaySessionInput) => Promise<void>
}) {
  const [date, setDate] = useState(todayInputValue())
  const [hours, setHours] = useState('1')
  const [minutes, setMinutes] = useState('0')
  const [note, setNote] = useState('')
  const [platformName, setPlatformName] = useState(detail.platforms[0] ?? '')
  const durationMinutes = durationFromInputs(hours, minutes)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await onCreatePlaySession({
      gameId: detail.id,
      start: new Date(date).toISOString(),
      durationMinutes,
      note,
      platformName,
    })

    setHours('1')
    setMinutes('0')
    setNote('')
  }

  return (
    <form className="archive-panel deferred-panel rounded-lg border border-[#C9A646]/15 bg-[#181B23] p-5" onSubmit={handleSubmit}>
      <h2 className="text-lg font-semibold text-white">Ajouter une session</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Date</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
          />
        </label>
        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Plateforme</span>
          <input
            value={platformName}
            onChange={(event) => setPlatformName(event.target.value)}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
          />
        </label>
        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Heures</span>
          <input
            type="number"
            min="0"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
          />
        </label>
        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Minutes</span>
          <input
            type="number"
            min="0"
            max="59"
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
          />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="mb-2 block text-xs font-medium text-zinc-500">Commentaire</span>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Premier passage a Anor Londo..."
          className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C5CFF]"
        />
      </label>
      <Button className="mt-4" type="submit" disabled={isSaving || !isPositiveDuration(durationMinutes)}>
        <Clock3 size={17} aria-hidden="true" />
        Ajouter
      </Button>
    </form>
  )
}

function ChronicleForm({
  detail,
  isSaving,
  onCreateChronicle,
}: DetailChildProps & {
  onCreateChronicle: (input: CreateChronicleInput) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [emotion, setEmotion] = useState<Emotion | ''>('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await onCreateChronicle({
      gameId: detail.id,
      title,
      content,
      emotion: emotion || undefined,
    })

    setTitle('')
    setContent('')
    setEmotion('')
  }

  return (
    <form className="archive-panel deferred-panel rounded-lg border border-[#C9A646]/15 bg-[#181B23] p-5" onSubmit={handleSubmit}>
      <h2 className="text-lg font-semibold text-white">Ecrire une chronique</h2>
      <div className="mt-5 grid gap-3">
        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Titre</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="La victoire finale"
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C5CFF]"
          />
        </label>
        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Emotion</span>
          <select
            value={emotion}
            onChange={(event) => setEmotion(event.target.value as Emotion | '')}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
          >
            <option value="">Aucune emotion</option>
            {EMOTION_VALUES.map((value) => (
              <option key={value} value={value}>
                {EMOTION_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Souvenir</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={6}
            placeholder="Ce que ce moment a represente..."
            className="w-full resize-none rounded-lg border border-white/10 bg-[#0F1117] px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C5CFF]"
          />
        </label>
      </div>
      <Button className="mt-4" type="submit" disabled={isSaving || title.trim().length === 0 || content.trim().length === 0}>
        <BookText size={17} aria-hidden="true" />
        Ajouter
      </Button>
    </form>
  )
}

function ChronicleTimelineArticle({
  chronicle,
  detail,
  isSaving,
  onDeleteChronicle,
  onUpdateChronicle,
}: {
  chronicle: ChronicleListItem
  detail: GameDetail
  isSaving: boolean
  onDeleteChronicle: (input: DeleteChronicleInput) => Promise<void>
  onUpdateChronicle: (input: UpdateChronicleInput) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(chronicle.title)
  const [content, setContent] = useState(chronicle.content)
  const [date, setDate] = useState(chronicle.date.slice(0, 10))
  const [emotion, setEmotion] = useState<Emotion | ''>(chronicle.emotion ?? '')
  const [favorite, setFavorite] = useState(chronicle.favorite)

  useEffect(() => {
    setTitle(chronicle.title)
    setContent(chronicle.content)
    setDate(chronicle.date.slice(0, 10))
    setEmotion(chronicle.emotion ?? '')
    setFavorite(chronicle.favorite)
  }, [chronicle])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await onUpdateChronicle({
      gameId: detail.id,
      id: chronicle.id,
      title,
      content,
      date: new Date(date).toISOString(),
      emotion: emotion || null,
      favorite,
    })

    setIsEditing(false)
  }

  async function handleDeleteChronicle() {
    const confirmed = window.confirm(`Supprimer la chronique "${chronicle.title}" ?`)

    if (confirmed) {
      await onDeleteChronicle({
        gameId: detail.id,
        id: chronicle.id,
      })
    }
  }

  if (isEditing) {
    return (
      <article className="rounded-lg border border-[#7C5CFF]/40 bg-[#121620] p-4">
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-[1fr_170px_190px_auto]">
            <label>
              <span className="sr-only">Titre de la chronique</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
              />
            </label>
            <label>
              <span className="sr-only">Date de la chronique</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
              />
            </label>
            <label>
              <span className="sr-only">Emotion de la chronique</span>
              <select
                value={emotion}
                onChange={(event) => setEmotion(event.target.value as Emotion | '')}
                className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
              >
                <option value="">Aucune emotion</option>
                {EMOTION_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {EMOTION_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              aria-label="Marquer comme favori"
              aria-pressed={favorite}
              title="Favori"
              onClick={() => setFavorite((current) => !current)}
              className={`grid h-11 w-11 place-items-center rounded-lg border transition ${
                favorite
                  ? 'border-[#C9A646]/60 bg-[#C9A646]/15 text-[#F1DA7A]'
                  : 'border-white/10 bg-[#0F1117] text-zinc-500 hover:text-white'
              }`}
            >
              <Star size={18} aria-hidden="true" />
            </button>
          </div>

          <label>
            <span className="sr-only">Contenu de la chronique</span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={5}
              className="w-full resize-none rounded-lg border border-white/10 bg-[#0F1117] px-3 py-3 text-sm leading-6 text-white outline-none transition focus:border-[#7C5CFF]"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={
                isSaving ||
                title.trim().length === 0 ||
                content.trim().length === 0 ||
                date.length === 0
              }
            >
              <Save size={17} aria-hidden="true" />
              Enregistrer
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
            >
              Annuler
            </Button>
          </div>
        </form>
      </article>
    )
  }

  return (
    <article className="rounded-lg border border-white/10 bg-[#121620] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-white">{chronicle.title}</h3>
            {chronicle.favorite ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#C9A646]/10 px-2 py-1 text-xs text-[#F1DA7A]">
                <Star size={13} aria-hidden="true" />
                Favori
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-zinc-500">{formatDate(chronicle.date)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {chronicle.emotion ? (
            <span className="rounded-lg bg-[#7C5CFF]/10 px-3 py-1 text-xs text-[#D8D0FF]">
              {EMOTION_LABELS[chronicle.emotion]}
            </span>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            aria-label={`Modifier ${chronicle.title}`}
            title="Modifier"
            onClick={() => setIsEditing(true)}
            disabled={isSaving}
            className="h-9"
          >
            <Pencil size={15} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            aria-label={`Supprimer ${chronicle.title}`}
            title="Supprimer"
            onClick={handleDeleteChronicle}
            disabled={isSaving}
            className="h-9 border-rose-400/30 bg-rose-400/10 text-rose-100 hover:border-rose-300/60 hover:bg-rose-400/15"
          >
            <Trash2 size={15} aria-hidden="true" />
          </Button>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{chronicle.content}</p>
    </article>
  )
}

function SessionTimelineArticle({
  detail,
  isSaving,
  onDeletePlaySession,
  onUpdatePlaySession,
  session,
}: {
  detail: GameDetail
  isSaving: boolean
  onDeletePlaySession: (input: DeletePlaySessionInput) => Promise<void>
  onUpdatePlaySession: (input: UpdatePlaySessionInput) => Promise<void>
  session: PlaySessionListItem
}) {
  const initialDuration = splitDurationMinutes(session.durationMinutes)
  const [isEditing, setIsEditing] = useState(false)
  const [date, setDate] = useState(session.start.slice(0, 10))
  const [hours, setHours] = useState(initialDuration.hours)
  const [minutes, setMinutes] = useState(initialDuration.minutes)
  const [note, setNote] = useState(session.note ?? '')
  const [platformName, setPlatformName] = useState(session.platformName ?? '')

  useEffect(() => {
    const nextDuration = splitDurationMinutes(session.durationMinutes)

    setDate(session.start.slice(0, 10))
    setHours(nextDuration.hours)
    setMinutes(nextDuration.minutes)
    setNote(session.note ?? '')
    setPlatformName(session.platformName ?? '')
  }, [session])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await onUpdatePlaySession({
      gameId: detail.id,
      id: session.id,
      start: new Date(date).toISOString(),
      durationMinutes: durationFromInputs(hours, minutes),
      note: note || null,
      platformName: platformName || null,
    })

    setIsEditing(false)
  }

  async function handleDeletePlaySession() {
    const confirmed = window.confirm(
      `Supprimer la session du ${formatDate(session.start)} ?`,
    )

    if (confirmed) {
      await onDeletePlaySession({
        gameId: detail.id,
        id: session.id,
      })
    }
  }

  if (isEditing) {
    const durationMinutes = durationFromInputs(hours, minutes)

    return (
      <article className="rounded-lg border border-[#4F7CFF]/40 bg-[#121620] p-4">
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-[170px_1fr_110px_110px]">
            <label>
              <span className="sr-only">Date de la session</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
              />
            </label>
            <label>
              <span className="sr-only">Plateforme de la session</span>
              <input
                value={platformName}
                onChange={(event) => setPlatformName(event.target.value)}
                className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
              />
            </label>
            <label>
              <span className="sr-only">Heures de session</span>
              <input
                type="number"
                min="0"
                value={hours}
                onChange={(event) => setHours(event.target.value)}
                className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
              />
            </label>
            <label>
              <span className="sr-only">Minutes de session</span>
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
                className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
              />
            </label>
          </div>

          <label>
            <span className="sr-only">Commentaire de session</span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={
                isSaving || date.length === 0 || !isPositiveDuration(durationMinutes)
              }
            >
              <Save size={17} aria-hidden="true" />
              Enregistrer
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
            >
              Annuler
            </Button>
          </div>
        </form>
      </article>
    )
  }

  return (
    <article className="rounded-lg border border-white/10 bg-[#121620] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 text-sm text-white">
            <CalendarDays size={17} aria-hidden="true" />
            <span>{formatDate(session.start)}</span>
            <span className="text-zinc-600">/</span>
            <span>{formatHours(session.durationMinutes)}</span>
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            {session.platformName ?? 'Plateforme non renseignée'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            aria-label={`Modifier la session du ${formatDate(session.start)}`}
            title="Modifier"
            onClick={() => setIsEditing(true)}
            disabled={isSaving}
            className="h-9"
          >
            <Pencil size={15} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            aria-label={`Supprimer la session du ${formatDate(session.start)}`}
            title="Supprimer"
            onClick={handleDeletePlaySession}
            disabled={isSaving}
            className="h-9 border-rose-400/30 bg-rose-400/10 text-rose-100 hover:border-rose-300/60 hover:bg-rose-400/15"
          >
            <Trash2 size={15} aria-hidden="true" />
          </Button>
        </div>
      </div>
      {session.note ? (
        <p className="mt-3 text-sm leading-6 text-zinc-400">{session.note}</p>
      ) : null}
    </article>
  )
}

function Timeline({
  detail,
  isSaving,
  onDeleteChronicle,
  onDeletePlaySession,
  onUpdateChronicle,
  onUpdatePlaySession,
}: {
  detail: GameDetail
  isSaving: boolean
  onDeleteChronicle: (input: DeleteChronicleInput) => Promise<void>
  onDeletePlaySession: (input: DeletePlaySessionInput) => Promise<void>
  onUpdateChronicle: (input: UpdateChronicleInput) => Promise<void>
  onUpdatePlaySession: (input: UpdatePlaySessionInput) => Promise<void>
}) {
  const [visibleSessionsCount, setVisibleSessionsCount] = useState(
    TIMELINE_SESSION_BATCH_SIZE,
  )
  const visibleSessions = detail.sessions.slice(0, visibleSessionsCount)
  const remainingSessionsCount = detail.sessions.length - visibleSessions.length

  useEffect(() => {
    setVisibleSessionsCount(TIMELINE_SESSION_BATCH_SIZE)
  }, [detail.id])

  return (
    <section className="archive-panel deferred-panel rounded-lg border border-[#C9A646]/15 bg-[#181B23] p-5">
      <h2 className="text-lg font-semibold text-white">Mon histoire</h2>
      <div className="mt-5 space-y-4">
        {detail.chronicles.length === 0 && detail.sessions.length === 0 ? (
          <p className="text-sm leading-6 text-zinc-500">
            Aucune chronique ou session n'a encore ete ajoutee pour ce jeu.
          </p>
        ) : null}

        {detail.chronicles.map((chronicle) => (
          <ChronicleTimelineArticle
            key={chronicle.id}
            chronicle={chronicle}
            detail={detail}
            isSaving={isSaving}
            onDeleteChronicle={onDeleteChronicle}
            onUpdateChronicle={onUpdateChronicle}
          />
        ))}

        {visibleSessions.map((session) => (
          <SessionTimelineArticle
            key={session.id}
            detail={detail}
            isSaving={isSaving}
            onDeletePlaySession={onDeletePlaySession}
            onUpdatePlaySession={onUpdatePlaySession}
            session={session}
          />
        ))}

        {remainingSessionsCount > 0 ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setVisibleSessionsCount((current) =>
                Math.min(current + TIMELINE_SESSION_BATCH_SIZE, detail.sessions.length),
              )
            }
          >
            <Plus size={17} aria-hidden="true" />
            Afficher {Math.min(TIMELINE_SESSION_BATCH_SIZE, remainingSessionsCount)} session(s)
            de plus
          </Button>
        ) : null}
      </div>
    </section>
  )
}
