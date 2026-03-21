"use client"
import { useState, CSSProperties, ChangeEvent } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SleepEntry {
  id: number;
  date: string;
  bedtime: string;
  waketime: string;
  quality: number;       // 1–5
  activity: number;      // 0–4
  stress: number;        // 0–4
  bp_sys: number | null;
  bp_dia: number | null;
  hr: number | null;
  steps: number | null;
}

interface FormState {
  date: string;
  bedtime: string;
  waketime: string;
  quality: number;
  activity: number;
  stress: number;
  bp_sys: string;
  bp_dia: string;
  hr: string;
  steps: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pad = (n: number): string => String(n).padStart(2, "0");

function formatDur(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}

function parseMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function sleepDur(bed: string, wake: string): number {
  let b = parseMin(bed);
  let w = parseMin(wake);
  if (w <= b) w += 1440;
  return w - b;
}

const Q_LABEL: string[]  = ["", "Awful", "Poor", "Fair", "Good", "Great"];
const Q_COLOR: string[]  = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4"];
const ACT_LABEL: string[]    = ["Sedentary", "Light", "Moderate", "Active", "Very Active"];
const STRESS_LABEL: string[] = ["None", "Mild", "Moderate", "High", "Severe"];
const STRESS_COLOR: string[] = ["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"];

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:       "#f5f6f8",
  surface:  "#ffffff",
  border:   "#e4e6ed",
  text:     "#111827",
  sub:      "#6b7280",
  muted:    "#9ca3af",
  accent:   "#4f46e5",
  accentBg: "#eef2ff",
} as const;

// ─── Slider ───────────────────────────────────────────────────────────────────
interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  color?: string;
  labels?: string[];
}

