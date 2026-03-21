"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { analyzePatient } from "../../lib/api"
import { PatientInput } from "../../types"

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
  return (
    <div className="text-white">
      <h2>Patient Form Test</h2>
      <button className="rounded-xl bg-white text-black px-5 py-3 font-semibold">
        Test Button
      </button>
    </div>
  )
}