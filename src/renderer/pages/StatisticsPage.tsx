import {
  Activity,
  BarChart3,
  BookText,
  Clock3,
  Gamepad2,
  Trophy,
} from 'lucide-react'
import {
  EMOTION_LABELS,
  GAME_STATUS_LABELS,
  type EmotionStat,
  type LibraryStatistics,
  type MonthlyPlayStat,
  type PlatformStat,
  type StatusStat,
} from '../../types/game'
import { StatTile } from '../components/library/StatTile'
import { formatHours } from '../utils/formatters'

interface StatisticsPageProps {
  statistics: LibraryStatistics
  isLoading: boolean
  error: string | null
}

const barTones = [
  'bg-[#7C5CFF]',
  'bg-[#4F7CFF]',
  'bg-[#C9A646]',
  'bg-[#A33D69]',
] as const

function getBarWidth(value: number, max: number) {
  if (value === 0 || max === 0) {
    return '0%'
  }

  return `${Math.max(6, Math.round((value / max) * 100))}%`
}

function formatMonth(month: string) {
  const [year, monthIndex] = month.split('-').map(Number)

  if (!year || !monthIndex) {
    return month
  }

  return new Intl.DateTimeFormat('fr-FR', {
    month: 'short',
    year: '2-digit',
  }).format(new Date(year, monthIndex - 1, 1))
}