function Slider({ value, min = 0, max = 4, onChange, color = T.accent, labels }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const steps = max - min + 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ position: "relative", height: 22, display: "flex", alignItems: "center" }}>
        {/* Track */}
        <div style={{ position: "absolute", left: 0, right: 0, height: 4, borderRadius: 99, background: T.border }} />
        {/* Fill */}
        <div style={{ position: "absolute", left: 0, width: `${pct}%`, height: 4, borderRadius: 99, background: color, transition: "width 0.15s, background 0.2s" }} />
        {/* Ticks */}
        {Array.from({ length: steps }, (_, i) => {
          const p = (i / (max - min)) * 100;
          return (
            <div key={i} style={{
              position: "absolute", left: `calc(${p}% - 3px)`,
              width: 6, height: 6, borderRadius: "50%",
              background: i <= value - min ? color : T.border,
              transition: "background 0.2s", pointerEvents: "none",
            }} />
          );
        })}
        {/* Thumb */}
        <div style={{
          position: "absolute", left: `calc(${pct}% - 9px)`,
          width: 18, height: 18, borderRadius: "50%",
          background: "#fff", border: `2px solid ${color}`,
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
          transition: "left 0.15s, border-color 0.2s", pointerEvents: "none",
        }} />
        {/* Native range (invisible overlay) */}
        <input
          type="range" min={min} max={max} step={1} value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))}
          style={{ position: "absolute", left: 0, width: "100%", opacity: 0, cursor: "pointer", height: "100%", margin: 0 }}
        />
      </div>
      {labels && (
        <div style={{ display: "flex" }}>
          {labels.map((l, i) => (
            <span key={i} style={{
              flex: 1, fontSize: 9.5, textAlign: "center",
              fontWeight: i + min === value ? 600 : 400,
              color: i + min === value ? color : T.muted,
              transition: "color 0.15s",
            }}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
interface FieldLabelProps { text: string; badge?: string; }
const FieldLabel = ({ text, badge }: FieldLabelProps) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
    <span style={{ fontSize: 11, fontWeight: 600, color: T.sub, letterSpacing: "0.07em", textTransform: "uppercase" }}>{text}</span>
    {badge && <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{badge}</span>}
  </div>
);

function inputStyle(focused: boolean): CSSProperties {
  return {
    background: T.bg,
    border: `1.5px solid ${focused ? T.accent : T.border}`,
    borderRadius: 10,
    padding: "9px 11px",
    color: T.text,
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    colorScheme: "light" as CSSProperties["colorScheme"],
    transition: "border-color 0.15s",
  };
}

interface TextBoxProps {
  label?: string;
  type?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  unit?: string;
}

function TextBox({ label, type = "text", value, onChange, placeholder, unit }: TextBoxProps) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && (
        <span style={{ fontSize: 11, fontWeight: 600, color: T.sub, letterSpacing: "0.07em", textTransform: "uppercase" }}>
          {label}
        </span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ ...inputStyle(focus), flex: 1 }}
        />
        {unit && <span style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap", flexShrink: 0 }}>{unit}</span>}
      </div>
    </div>
  );
}

interface SectionCardProps { title: string; color?: string; children: React.ReactNode; }
function SectionCard({ title, color = T.accent, children }: SectionCardProps) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ borderBottom: `1px solid ${T.border}`, padding: "13px 18px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 3, height: 14, borderRadius: 99, background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: T.sub, letterSpacing: "0.1em", textTransform: "uppercase" }}>{title}</span>
      </div>
      <div style={{ padding: "18px 18px", display: "flex", flexDirection: "column", gap: 18 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Blood Pressure Inputs ────────────────────────────────────────────────────
// Extracted to avoid hooks-inside-map anti-pattern
interface BPInputProps {
  placeholder: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  min: number;
  max: number;
}
function BPInput({ placeholder, value, onChange, min, max }: BPInputProps) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      type="number" placeholder={placeholder} value={value} onChange={onChange}
      min={min} max={max}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{ ...inputStyle(focus), flex: 1 }}
    />
  );
}

// ─── Entry Form ───────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().split("T")[0];
const BLANK: FormState = {
  date: TODAY, bedtime: "23:00", waketime: "07:00", quality: 3,
  activity: 2, stress: 1,
  bp_sys: "", bp_dia: "", hr: "", steps: "",
};

interface EntryFormProps { onAdd: (entry: SleepEntry) => void; }

function EntryForm({ onAdd }: EntryFormProps) {
  const [f, setF] = useState<FormState>({ ...BLANK });
  const s = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));
  const sv = (k: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) => s(k, e.target.value as FormState[typeof k]);
  const dur = sleepDur(f.bedtime, f.waketime);

  const handleSave = () => {
    onAdd({
      ...f,
      id: Date.now(),
      quality: f.quality,
      activity: f.activity,
      stress: f.stress,
      bp_sys: Number(f.bp_sys) || null,
      bp_dia: Number(f.bp_dia) || null,
      hr: Number(f.hr) || null,
      steps: Number(f.steps) || null,
    });
    setF({ ...BLANK });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── 1. Sleep Information ─────────────────────────────────────── */}
      <SectionCard title="Sleep Information" color={T.accent}>
        <TextBox label="Date" type="date" value={f.date} onChange={sv("date")} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TextBox label="Bedtime" type="time" value={f.bedtime} onChange={sv("bedtime")} />
          <TextBox label="Wake Time" type="time" value={f.waketime} onChange={sv("waketime")} />
        </div>

        {/* Duration pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 1, background: T.border }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: T.accent, background: T.accentBg, borderRadius: 20, padding: "3px 12px" }}>
            {formatDur(dur)} total
          </span>
          <div style={{ flex: 1, height: 1, background: T.border }} />
        </div>

        <div>
          <FieldLabel text="Sleep Quality" badge={Q_LABEL[f.quality]} />
          <Slider value={f.quality} min={1} max={5} color={Q_COLOR[f.quality]}
            onChange={(v) => s("quality", v)} labels={Q_LABEL.slice(1)} />
        </div>
      </SectionCard>

      {/* ── 2. Health Metrics ────────────────────────────────────────── */}
      <SectionCard title="Health Metrics" color="#0ea5e9">
        <div>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.sub, letterSpacing: "0.07em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
            Blood Pressure
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BPInput placeholder="Systolic"  value={f.bp_sys} onChange={sv("bp_sys")} min={60}  max={220} />
            <span style={{ fontSize: 13, color: T.muted, flexShrink: 0 }}>/</span>
            <BPInput placeholder="Diastolic" value={f.bp_dia} onChange={sv("bp_dia")} min={40}  max={140} />
            <span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>mmHg</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TextBox label="Heart Rate"  type="number" value={f.hr}    onChange={sv("hr")}    placeholder="65"   unit="bpm" />
          <TextBox label="Daily Steps" type="number" value={f.steps} onChange={sv("steps")} placeholder="8500" />
        </div>
      </SectionCard>

      {/* ── 3. Daily Activity ────────────────────────────────────────── */}
      <SectionCard title="Daily Activity" color="#10b981">
        <div>
          <FieldLabel text="Physical Activity Level" badge={ACT_LABEL[f.activity]} />
          <Slider value={f.activity} min={0} max={4}
            color={`hsl(${(f.activity / 4) * 160 + 140}, 55%, 42%)`}
            onChange={(v) => s("activity", v)} labels={ACT_LABEL} />
        </div>
        <div>
          <FieldLabel text="Stress Level" badge={STRESS_LABEL[f.stress]} />
          <Slider value={f.stress} min={0} max={4} color={STRESS_COLOR[f.stress]}
            onChange={(v) => s("stress", v)} labels={STRESS_LABEL} />
        </div>
      </SectionCard>

      {/* Save */}
      <button
        onClick={handleSave}
        style={{
          width: "100%", background: T.accent, border: "none", borderRadius: 12,
          padding: "13px", color: "#fff", fontSize: 14, fontWeight: 700,
          cursor: "pointer", letterSpacing: "0.02em", fontFamily: "inherit",
          boxShadow: `0 4px 14px ${T.accent}33`,
        }}>
        Save Entry
      </button>
    </div>
  );
}

