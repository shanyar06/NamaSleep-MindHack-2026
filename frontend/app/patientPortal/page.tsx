"use client";

import { useState, useEffect, useCallback, ChangeEvent } from "react";

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
interface PatientEntry {
  id: string | number;
  name?: string;
  gender?: string;
  age?: number;
  occupation?: string;
  city?: string;
  sleep_duration?: number;
  quality_of_sleep?: number;
  physical_activity?: number;
  stress_level?: number;
  bmi_category?: string;
  blood_pressure_category?: string;
  heart_rate?: number;
  daily_steps?: number;
  sleep_disorders?: string;
  created_at?: string;
}

interface AnalysisResult {
  patient_id: string;
  risk_level: "low" | "medium" | "high";
  risk_score: number;
  recommendation_type: "lifestyle" | "monitor" | "escalate";
  doctor_flag: boolean;
  factors: string[];
  patient_summary: string;
  doctor_summary: string;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:         "#f5f6f9",
  surface:    "#ffffff",
  border:     "#e4e7ef",
  text:       "#111827",
  sub:        "#64748b",
  muted:      "#94a3b8",
  accent:     "#2563eb",
  accentBg:   "#eff6ff",
  accentLight:"#bfdbfe",
  low:        "#16a34a",
  lowBg:      "#f0fdf4",
  medium:     "#d97706",
  mediumBg:   "#fffbeb",
  high:       "#dc2626",
  highBg:     "#fef2f2",
  nav:        "#0f172a",
  navText:    "#94a3b8",
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
    <div style={{ padding: "20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
      {children}
    </div>
  </div>
);

const FieldLabel = ({ text, badge }: { text: string; badge?: string }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
    <span style={{ fontSize: 10.5, fontWeight: 600, color: C.sub, letterSpacing: "0.08em", textTransform: "uppercase" }}>{text}</span>
    {badge && <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{badge}</span>}
  </div>
);

const Spinner = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
    <div style={{ width: 26, height: 26, borderRadius: "50%", border: `3px solid ${C.border}`, borderTopColor: C.accent, animation: "spin 0.7s linear infinite" }} />
  </div>
);

const ErrorBanner = ({ msg, onDismiss }: { msg: string; onDismiss: () => void }) => (
  <div style={{ background: C.highBg, border: `1px solid ${C.high}30`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.high, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <span>{msg}</span>
    <button onClick={onDismiss} style={{ background: "none", border: "none", color: C.high, cursor: "pointer", fontSize: 16 }}>×</button>
  </div>
);

const SuccessBanner = ({ msg }: { msg: string }) => (
  <div style={{ background: C.lowBg, border: `1px solid ${C.low}30`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.low }}>
    {msg}
  </div>
);

// Slider with custom track + thumb
function Slider({ value, min = 0, max = 10, onChange, color = C.accent, labels }: {
  value: number; min?: number; max?: number;
  onChange: (v: number) => void; color?: string; labels?: string[];
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ position: "relative", height: 22, display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 4, borderRadius: 99, background: C.border }} />
        <div style={{ position: "absolute", left: 0, width: `${pct}%`, height: 4, borderRadius: 99, background: color, transition: "width 0.1s" }} />
        {Array.from({ length: max - min + 1 }, (_, i) => (
          <div key={i} style={{
            position: "absolute", left: `calc(${(i / (max - min)) * 100}% - 3px)`,
            width: 6, height: 6, borderRadius: "50%",
            background: i <= value - min ? color : C.border,
            pointerEvents: "none", transition: "background 0.15s",
          }} />
        ))}
        <div style={{
          position: "absolute", left: `calc(${pct}% - 9px)`,
          width: 18, height: 18, borderRadius: "50%",
          background: "#fff", border: `2px solid ${color}`,
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
          transition: "left 0.1s", pointerEvents: "none",
        }} />
        <input type="range" min={min} max={max} step={1} value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))}
          style={{ position: "absolute", left: 0, width: "100%", opacity: 0, cursor: "pointer", height: "100%", margin: 0 }} />
      </div>
      {labels && (
        <div style={{ display: "flex" }}>
          {labels.map((l, i) => (
            <span key={i} style={{
              flex: 1, fontSize: 9.5, textAlign: "center",
              fontWeight: i + min === value ? 700 : 400,
              color: i + min === value ? color : C.muted,
              transition: "color 0.15s",
            }}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function TextInput({ label, type = "text", value, onChange, placeholder, unit }: {
  label?: string; type?: string; value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; unit?: string;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <span style={{ fontSize: 10.5, fontWeight: 600, color: C.sub, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>}
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <input type={type} value={value} onChange={onChange} placeholder={placeholder}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            flex: 1, background: C.bg, border: `1.5px solid ${focus ? C.accent : C.border}`,
            borderRadius: 10, padding: "9px 11px", color: C.text, fontSize: 13,
            fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const,
            colorScheme: "light" as React.CSSProperties["colorScheme"],
            transition: "border-color 0.15s",
          }} />
        {unit && <span style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap", flexShrink: 0 }}>{unit}</span>}
      </div>
    </div>
  );
}

// Score ring
const ScoreRing = ({ score, level }: { score: number; level: string }) => {
  const color = RISK_COLOR[level as keyof typeof RISK_COLOR] ?? C.sub;
  const r = 36, circ = 2 * Math.PI * r;
  return (
    <svg width="86" height="86" viewBox="0 0 86 86">
      <circle cx="43" cy="43" r={r} fill="none" stroke={C.border} strokeWidth="7" />
      <circle cx="43" cy="43" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${(score / 100) * circ} ${circ - (score / 100) * circ}`}
        strokeDashoffset={circ * 0.25} strokeLinecap="round" />
      <text x="43" y="47" textAnchor="middle" fill={C.text} fontSize="17" fontWeight="700" fontFamily="'DM Sans',sans-serif">{score}</text>
    </svg>
  );
};

const RiskBadge = ({ level }: { level: string }) => {
  const color = RISK_COLOR[level as keyof typeof RISK_COLOR] ?? C.sub;
  const bg    = RISK_BG[level as keyof typeof RISK_BG] ?? C.bg;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color, background: bg, border: `1px solid ${color}30`, borderRadius: 6, padding: "3px 10px" }}>
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

// ─── Metric pill for history cards ───────────────────────────────────────────
const MetricChip = ({ label, value }: { label: string; value: string | number | undefined }) => {
  if (value == null || value === "") return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 12px", minWidth: 80, flex: "1 1 80px" }}>
      <span style={{ fontSize: 9.5, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{value}</span>
    </div>
  );
};

// ─── Patient selector (login screen) ─────────────────────────────────────────
interface PatientPickerProps { onPick: (p: PatientEntry) => void; }

function PatientPicker({ onPick }: PatientPickerProps) {
  const [patients, setPatients] = useState<PatientEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");

  useEffect(() => {
    api("/patients")
      .then((r) => setPatients(r.patients ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    return (
      String(p.id).includes(q) ||
      (p.name ?? "").toLowerCase().includes(q) ||
      (p.occupation ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: C.accentBg, border: `1.5px solid ${C.accentLight}`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 16px" }}>
            🌙
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: "0 0 6px" }}>Patient Portal</h1>
          <p style={{ fontSize: 13, color: C.sub, margin: 0 }}>Select your profile to view and log your health data</p>
        </div>

        <Card>
          <div style={{ marginBottom: 14 }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ID, or occupation…"
              style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" as const }} />
          </div>

          {error && <ErrorBanner msg={error} onDismiss={() => setError("")} />}
          {loading && <Spinner />}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "30px 0", color: C.muted, fontSize: 13 }}>
              {patients.length === 0 ? "No patients in the database yet." : "No results found."}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto" }}>
            {filtered.map((p) => (
              <button key={p.id} onClick={() => onPick(p)}
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "12px 14px",
                  background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12,
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.accent; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 3px ${C.accentBg}`; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}
              >
                {/* Avatar */}
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.accentBg, border: `1.5px solid ${C.accentLight}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, fontWeight: 700, color: C.accent }}>
                  {(p.name ?? String(p.id)).charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{p.name ?? `Patient #${p.id}`}</div>
                  <div style={{ fontSize: 12, color: C.sub }}>
                    {[p.age && `${p.age}y`, p.gender, p.occupation, p.city].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <span style={{ color: C.muted, fontSize: 18 }}>›</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Main patient portal ──────────────────────────────────────────────────────
type Tab = "log" | "history" | "result";

interface LogForm {
  // Sleep
  bedtime: string;
  waketime: string;
  quality_of_sleep: number;
  // Health metrics
  heart_rate: string;
  bp_sys: string;
  bp_dia: string;
  daily_steps: string;
  // Daily activity
  physical_activity: number;
  stress_level: number;
  // Hidden / carried from profile
  gender: string;
  age: string;
  occupation: string;
  city: string;
  bmi_category: string;
  blood_pressure_category: string;
  sleep_disorders: string;
}

const QUALITY_LABELS  = ["Awful", "Poor", "Fair", "Good", "Great"];
const ACT_LABELS      = ["Sedentary", "Light", "Moderate", "Active", "Very Active"];
const STRESS_LABELS   = ["None", "Mild", "Moderate", "High", "Severe"];
const STRESS_COLORS   = ["#16a34a", "#84cc16", "#eab308", "#f97316", "#ef4444"];

function timeToDecimalHours(bedtime: string, waketime: string): number {
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = waketime.split(":").map(Number);
  let bed  = bh * 60 + bm;
  let wake = wh * 60 + wm;
  if (wake <= bed) wake += 1440;
  return Math.round(((wake - bed) / 60) * 10) / 10;
}

function formatDur(bedtime: string, waketime: string): string {
  if (!bedtime || !waketime) return "—";
  const total = timeToDecimalHours(bedtime, waketime);
  const h = Math.floor(total);
  const m = Math.round((total - h) * 60);
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}

interface PortalProps { patient: PatientEntry; onLogout: () => void; }

function PatientPortalMain({ patient, onLogout }: PortalProps) {
  const [tab, setTab]           = useState<Tab>("log");
  const [allEntries, setEntries] = useState<PatientEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [result, setResult]     = useState<AnalysisResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  const [form, setForm] = useState<LogForm>({
    bedtime: "23:00", waketime: "07:00",
    quality_of_sleep: 6,
    heart_rate: "", bp_sys: "", bp_dia: "", daily_steps: "",
    physical_activity: 2,
    stress_level: 1,
    // Carry from profile
    gender: (patient.gender as string) ?? "Male",
    age: String(patient.age ?? "30"),
    occupation: (patient.occupation as string) ?? "",
    city: (patient.city as string) ?? "Ottawa",
    bmi_category: (patient.bmi_category as string) ?? "Normal",
    blood_pressure_category: (patient.blood_pressure_category as string) ?? "Normal",
    sleep_disorders: (patient.sleep_disorders as string) ?? "",
  });

  const s = <K extends keyof LogForm>(k: K, v: LogForm[K]) => setForm((p) => ({ ...p, [k]: v }));
  const sv = (k: keyof LogForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => s(k, e.target.value as LogForm[typeof k]);

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const r = await api("/patients");
      const all: PatientEntry[] = r.patients ?? [];
      // Filter to entries belonging to this patient's id or name
      const mine = all.filter((p) => String(p.id) === String(patient.id) || (patient.name && p.name === patient.name));
      setEntries(mine.length ? mine : [patient]);
    } catch {
      setEntries([patient]);
    } finally {
      setLoadingEntries(false);
    }
  }, [patient]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const stressColor = STRESS_COLORS[form.stress_level] ?? C.accent;
  const actColor    = `hsl(${(form.physical_activity / 4) * 160 + 140}, 55%, 42%)`;

  const handleSubmit = async () => {
    setSubmitting(true); setError(""); setSuccess("");
    try {
      const sleep_duration = timeToDecimalHours(form.bedtime, form.waketime);
      // Map slider 0–4 to 0–100 for activity
      const activityMapped = [10, 25, 50, 75, 95][form.physical_activity] ?? 50;
      // Map stress 0–4 to 1–10
      const stressMapped = [1, 3, 5, 7, 10][form.stress_level] ?? 5;
      // Map quality 0–4 → 1–10
      const qualityMapped = Math.round(1 + (form.quality_of_sleep / 10) * 9);
      // Blood pressure category derived from sys
      let bp_category = form.blood_pressure_category;
      const sys = Number(form.bp_sys);
      if (sys) {
        if (sys < 120) bp_category = "Normal";
        else if (sys < 130) bp_category = "Elevated";
        else if (sys < 140) bp_category = "Hypertension Stage 1";
        else bp_category = "Hypertension Stage 2";
      }

      const payload = {
        name:                     patient.name ?? `Patient #${patient.id}`,
        gender:                   form.gender,
        age:                      Number(form.age),
        occupation:               form.occupation,
        city:                     form.city,
        sleep_duration,
        quality_of_sleep:         qualityMapped,
        physical_activity:        activityMapped,
        stress_level:             stressMapped,
        bmi_category:             form.bmi_category,
        blood_pressure_category:  bp_category,
        heart_rate:               Number(form.heart_rate) || 70,
        daily_steps:              Number(form.daily_steps) || 5000,
        sleep_disorders:          form.sleep_disorders || null,
      };

      const res: AnalysisResult = await api("/analyze-patient", { method: "POST", body: JSON.stringify(payload) });
      setResult(res);
      setSuccess("Entry submitted. Your risk assessment is ready.");
      setTab("result");
      await loadEntries();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "log",     label: "Log Entry"  },
    { id: "history", label: "My History" },
    { id: "result",  label: "My Result"  },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans',sans-serif", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
        input[type=date]::-webkit-calendar-picker-indicator,
        input[type=time]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.4; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.25; }
      `}</style>

      {/* Top bar */}
      <div style={{ background: C.nav, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 58, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>NamaSleep</span>
          <span style={{ fontSize: 11, color: "#334155", background: "#1e293b", borderRadius: 5, padding: "2px 8px" }}>Patient Portal</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.accentBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: C.accent }}>
            {(patient.name ?? String(patient.id)).charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>{patient.name ?? `Patient #${patient.id}`}</span>
          <button onClick={onLogout} style={{ background: "none", border: "1px solid #334155", borderRadius: 7, padding: "5px 12px", color: "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            Switch
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px 20px 60px" }}>

        {/* Patient greeting */}
        <div style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: "0 0 3px" }}>
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {(patient.name ?? `Patient #${patient.id}`).split(" ")[0]}
          </h2>
          <p style={{ fontSize: 13, color: C.sub }}>
            {new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
            {patient.occupation ? ` · ${patient.occupation}` : ""}
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: "#ebedf2", borderRadius: 12, padding: 4, gap: 3, marginBottom: 18 }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "8px 6px", border: "none", borderRadius: 9, cursor: "pointer",
              fontSize: 12, fontWeight: 600, fontFamily: "inherit", transition: "all 0.15s",
              background: tab === t.id ? C.surface : "transparent",
              color: tab === t.id ? C.accent : C.sub,
              boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── LOG ENTRY ─────────────────────────────────────────────── */}
        {tab === "log" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {error && <ErrorBanner msg={error} onDismiss={() => setError("")} />}
            {success && <SuccessBanner msg={success} />}

            {/* Sleep information */}
            <SectionCard title="Sleep Information" color={C.accent}>
              <TextInput label="Bedtime" type="time" value={form.bedtime} onChange={sv("bedtime")} />
              <TextInput label="Wake Time" type="time" value={form.waketime} onChange={sv("waketime")} />

              {/* Duration pill */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: C.accent, background: C.accentBg, borderRadius: 20, padding: "3px 12px" }}>
                  {formatDur(form.bedtime, form.waketime)} total
                </span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>

              <div>
                <FieldLabel text="Sleep Quality" badge={QUALITY_LABELS[Math.round((form.quality_of_sleep / 10) * 4)]} />
                <Slider value={form.quality_of_sleep} min={1} max={10}
                  color={`hsl(${((form.quality_of_sleep - 1) / 9) * 120}, 55%, 42%)`}
                  onChange={(v) => s("quality_of_sleep", v)}
                  labels={["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]} />
              </div>
            </SectionCard>

            {/* Health metrics */}
            <SectionCard title="Health Metrics" color="#0ea5e9">
              <div>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: C.sub, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                  Blood Pressure
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <BPInput placeholder="Systolic"  value={form.bp_sys}  onChange={sv("bp_sys")}  min={60}  max={220} />
                  <span style={{ fontSize: 14, color: C.muted, flexShrink: 0 }}>/</span>
                  <BPInput placeholder="Diastolic" value={form.bp_dia} onChange={sv("bp_dia")} min={40} max={140} />
                  <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>mmHg</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <TextInput label="Heart Rate" type="number" value={form.heart_rate} onChange={sv("heart_rate")} placeholder="72" unit="bpm" />
                <TextInput label="Daily Steps" type="number" value={form.daily_steps} onChange={sv("daily_steps")} placeholder="8500" />
              </div>
            </SectionCard>

            {/* Daily activity */}
            <SectionCard title="Daily Activity" color="#10b981">
              <div>
                <FieldLabel text="Physical Activity Level" badge={ACT_LABELS[form.physical_activity]} />
                <Slider value={form.physical_activity} min={0} max={4} color={actColor}
                  onChange={(v) => s("physical_activity", v)} labels={ACT_LABELS} />
              </div>
              <div>
                <FieldLabel text="Stress Level" badge={STRESS_LABELS[form.stress_level]} />
                <Slider value={form.stress_level} min={0} max={4} color={stressColor}
                  onChange={(v) => s("stress_level", v)} labels={STRESS_LABELS} />
              </div>
            </SectionCard>

            <button onClick={handleSubmit} disabled={submitting} style={{
              width: "100%", background: C.accent, border: "none", borderRadius: 12,
              padding: "13px", color: "#fff", fontSize: 14, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: `0 4px 14px ${C.accent}33`,
              opacity: submitting ? 0.65 : 1,
            }}>
              {submitting ? "Analysing…" : "Submit Daily Entry"}
            </button>
          </div>
        )}

        {/* ── HISTORY ───────────────────────────────────────────────── */}
        {tab === "history" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: C.sub }}>{allEntries.length} entr{allEntries.length === 1 ? "y" : "ies"} found</span>
              <button onClick={loadEntries} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 7, padding: "5px 12px", color: C.sub, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Refresh</button>
            </div>

            {loadingEntries && <Spinner />}

            {!loadingEntries && allEntries.length === 0 && (
              <Card style={{ textAlign: "center", padding: "40px 20px", color: C.muted, fontSize: 13 }}>
                No entries yet. Log your first entry above.
              </Card>
            )}

            {allEntries.map((e, i) => (
              <Card key={i} style={{ padding: "16px 18px" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                      {e.created_at ? new Date(e.created_at).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : `Entry #${i + 1}`}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      {e.created_at ? new Date(e.created_at).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </div>
                  </div>
                  {e.sleep_disorders && (
                    <span style={{ fontSize: 11, background: C.highBg, color: C.high, border: `1px solid ${C.high}25`, borderRadius: 6, padding: "2px 8px" }}>
                      {e.sleep_disorders}
                    </span>
                  )}
                </div>

                {/* Metric chips */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {e.heart_rate      != null && <MetricChip label="Heart Rate"   value={`${e.heart_rate} bpm`} />}
                  {e.daily_steps     != null && <MetricChip label="Steps"        value={e.daily_steps.toLocaleString()} />}
                  {e.sleep_duration  != null && <MetricChip label="Sleep"        value={`${e.sleep_duration}h`} />}
                  {e.quality_of_sleep != null && <MetricChip label="Quality"     value={`${e.quality_of_sleep}/10`} />}
                  {e.stress_level    != null && <MetricChip label="Stress"       value={`${e.stress_level}/10`} />}
                  {e.physical_activity != null && <MetricChip label="Activity"   value={`${e.physical_activity}`} />}
                  {e.blood_pressure_category && <MetricChip label="BP Category" value={e.blood_pressure_category} />}
                  {e.bmi_category    != null && <MetricChip label="BMI"          value={e.bmi_category} />}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── RESULT ────────────────────────────────────────────────── */}
        {tab === "result" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!result && (
              <Card style={{ textAlign: "center", padding: "40px 20px" }}>
                <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>No result yet. Submit a daily entry to see your risk assessment.</p>
                <button onClick={() => setTab("log")} style={{
                  marginTop: 14, background: C.accent, border: "none", borderRadius: 9,
                  padding: "9px 20px", color: "#fff", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}>Log an Entry</button>
              </Card>
            )}

            {result && (
              <>
                {/* Score card */}
                <Card>
                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <ScoreRing score={result.risk_score} level={result.risk_level} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                        <RiskBadge level={result.risk_level} />
                        <RecoBadge type={result.recommendation_type} />
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: C.sub, lineHeight: 1.7 }}>{result.patient_summary}</p>
                    </div>
                  </div>
                </Card>

                {/* Factors */}
                {result.factors.length > 0 && (
                  <Card>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Contributing Factors</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {result.factors.map((f) => (
                        <span key={f} style={{ fontSize: 12, color: C.sub, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: "4px 12px" }}>{f}</span>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Recommendation guidance */}
                <Card style={{ borderLeft: `3px solid ${RISK_COLOR[result.risk_level]}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>What This Means</div>
                  {result.recommendation_type === "lifestyle" && (
                    <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.7 }}>
                      Your sleep patterns look generally healthy. Focus on maintaining a consistent sleep schedule, regular physical activity, and stress management habits.
                    </p>
                  )}
                  {result.recommendation_type === "monitor" && (
                    <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.7 }}>
                      Some patterns in your data warrant monitoring. Continue logging your metrics daily and consider discussing these trends with your healthcare provider at your next visit.
                    </p>
                  )}
                  {result.recommendation_type === "escalate" && (
                    <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.7 }}>
                      Your results suggest it would be beneficial to speak with a healthcare professional soon. Please reach out to your doctor or a sleep specialist to discuss these findings.
                    </p>
                  )}
                </Card>

                <p style={{ margin: 0, fontSize: 11, color: C.muted, textAlign: "center" }}>
                  This tool is for screening and early support only — it does not provide a medical diagnosis.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BP input (extracted to avoid hooks-in-map) ───────────────────────────────
function BPInput({ placeholder, value, onChange, min, max }: {
  placeholder: string; value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  min: number; max: number;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <input type="number" placeholder={placeholder} value={value}
      onChange={onChange as (e: ChangeEvent<HTMLInputElement>) => void}
      min={min} max={max}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{
        flex: 1, background: C.bg,
        border: `1.5px solid ${focus ? C.accent : C.border}`,
        borderRadius: 10, padding: "9px 10px", color: C.text,
        fontSize: 13, fontFamily: "inherit", outline: "none",
        boxSizing: "border-box" as const, transition: "border-color 0.15s",
      }} />
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export default function PatientPortal() {
  const [patient, setPatient] = useState<PatientEntry | null>(null);

  if (!patient) return <PatientPicker onPick={setPatient} />;
  return <PatientPortalMain patient={patient} onLogout={() => setPatient(null)} />;
}
