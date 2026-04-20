import PeriodTracker from './components/PeriodTracker'

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <h1 className="text-2xl font-bold">Smart Period Tracker</h1>
          <p className="text-sm text-slate-500">Track cycles with confidence and clarity</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <PeriodTracker />
      </main>
    </div>
  )
}

export default App