// ─── History ──────────────────────────────────────────────────────────────────
interface HistoryListProps { entries: SleepEntry[]; onDelete: (id: number) => void; }

function HistoryList({ entries, onDelete }: HistoryListProps) {
  if (entries.length === 0) return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: T.muted, fontSize: 13 }}>
      No entries yet — start logging above.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {entries.map((e) => {
        const dur = sleepDur(e.bedtime, e.waketime);
        const qc = Q_COLOR[e.quality];
        const dateStr = new Date(e.date + "T12:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
        const actColor = `hsl(${(e.activity / 4) * 160 + 140}, 55%, 42%)`;

        return (
          <div key={e.id} style={{
            background: T.surface, border: `1px solid ${T.border}`,
            borderLeft: `3px solid ${qc}`, borderRadius: 14,
            padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{dateStr}</span>
                  <span style={{ fontSize: 10.5, background: `${qc}18`, color: qc, borderRadius: 20, padding: "2px 9px", fontWeight: 600 }}>
                    {Q_LABEL[e.quality]}
                  </span>
                  <span style={{ fontSize: 10.5, background: T.accentBg, color: T.accent, borderRadius: 20, padding: "2px 9px", fontWeight: 600 }}>
                    {formatDur(dur)}
                  </span>
                </div>

                {/* Three labelled groups */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11.5, color: T.sub }}>
                    <span style={{ fontWeight: 600, color: T.muted, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", flexBasis: "100%" }}>Sleep</span>
                    <span>{e.bedtime} – {e.waketime}</span>
                  </div>

                  {(e.hr || e.bp_sys || e.steps) && (
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11.5, color: T.sub }}>
                      <span style={{ fontWeight: 600, color: T.muted, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", flexBasis: "100%" }}>Health Metrics</span>
                      {e.bp_sys != null && <span>BP <b style={{ color: T.text }}>{e.bp_sys}/{e.bp_dia} mmHg</b></span>}
                      {e.hr     != null && <span>HR <b style={{ color: T.text }}>{e.hr} bpm</b></span>}
                      {e.steps  != null && <span>Steps <b style={{ color: T.text }}>{e.steps.toLocaleString()}</b></span>}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11.5, color: T.sub }}>
                    <span style={{ fontWeight: 600, color: T.muted, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", flexBasis: "100%" }}>Daily Activity</span>
                    <span>Activity <b style={{ color: actColor }}>{ACT_LABEL[e.activity]}</b></span>
                    <span>Stress <b style={{ color: STRESS_COLOR[e.stress] }}>{STRESS_LABEL[e.stress]}</b></span>
                  </div>
                </div>

                {/* Mini progress bars */}
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                  {([
                    { label: "Quality",  val: e.quality,  max: 5, color: qc },
                    { label: "Activity", val: e.activity, max: 4, color: actColor },
                    { label: "Stress",   val: e.stress,   max: 4, color: STRESS_COLOR[e.stress] },
                  ] as const).map(({ label, val, max, color }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 9.5, color: T.muted, width: 48, flexShrink: 0 }}>{label}</span>
                      <div style={{ flex: 1, height: 3, borderRadius: 99, background: T.border }}>
                        <div style={{ width: `${(val / max) * 100}%`, height: "100%", background: color, borderRadius: 99 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onDelete(e.id)}
                style={{ background: "none", border: "none", color: T.border, cursor: "pointer", fontSize: 14, padding: "2px 4px", borderRadius: 4, flexShrink: 0, lineHeight: 1 }}
                onMouseEnter={(ev) => ((ev.target as HTMLButtonElement).style.color = "#ef4444")}
                onMouseLeave={(ev) => ((ev.target as HTMLButtonElement).style.color = T.border)}
              >✕</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Arc ──────────────────────────────────────────────────────────────────────
interface ArcProps { value: number; max: number; label: string; sub: string; color: string; }
function Arc({ value, max, label, sub, color }: ArcProps) {
  const pct = Math.min(value / max, 1);
  const r = 44, c = Math.PI * r, dash = c * pct;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width="100" height="60" viewBox="0 0 100 60">
        <path d="M 6 56 A 44 44 0 0 1 94 56" fill="none" stroke={T.border} strokeWidth="7" strokeLinecap="round" />
        <path d="M 6 56 A 44 44 0 0 1 94 56" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`} />
        <text x="50" y="46" textAnchor="middle" fill={T.text} fontSize="14" fontWeight="700" fontFamily="'Inter',sans-serif">{label}</text>
        <text x="50" y="58" textAnchor="middle" fill={T.muted} fontSize="7.5" fontFamily="'Inter',sans-serif">{sub}</text>
      </svg>
    </div>
  );
}

// ─── Bars ─────────────────────────────────────────────────────────────────────
interface BarsProps { entries: SleepEntry[]; }
function Bars({ entries }: BarsProps) {
  const last7 = [...entries].slice(0, 7).reverse();
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 72 }}>
      {last7.map((e) => {
        const pct = Math.min(sleepDur(e.bedtime, e.waketime) / 600, 1);
        const day = new Date(e.date + "T12:00").toLocaleDateString("en", { weekday: "short" });
        return (
          <div key={e.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: "100%", height: 56, display: "flex", alignItems: "flex-end" }}>
              <div style={{ width: "100%", height: `${pct * 100}%`, minHeight: 3, background: Q_COLOR[e.quality], borderRadius: "3px 3px 2px 2px", opacity: 0.75 }} />
            </div>
            <span style={{ fontSize: 9, color: T.muted }}>{day}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────
interface StatsProps { entries: SleepEntry[]; }
function Stats({ entries }: StatsProps) {
  if (entries.length === 0) return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: T.muted, fontSize: 13 }}>
      Log entries to see stats.
    </div>
  );

  const avgOf = (key: keyof SleepEntry): number =>
    entries.reduce((a, e) => a + (Number(e[key]) || 0), 0) / entries.length;

  const avgDur    = Math.round(entries.map((e) => sleepDur(e.bedtime, e.waketime)).reduce((a, b) => a + b, 0) / entries.length);
  const avgQ      = avgOf("quality").toFixed(1);
  const avgStress = avgOf("stress").toFixed(1);
  const avgAct    = avgOf("activity").toFixed(1);

  const hE       = entries.filter((e) => e.hr != null) as SleepEntry[];
  const avgHr    = hE.length ? Math.round(hE.reduce((a, e) => a + (e.hr as number), 0) / hE.length) : null;

  const sE       = entries.filter((e) => e.steps != null) as SleepEntry[];
  const avgSteps = sE.length ? Math.round(sE.reduce((a, e) => a + (e.steps as number), 0) / sE.length) : null;

  const bE       = entries.filter((e) => e.bp_sys != null) as SleepEntry[];
  const avgBpSys = bE.length ? Math.round(bE.reduce((a, e) => a + (e.bp_sys as number), 0) / bE.length) : null;
  const avgBpDia = bE.length ? Math.round(bE.reduce((a, e) => a + (e.bp_dia as number), 0) / bE.length) : null;

  const bedMins   = entries.map((e) => { const m = parseMin(e.bedtime); return m < 720 ? m + 1440 : m; });
  const avgBed    = Math.round(bedMins.reduce((a, b) => a + b, 0) / entries.length) % 1440;
  const avgBedStr = `${pad(Math.floor(avgBed / 60) % 24)}:${pad(avgBed % 60)}`;

  interface TileProps { label: string; value: string; sub?: string; color?: string; }
  const Tile = ({ label, value, sub, color }: TileProps) => (
    <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontSize: 9.5, fontWeight: 600, color: T.sub, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color ?? T.text }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  interface BarStatProps { label: string; val: number; max: number; color: string; valLabel: string; }
  const BarStat = ({ label, val, max, color, valLabel }: BarStatProps) => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: T.sub }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color }}>{valLabel}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: T.border }}>
        <div style={{ width: `${(val / max) * 100}%`, height: "100%", background: color, borderRadius: 99 }} />
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      <SectionCard title="Sleep" color={T.accent}>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          <Arc value={avgDur / 60} max={10} label={`${(avgDur / 60).toFixed(1)}h`} sub="AVG SLEEP" color={T.accent} />
          <Arc value={Number(avgQ)} max={5} label={avgQ} sub="QUALITY" color={Q_COLOR[Math.round(Number(avgQ))]} />
        </div>
        <Bars entries={entries} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[1, 2, 3, 4, 5].map((q) => (
            <div key={q} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: Q_COLOR[q] }} />
              <span style={{ fontSize: 9.5, color: T.muted }}>{Q_LABEL[q]}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Health Metrics" color="#0ea5e9">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Tile label="Avg Bedtime" value={avgBedStr}   sub={`${entries.length} nights`} color={T.accent} />
          {avgSteps  != null && <Tile label="Avg Steps"      value={avgSteps.toLocaleString()} sub="per day"  color="#10b981" />}
          {avgBpSys  != null && <Tile label="Avg BP"         value={`${avgBpSys}/${avgBpDia}`} sub="mmHg"    color="#0ea5e9" />}
          {avgHr     != null && <Tile label="Avg Heart Rate" value={`${avgHr} bpm`}            color="#f59e0b" />}
        </div>
      </SectionCard>

      <SectionCard title="Daily Activity" color="#10b981">
        <BarStat
          label="Avg Activity Level" val={Number(avgAct)} max={4}
          color={`hsl(${(Number(avgAct) / 4) * 160 + 140}, 55%, 42%)`}
          valLabel={ACT_LABEL[Math.round(Number(avgAct))]}
        />
        <BarStat
          label="Avg Stress Level" val={Number(avgStress)} max={4}
          color={STRESS_COLOR[Math.round(Number(avgStress))]}
          valLabel={STRESS_LABEL[Math.round(Number(avgStress))]}
        />
      </SectionCard>

    </div>
  );
}

// ─── Sample data ──────────────────────────────────────────────────────────────
const SAMPLE: SleepEntry[] = [
  { id: 1, date: "2026-03-20", bedtime: "23:30", waketime: "06:45", quality: 3, activity: 2, stress: 3, bp_sys: 122, bp_dia: 80, hr: 68, steps: 7200  },
  { id: 2, date: "2026-03-19", bedtime: "00:15", waketime: "07:00", quality: 2, activity: 1, stress: 4, bp_sys: 130, bp_dia: 85, hr: 74, steps: 3400  },
  { id: 3, date: "2026-03-18", bedtime: "22:45", waketime: "07:30", quality: 4, activity: 3, stress: 2, bp_sys: 118, bp_dia: 76, hr: 62, steps: 10200 },
  { id: 4, date: "2026-03-17", bedtime: "01:00", waketime: "08:00", quality: 2, activity: 0, stress: 4, bp_sys: 128, bp_dia: 82, hr: 71, steps: 2100  },
  { id: 5, date: "2026-03-16", bedtime: "23:00", waketime: "07:15", quality: 5, activity: 4, stress: 1, bp_sys: 115, bp_dia: 74, hr: 58, steps: 14500 },
  { id: 6, date: "2026-03-15", bedtime: "23:45", waketime: "06:30", quality: 3, activity: 2, stress: 2, bp_sys: 120, bp_dia: 78, hr: 65, steps: 6800  },
  { id: 7, date: "2026-03-14", bedtime: "22:30", waketime: "07:00", quality: 4, activity: 3, stress: 1, bp_sys: 117, bp_dia: 75, hr: 60, steps: 9800  },
];

// ─── App ──────────────────────────────────────────────────────────────────────
type TabId = "log" | "history" | "stats";
interface Tab { id: TabId; label: string; }

export default function App() {
  const [entries, setEntries] = useState<SleepEntry[]>(SAMPLE);
  const [tab, setTab] = useState<TabId>("log");

  const tabs: Tab[] = [
    { id: "log",     label: "Log"     },
    { id: "history", label: "History" },
    { id: "stats",   label: "Stats"   },
  ];

  const handleAdd = (entry: SleepEntry) => {
    setEntries((prev) => [entry, ...prev]);
    setTab("history");
  };

  const handleDelete = (id: number) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; }
        input[type=date]::-webkit-calendar-picker-indicator,
        input[type=time]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.4; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.25; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
      `}</style>

      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Inter',sans-serif", color: T.text, display: "flex", justifyContent: "center", paddingBottom: 60 }}>
        <div style={{ width: "100%", maxWidth: 460 }}>

          {/* Header */}
          <div style={{ padding: "30px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
                {new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: "-0.02em" }}>
                Sleep <span style={{ color: T.accent }}>Journal</span>
              </h1>
            </div>
            <div style={{ background: T.accentBg, borderRadius: 12, padding: "8px 14px", fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {entries.length} nights
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", margin: "0 16px 14px", background: "#ededf2", borderRadius: 12, padding: 4, gap: 3 }}>
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: "9px 4px", border: "none", borderRadius: 9, cursor: "pointer",
                fontSize: 12, fontWeight: 600, fontFamily: "inherit", letterSpacing: "0.02em", transition: "all 0.15s",
                background: tab === t.id ? T.surface : "transparent",
                color: tab === t.id ? T.accent : T.sub,
                boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.07)" : "none",
              }}>{t.label}</button>
            ))}
          </div>

          {/* Content */}
          <div style={{ padding: "0 16px" }}>
            {tab === "log"     && <EntryForm onAdd={handleAdd} />}
            {tab === "history" && <HistoryList entries={entries} onDelete={handleDelete} />}
            {tab === "stats"   && <Stats entries={entries} />}
          </div>

        </div>
      </div>
    </>
  );
}