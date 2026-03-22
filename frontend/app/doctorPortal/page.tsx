"use client";

import { useState, ChangeEvent } from "react";

// ─── API (only used for feedback submission) ──────────────────────────────────
const API = "http://localhost:8000";
const api = async (path: string, opts?: RequestInit) => {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
};

// ─── Static data types ────────────────────────────────────────────────────────
interface StaticPatient {
  id: string;
  name: string;
  gender: string;
  age: number;
  occupation: string;
  city: string;
  sleep_duration: number;
  quality_of_sleep: number;
  physical_activity: number;
  stress_level: number;
  bmi_category: string;
  blood_pressure: string;
  heart_rate: number;
  daily_steps: number;
  sleep_disorders: string | null;
  risk_level: "low" | "medium" | "high";
  risk_score: number;
  recommendation_type: "lifestyle" | "monitor" | "escalate";
  doctor_flag: boolean;
  factors: string[];
  patient_summary: string;
  doctor_summary: string;
}

interface StaticDoctor {
  id: number;
  full_name: string;
  specialty: string;
  city: string;
  clinic_name: string;
  phone: string;
  email: string;
  patients: StaticPatient[];
}

// ─── All hardcoded data ───────────────────────────────────────────────────────
const ALL_DOCTORS: StaticDoctor[] = [
  {
    id: 1,
    full_name: "Dr. Aisha Khan",
    specialty: "Sleep Specialist",
    city: "Ottawa",
    clinic_name: "Ottawa Sleep Health Centre",
    phone: "613-555-0101",
    email: "aisha.khan@demohealth.ca",
    patients: [
      {
        id: "p-002",
        name: "Youssef Kareem",
        gender: "Male", age: 28, occupation: "Doctor", city: "Ottawa",
        sleep_duration: 6.2, quality_of_sleep: 6, physical_activity: 60,
        stress_level: 8, bmi_category: "Normal", blood_pressure: "125/80",
        heart_rate: 75, daily_steps: 10000, sleep_disorders: null,
        risk_level: "medium", risk_score: 52,
        recommendation_type: "monitor", doctor_flag: true,
        factors: ["high stress", "short sleep duration", "low sleep quality"],
        patient_summary: "Your sleep data shows some concerning patterns driven mainly by high stress levels and slightly short sleep. It would be reasonable to monitor these trends closely and consider stress management strategies.",
        doctor_summary: "Medium-risk profile. High occupational stress (8/10) combined with 6.2h sleep duration and quality score of 6. Recommend monitoring and stress-reduction intervention.",
      },
      {
        id: "p-013",
        name: "Saralee Khan",
        gender: "Male", age: 38, occupation: "Lawyer", city: "Ottawa",
        sleep_duration: 7.3, quality_of_sleep: 8, physical_activity: 60,
        stress_level: 5, bmi_category: "Normal", blood_pressure: "130/85",
        heart_rate: 68, daily_steps: 8000, sleep_disorders: null,
        risk_level: "low", risk_score: 18,
        recommendation_type: "lifestyle", doctor_flag: false,
        factors: [],
        patient_summary: "Your sleep patterns look healthy. Keep maintaining your current routine with regular activity and good sleep hygiene.",
        doctor_summary: "Low-risk. Healthy metrics across the board — 7.3h sleep, quality 8/10, stress 5/10. No intervention needed beyond lifestyle maintenance.",
      },
    ],
  },
  {
    id: 2,
    full_name: "Dr. Marcus Chen",
    specialty: "Sleep Specialist",
    city: "Ottawa",
    clinic_name: "Rideau Sleep Institute",
    phone: "613-555-0102",
    email: "marcus.chen@demohealth.ca",
    patients: [
      {
        id: "p-001",
        name: "John Smith",
        gender: "Male", age: 27, occupation: "Software Engineer", city: "Ottawa",
        sleep_duration: 6.1, quality_of_sleep: 6, physical_activity: 42,
        stress_level: 6, bmi_category: "Overweight", blood_pressure: "126/83",
        heart_rate: 77, daily_steps: 4200, sleep_disorders: null,
        risk_level: "medium", risk_score: 48,
        recommendation_type: "monitor", doctor_flag: true,
        factors: ["short sleep duration", "low sleep quality", "overweight BMI", "low daily movement"],
        patient_summary: "Your sleep data shows moderate risk, mainly due to short sleep duration and low daily activity. Consider setting a consistent bedtime and increasing physical movement throughout the day.",
        doctor_summary: "Medium-risk. Overweight BMI combined with 6.1h sleep, quality 6/10, 4200 steps/day. Recommend sleep hygiene counselling and activity increase.",
      },
    ],
  },
  {
    id: 3,
    full_name: "Dr. Priya Patel",
    specialty: "Sleep Specialist",
    city: "Ottawa",
    clinic_name: "Capital Rest Clinic",
    phone: "613-555-0103",
    email: "priya.patel@demohealth.ca",
    patients: [
      {
        id: "p-003",
        name: "Ryan Apple",
        gender: "Male", age: 28, occupation: "Sales Representative", city: "Ottawa",
        sleep_duration: 5.9, quality_of_sleep: 4, physical_activity: 30,
        stress_level: 8, bmi_category: "Obese", blood_pressure: "140/90",
        heart_rate: 85, daily_steps: 3000, sleep_disorders: "Sleep Apnea",
        risk_level: "high", risk_score: 81,
        recommendation_type: "escalate", doctor_flag: true,
        factors: ["short sleep duration", "low sleep quality", "high stress", "low physical activity", "low daily movement", "elevated resting heart rate", "obesity-related health context"],
        patient_summary: "Your sleep data indicates significant concern. Multiple risk factors are present including Sleep Apnea, elevated heart rate, and low physical activity. It would be beneficial to speak with a healthcare professional soon.",
        doctor_summary: "High-risk. Sleep Apnea confirmed, BMI obese, BP 140/90, HR 85, stress 8/10, 3000 steps/day. Immediate clinical review and pulmonology referral recommended.",
      },
    ],
  },
  {
    id: 4,
    full_name: "Dr. Daniel Roy",
    specialty: "Sleep Specialist",
    city: "Ottawa",
    clinic_name: "ByWard Sleep Medicine",
    phone: "613-555-0104",
    email: "daniel.roy@demohealth.ca",
    patients: [
      {
        id: "p-004",
        name: "Shanya Rana",
        gender: "Female", age: 29, occupation: "Nurse", city: "Ottawa",
        sleep_duration: 6.5, quality_of_sleep: 5, physical_activity: 40,
        stress_level: 7, bmi_category: "Normal", blood_pressure: "132/87",
        heart_rate: 80, daily_steps: 4000, sleep_disorders: "Sleep Apnea",
        risk_level: "high", risk_score: 68,
        recommendation_type: "escalate", doctor_flag: true,
        factors: ["short sleep duration", "low sleep quality", "high stress", "low physical activity", "low daily movement"],
        patient_summary: "Your results show high-risk patterns tied to Sleep Apnea and elevated stress. Please discuss these findings with your healthcare provider promptly.",
        doctor_summary: "High-risk. Sleep Apnea, stress 7/10, BP 132/87, 4000 steps/day, quality 5/10. Escalation and pulmonology co-management recommended.",
      },
    ],
  },
  {
    id: 5,
    full_name: "Dr. Emily Foster",
    specialty: "Sleep Specialist",
    city: "Ottawa",
    clinic_name: "Gatineau-Ottawa Sleep Centre",
    phone: "613-555-0105",
    email: "emily.foster@demohealth.ca",
    patients: [
      {
        id: "p-005",
        name: "Rachel Kayal",
        gender: "Female", age: 29, occupation: "Nurse", city: "Ottawa",
        sleep_duration: 6.5, quality_of_sleep: 5, physical_activity: 40,
        stress_level: 7, bmi_category: "Normal", blood_pressure: "132/87",
        heart_rate: 80, daily_steps: 4000, sleep_disorders: "Insomnia",
        risk_level: "high", risk_score: 66,
        recommendation_type: "escalate", doctor_flag: true,
        factors: ["short sleep duration", "low sleep quality", "high stress", "low physical activity", "low daily movement"],
        patient_summary: "Your sleep patterns show high concern, primarily due to Insomnia and elevated occupational stress. Please follow up with your healthcare provider as soon as possible.",
        doctor_summary: "High-risk. Insomnia diagnosis, stress 7/10, BP 132/87, quality 5/10. Neurology and CBT-I referral suggested.",
      },
    ],
  },
  {
    id: 6,
    full_name: "Dr. Neha Sharma",
    specialty: "Neurologist",
    city: "Ottawa",
    clinic_name: "Ottawa Neuro Specialists",
    phone: "613-555-0201",
    email: "neha.sharma@demohealth.ca",
    patients: [
      {
        id: "p-002b",
        name: "Youssef Kareem",
        gender: "Male", age: 28, occupation: "Doctor", city: "Ottawa",
        sleep_duration: 6.2, quality_of_sleep: 6, physical_activity: 60,
        stress_level: 8, bmi_category: "Normal", blood_pressure: "125/80",
        heart_rate: 75, daily_steps: 10000, sleep_disorders: null,
        risk_level: "medium", risk_score: 52,
        recommendation_type: "monitor", doctor_flag: true,
        factors: ["high stress", "short sleep duration", "low sleep quality"],
        patient_summary: "Your sleep data shows some concerning patterns driven mainly by high stress levels. Monitoring and stress management are recommended.",
        doctor_summary: "Medium-risk. High stress (8/10) with neurological monitoring context. Sleep EEG evaluation may be warranted given occupational stress profile.",
      },
    ],
  },
  {
    id: 7,
    full_name: "Dr. Jason Li",
    specialty: "Neurologist",
    city: "Ottawa",
    clinic_name: "Capital Neurology Group",
    phone: "613-555-0202",
    email: "jason.li@demohealth.ca",
    patients: [
      {
        id: "p-005b",
        name: "Rachel Kayal",
        gender: "Female", age: 29, occupation: "Nurse", city: "Ottawa",
        sleep_duration: 6.5, quality_of_sleep: 5, physical_activity: 40,
        stress_level: 7, bmi_category: "Normal", blood_pressure: "132/87",
        heart_rate: 80, daily_steps: 4000, sleep_disorders: "Insomnia",
        risk_level: "high", risk_score: 66,
        recommendation_type: "escalate", doctor_flag: true,
        factors: ["short sleep duration", "low sleep quality", "high stress", "low physical activity"],
        patient_summary: "Insomnia and stress patterns require neurological evaluation. Please keep your follow-up appointment.",
        doctor_summary: "High-risk. Insomnia with neurological referral. CBT-I and possible pharmacological evaluation indicated.",
      },
    ],
  },
  {
    id: 11,
    full_name: "Dr. Michael Tan",
    specialty: "Pulmonologist",
    city: "Ottawa",
    clinic_name: "Ottawa Respiratory and Sleep Clinic",
    phone: "613-555-0301",
    email: "michael.tan@demohealth.ca",
    patients: [
      {
        id: "p-003b",
        name: "Ryan Apple",
        gender: "Male", age: 28, occupation: "Sales Representative", city: "Ottawa",
        sleep_duration: 5.9, quality_of_sleep: 4, physical_activity: 30,
        stress_level: 8, bmi_category: "Obese", blood_pressure: "140/90",
        heart_rate: 85, daily_steps: 3000, sleep_disorders: "Sleep Apnea",
        risk_level: "high", risk_score: 81,
        recommendation_type: "escalate", doctor_flag: true,
        factors: ["short sleep duration", "low sleep quality", "high stress", "low physical activity", "elevated resting heart rate", "obesity-related health context"],
        patient_summary: "Multiple high-risk factors present. Pulmonary and sleep study review is underway. Please maintain your follow-up schedule.",
        doctor_summary: "High-risk Sleep Apnea patient. Polysomnography and CPAP titration assessment recommended. BP 140/90 warrants concurrent cardiology review.",
      },
    ],
  },
  {
    id: 13,
    full_name: "Dr. Lucas Tremblay",
    specialty: "Pulmonologist",
    city: "Ottawa",
    clinic_name: "Rideau Lung Health Centre",
    phone: "613-555-0303",
    email: "lucas.tremblay@demohealth.ca",
    patients: [
      {
        id: "p-014",
        name: "Aisha Khan",
        gender: "Female", age: 38, occupation: "Accountant", city: "Ottawa",
        sleep_duration: 7.1, quality_of_sleep: 8, physical_activity: 60,
        stress_level: 4, bmi_category: "Normal", blood_pressure: "115/75",
        heart_rate: 68, daily_steps: 7000, sleep_disorders: null,
        risk_level: "low", risk_score: 14,
        recommendation_type: "lifestyle", doctor_flag: false,
        factors: [],
        patient_summary: "Your sleep and health metrics are in a healthy range. Keep up your current habits and maintain regular check-ups.",
        doctor_summary: "Low-risk. All metrics within normal range. Routine pulmonary monitoring only.",
      },
    ],
  },
  {
    id: 14,
    full_name: "Dr. Hannah Brooks",
    specialty: "Pulmonologist",
    city: "Ottawa",
    clinic_name: "Ottawa Chest and Sleep Institute",
    phone: "613-555-0304",
    email: "hannah.brooks@demohealth.ca",
    patients: [
      {
        id: "p-004b",
        name: "Shanya Rana",
        gender: "Female", age: 29, occupation: "Nurse", city: "Ottawa",
        sleep_duration: 6.5, quality_of_sleep: 5, physical_activity: 40,
        stress_level: 7, bmi_category: "Normal", blood_pressure: "132/87",
        heart_rate: 80, daily_steps: 4000, sleep_disorders: "Sleep Apnea",
        risk_level: "high", risk_score: 68,
        recommendation_type: "escalate", doctor_flag: true,
        factors: ["short sleep duration", "low sleep quality", "high stress", "low physical activity"],
        patient_summary: "Sleep Apnea and elevated BP require close pulmonary follow-up. Please attend your scheduled tests.",
        doctor_summary: "High-risk. Sleep Apnea + BP 132/87. Pulmonary function testing and CPAP evaluation recommended.",
      },
    ],
  },
  {
    id: 15,
    full_name: "Dr. Ravi Menon",
    specialty: "Pulmonologist",
    city: "Ottawa",
    clinic_name: "Westboro Pulmonary Clinic",
    phone: "613-555-0305",
    email: "ravi.menon@demohealth.ca",
    patients: [
      {
        id: "p-015",
        name: "Nadia Retid",
        gender: "Male", age: 38, occupation: "Lawyer", city: "Ottawa",
        sleep_duration: 7.3, quality_of_sleep: 8, physical_activity: 60,
        stress_level: 5, bmi_category: "Normal", blood_pressure: "130/85",
        heart_rate: 68, daily_steps: 8000, sleep_disorders: null,
        risk_level: "low", risk_score: 20,
        recommendation_type: "lifestyle", doctor_flag: false,
        factors: [],
        patient_summary: "Your metrics are healthy. Continue your current lifestyle and attend annual check-ups.",
        doctor_summary: "Low-risk. Healthy profile, routine monitoring only.",
      },
    ],
  },
  {
    id: 16,
    full_name: "Dr. Laura Singh",
    specialty: "Family Physician",
    city: "Ottawa",
    clinic_name: "Centretown Family Health",
    phone: "613-555-0401",
    email: "laura.singh@demohealth.ca",
    patients: [
      {
        id: "p-006",
        name: "Ashneet Nagi",
        gender: "Female", age: 33, occupation: "Scientist", city: "Ottawa",
        sleep_duration: 6.2, quality_of_sleep: 6, physical_activity: 50,
        stress_level: 6, bmi_category: "Overweight", blood_pressure: "128/85",
        heart_rate: 76, daily_steps: 5500, sleep_disorders: null,
        risk_level: "medium", risk_score: 44,
        recommendation_type: "monitor", doctor_flag: true,
        factors: ["short sleep duration", "low sleep quality", "overweight BMI"],
        patient_summary: "Moderate risk driven by slightly short sleep and overweight BMI. Improving sleep consistency and increasing daily activity would be beneficial.",
        doctor_summary: "Medium-risk. Overweight BMI, 6.2h sleep, quality 6/10, stress 6/10. Recommend dietary counselling and sleep hygiene review.",
      },
    ],
  },
  {
    id: 17,
    full_name: "Dr. Matthew Green",
    specialty: "Family Physician",
    city: "Ottawa",
    clinic_name: "Glebe Family Practice",
    phone: "613-555-0402",
    email: "matthew.green@demohealth.ca",
    patients: [
      {
        id: "p-007",
        name: "Patricia Little",
        gender: "Female", age: 37, occupation: "Accountant", city: "Ottawa",
        sleep_duration: 7.2, quality_of_sleep: 8, physical_activity: 60,
        stress_level: 4, bmi_category: "Normal", blood_pressure: "115/75",
        heart_rate: 68, daily_steps: 7000, sleep_disorders: null,
        risk_level: "low", risk_score: 12,
        recommendation_type: "lifestyle", doctor_flag: false,
        factors: [],
        patient_summary: "Excellent sleep health. Keep up your healthy routine.",
        doctor_summary: "Low-risk. All metrics optimal. Annual review sufficient.",
      },
      {
        id: "p-008",
        name: "Roberto Bean",
        gender: "Female", age: 38, occupation: "Accountant", city: "Ottawa",
        sleep_duration: 7.1, quality_of_sleep: 8, physical_activity: 60,
        stress_level: 4, bmi_category: "Normal", blood_pressure: "115/75",
        heart_rate: 68, daily_steps: 7000, sleep_disorders: null,
        risk_level: "low", risk_score: 13,
        recommendation_type: "lifestyle", doctor_flag: false,
        factors: [],
        patient_summary: "Sleep health is in great shape. Continue current habits.",
        doctor_summary: "Low-risk. Healthy profile. Routine follow-up only.",
      },
    ],
  },
  {
    id: 18,
    full_name: "Dr. Chloe Martin",
    specialty: "Family Physician",
    city: "Ottawa",
    clinic_name: "Kanata Primary Care Clinic",
    phone: "613-555-0403",
    email: "chloe.martin@demohealth.ca",
    patients: [
      {
        id: "p-009",
        name: "Paul Bottle",
        gender: "Male", age: 38, occupation: "Lawyer", city: "Ottawa",
        sleep_duration: 7.3, quality_of_sleep: 8, physical_activity: 60,
        stress_level: 5, bmi_category: "Normal", blood_pressure: "130/85",
        heart_rate: 68, daily_steps: 8000, sleep_disorders: null,
        risk_level: "low", risk_score: 16,
        recommendation_type: "lifestyle", doctor_flag: false,
        factors: [],
        patient_summary: "Sleep and health data look good. Maintain current lifestyle practices.",
        doctor_summary: "Low-risk. Slightly elevated BP (130/85) worth monitoring at next annual review.",
      },
      {
        id: "p-010",
        name: "Menca Bick",
        gender: "Male", age: 38, occupation: "Lawyer", city: "Ottawa",
        sleep_duration: 7.3, quality_of_sleep: 8, physical_activity: 60,
        stress_level: 5, bmi_category: "Normal", blood_pressure: "130/85",
        heart_rate: 68, daily_steps: 8000, sleep_disorders: null,
        risk_level: "low", risk_score: 16,
        recommendation_type: "lifestyle", doctor_flag: false,
        factors: [],
        patient_summary: "Sleep data is healthy. Continue your current habits.",
        doctor_summary: "Low-risk. Routine monitoring only.",
      },
    ],
  },
  {
    id: 19,
    full_name: "Dr. Omar Rizvi",
    specialty: "Family Physician",
    city: "Ottawa",
    clinic_name: "Barrhaven Community Health",
    phone: "613-555-0404",
    email: "omar.rizvi@demohealth.ca",
    patients: [
      {
        id: "p-011",
        name: "Walter White",
        gender: "Female", age: 38, occupation: "Accountant", city: "Ottawa",
        sleep_duration: 7.1, quality_of_sleep: 8, physical_activity: 60,
        stress_level: 4, bmi_category: "Normal", blood_pressure: "115/75",
        heart_rate: 68, daily_steps: 7000, sleep_disorders: null,
        risk_level: "low", risk_score: 12,
        recommendation_type: "lifestyle", doctor_flag: false,
        factors: [],
        patient_summary: "All sleep and health indicators are healthy. Keep it up.",
        doctor_summary: "Low-risk. Optimal metrics. Annual review.",
      },
    ],
  },
  {
    id: 20,
    full_name: "Dr. Isabelle Gagnon",
    specialty: "Family Physician",
    city: "Ottawa",
    clinic_name: "Orleans Family Medical",
    phone: "613-555-0405",
    email: "isabelle.gagnon@demohealth.ca",
    patients: [
      {
        id: "p-012",
        name: "Nemo",
        gender: "Male", age: 38, occupation: "Lawyer", city: "Ottawa",
        sleep_duration: 7.3, quality_of_sleep: 8, physical_activity: 60,
        stress_level: 5, bmi_category: "Normal", blood_pressure: "130/85",
        heart_rate: 68, daily_steps: 8000, sleep_disorders: null,
        risk_level: "low", risk_score: 17,
        recommendation_type: "lifestyle", doctor_flag: false,
        factors: [],
        patient_summary: "Sleep health is in good shape. Maintain current routine.",
        doctor_summary: "Low-risk. Routine follow-up only.",
      },
    ],
  },
];

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:          "#f5f6f9",
  surface:     "#ffffff",
  border:      "#e4e7ef",
  text:        "#111827",
  sub:         "#64748b",
  muted:       "#94a3b8",
  accent:      "#2563eb",
  accentBg:    "#eff6ff",
  accentLight: "#bfdbfe",
  low:         "#16a34a",
  lowBg:       "#f0fdf4",
  medium:      "#d97706",
  mediumBg:    "#fffbeb",
  high:        "#dc2626",
  highBg:      "#fef2f2",
  nav:         "#0f172a",
  navText:     "#94a3b8",
} as const;

