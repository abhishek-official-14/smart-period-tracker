import { useMemo, useState } from 'react'

const MIN_CYCLE_LENGTH = 15
const MAX_CYCLE_LENGTH = 90
const PERIOD_DURATION_DAYS = 5
const DAY_IN_MS = 24 * 60 * 60 * 1000
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_IN_MS)
}

function startOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function formatMonth(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(date)
}

function dateToIso(date) {
  return date.toISOString().split('T')[0]
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

function getMonthGrid(monthDate) {
  const monthStart = startOfMonth(monthDate)
  const firstGridDate = addDays(monthStart, -monthStart.getUTCDay())

  return Array.from({ length: 42 }, (_, index) => addDays(firstGridDate, index))
}

function getPredictionMap(lastPeriodStart, cycleLength, displayedMonth) {
  const monthStart = startOfMonth(displayedMonth)
  const monthEnd = new Date(Date.UTC(displayedMonth.getUTCFullYear(), displayedMonth.getUTCMonth() + 1, 0))
  const rangeStart = addDays(monthStart, -45)
  const rangeEnd = addDays(monthEnd, 45)
  const typeByDate = new Map()

  let cursor = new Date(lastPeriodStart)

  while (cursor <= rangeEnd) {
    const periodStart = new Date(cursor)
    const periodEnd = addDays(periodStart, PERIOD_DURATION_DAYS - 1)

    for (let i = 0; i < PERIOD_DURATION_DAYS; i += 1) {
      const day = addDays(periodStart, i)
      if (day >= rangeStart && day <= rangeEnd) {
        typeByDate.set(dateToIso(day), 'period')
      }
    }

    const ovulationDate = addDays(addDays(periodStart, cycleLength), -14)
    for (let i = -3; i <= 3; i += 1) {
      const day = addDays(ovulationDate, i)
      const iso = dateToIso(day)
      if (day >= rangeStart && day <= rangeEnd && typeByDate.get(iso) !== 'period') {
        typeByDate.set(iso, 'fertile')
      }
    }

    cursor = addDays(cursor, cycleLength)
    if (periodEnd > rangeEnd) {
      break
    }
  }

  return typeByDate
}

export default function PeriodTracker() {
  const [lastPeriodDate, setLastPeriodDate] = useState('')
  const [cycleLength, setCycleLength] = useState('28')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [displayedMonth, setDisplayedMonth] = useState(startOfMonth(new Date()))
  const [selectedDateIso, setSelectedDateIso] = useState(null)

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
    const predictionMap = getPredictionMap(parsedLastDate, normalizedCycleLength, displayedMonth)

    return {
      errors: [],
      results: {
        nextPeriodDate,
        ovulationDate,
        fertileWindowStart,
        fertileWindowEnd,
        predictionMap,
      },
    }
  }, [isSubmitted, lastPeriodDate, cycleLength, displayedMonth])

  const monthDays = useMemo(() => getMonthGrid(displayedMonth), [displayedMonth])
  const selectedDate = selectedDateIso ? parseIsoDate(selectedDateIso) : null
  const selectedDateType = selectedDateIso && results ? results.predictionMap.get(selectedDateIso) : null

  function onSubmit(event) {
    event.preventDefault()
    setIsSubmitted(true)
    setSelectedDateIso(null)
  }

  function moveMonth(offset) {
    setDisplayedMonth((current) =>
      startOfMonth(new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + offset, 1))),
    )
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
        <>
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

          <section className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                onClick={() => moveMonth(-1)}
              >
                Previous
              </button>
              <p className="text-base font-semibold text-slate-900">{formatMonth(displayedMonth)}</p>
              <button
                type="button"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                onClick={() => moveMonth(1)}
              >
                Next
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-slate-500">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-1">
                  {label}
                </div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {monthDays.map((day) => {
                const iso = dateToIso(day)
                const predictionType = results.predictionMap.get(iso)
                const isCurrentMonth = day.getUTCMonth() === displayedMonth.getUTCMonth()
                const isSelected = selectedDateIso === iso

                let cellClasses = 'border-slate-200 bg-white text-slate-800 hover:bg-slate-100'
                if (predictionType === 'period') {
                  cellClasses = 'border-red-300 bg-red-100 text-red-900 hover:bg-red-200'
                } else if (predictionType === 'fertile') {
                  cellClasses = 'border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                }

                if (!isCurrentMonth) {
                  cellClasses += ' opacity-50'
                }

                if (isSelected) {
                  cellClasses += ' ring-2 ring-indigo-400'
                }

                return (
                  <button
                    key={iso}
                    type="button"
                    className={`h-11 rounded-md border text-sm font-medium transition ${cellClasses}`}
                    onClick={() => setSelectedDateIso(iso)}
                  >
                    {day.getUTCDate()}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-700">
              <div className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400" /> Period
              </div>
              <div className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-400" /> Fertile
              </div>
            </div>

            <div className="mt-4 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
              {selectedDate && (
                <>
                  <p className="font-semibold text-slate-900">{formatDate(selectedDate)}</p>
                  <p className="mt-1">
                    {selectedDateType === 'period' && 'Predicted period day.'}
                    {selectedDateType === 'fertile' && 'Predicted fertile window day.'}
                    {!selectedDateType && 'No period or fertile prediction for this date.'}
                  </p>
                </>
              )}
              {!selectedDate && <p>Click a date to view details.</p>}
            </div>
          </section>
        </>
      )}
    </section>
  )
}
