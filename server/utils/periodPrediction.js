const DAY_IN_MS = 24 * 60 * 60 * 1000
const MIN_CYCLE_LENGTH = 15
const MAX_CYCLE_LENGTH = 90
const MIN_HISTORY_CYCLES = 3
const MAX_HISTORY_CYCLES = 6

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

function normalizeCycleHistory(cycleHistory) {
  if (!Array.isArray(cycleHistory)) {
    return null
  }

  return cycleHistory
    .map((cycle) => (typeof cycle === 'string' ? Number(cycle) : cycle))
    .slice(-MAX_HISTORY_CYCLES)
}

function validateCycleLength(cycleLength, errors, fieldName = 'cycleLength') {
  if (!Number.isInteger(cycleLength)) {
    errors.push(`${fieldName} must be an integer number of days`)
    return
  }

  if (cycleLength < MIN_CYCLE_LENGTH || cycleLength > MAX_CYCLE_LENGTH) {
    errors.push(`${fieldName} must be between ${MIN_CYCLE_LENGTH} and ${MAX_CYCLE_LENGTH} days`)
  }
}

function validateInputs(lastPeriodDate, cycleLength, cycleHistory) {
  const errors = []

  const parsedLastPeriodDate = parseISODate(lastPeriodDate)
  if (!parsedLastPeriodDate) {
    errors.push('lastPeriodDate must be a valid date in YYYY-MM-DD format')
  }

  if (parsedLastPeriodDate) {
    const todayUtc = new Date()
    const todayDate = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate()))

    if (parsedLastPeriodDate > todayDate) {
      errors.push('lastPeriodDate cannot be in the future')
    }
  }

  if (Array.isArray(cycleHistory)) {
    const normalizedHistory = normalizeCycleHistory(cycleHistory)

    if (normalizedHistory.length < MIN_HISTORY_CYCLES) {
      errors.push(`cycleHistory must contain at least ${MIN_HISTORY_CYCLES} cycles`)
    }

    normalizedHistory.forEach((cycle, index) => {
      validateCycleLength(cycle, errors, `cycleHistory[${index}]`)
    })
  } else {
    validateCycleLength(cycleLength, errors)
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

function calculateAverageCycle(cycleHistory) {
  const total = cycleHistory.reduce((sum, cycle) => sum + cycle, 0)
  return total / cycleHistory.length
}

function detectIrregularCycle(cycleHistory) {
  if (cycleHistory.length < MIN_HISTORY_CYCLES) {
    return {
      isIrregular: false,
      metrics: {
        range: 0,
        standardDeviation: 0,
      },
    }
  }

  const minCycle = Math.min(...cycleHistory)
  const maxCycle = Math.max(...cycleHistory)
  const range = maxCycle - minCycle

  const average = calculateAverageCycle(cycleHistory)
  const variance = cycleHistory.reduce((sum, cycle) => sum + (cycle - average) ** 2, 0) / cycleHistory.length
  const standardDeviation = Math.sqrt(variance)

  // A practical rule of thumb:
  // - Range greater than 7 days or
  // - Standard deviation of 4+ days
  const isIrregular = range > 7 || standardDeviation >= 4

  return {
    isIrregular,
    metrics: {
      range,
      standardDeviation: Number(standardDeviation.toFixed(2)),
    },
  }
}

export function predictPeriodDates({ lastPeriodDate, cycleLength, cycleHistory }) {
  const normalizedHistory = normalizeCycleHistory(cycleHistory)
  const validation = validateInputs(lastPeriodDate, cycleLength, normalizedHistory)

  if (!validation.isValid) {
    return {
      ok: false,
      errors: validation.errors,
      data: null,
    }
  }

  const lastDate = parseISODate(lastPeriodDate)

  const historyToUse = Array.isArray(normalizedHistory) ? normalizedHistory : null
  const averageCycleLength = historyToUse ? calculateAverageCycle(historyToUse) : cycleLength
  const cycleLengthForPrediction = Math.round(averageCycleLength)
  const irregularity = historyToUse ? detectIrregularCycle(historyToUse) : { isIrregular: false, metrics: null }

  const nextPeriod = addDays(lastDate, cycleLengthForPrediction)
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
        cycleHistory: historyToUse,
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
        cycleAnalysis: {
          averageCycleLength: Number(averageCycleLength.toFixed(2)),
          cycleLengthUsedForPrediction: cycleLengthForPrediction,
          isUsingHistoryAverage: Boolean(historyToUse),
          historyCyclesStored: historyToUse?.length ?? 0,
          irregularity,
        },
      },
    },
  }
}

export { validateInputs }
