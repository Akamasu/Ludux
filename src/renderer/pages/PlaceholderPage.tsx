interface PlaceholderPageProps {
  eyebrow: string
  title: string
  description: string
}

export function PlaceholderPage({ description, eyebrow, title }: PlaceholderPageProps) {
  return (
    <div className="flex flex-1 items-center">
      <section className="w-full rounded-lg border border-dashed border-white/15 bg-[#141417] p-8">
        <p className="text-sm font-medium text-emerald-300">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">{description}</p>
      </section>
    </div>
  )
}