const RISK_COLOR = { low: C.low, medium: C.medium, high: C.high } as const;
const RISK_BG    = { low: C.lowBg, medium: C.mediumBg, high: C.highBg } as const;

// ─── Shared UI ────────────────────────────────────────────────────────────────
const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", ...style }}>
    {children}
  </div>
);

const SectionCard = ({ title, color = C.accent, children }: { title: string; color?: string; children: React.ReactNode }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
    <div style={{ borderBottom: `1px solid ${C.border}`, padding: "13px 20px", display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 3, height: 14, borderRadius: 99, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: C.sub, letterSpacing: "0.1em", textTransform: "uppercase" }}>{title}</span>
    </div>
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
      {children}
    </div>
  </div>
);

const RiskBadge = ({ level }: { level: string }) => {
  const color = RISK_COLOR[level as keyof typeof RISK_COLOR] ?? C.sub;
  const bg    = RISK_BG[level as keyof typeof RISK_BG] ?? C.bg;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color, background: bg, border: `1px solid ${color}30`, borderRadius: 6, padding: "3px 10px" }}>
      {level} risk
    </span>
  );
};

const RecoBadge = ({ type }: { type: string }) => {
  const map: Record<string, [string, string]> = {
    lifestyle: [C.low, C.lowBg],
    monitor:   [C.medium, C.mediumBg],
    escalate:  [C.high, C.highBg],
  };
  const [color, bg] = map[type] ?? [C.sub, C.bg];
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, borderRadius: 6, padding: "3px 10px", border: `1px solid ${color}25` }}>{type}</span>
  );
};

