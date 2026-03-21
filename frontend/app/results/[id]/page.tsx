async function getPatient(id: string) {
  const res = await fetch(`http://127.0.0.1:8000/patient/${id}`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch patient")
  return res.json()
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const patient = await getPatient(id)
  const result = patient.before

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-3xl font-bold">Assessment Results</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 p-5 bg-slate-900">
          <div className="text-slate-400 text-sm">Risk Level</div>
          <div className="text-2xl font-semibold capitalize">{result.risk_level}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 p-5 bg-slate-900">
          <div className="text-slate-400 text-sm">Risk Score</div>
          <div className="text-2xl font-semibold">{result.risk_score}/100</div>
        </div>
        <div className="rounded-2xl border border-slate-800 p-5 bg-slate-900">
          <div className="text-slate-400 text-sm">Recommendation</div>
          <div className="text-2xl font-semibold capitalize">{result.recommendation_type}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 p-5 bg-slate-900">
        <h2 className="font-semibold text-xl mb-2">Contributing Factors</h2>
        <ul className="list-disc ml-5 space-y-1 text-slate-300">
          {result.factors.map((factor: string) => (
            <li key={factor}>{factor}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-800 p-5 bg-slate-900">
        <h2 className="font-semibold text-xl mb-2">Patient Summary</h2>
        <p className="text-slate-300">{result.patient_summary}</p>
      </div>
    </main>
  )
}