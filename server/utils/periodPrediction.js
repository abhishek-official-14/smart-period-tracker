const DAY_IN_MS = 24 * 60 * 60 * 1000
const MIN_CYCLE_LENGTH = 15
const MAX_CYCLE_LENGTH = 90

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_IN_MS)
}

function parseISODate(dateString) {
  if (typeof dateString !== 'string') {
    return null
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return null
  }

  const parsed = new Date(`${dateString}T00:00:00.000Z`)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  if (formatDate(parsed) !== dateString) {
    return null
  }

  return parsed
}

function validateInputs(lastPeriodDate, cycleLength) {
  const errors = []

  const parsedLastPeriodDate = parseISODate(lastPeriodDate)
  if (!parsedLastPeriodDate) {
    errors.push('lastPeriodDate must be a valid date in YYYY-MM-DD format')
  }

  if (!Number.isInteger(cycleLength)) {
    errors.push('cycleLength must be an integer number of days')
  } else if (cycleLength < MIN_CYCLE_LENGTH || cycleLength > MAX_CYCLE_LENGTH) {
    errors.push(`cycleLength must be between ${MIN_CYCLE_LENGTH} and ${MAX_CYCLE_LENGTH} days`)
  }

  if (parsedLastPeriodDate) {
    const todayUtc = new Date()
    const todayDate = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate()))

    if (parsedLastPeriodDate > todayDate) {
      errors.push('lastPeriodDate cannot be in the future')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function predictPeriodDates({ lastPeriodDate, cycleLength }) {
  const validation = validateInputs(lastPeriodDate, cycleLength)

  if (!validation.isValid) {
    return {
      ok: false,
      errors: validation.errors,
      data: null,
    }
  }

  const lastDate = parseISODate(lastPeriodDate)
  const nextPeriod = addDays(lastDate, cycleLength)
  const ovulation = addDays(nextPeriod, -14)
  const fertileStart = addDays(ovulation, -3)
  const fertileEnd = addDays(ovulation, 3)

  return {
    ok: true,
    errors: [],
    data: {
      input: {
        lastPeriodDate: formatDate(lastDate),
        cycleLength,
      },
      predictions: {
        nextPeriodDate: formatDate(nextPeriod),
        ovulationDate: formatDate(ovulation),
        fertileWindow: {
          startDate: formatDate(fertileStart),
          endDate: formatDate(fertileEnd),
        },
      },
      metadata: {
        assumptions: {
          lutealPhaseDays: 14,
          fertileWindowOffsetDays: 3,
        },
      },
    },
  }
}

export { validateInputs }