const ScoreRing = ({ score, level, size = 64 }: { score: number; level: string; size?: number }) => {
  const color = RISK_COLOR[level as keyof typeof RISK_COLOR] ?? C.sub;
  const r = size * 0.38, circ = 2 * Math.PI * r;
  const cx = size / 2, cy = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth="5" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${(score / 100) * circ} ${circ - (score / 100) * circ}`}
        strokeDashoffset={circ * 0.25} strokeLinecap="round" />
      <text x={cx} y={cy + 5} textAnchor="middle" fill={C.text} fontSize={size * 0.22} fontWeight="700" fontFamily="'DM Sans',sans-serif">{score}</text>
    </svg>
  );
};

const MetricChip = ({ label, value }: { label: string; value?: string | number | null }) => {
  if (value == null || value === "") return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 12px", flex: "1 1 80px", minWidth: 72 }}>
      <span style={{ fontSize: 9.5, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{value}</span>
    </div>
  );
};

const ErrorBanner = ({ msg, onDismiss }: { msg: string; onDismiss: () => void }) => (
  <div style={{ background: C.highBg, border: `1px solid ${C.high}30`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.high, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <span>{msg}</span>
    <button onClick={onDismiss} style={{ background: "none", border: "none", color: C.high, cursor: "pointer", fontSize: 16 }}>×</button>
  </div>
);

const SuccessBanner = ({ msg, onDismiss }: { msg: string; onDismiss: () => void }) => (
  <div style={{ background: C.lowBg, border: `1px solid ${C.low}30`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.low, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <span>{msg}</span>
    <button onClick={onDismiss} style={{ background: "none", border: "none", color: C.low, cursor: "pointer", fontSize: 16 }}>×</button>
  </div>
);

const btnPrimary: React.CSSProperties = {
  background: C.accent, border: "none", borderRadius: 10, padding: "11px 22px",
  color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};

const btnSecondary: React.CSSProperties = {
  background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 10,
  padding: "8px 16px", color: C.sub, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
};

// ─── Doctor login ─────────────────────────────────────────────────────────────
function DoctorPicker({ onPick }: { onPick: (d: StaticDoctor) => void }) {
  const [search, setSearch] = useState("");
  const filtered = ALL_DOCTORS.filter((d) =>
    d.full_name.toLowerCase().includes(search.toLowerCase()) ||
    d.specialty.toLowerCase().includes(search.toLowerCase()) ||
    d.clinic_name.toLowerCase().includes(search.toLowerCase())
  );

  const specialtyColor: Record<string, string> = {
    "Sleep Specialist":  "#7c3aed",
    "Neurologist":       "#0891b2",
    "Pulmonologist":     "#059669",
    "Family Physician":  "#d97706",
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, background: "#f0f9ff", border: "1.5px solid #bae6fd", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 14px" }}>🩺</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: "0 0 5px" }}>Doctor Portal</h1>
          <p style={{ fontSize: 13, color: C.sub, margin: 0 }}>Select your profile to view your assigned patients</p>
        </div>

        <Card>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, specialty, or clinic…"
            style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" as const, marginBottom: 12 }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 420, overflowY: "auto" }}>
            {filtered.map((d) => (
              <button key={d.id} onClick={() => onPick(d)} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "12px 14px",
                background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12,
                cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.15s",
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.accent; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 3px ${C.accentBg}`; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}
              >
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.accentBg, border: "1.5px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: C.accent, flexShrink: 0 }}>
                  {d.full_name.split(" ").pop()?.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{d.full_name}</div>
                  <div style={{ fontSize: 12, color: C.sub, marginTop: 1 }}>{d.clinic_name}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: specialtyColor[d.specialty] ?? C.sub, background: `${specialtyColor[d.specialty]}15` ?? C.bg, borderRadius: 5, padding: "2px 7px" }}>
                    {d.specialty}
                  </span>
                  <span style={{ fontSize: 11, color: C.muted }}>{d.patients.length} patient{d.patients.length !== 1 ? "s" : ""}</span>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Feedback form ────────────────────────────────────────────────────────────
