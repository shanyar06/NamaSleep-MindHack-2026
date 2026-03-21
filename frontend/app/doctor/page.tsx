"use client"

import { useEffect, useState } from "react"
import { getFlaggedPatients, submitDoctorFeedback, getComparison } from "../../lib/api"

export default function DoctorPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [comparison, setComparison] = useState<any | null>(null)

  useEffect(() => {
    getFlaggedPatients().then(setPatients).catch(console.error)
  }, [])

  async function handleFeedback(decision: string) {
    if (!selected) return
    await submitDoctorFeedback({
      patient_id: selected.patient_id,
      doctor_decision: decision,
      updated_recommendation_type: decision === "agree" ? selected.recommendation_type : "escalate",
      notes: "Hackathon clinician feedback example",
    })
    const comp = await getComparison(selected.patient_id)
    setComparison(comp)
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-[320px_1fr] gap-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <h1 className="text-2xl font-bold mb-4">Flagged Patients</h1>
        <div className="space-y-3">
          {patients.map((p) => (
            <button
              key={p.patient_id}
              onClick={() => {
                setSelected(p)
                setComparison(null)
              }}
              className="w-full text-left rounded-xl border border-slate-700 p-3 hover:bg-slate-800"
            >
              <div className="font-semibold">{p.patient_id.slice(0, 8)}</div>
              <div className="text-sm text-slate-300 capitalize">
                {p.risk_level} risk · {p.recommendation_type}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        {!selected ? (
          <p className="text-slate-300">Select a patient to review.</p>
        ) : (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold">Doctor Review</h2>
              <p className="text-slate-300 mt-2">{selected.doctor_summary}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Factors</h3>
              <ul className="list-disc ml-5 text-slate-300 space-y-1">
                {selected.factors.map((f: string) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleFeedback("agree")}
                className="rounded-xl bg-white text-black px-4 py-2 font-semibold"
              >
                Agree
              </button>
              <button
                onClick={() => handleFeedback("adjust")}
                className="rounded-xl border border-slate-700 px-4 py-2 font-semibold"
              >
                Adjust to Escalate
              </button>
            </div>

            {comparison && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-700 p-4">
                  <h4 className="font-semibold mb-2">Before Feedback</h4>
                  <p className="text-slate-300 capitalize">
                    {comparison.before.risk_level} · {comparison.before.recommendation_type}
                  </p>
                  <p className="text-slate-400 mt-2">Score: {comparison.before.risk_score}</p>
                </div>

                <div className="rounded-xl border border-slate-700 p-4">
                  <h4 className="font-semibold mb-2">After Feedback</h4>
                  <p className="text-slate-300 capitalize">
                    {comparison.after.risk_level} · {comparison.after.recommendation_type}
                  </p>
                  <p className="text-slate-400 mt-2">Score: {comparison.after.risk_score}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}