function StatusDistribution({ stats }: { stats: StatusStat[] }) {
  const max = Math.max(...stats.map((stat) => stat.count), 0)

  return (
    <section className="rounded-lg border border-white/10 bg-[#181B23] p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Repartition</h2>
          <p className="mt-1 text-sm text-zinc-500">Par statut de progression</p>
        </div>
        <BarChart3 className="text-[#A797FF]" size={20} aria-hidden="true" />
      </div>

      <div className="space-y-4">
        {stats.map((stat, index) => (
          <div key={stat.status}>
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-zinc-200">
                {GAME_STATUS_LABELS[stat.status]}
              </span>
              <span className="text-zinc-500">
                {stat.count} jeux · {formatHours(stat.totalMinutes)}
              </span>
            </div>
            <div className="h-2 rounded-lg bg-white/7">
              <div
                className={`h-full rounded-lg ${barTones[index % barTones.length]}`}
                style={{ width: getBarWidth(stat.count, max) }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function PlatformBreakdown({ stats }: { stats: PlatformStat[] }) {
  const visibleStats = stats.slice(0, 6)
  const max = Math.max(...visibleStats.map((stat) => stat.games), 0)

  return (
    <section className="rounded-lg border border-white/10 bg-[#181B23] p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Plateformes</h2>
          <p className="mt-1 text-sm text-zinc-500">Jeux possedes et temps rattache</p>
        </div>
        <Gamepad2 className="text-[#8CA7FF]" size={20} aria-hidden="true" />
      </div>

      {visibleStats.length === 0 ? (
        <p className="text-sm leading-6 text-zinc-500">Aucune plateforme renseignee.</p>
      ) : (
        <div className="space-y-4">
          {visibleStats.map((stat, index) => (
            <div key={stat.name}>
              <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-zinc-200">{stat.name}</span>
                <span className="text-zinc-500">
                  {stat.games} jeux · {formatHours(stat.totalMinutes)}
                </span>
              </div>
              <div className="h-2 rounded-lg bg-white/7">
                <div
                  className={`h-full rounded-lg ${barTones[(index + 1) % barTones.length]}`}
                  style={{ width: getBarWidth(stat.games, max) }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function EmotionPulse({ stats }: { stats: EmotionStat[] }) {
  const visibleStats = stats.filter((stat) => stat.count > 0)

  return (
    <section className="rounded-lg border border-white/10 bg-[#181B23] p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Emotions</h2>
          <p className="mt-1 text-sm text-zinc-500">Tonalite des chroniques</p>
        </div>
        <Activity className="text-[#C46A91]" size={20} aria-hidden="true" />
      </div>

      {visibleStats.length === 0 ? (
        <p className="text-sm leading-6 text-zinc-500">
          Les emotions apparaitront avec les prochaines chroniques.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {visibleStats.map((stat) => (
            <span
              key={stat.emotion}
              className="rounded-lg border border-white/10 bg-[#121620] px-3 py-2 text-sm text-zinc-200"
            >
              {EMOTION_LABELS[stat.emotion]} · {stat.count}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

function MonthlyActivity({ stats }: { stats: MonthlyPlayStat[] }) {
  const max = Math.max(...stats.map((stat) => stat.totalMinutes), 0)

  return (
    <section className="rounded-lg border border-white/10 bg-[#181B23] p-5 xl:col-span-2">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Activite mensuelle</h2>
          <p className="mt-1 text-sm text-zinc-500">Sessions sur les douze derniers mois joues</p>
        </div>
        <Clock3 className="text-[#DBC46E]" size={20} aria-hidden="true" />
      </div>

      {stats.length === 0 ? (
        <p className="text-sm leading-6 text-zinc-500">
          Les sessions alimentees depuis les fiches de jeux composeront cette courbe.
        </p>
      ) : (
        <div className="flex h-48 items-end gap-3">
          {stats.map((stat, index) => (
            <div key={stat.month} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-32 w-full items-end rounded-lg bg-[#121620] px-2 pb-2">
                <div
                  className={`w-full rounded-md ${barTones[index % barTones.length]}`}
                  style={{
                    height:
                      stat.totalMinutes === 0 || max === 0
                        ? '0%'
                        : `${Math.max(10, Math.round((stat.totalMinutes / max) * 100))}%`,
                  }}
                  title={`${formatHours(stat.totalMinutes)} · ${stat.sessions} sessions`}
                />
              </div>
              <span className="w-full truncate text-center text-xs text-zinc-500">
                {formatMonth(stat.month)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function StatisticsPage({ error, isLoading, statistics }: StatisticsPageProps) {
  const averageMinutes =
    statistics.gamesOwned === 0
      ? 0
      : Math.round(statistics.totalMinutes / statistics.gamesOwned)

  return (
    <div className="flex flex-1 flex-col gap-7">
      <header className="flex items-start justify-between gap-6 border-b border-white/10 pb-7">
        <div>
          <p className="text-sm font-medium text-[#A797FF]">Statistiques</p>
          <h1 className="mt-2 text-4xl font-semibold text-white">Tableau de bord</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Une lecture claire de votre bibliotheque, de votre temps de jeu et des
            souvenirs consignes.
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#181B23] px-4 py-3 text-right">
          <p className="text-xs text-zinc-500">Completion</p>
          <p className="mt-1 text-sm font-medium text-zinc-100">
            {isLoading ? 'Chargement' : `${statistics.completionRate} %`}
          </p>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatTile
          label="Jeux"
          value={String(statistics.gamesOwned)}
          icon={Gamepad2}
          tone="violet"
        />
        <StatTile
          label="Temps joue"
          value={formatHours(statistics.totalMinutes)}
          icon={Clock3}
          tone="blue"
        />
        <StatTile
          label="Termines"
          value={String(statistics.gamesCompleted)}
          icon={Trophy}
          tone="gold"
        />
        <StatTile
          label="Sessions"
          value={String(statistics.totalSessions)}
          icon={Activity}
          tone="magenta"
        />
        <StatTile
          label="Chroniques"
          value={String(statistics.totalChronicles)}
          icon={BookText}
          tone="violet"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <StatusDistribution stats={statistics.statusStats} />
        <div className="rounded-lg border border-white/10 bg-[#181B23] p-5">
          <h2 className="text-lg font-semibold text-white">Rythme personnel</h2>
          <dl className="mt-5 grid gap-4">
            <div className="rounded-lg border border-white/10 bg-[#121620] p-4">
              <dt className="text-sm text-zinc-500">Temps moyen par jeu</dt>
              <dd className="mt-2 text-2xl font-semibold text-white">
                {formatHours(averageMinutes)}
              </dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#121620] p-4">
              <dt className="text-sm text-zinc-500">Jeux termines</dt>
              <dd className="mt-2 text-2xl font-semibold text-white">
                {statistics.gamesCompleted} / {statistics.gamesOwned}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <PlatformBreakdown stats={statistics.platformStats} />
        <EmotionPulse stats={statistics.emotionStats} />
        <MonthlyActivity stats={statistics.monthlyPlayStats} />
      </section>
    </div>
  )
}