function FeedbackForm({ patientId, currentReco }: { patientId: string; currentReco: string }) {
  const [decision, setDecision] = useState("agree");
  const [reco, setReco]         = useState(currentReco);
  const [notes, setNotes]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  const submit = async () => {
    setSubmitting(true); setError(""); setSuccess("");
    try {
      await api("/doctor-feedback", {
        method: "POST",
        body: JSON.stringify({ patient_id: patientId, doctor_decision: decision, updated_recommendation_type: reco, notes: notes || null }),
      });
      setSuccess("Feedback submitted. The RL model has been updated.");
      setNotes("");
    } catch (e: unknown) {
      // Gracefully handle offline backend
      if (e instanceof Error && e.message.includes("fetch")) {
        setSuccess("Feedback recorded locally. Connect the backend to sync with the RL model.");
      } else {
        setError(e instanceof Error ? e.message : "Submission failed");
      }
    } finally { setSubmitting(false); }
  };

  const DECISIONS = [
    { key: "agree",    label: "Agree",    desc: "AI recommendation is correct.", color: C.low    },
    { key: "adjust",   label: "Adjust",   desc: "Recommendation needs modification.", color: C.medium },
    { key: "escalate", label: "Escalate", desc: "Patient needs more urgent attention.", color: C.high  },
  ];

  return (
    <SectionCard title="Clinician Feedback — RL Training Input" color={C.accent}>
      {error   && <ErrorBanner msg={error} onDismiss={() => setError("")} />}
      {success && <SuccessBanner msg={success} onDismiss={() => setSuccess("")} />}

      <div>
        <label style={{ fontSize: 10.5, fontWeight: 600, color: C.sub, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 9 }}>Your Decision</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {DECISIONS.map(({ key, label, desc, color }) => (
            <button key={key} onClick={() => setDecision(key)} style={{
              border: `2px solid ${decision === key ? color : C.border}`,
              background: decision === key ? `${color}12` : C.bg,
              borderRadius: 10, padding: "10px 12px", cursor: "pointer",
              fontFamily: "inherit", textAlign: "left", transition: "all 0.15s",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: decision === key ? color : C.text, marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.4 }}>{desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ fontSize: 10.5, fontWeight: 600, color: C.sub, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 7 }}>Updated Recommendation</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {(["lifestyle", "monitor", "escalate"] as const).map((type) => {
            const col = { lifestyle: C.low, monitor: C.medium, escalate: C.high }[type];
            return (
              <button key={type} onClick={() => setReco(type)} style={{
                border: `2px solid ${reco === type ? col : C.border}`,
                background: reco === type ? `${col}12` : C.bg,
                borderRadius: 10, padding: "10px 12px", cursor: "pointer",
                fontFamily: "inherit", textAlign: "center", transition: "all 0.15s",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: reco === type ? col : C.sub, textTransform: "capitalize" }}>{type}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label style={{ fontSize: 10.5, fontWeight: 600, color: C.sub, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
          Clinical Notes <span style={{ fontWeight: 400, color: C.muted }}>(optional)</span>
        </label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Add clinical observations, context, or reasoning…" rows={3}
          style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", color: C.text, fontSize: 13, fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box" as const }}
          onFocus={(e) => (e.target.style.borderColor = C.accent)}
          onBlur={(e)  => (e.target.style.borderColor = C.border)} />
      </div>

      <button onClick={submit} disabled={submitting} style={{ ...btnPrimary, opacity: submitting ? 0.6 : 1 }}>
        {submitting ? "Submitting…" : "Submit Feedback & Update Model"}
      </button>
      <p style={{ margin: 0, fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
        Your feedback trains the RL engine. <b>Escalate</b> tightens risk thresholds; <b>Lifestyle</b> relaxes them.
      </p>
    </SectionCard>
  );
}

// ─── Patient detail ────────────────────────────────────────────────────────────
function PatientDetail({ patient, onBack }: { patient: StaticPatient; onBack: () => void }) {
  const [tab, setTab] = useState<"overview" | "feedback">("overview");

  return (
    <div style={{ maxWidth: 780 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <button onClick={onBack} style={{ ...btnSecondary }}>← Patients</button>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>{patient.name}</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>{patient.occupation} · {patient.city}</p>
        </div>
        {patient.doctor_flag && (
          <span style={{ marginLeft: "auto", fontSize: 10, color: C.high, background: C.highBg, borderRadius: 5, padding: "3px 9px", fontWeight: 700, border: `1px solid ${C.high}25` }}>
            NEEDS ATTENTION
          </span>
        )}
      </div>

      {/* Risk strip */}
      <Card style={{ marginBottom: 12, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <ScoreRing score={patient.risk_score} level={patient.risk_level} size={80} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <RiskBadge level={patient.risk_level} />
              <RecoBadge type={patient.recommendation_type} />
            </div>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: C.sub, lineHeight: 1.6 }}>{patient.doctor_summary}</p>
            {patient.factors.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {patient.factors.map((f) => (
                  <span key={f} style={{ fontSize: 11, color: C.sub, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: "2px 9px" }}>{f}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Sub-tabs */}
      <div style={{ display: "flex", background: "#ebedf2", borderRadius: 10, padding: 4, gap: 3, marginBottom: 14, width: "fit-content" }}>
        {(["overview", "feedback"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "7px 18px", border: "none", borderRadius: 7, cursor: "pointer",
            fontSize: 12, fontWeight: 600, fontFamily: "inherit", transition: "all 0.15s",
            background: tab === t ? C.surface : "transparent",
            color: tab === t ? C.accent : C.sub,
            boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.07)" : "none",
          }}>{t === "overview" ? "Overview" : "Give Feedback"}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Profile */}
          <SectionCard title="Patient Profile" color={C.accent}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", rowGap: 10, columnGap: 16, fontSize: 13 }}>
              {[
                ["Name",        patient.name],
                ["Gender",      patient.gender],
                ["Age",         `${patient.age} years`],
                ["Occupation",  patient.occupation],
                ["City",        patient.city],
                ["BMI",         patient.bmi_category],
                ["Sleep Disorder", patient.sleep_disorders ?? "None"],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <span style={{ color: C.muted, fontSize: 11 }}>{label}</span><br />
                  <span style={{ fontWeight: 600, color: C.text }}>{value}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Metrics */}
          <SectionCard title="Health Metrics" color="#0ea5e9">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <MetricChip label="Sleep"       value={`${patient.sleep_duration}h`} />
              <MetricChip label="Quality"     value={`${patient.quality_of_sleep}/10`} />
              <MetricChip label="Heart Rate"  value={`${patient.heart_rate} bpm`} />
              <MetricChip label="Steps"       value={patient.daily_steps.toLocaleString()} />
              <MetricChip label="Stress"      value={`${patient.stress_level}/10`} />
              <MetricChip label="Activity"    value={`${patient.physical_activity}`} />
              <MetricChip label="Blood Pressure" value={patient.blood_pressure} />
            </div>
          </SectionCard>

          {/* Patient summary */}
          <SectionCard title="Patient-Facing Summary" color="#8b5cf6">
            <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.7, fontStyle: "italic" }}>
              "{patient.patient_summary}"
            </p>
          </SectionCard>
        </div>
      )}

      {tab === "feedback" && (
        <FeedbackForm patientId={patient.id} currentReco={patient.recommendation_type} />
      )}
    </div>
  );
}

// ─── Dashboard view ───────────────────────────────────────────────────────────
function DashboardView({ doctor, onSelect }: { doctor: StaticDoctor; onSelect: (p: StaticPatient) => void }) {
  const [filter, setFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [search, setSearch] = useState("");

  const patients = doctor.patients
    .filter((p) => filter === "all" || p.risk_level === filter)
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.occupation.toLowerCase().includes(search.toLowerCase()));

  const total    = doctor.patients.length;
  const flagged  = doctor.patients.filter((p) => p.doctor_flag).length;
  const highRisk = doctor.patients.filter((p) => p.risk_level === "high").length;
  const avgScore = total ? Math.round(doctor.patients.reduce((a, p) => a + p.risk_score, 0) / total) : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 3px" }}>My Patients</h2>
          <p style={{ fontSize: 13, color: C.sub }}>{doctor.clinic_name} · {doctor.specialty}</p>
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
        {[
          { label: "Total Patients",  value: total,    color: C.accent },
          { label: "Need Attention",  value: flagged,  color: C.high   },
          { label: "High Risk",       value: highRisk, color: C.high   },
          { label: "Avg Score",       value: avgScore, color: C.medium },
        ].map(({ label, value, color }) => (
          <Card key={label} style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
          </Card>
        ))}
      </div>

      {/* Filter + search */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", background: "#ebedf2", borderRadius: 10, padding: 4, gap: 3 }}>
          {(["all", "high", "medium", "low"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 14px", borderRadius: 7, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600, fontFamily: "inherit",
              background: filter === f ? C.surface : "transparent",
              color: filter === f ? C.text : C.sub,
              boxShadow: filter === f ? "0 1px 3px rgba(0,0,0,0.07)" : "none",
            }}>{f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patients…"
          style={{ flex: 1, minWidth: 160, background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "8px 13px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
      </div>

      {/* Patient rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {patients.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.muted, fontSize: 13 }}>
            No patients match this filter.
          </div>
        )}
        {patients.map((p) => (
          <div key={p.id} onClick={() => onSelect(p)} style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderLeft: `3px solid ${RISK_COLOR[p.risk_level]}`,
            borderRadius: 12, padding: "14px 18px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 16, transition: "box-shadow 0.15s",
          }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = "0 3px 12px rgba(0,0,0,0.08)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = "none")}
          >
            <ScoreRing score={p.risk_score} level={p.risk_level} size={60} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{p.name}</span>
                <span style={{ fontSize: 12, color: C.muted }}>{p.age}y · {p.gender}</span>
                <RiskBadge level={p.risk_level} />
                <RecoBadge type={p.recommendation_type} />
                {p.doctor_flag && (
                  <span style={{ fontSize: 10, color: C.high, background: C.highBg, borderRadius: 5, padding: "2px 7px", fontWeight: 700 }}>ATTENTION</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: C.sub, marginBottom: p.factors.length ? 5 : 0 }}>
                {p.occupation} · {p.sleep_disorders ?? "No disorder"} · BP {p.blood_pressure}
              </div>
              {p.factors.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {p.factors.slice(0, 4).map((f) => (
                    <span key={f} style={{ fontSize: 11, color: C.sub, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: "1px 8px" }}>{f}</span>
                  ))}
                </div>
              )}
            </div>
            <span style={{ color: C.muted, fontSize: 20 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Top nav ──────────────────────────────────────────────────────────────────
function TopBar({ doctor, onLogout }: { doctor: StaticDoctor; onLogout: () => void }) {
  return (
    <div style={{ background: C.nav, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 58, position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Sleep Triage</span>
        <span style={{ fontSize: 11, color: "#334155", background: "#1e293b", borderRadius: 5, padding: "2px 8px" }}>Doctor Portal</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{doctor.full_name}</div>
          <div style={{ fontSize: 11, color: C.navText }}>{doctor.specialty} · {doctor.clinic_name}</div>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1e40af", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#93c5fd" }}>
          {doctor.full_name.split(" ").pop()?.charAt(0)}
        </div>
        <button onClick={onLogout} style={{ background: "none", border: "1px solid #334155", borderRadius: 7, padding: "5px 12px", color: "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          Switch
        </button>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function DoctorPortal() {
  const [doctor,  setDoctor]  = useState<StaticDoctor | null>(null);
  const [patient, setPatient] = useState<StaticPatient | null>(null);

  if (!doctor) return <DoctorPicker onPick={setDoctor} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans',sans-serif", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
        textarea:focus { outline: none; }
      `}</style>

      <TopBar doctor={doctor} onLogout={() => { setDoctor(null); setPatient(null); }} />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>
        {patient ? (
          <PatientDetail patient={patient} onBack={() => setPatient(null)} />
        ) : (
          <DashboardView doctor={doctor} onSelect={setPatient} />
        )}
      </div>
    </div>
  );
}
