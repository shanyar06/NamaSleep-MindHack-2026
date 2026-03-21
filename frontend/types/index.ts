export type PatientInput = {
  name: string
  age: number
  sleep_duration: number
  awakenings: number
  sleep_efficiency: number
  stress_level: number
  screen_time_before_bed: number
  caffeine_intake: number
  bedtime_consistency: number
  rem_irregularity: number
}

export type AnalysisResponse = {
  patient_id: string
  risk_level: string
  risk_score: number
  recommendation_type: string
  doctor_flag: boolean
  factors: string[]
  patient_summary: string
  doctor_summary: string
}

export type DoctorFeedback = {
  patient_id: string
  doctor_decision: string
  updated_recommendation_type: string
  notes?: string
}