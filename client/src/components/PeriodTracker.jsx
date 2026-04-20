import { useMemo, useState } from 'react'

const MIN_CYCLE_LENGTH = 15
const MAX_CYCLE_LENGTH = 90
const DAY_IN_MS = 24 * 60 * 60 * 1000

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_IN_MS)
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function parseIsoDate(dateString) {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return null
  }

  const parsed = new Date(`${dateString}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  const isoDate = parsed.toISOString().split('T')[0]
  return isoDate === dateString ? parsed : null
}

function getTodayIsoDate() {
  return new Date().toISOString().split('T')[0]
}

function validateInputs(lastPeriodDate, cycleLength) {
  const errors = []
  const parsedLastDate = parseIsoDate(lastPeriodDate)

  if (!parsedLastDate) {
    errors.push('Please enter a valid last period date.')
  }

  const normalizedCycleLength = Number(cycleLength)
  if (!Number.isInteger(normalizedCycleLength)) {
    errors.push('Cycle length must be a whole number of days.')
  } else if (normalizedCycleLength < MIN_CYCLE_LENGTH || normalizedCycleLength > MAX_CYCLE_LENGTH) {
    errors.push(`Cycle length must be between ${MIN_CYCLE_LENGTH} and ${MAX_CYCLE_LENGTH} days.`)
  }

  const today = parseIsoDate(getTodayIsoDate())
  if (parsedLastDate && today && parsedLastDate > today) {
    errors.push('Last period date cannot be in the future.')
  }

  return {
    errors,
    parsedLastDate,
    normalizedCycleLength,
  }
}

export default function PeriodTracker() {
  const [lastPeriodDate, setLastPeriodDate] = useState('')
  const [cycleLength, setCycleLength] = useState('28')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const { errors, results } = useMemo(() => {
    if (!isSubmitted) {
      return {
        errors: [],
        results: null,
      }
    }

    const { errors: validationErrors, parsedLastDate, normalizedCycleLength } = validateInputs(
      lastPeriodDate,
      cycleLength,
    )

    if (validationErrors.length > 0 || !parsedLastDate) {
      return {
        errors: validationErrors,
        results: null,
      }
    }

    const nextPeriodDate = addDays(parsedLastDate, normalizedCycleLength)
    const ovulationDate = addDays(nextPeriodDate, -14)
    const fertileWindowStart = addDays(ovulationDate, -3)
    const fertileWindowEnd = addDays(ovulationDate, 3)

    return {
      errors: [],
      results: {
        nextPeriodDate,
        ovulationDate,
        fertileWindowStart,
        fertileWindowEnd,
      },
    }
  }, [isSubmitted, lastPeriodDate, cycleLength])

  function onSubmit(event) {
    event.preventDefault()
    setIsSubmitted(true)
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-semibold text-slate-900">Period Tracker</h2>
      <p className="mt-1 text-sm text-slate-500">Add your last period date and cycle length to view predictions.</p>

      <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={onSubmit} noValidate>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Last period date
          <input
            type="date"
            max={getTodayIsoDate()}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            value={lastPeriodDate}
            onChange={(event) => setLastPeriodDate(event.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Cycle length (days)
          <input
            type="number"
            min={MIN_CYCLE_LENGTH}
            max={MAX_CYCLE_LENGTH}
            inputMode="numeric"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            value={cycleLength}
            onChange={(event) => setCycleLength(event.target.value)}
            required
          />
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 sm:w-auto"
          >
            Show Results
          </button>
        </div>
      </form>

      {isSubmitted && errors.length > 0 && (
        <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert">
          <p className="font-semibold">Please fix the following:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {results && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Next period date</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{formatDate(results.nextPeriodDate)}</p>
          </article>

          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Estimated ovulation</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{formatDate(results.ovulationDate)}</p>
          </article>

          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Fertile window</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {formatDate(results.fertileWindowStart)} - {formatDate(results.fertileWindowEnd)}
            </p>
          </article>
        </div>
      )}
    </section>
  )
}
