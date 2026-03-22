"use client"
import { useState, useEffect, useCallback } from "react";

// ─── API ──────────────────────────────────────────────────────────────────────
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

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnalysisResponse {
  patient_id: string;
  risk_level: "low" | "medium" | "high";
  risk_score: number;
  recommendation_type: "lifestyle" | "monitor" | "escalate";
  doctor_flag: boolean;
  factors: string[];
  patient_summary: string;
  doctor_summary: string;
}

interface DashboardPatient {
  patient_id: string;
  name: string;
  age: number;
  gender: string;
  occupation: string;
  city: string;
  risk_level: "low" | "medium" | "high";
  risk_score: number;
  recommendation_type: string;
  doctor_flag: boolean;
  needs_attention: boolean;
  factors: string[];
}

interface PatientDetail {
  patient_id: string;
  profile: Record<string, unknown>;
  latest: AnalysisResponse;
  history: HistoryEntry[];
  latest_feedback: Record<string, unknown> | null;
  comparison: { before: AnalysisResponse; after: AnalysisResponse } | null;
  needs_attention: boolean;
}

interface HistoryEntry {
  label: string;
  sleep_duration?: number;
  quality_of_sleep?: number;
  physical_activity?: number;
  stress_level?: number;
  heart_rate?: number;
  daily_steps?: number;
  risk_score: number;
  risk_level: string;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#f0f2f5",
  surface: "#ffffff",
  border: "#e2e5ec",
  text: "#0f172a",
  sub: "#64748b",
  muted: "#94a3b8",
  accent: "#2563eb",
  accentBg: "#eff6ff",
  accentLight: "#bfdbfe",
  low: "#16a34a",
  lowBg: "#f0fdf4",
  medium: "#d97706",
  mediumBg: "#fffbeb",
  high: "#dc2626",
  highBg: "#fef2f2",
  sidebar: "#0f172a",
  sidebarText: "#94a3b8",
  sidebarActive: "#2563eb",
} as const;

const RISK_COLOR = { low: C.low, medium: C.medium, high: C.high } as const;
const RISK_BG = { low: C.lowBg, medium: C.mediumBg, high: C.highBg } as const;

// ─── Shared components ────────────────────────────────────────────────────────
const Badge = ({ level }: { level: string }) => {
  const color = RISK_COLOR[level as keyof typeof RISK_COLOR] ?? C.sub;
  const bg = RISK_BG[level as keyof typeof RISK_BG] ?? C.bg;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
      textTransform: "uppercase", color, background: bg,
      border: `1px solid ${color}30`, borderRadius: 6, padding: "2px 8px",
    }}>{level}</span>
  );
};

const RecoBadge = ({ type }: { type: string }) => {
  const map: Record<string, [string, string]> = {
    lifestyle: ["#16a34a", "#f0fdf4"],
    monitor: ["#d97706", "#fffbeb"],
    escalate: ["#dc2626", "#fef2f2"],
  };
  const [color, bg] = map[type] ?? [C.sub, C.bg];
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color, background: bg,
      borderRadius: 6, padding: "2px 8px", border: `1px solid ${color}25`,
    }}>{type}</span>
  );
};

const ScoreRing = ({ score, level }: { score: number; level: string }) => {
  const color = RISK_COLOR[level as keyof typeof RISK_COLOR] ?? C.sub;
  const r = 28, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width="70" height="70" viewBox="0 0 70 70">
      <circle cx="35" cy="35" r={r} fill="none" stroke={C.border} strokeWidth="6" />
      <circle cx="35" cy="35" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round" />
      <text x="35" y="39" textAnchor="middle" fill={C.text} fontSize="15" fontWeight="700" fontFamily="'DM Sans',sans-serif">{score}</text>
    </svg>
  );
};

const FactorPill = ({ text }: { text: string }) => (
  <span style={{
    fontSize: 11, color: C.sub, background: C.bg,
    border: `1px solid ${C.border}`, borderRadius: 20,
    padding: "2px 10px",
  }}>{text}</span>
);

