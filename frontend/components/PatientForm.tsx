"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { analyzePatient } from "@/lib/api"
import { PatientInput } from "@/types"

const initialState: PatientInput = {
  name: "Test Patient",
  age: 24,
  sleep_duration: 5.2,
  awakenings: 4,
  sleep_efficiency: 68,
  stress_level: 8,
  screen_time_before_bed: 120,
  caffeine_intake: 3,
  bedtime_consistency: 3,
  rem_irregularity: 0.7,
}

export default function PatientForm() {
  const [form, setForm] = useState<PatientInput>(initialState)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function update<K extends keyof PatientInput>(key: K, value: PatientInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await analyzePatient(form)
      router.push(`/results/${result.patient_id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-2xl mx-auto">
      {[
        ["name", "Name"],
        ["age", "Age"],
        ["sleep_duration", "Sleep Duration (hours)"],
        ["awakenings", "Awakenings"],
        ["sleep_efficiency", "Sleep Efficiency (%)"],
        ["stress_level", "Stress Level (1-10)"],
        ["screen_time_before_bed", "Screen Time Before Bed (min)"],
        ["caffeine_intake", "Caffeine Intake"],
        ["bedtime_consistency", "Bedtime Consistency (1-10)"],
        ["rem_irregularity", "REM Irregularity (0-1)"],
      ].map(([key, label]) => (
        <div key={key} className="space-y-1">
          <label className="block text-sm text-slate-300">{label}</label>
          <input
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2"
            value={String(form[key as keyof PatientInput])}
            onChange={(e) =>
              update(
                key as keyof PatientInput,
                key === "name"
                  ? e.target.value
                  : Number(e.target.value)
              )
            }
          />
        </div>
      ))}

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-white text-black px-5 py-3 font-semibold"
      >
        {loading ? "Analyzing..." : "Analyze Sleep Risk"}
      </button>
    </form>
  )
}