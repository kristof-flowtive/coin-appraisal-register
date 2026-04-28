import { useEffect, useRef, useState } from 'react'
import { calculateBulk } from '../api/client'
import { cartLineToRequestItem } from '../api/types'
import { useCart } from '../state/useCart'
import { useConfig } from '../state/useConfig'
import { useSession } from '../state/useSession'

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function CalculatorScreen() {
  const config = useConfig()
  const cart = useCart()
  const session = useSession()

  const [calcLoading, setCalcLoading] = useState(false)
  const [calcError, setCalcError] = useState<string | null>(null)

  const prevRepRef = useRef<string | null>(null)
  useEffect(() => {
    const prev = prevRepRef.current
    if (
      prev !== null &&
      session.selectedRepId !== null &&
      prev !== session.selectedRepId
    ) {
      cart.clear()
      session.setLastCalc(null)
    }
    prevRepRef.current = session.selectedRepId
  }, [session.selectedRepId, cart, session])

  useEffect(() => {
    if (import.meta.env.DEV) {
      window.__test = { ...(window.__test ?? {}), addLine: cart.addLine }
    }
  }, [cart.addLine])

  async function handleCalculate() {
    if (cart.lines.length === 0) return
    setCalcLoading(true)
    setCalcError(null)
    try {
      const items = cart.lines.map(cartLineToRequestItem)
      const result = await calculateBulk(items)
      session.setLastCalc(result)
    } catch (err) {
      setCalcError(err instanceof Error ? err.message : String(err))
    } finally {
      setCalcLoading(false)
    }
  }

  function handleNewBag() {
    if (cart.lines.length === 0 && !session.lastCalc) return
    if (window.confirm('Start a new bag? This clears the cart.')) {
      cart.clear()
      session.setLastCalc(null)
    }
  }

  const canCalculate =
    session.selectedRepId !== null && cart.lines.length > 0 && !calcLoading
  const total = session.lastCalc?.total ?? 0
  const spot = session.lastCalc?.spot ?? null

  return (
    <main className="min-h-dvh flex flex-col bg-slate-50 pb-40">
      <header className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">
          Coin Appraisal Register
        </h1>
        <button
          onClick={() => void config.refresh()}
          disabled={config.loading}
          className="px-3 py-2 text-sm rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
          title="Refresh config from Airtable"
        >
          {config.loading ? 'Refreshing…' : 'Refresh Config'}
        </button>
      </header>

      {config.error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-sm text-red-800">
          Could not load config: {config.error.message}
        </div>
      )}

      {calcError && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-sm text-amber-900 flex items-center justify-between gap-3">
          <span>Calculate failed: {calcError}</span>
          <button
            onClick={() => setCalcError(null)}
            className="text-amber-700 underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="px-4 py-3 bg-white border-b border-slate-200">
        <label
          htmlFor="rep-select"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Rep
        </label>
        <select
          id="rep-select"
          value={session.selectedRepId ?? ''}
          onChange={(e) => session.setSelectedRepId(e.target.value || null)}
          className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-base"
        >
          <option value="">Select rep…</option>
          {config.reps.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </section>

      {spot && (
        <section className="px-4 py-2 bg-slate-100 text-xs text-slate-600 border-b border-slate-200 flex flex-wrap gap-x-4 gap-y-1">
          <span>Gold: {usd.format(spot.gold)}/oz</span>
          <span>Silver: {usd.format(spot.silver)}/oz</span>
          <span>Platinum: {usd.format(spot.platinum)}/oz</span>
        </section>
      )}

      <section className="flex-1 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-slate-700">
            Bag ({cart.lines.length})
          </h2>
          <button
            onClick={() =>
              window.alert(
                'Add Coin form lands in Phase 4D. For now, use window.__test.addLine() in the dev console.',
              )
            }
            className="px-3 py-1.5 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-800"
          >
            Add Coin
          </button>
        </div>

        {cart.lines.length === 0 ? (
          <p className="py-8 text-center text-slate-500 text-sm">
            Add a coin to get started.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 bg-white rounded-md border border-slate-200">
            {cart.lines.map((line) => {
              const value =
                line.priced_by === 'each_metal' ? line.quantity : line.weight_grams
              return (
                <li
                  key={line.id}
                  className="px-3 py-2 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {line.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {value} {line.unit_label}
                    </div>
                  </div>
                  <input
                    type="number"
                    inputMode={
                      line.priced_by === 'each_metal' ? 'numeric' : 'decimal'
                    }
                    step={line.priced_by === 'each_metal' ? 1 : 0.01}
                    min={0}
                    value={value}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      if (!Number.isNaN(v) && v >= 0) cart.updateLine(line.id, v)
                    }}
                    className="w-20 px-2 py-1 text-sm rounded border border-slate-300"
                    aria-label={`Edit ${line.name}`}
                  />
                  <button
                    onClick={() => cart.removeLine(line.id)}
                    className="text-slate-400 hover:text-red-500 px-2 py-1 text-lg leading-none"
                    aria-label={`Remove ${line.name}`}
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-lg">
        <div className="px-4 pt-3 pb-2 flex items-baseline justify-between">
          <span className="text-sm text-slate-600">Total</span>
          <span className="text-3xl font-bold text-slate-900 tabular-nums">
            {usd.format(total)}
          </span>
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={() => void handleCalculate()}
            disabled={!canCalculate}
            className="flex-1 py-3 rounded-md bg-emerald-600 text-white text-base font-semibold disabled:bg-slate-300 disabled:text-slate-500 hover:bg-emerald-700"
          >
            {calcLoading ? 'Calculating…' : 'Calculate Total'}
          </button>
          <button
            onClick={handleNewBag}
            className="px-4 py-3 rounded-md border border-slate-300 text-slate-700 text-sm hover:bg-slate-100"
          >
            New Bag
          </button>
        </div>
      </div>
    </main>
  )
}
