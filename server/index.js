import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { predictPeriodDates } from './utils/periodPrediction.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Smart Period Tracker API is running' })
})

app.post('/api/predictions/period', (req, res) => {
  const { lastPeriodDate, cycleLength } = req.body ?? {}
  const numericCycleLength = typeof cycleLength === 'string' ? Number(cycleLength) : cycleLength

  const result = predictPeriodDates({
    lastPeriodDate,
    cycleLength: numericCycleLength,
  })

  if (!result.ok) {
    return res.status(400).json(result)
  }

  return res.json(result)
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