const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", ...style }}>
    {children}
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
    {children}
  </div>
);

const Spinner = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
    <div style={{
      width: 28, height: 28, borderRadius: "50%",
      border: `3px solid ${C.border}`,
      borderTopColor: C.accent,
      animation: "spin 0.7s linear infinite",
    }} />
  </div>
);

const ErrorBanner = ({ msg, onDismiss }: { msg: string; onDismiss: () => void }) => (
  <div style={{
    background: C.highBg, border: `1px solid ${C.high}30`, borderRadius: 10,
    padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.high,
    display: "flex", justifyContent: "space-between", alignItems: "center",
  }}>
    <span>{msg}</span>
    <button onClick={onDismiss} style={{ background: "none", border: "none", color: C.high, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
  </div>
);

const inputCls: React.CSSProperties = {
  background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 9,
  padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: "inherit",
  outline: "none", width: "100%", boxSizing: "border-box", colorScheme: "light" as React.CSSProperties["colorScheme"],
};

const btnPrimary: React.CSSProperties = {
  background: C.accent, border: "none", borderRadius: 9, padding: "10px 20px",
  color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
  fontFamily: "inherit", letterSpacing: "0.02em",
};

const btnSecondary: React.CSSProperties = {
  background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 9, padding: "9px 18px",
  color: C.sub, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
};

// ─── AnalyzeView ──────────────────────────────────────────────────────────────
function AnalyzeView({ onResult }: { onResult: (r: AnalysisResponse) => void }) {
  const [form, setForm] = useState({
    name: "", gender: "Male", age: "30", occupation: "Engineer",
    city: "Ottawa",
    sleep_duration: "6.5", quality_of_sleep: "6", physical_activity: "40",
    stress_level: "6", bmi_category: "Normal", blood_pressure_category: "Normal",
    heart_rate: "72", daily_steps: "6000", sleep_disorders: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const s = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const payload = {
        ...form,
        age: Number(form.age),
        sleep_duration: Number(form.sleep_duration),
        quality_of_sleep: Number(form.quality_of_sleep),
        physical_activity: Number(form.physical_activity),
        stress_level: Number(form.stress_level),
        heart_rate: Number(form.heart_rate),
        daily_steps: Number(form.daily_steps),
        sleep_disorders: form.sleep_disorders || null,
      };
      const res = await api("/analyze-patient", { method: "POST", body: JSON.stringify(payload) });
      onResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, k, type = "text", options }: { label: string; k: string; type?: string; options?: string[] }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 10.5, fontWeight: 600, color: C.sub, letterSpacing: "0.07em", textTransform: "uppercase" }}>{label}</label>
      {options ? (
        <select value={(form as Record<string, string>)[k]} onChange={s(k)} style={{ ...inputCls }}>
          {options.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={(form as Record<string, string>)[k]} onChange={s(k)} style={inputCls}
          onFocus={(e) => (e.target.style.borderColor = C.accent)}
          onBlur={(e) => (e.target.style.borderColor = C.border)} />
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>New Patient Analysis</h2>
        <p style={{ fontSize: 13, color: C.sub, margin: "4px 0 0" }}>Submit patient data to receive a sleep risk assessment.</p>
      </div>

      {error && <ErrorBanner msg={error} onDismiss={() => setError("")} />}

      {/* Patient Info */}
      <Card style={{ marginBottom: 14 }}>
        <SectionTitle>Patient Information</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Full Name" k="name" />
          <Field label="Occupation" k="occupation" />
          <Field label="Age" k="age" type="number" />
          <Field label="Gender" k="gender" options={["Male", "Female", "Other"]} />
          <Field label="City" k="city" />
          <Field label="BMI Category" k="bmi_category" options={["Normal", "Overweight", "Obese", "Underweight"]} />
        </div>
      </Card>

      {/* Sleep Info */}
      <Card style={{ marginBottom: 14 }}>
        <SectionTitle>Sleep Information</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Sleep Duration (hrs)" k="sleep_duration" type="number" />
          <Field label="Sleep Quality (1–10)" k="quality_of_sleep" type="number" />
          <Field label="Sleep Disorders" k="sleep_disorders" />
          <Field label="Blood Pressure Category" k="blood_pressure_category" options={["Normal", "Elevated", "Hypertension Stage 1", "Hypertension Stage 2"]} />
        </div>
      </Card>

      {/* Health Metrics */}
      <Card style={{ marginBottom: 14 }}>
        <SectionTitle>Health Metrics</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Heart Rate (bpm)" k="heart_rate" type="number" />
          <Field label="Daily Steps" k="daily_steps" type="number" />
          <Field label="Physical Activity (0–100)" k="physical_activity" type="number" />
        </div>
      </Card>

      {/* Daily Activity */}
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle>Daily Activity</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Stress Level (1–10)" k="stress_level" type="number" />
        </div>
      </Card>

      <button onClick={submit} disabled={loading} style={{ ...btnPrimary, width: "100%", padding: "13px", fontSize: 14, opacity: loading ? 0.6 : 1 }}>
        {loading ? "Analysing…" : "Run Sleep Risk Analysis"}
      </button>
    </div>
  );
}

// ─── ResultView ───────────────────────────────────────────────────────────────
function ResultView({ result, onBack, onGoToDashboard }: { result: AnalysisResponse; onBack: () => void; onGoToDashboard: () => void }) {
  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ ...btnSecondary, padding: "7px 14px" }}>← Back</button>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>Analysis Result</h2>
          <p style={{ fontSize: 11, color: C.muted, margin: 0, fontFamily: "monospace" }}>{result.patient_id}</p>
        </div>
      </div>

      {/* Score + Level */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <ScoreRing score={result.risk_score} level={result.risk_level} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <Badge level={result.risk_level} />
              <RecoBadge type={result.recommendation_type} />
              {result.doctor_flag && (
                <span style={{ fontSize: 11, color: C.medium, background: C.mediumBg, borderRadius: 6, padding: "2px 8px", border: `1px solid ${C.medium}25` }}>
                  Doctor Flag
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: C.sub, lineHeight: 1.6 }}>{result.patient_summary}</p>
          </div>
        </div>
      </Card>

      {/* Factors */}
      {result.factors.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <SectionTitle>Contributing Factors</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {result.factors.map((f) => <FactorPill key={f} text={f} />)}
          </div>
        </Card>
      )}

      {/* Doctor summary */}
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle>Clinician Summary</SectionTitle>
        <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.7, fontStyle: "italic" }}>{result.doctor_summary}</p>
      </Card>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onBack} style={{ ...btnSecondary, flex: 1 }}>New Analysis</button>
        <button onClick={onGoToDashboard} style={{ ...btnPrimary, flex: 1 }}>Go to Dashboard</button>
      </div>
    </div>
  );
}

