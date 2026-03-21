import { AnalysisResponse, DoctorFeedback, PatientInput } from "../types"

const API_BASE = "http://127.0.0.1:8000"

export async function analyzePatient(input: PatientInput): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/analyze-patient`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error("Failed to analyze patient")
  return res.json()
}

export async function getFlaggedPatients() {
  const res = await fetch(`${API_BASE}/patients/flagged`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch flagged patients")
  return res.json()
}

export async function submitDoctorFeedback(payload: DoctorFeedback) {
  const res = await fetch(`${API_BASE}/doctor-feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error("Failed to submit doctor feedback")
  return res.json()
}

export async function getComparison(patientId: string) {
  const res = await fetch(`${API_BASE}/patient/${patientId}/comparison`, {
    cache: "no-store",
  })
  if (!res.ok) throw new Error("Failed to fetch comparison")
  return res.json()
}