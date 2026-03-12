import BarChart3D, { SALES_DATA, MAX_VAL } from './components/BarChart3D'

function formatCurrency(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`
  return `$${n}`
}

const total = SALES_DATA.reduce((s, d) => s + d.value, 0)
const avg = Math.round(total / SALES_DATA.length)
const peak = SALES_DATA.find(d => d.value === MAX_VAL)!

export default function App() {
  return (
    <div
      className="paper-texture min-h-screen flex flex-col items-center py-8 px-4 md:px-8"
    >
      {/* ── Header ── */}
      <header className="w-full max-w-5xl mb-6">
        <div className="flex items-baseline gap-3 mb-1">
          <span
            className="font-mono text-xs tracking-widest uppercase"
            style={{ color: 'var(--ink-muted)' }}
          >
            Dashboard / Revenue
          </span>
        </div>
        <h1
          className="font-serif text-3xl md:text-4xl font-bold tracking-tight leading-tight"
          style={{ color: 'var(--ink)' }}
        >
          Monthly Sales
        </h1>
        <p
          className="mt-1 font-serif text-sm md:text-base"
          style={{ color: 'var(--ink-muted)' }}
        >
          Full year overview · Hover bars for details
        </p>

        {/* Divider */}
        <div
          className="mt-4 h-px w-full"
          style={{ background: 'var(--border)' }}
        />
      </header>

      {/* ── Stat Cards ── */}
      <div className="w-full max-w-5xl grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Revenue', value: formatCurrency(total), sub: 'FY 2024' },
          { label: 'Monthly Average', value: formatCurrency(avg), sub: 'Per month' },
          { label: 'Peak Month', value: peak.month.slice(0, 3), sub: formatCurrency(peak.value) },
        ].map(stat => (
          <div key={stat.label} className="card-paper rounded-sm p-4">
            <p
              className="font-mono text-[10px] md:text-xs tracking-widest uppercase mb-1"
              style={{ color: 'var(--ink-muted)' }}
            >
              {stat.label}
            </p>
            <p
              className="font-serif text-xl md:text-2xl font-bold"
              style={{ color: 'var(--ink)' }}
            >
              {stat.value}
            </p>
            <p
              className="font-mono text-[10px] md:text-xs mt-0.5"
              style={{ color: 'var(--ink-muted)' }}
            >
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* ── 3D Chart Widget ── */}
      <div className="w-full max-w-5xl card-paper rounded-sm overflow-hidden">
        {/* Widget header */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--ink)' }}
            />
            <span
              className="font-mono text-xs tracking-wider uppercase"
              style={{ color: 'var(--ink-light)' }}
            >
              3D Bar Chart · Three.js
            </span>
          </div>
          <span
            className="font-mono text-xs"
            style={{ color: 'var(--ink-muted)' }}
          >
            Jan – Dec 2024
          </span>
        </div>

        {/* Canvas area */}
        <div style={{ height: 'clamp(320px, 52vw, 520px)' }}>
          <BarChart3D />
        </div>

        {/* Legend */}
        <div
          className="flex items-center gap-4 px-5 py-3 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3"
              style={{ background: 'var(--ink)' }}
            />
            <span
              className="font-mono text-xs"
              style={{ color: 'var(--ink-muted)' }}
            >
              Monthly Revenue (USD)
            </span>
          </div>
          <div
            className="ml-auto font-mono text-xs"
            style={{ color: 'var(--ink-muted)' }}
          >
            Scale max: {formatCurrency(MAX_VAL)}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="w-full max-w-5xl mt-8 flex items-center justify-between">
        <div
          className="h-px flex-1"
          style={{ background: 'var(--border)' }}
        />
        <span
          className="mx-4 font-mono text-xs"
          style={{ color: 'var(--ink-muted)' }}
        >
          Grovyn · 2024
        </span>
        <div
          className="h-px flex-1"
          style={{ background: 'var(--border)' }}
        />
      </footer>
    </div>
  )
}