// ─── DashboardView ────────────────────────────────────────────────────────────
function DashboardView({ onSelect, onSeed }: { onSelect: (id: string) => void; onSeed: () => void }) {
  const [data, setData] = useState<{ total_patients: number; flagged_patients: number; patients: DashboardPatient[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await api("/doctor/dashboard");
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await api("/seed-demo-cases", { method: "POST" });
      onSeed();
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Seed failed");
    } finally { setSeeding(false); }
  };

  const filtered = data?.patients.filter((p) => filter === "all" || p.risk_level === filter) ?? [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Patient Dashboard</h2>
          <p style={{ fontSize: 13, color: C.sub, margin: "3px 0 0" }}>All patients sorted by risk priority</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={{ ...btnSecondary, padding: "7px 14px" }}>Refresh</button>
          <button onClick={handleSeed} disabled={seeding} style={{ ...btnPrimary, padding: "7px 14px", opacity: seeding ? 0.6 : 1 }}>
            {seeding ? "Seeding…" : "Seed Demo Cases"}
          </button>
        </div>
      </div>

      {error && <ErrorBanner msg={error} onDismiss={() => setError("")} />}

      {/* Stats row */}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Total Patients", value: data.total_patients, color: C.accent },
            { label: "Flagged", value: data.flagged_patients, color: C.high },
            { label: "High Risk", value: data.patients.filter((p) => p.risk_level === "high").length, color: C.high },
            { label: "Avg Score", value: data.patients.length ? Math.round(data.patients.reduce((a, p) => a + p.risk_score, 0) / data.patients.length) : "—", color: C.medium },
          ].map(({ label, value, color }) => (
            <Card key={label} style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, background: C.bg, borderRadius: 10, padding: 4, width: "fit-content" }}>
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

      {loading ? <Spinner /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: C.muted, fontSize: 13 }}>
              No patients yet. Seed demo cases or submit a new analysis.
            </div>
          )}
          {filtered.map((p) => (
            <div key={p.patient_id} onClick={() => onSelect(p.patient_id)}
              style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${RISK_COLOR[p.risk_level]}`,
                borderRadius: 12, padding: "14px 18px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 16,
                transition: "box-shadow 0.15s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 10px rgba(0,0,0,0.08)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = "none")}
            >
              <ScoreRing score={p.risk_score} level={p.risk_level} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{p.name || "Unknown Patient"}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{p.age && `${p.age}y`} {p.gender}</span>
                  <Badge level={p.risk_level} />
                  <RecoBadge type={p.recommendation_type} />
                  {p.needs_attention && (
                    <span style={{ fontSize: 10, color: C.high, background: C.highBg, borderRadius: 5, padding: "1px 7px", fontWeight: 700 }}>ATTENTION</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: C.sub, marginBottom: 5 }}>
                  {p.occupation} · {p.city}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {p.factors.slice(0, 4).map((f) => <FactorPill key={f} text={f} />)}
                </div>
              </div>
              <span style={{ color: C.muted, fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PatientDetailView ────────────────────────────────────────────────────────
function PatientDetailView({ patientId, onBack }: { patientId: string; onBack: () => void }) {
  const [data, setData] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fbDecision, setFbDecision] = useState("agree");
  const [fbReco, setFbReco] = useState("monitor");
  const [fbNotes, setFbNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fbSuccess, setFbSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await api(`/doctor/patient/${patientId}`);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load patient");
    } finally { setLoading(false); }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const submitFeedback = async () => {
    setSubmitting(true); setFbSuccess("");
    try {
      await api("/doctor-feedback", {
        method: "POST",
        body: JSON.stringify({
          patient_id: patientId,
          doctor_decision: fbDecision,
          updated_recommendation_type: fbReco,
          notes: fbNotes || null,
        }),
      });
      setFbSuccess("Feedback applied. Model updated.");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Feedback failed");
    } finally { setSubmitting(false); }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner msg={error} onDismiss={() => setError("")} />;
  if (!data) return null;

  const { latest, profile, history, comparison } = data;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <button onClick={onBack} style={{ ...btnSecondary, padding: "7px 14px" }}>← Dashboard</button>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>
            {(profile.name as string) || "Patient Detail"}
          </h2>
          <p style={{ fontSize: 11, color: C.muted, margin: 0, fontFamily: "monospace" }}>{patientId}</p>
        </div>
        {data.needs_attention && (
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.high, background: C.highBg, borderRadius: 6, padding: "4px 10px", fontWeight: 700, border: `1px solid ${C.high}25` }}>
            NEEDS ATTENTION
          </span>
        )}
      </div>

      {/* Current analysis */}
      <Card style={{ marginBottom: 12 }}>
        <SectionTitle>Current Analysis</SectionTitle>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
          <ScoreRing score={latest.risk_score} level={latest.risk_level} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <Badge level={latest.risk_level} />
              <RecoBadge type={latest.recommendation_type} />
              {latest.doctor_flag && <span style={{ fontSize: 11, color: C.medium, background: C.mediumBg, borderRadius: 6, padding: "2px 8px" }}>Doctor Flag</span>}
            </div>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: C.sub, lineHeight: 1.6 }}>{latest.patient_summary}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {latest.factors.map((f) => <FactorPill key={f} text={f} />)}
            </div>
          </div>
        </div>
      </Card>

      {/* Profile */}
      <Card style={{ marginBottom: 12 }}>
        <SectionTitle>Patient Profile</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px 16px", fontSize: 12 }}>
          {Object.entries(profile).filter(([, v]) => v != null && v !== "").map(([k, v]) => (
            <div key={k}>
              <span style={{ color: C.muted, textTransform: "capitalize" }}>{k.replace(/_/g, " ")}: </span>
              <span style={{ fontWeight: 600, color: C.text }}>{String(v)}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Comparison */}
      {comparison && (
        <Card style={{ marginBottom: 12 }}>
          <SectionTitle>Before / After Feedback</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {(["before", "after"] as const).map((key) => {
              const r = comparison[key];
              return (
                <div key={key} style={{ background: C.bg, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{key}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <Badge level={r.risk_level} />
                    <RecoBadge type={r.recommendation_type} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Score: {r.risk_score}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* History chart */}
      {history.length > 0 && (
        <Card style={{ marginBottom: 12 }}>
          <SectionTitle>Risk Score History</SectionTitle>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
            {history.map((h, i) => {
              const pct = h.risk_score / 100;
              const color = RISK_COLOR[h.risk_level as keyof typeof RISK_COLOR] ?? C.sub;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: "100%", height: 64, display: "flex", alignItems: "flex-end" }}>
                    <div title={`${h.label}: ${h.risk_score}`} style={{ width: "100%", height: `${pct * 100}%`, minHeight: 3, background: color, borderRadius: "3px 3px 1px 1px", opacity: 0.8 }} />
                  </div>
                  <span style={{ fontSize: 9, color: C.muted, textAlign: "center" }}>{h.label}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Clinician feedback */}
      <Card style={{ marginBottom: 12 }}>
        <SectionTitle>Clinician Feedback</SectionTitle>
        {data.latest_feedback && (
          <div style={{ background: C.accentBg, border: `1px solid ${C.accentLight}`, borderRadius: 9, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: C.accent }}>
            Last feedback: <b>{(data.latest_feedback.doctor_decision as string)}</b> → <b>{(data.latest_feedback.updated_recommendation_type as string)}</b>
            {data.latest_feedback.notes && <span style={{ color: C.sub }}> · {data.latest_feedback.notes as string}</span>}
          </div>
        )}

        {fbSuccess && (
          <div style={{ background: C.lowBg, border: `1px solid ${C.low}30`, borderRadius: 9, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: C.low }}>{fbSuccess}</div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 10.5, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 5 }}>Decision</label>
            <select value={fbDecision} onChange={(e) => setFbDecision(e.target.value)} style={{ ...inputCls }}>
              {["agree", "adjust", "escalate"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10.5, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 5 }}>Updated Recommendation</label>
            <select value={fbReco} onChange={(e) => setFbReco(e.target.value)} style={{ ...inputCls }}>
              {["lifestyle", "monitor", "escalate"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10.5, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 5 }}>Notes</label>
          <textarea value={fbNotes} onChange={(e) => setFbNotes(e.target.value)}
            placeholder="Optional clinical notes…" rows={2}
            style={{ ...inputCls, resize: "none" }} />
        </div>
        <button onClick={submitFeedback} disabled={submitting} style={{ ...btnPrimary, opacity: submitting ? 0.6 : 1 }}>
          {submitting ? "Submitting…" : "Submit Feedback"}
        </button>

        <p style={{ margin: "10px 0 0", fontSize: 11, color: C.muted }}>
          Submitting feedback trains the RL engine — future risk scores may shift accordingly.
        </p>
      </Card>

      {/* Doctor summary */}
      <Card>
        <SectionTitle>Clinician Summary</SectionTitle>
        <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.7, fontStyle: "italic" }}>{latest.doctor_summary}</p>
      </Card>
    </div>
  );
}

// ─── FlaggedView ──────────────────────────────────────────────────────────────
function FlaggedView({ onSelect }: { onSelect: (id: string) => void }) {
  const [patients, setPatients] = useState<AnalysisResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api("/patients/flagged");
        setPatients(res);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Flagged Patients</h2>
        <p style={{ fontSize: 13, color: C.sub, margin: "3px 0 0" }}>Patients requiring clinician review</p>
      </div>

      {error && <ErrorBanner msg={error} onDismiss={() => setError("")} />}
      {loading ? <Spinner /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {patients.length === 0 && <div style={{ textAlign: "center", padding: "60px 0", color: C.muted, fontSize: 13 }}>No flagged patients.</div>}
          {patients.map((p) => (
            <div key={p.patient_id} onClick={() => onSelect(p.patient_id)}
              style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${RISK_COLOR[p.risk_level]}`,
                borderRadius: 12, padding: "14px 18px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 14,
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = "none")}
            >
              <ScoreRing score={p.risk_score} level={p.risk_level} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 5 }}>
                  <Badge level={p.risk_level} />
                  <RecoBadge type={p.recommendation_type} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {p.factors.map((f) => <FactorPill key={f} text={f} />)}
                </div>
              </div>
              <span style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{p.patient_id.slice(0, 8)}…</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SettingsView ─────────────────────────────────────────────────────────────
function SettingsView() {
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState("");

  const reset = async () => {
    setResetting(true); setMsg("");
    try {
      await api("/reset-demo", { method: "POST" });
      setMsg("Demo data cleared. All patients, feedback, and policy state have been reset.");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Reset failed");
    } finally { setResetting(false); }
  };

  return (
    <div style={{ maxWidth: 540 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Settings</h2>
        <p style={{ fontSize: 13, color: C.sub, margin: "3px 0 0" }}>Demo controls and system information</p>
      </div>

      <Card style={{ marginBottom: 14 }}>
        <SectionTitle>About</SectionTitle>
        <p style={{ margin: 0, fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
          This application integrates a sleep triage risk engine with a reinforcement-learning feedback loop.
          Patient sleep data is scored by a weighted risk model, LLM-generated summaries are produced for patients and clinicians,
          and doctor feedback adjusts the model's escalation thresholds in real time.
        </p>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <SectionTitle>Endpoints</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontFamily: "monospace" }}>
          {[
            ["POST", "/analyze-patient"],
            ["GET",  "/doctor/dashboard"],
            ["GET",  "/patients/flagged"],
            ["POST", "/doctor-feedback"],
            ["POST", "/seed-demo-cases"],
            ["POST", "/reset-demo"],
          ].map(([m, p]) => (
            <div key={p} style={{ display: "flex", gap: 8, color: C.sub }}>
              <span style={{ color: m === "POST" ? C.accent : C.medium, fontWeight: 700, minWidth: 40 }}>{m}</span>
              <span>{p}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Demo Controls</SectionTitle>
        {msg && (
          <div style={{ background: C.accentBg, border: `1px solid ${C.accentLight}`, borderRadius: 9, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: C.accent }}>
            {msg}
          </div>
        )}
        <button onClick={reset} disabled={resetting} style={{ ...btnSecondary, color: C.high, borderColor: `${C.high}40`, opacity: resetting ? 0.6 : 1 }}>
          {resetting ? "Resetting…" : "Reset Demo State"}
        </button>
        <p style={{ margin: "8px 0 0", fontSize: 11, color: C.muted }}>
          Clears all in-memory patients, feedback, and resets RL policy thresholds.
        </p>
      </Card>
    </div>
  );
}

// ─── App shell ────────────────────────────────────────────────────────────────
type View = "analyze" | "result" | "dashboard" | "patient" | "flagged" | "settings";

const NAV = [
  { id: "analyze",   icon: "＋", label: "New Analysis" },
  { id: "dashboard", icon: "⊞", label: "Dashboard" },
  { id: "flagged",   icon: "⚑", label: "Flagged" },
  { id: "settings",  icon: "⚙", label: "Settings" },
] as const;

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [serverOk, setServerOk] = useState<boolean | null>(null);

  useEffect(() => {
    api("/").then(() => setServerOk(true)).catch(() => setServerOk(false));
  }, []);

  const goto = (v: View) => { setView(v); setSelectedPatient(null); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; }
        @keyframes spin { to { transform: rotate(360deg); } }
        select, textarea { color: ${C.text}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
        input:focus, select:focus, textarea:focus { border-color: ${C.accent} !important; }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", color: C.text, background: C.bg }}>
        {/* Sidebar */}
        <div style={{
          width: 220, flexShrink: 0, background: C.sidebar,
          display: "flex", flexDirection: "column", padding: "24px 0",
          position: "sticky", top: 0, height: "100vh",
        }}>
          {/* Logo */}
          <div style={{ padding: "0 20px 24px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "0.01em" }}>Sleep Triage</div>
            <div style={{ fontSize: 11, color: C.sidebarText, marginTop: 2 }}>Risk Assessment Platform</div>
          </div>

          {/* Server status */}
          <div style={{ padding: "0 20px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: serverOk === null ? "#64748b" : serverOk ? "#22c55e" : "#ef4444",
              }} />
              <span style={{ color: C.sidebarText }}>
                {serverOk === null ? "Connecting…" : serverOk ? "Server online" : "Server offline"}
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "0 10px" }}>
            {NAV.map((n) => {
              const active = view === n.id || (view === "result" && n.id === "analyze") || (view === "patient" && n.id === "dashboard");
              return (
                <button key={n.id} onClick={() => goto(n.id as View)} style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "9px 12px", border: "none", borderRadius: 8, cursor: "pointer",
                  marginBottom: 2, fontFamily: "inherit",
                  background: active ? `${C.sidebarActive}22` : "transparent",
                  color: active ? "#fff" : C.sidebarText,
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  transition: "all 0.15s",
                }}>
                  <span style={{ fontSize: 14, opacity: 0.8 }}>{n.icon}</span>
                  <span>{n.label}</span>
                  {active && <div style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: C.sidebarActive }} />}
                </button>
              );
            })}
          </nav>

          <div style={{ padding: "0 20px", fontSize: 10, color: "#334155" }}>
            Prototype · Not for clinical use
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, padding: "32px 28px", overflowY: "auto" }}>
          {serverOk === false && (
            <div style={{
              background: C.highBg, border: `1px solid ${C.high}30`,
              borderRadius: 10, padding: "12px 16px", marginBottom: 20,
              fontSize: 13, color: C.high,
            }}>
              Cannot reach backend at <b>{API}</b>. Make sure the FastAPI server is running (<code>uvicorn main:app --reload</code>).
            </div>
          )}

          {view === "analyze"   && <AnalyzeView onResult={(r) => { setResult(r); setView("result"); }} />}
          {view === "result"    && result && <ResultView result={result} onBack={() => setView("analyze")} onGoToDashboard={() => setView("dashboard")} />}
          {view === "dashboard" && <DashboardView onSelect={(id) => { setSelectedPatient(id); setView("patient"); }} onSeed={() => {}} />}
          {view === "patient"   && selectedPatient && <PatientDetailView patientId={selectedPatient} onBack={() => setView("dashboard")} />}
          {view === "flagged"   && <FlaggedView onSelect={(id) => { setSelectedPatient(id); setView("patient"); }} />}
          {view === "settings"  && <SettingsView />}
        </div>
      </div>
    </>
  );
}
