import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = 'https://wqfouncmysvajyhjnntt.supabase.co';
const SUPABASE_KEY = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZm91bmN',
  'teXN2YWp5aGpubnR0Iiwicm9sZSI6ImFub24iLCJpYX',
  'QiOjE3NzU0Mzc3NzUsImV4cCI6MjA5MTAxMzc3NX0',
  'Zb89er0PkbDvH_TZfsZ_sCm-gkUTDzYau1BguQz3u0A'
].join('.');

const sb = (endpoint, opts = {}) => fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
  ...opts,
  headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": opts.prefer || "return=representation", ...opts.headers },
}).then(r => r.ok ? r.json() : Promise.reject(r));

const sbGet = (table, query = "") => sb(`${table}?${query}&order=id.asc`, { prefer: "return=representation" });
const sbPost = (table, data) => sb(table, { method: "POST", body: JSON.stringify(data), prefer: "return=representation" });
const sbPatch = (table, query, data) => sb(`${table}?${query}`, { method: "PATCH", body: JSON.stringify(data), prefer: "return=representation" });
const sbDelete = (table, query) => sb(`${table}?${query}`, { method: "DELETE", prefer: "return=representation" });

const TABS = ["Panel", "Clientes", "Calendario", "Canceladas"];

const C = {
  bg: "#0c0e14", surface: "#161922", surfaceAlt: "#1e2230", border: "#282d3e",
  accent: "#d4a24e", accentGlow: "rgba(212,162,78,0.12)",
  text: "#e4e2dc", textDim: "#7a7d89",
  success: "#5ce89a", danger: "#f06060", info: "#5ba8f5",
  grupal: "#a78bfa", personal: "#f59e0b", libre: "#34d399", guiado: "#60a5fa",
};

// ─── PLANS & PRICING ───
const MODALITIES = [
  { key: "grupal", label: "Entrenamiento Grupal", color: C.grupal, icon: "👥", duration: 45, capacity: "8-10 personas", matricula: 20 },
  { key: "personal", label: "Entrenamiento Personal", color: C.personal, icon: "🏋️", duration: 45, capacity: "Individual o pareja", matricula: 20 },
  { key: "libre_total", label: "Entrenamiento Libre Total", color: C.libre, icon: "🔓", duration: null, capacity: "Acceso libre", matricula: 20 },
  { key: "libre_guiado", label: "Entrenamiento Libre Guiado", color: C.guiado, icon: "📋", duration: null, capacity: "Acceso con guía", matricula: 20 },
];

const PRICING = {
  grupal:       { 1: 20, 2: 35, 3: 45, 4: 55 },
  personal:     { 1: 80, 2: 140, 3: 180, 4: 220 },
  libre_total:  { 1: 12, 2: 20, 3: 25, 4: 30 },
  libre_guiado: { 1: 25, 2: 40, 3: 50, 4: 60 },
};

const FREQ_OPTIONS = [
  { value: 1, label: "1 entreno/semana" },
  { value: 2, label: "2 entrenos/semana" },
  { value: 3, label: "3 entrenos/semana" },
  { value: 4, label: "4 entrenos/semana" },
];

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie"];
const DAY_NAMES_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

function getPlanLabel(modality, freq) {
  const mod = MODALITIES.find(m => m.key === modality);
  if (!mod) return modality || "—";
  const price = PRICING[modality]?.[freq];
  return `${mod.label} – ${freq}x/sem${price ? ` (${price}€)` : ""}`;
}

function getPlanShort(modality, freq, schedule) {
  const labels = { grupal: "Grupal", personal: "Personal", libre_total: "Libre", libre_guiado: "L. Guiado" };
  if (!schedule || schedule.length === 0) return `${labels[modality] || modality} ${freq}x`;
  const days = schedule.map(s => DAY_NAMES[s.day]).join("-");
  return `${labels[modality] || modality} ${freq}x (${days})`;
}

function getScheduleLabel(schedule) {
  if (!schedule || schedule.length === 0) return "";
  return schedule.map(s => `${DAY_NAMES[s.day]} ${s.time}`).join(", ");
}

function getScheduleDaysOnly(schedule) {
  if (!schedule || schedule.length === 0) return "";
  return schedule.map(s => DAY_NAMES[s.day]).join(", ");
}

const GYM_TIME_SLOTS = [
  "07:00","08:00","09:00","10:00","11:00","12:00",
  "16:00","17:00","18:00","19:00","20:00","21:00"
];

const SESSION_TYPES = ["Grupal", "Personal", "Libre Total", "Libre Guiado", "Evaluación"];
const STATUS_OPTIONS = ["programada", "completada", "cancelada"];

function getNextMonday(fromDate) {
  const d = new Date(fromDate + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function getMondaysAround(today, count = 8) {
  const mondays = [];
  const first = new Date(today + "T00:00:00");
  first.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  for (let i = -2; i < count; i++) {
    const m = new Date(first);
    m.setDate(first.getDate() + i * 7);
    mondays.push(m.toISOString().split("T")[0]);
  }
  return mondays;
}

function getModColor(modality) {
  return MODALITIES.find(m => m.key === modality)?.color || C.accent;
}

function hasPathology(notes) {
  if (!notes) return false;
  const keywords = ["lesión","lesion","dolor","rodilla","lumbar","espalda","hombro","prótesis","protesis","escoliosis","hipertensión","hipertension","diabét","diabet","hernia","tendin","fractura","tobillo","cervical","cadera","muñeca","codo"];
  const lower = notes.toLowerCase();
  return keywords.some(k => lower.includes(k));
}



function uid() { return Date.now() + Math.floor(Math.random() * 9999); }
function fmtDate(d) { return new Date(d + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" }); }
function fmtDateFull(d) { return new Date(d + "T00:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
function getToday() { return new Date().toISOString().split("T")[0]; }
function getWeekDates(offset = 0) {
  const t = new Date(), m = new Date(t);
  m.setDate(t.getDate() - ((t.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 5 }, (_, i) => { const d = new Date(m); d.setDate(m.getDate() + i); return d.toISOString().split("T")[0]; });
}

function Badge({ status }) {
  const m = { programada: [C.info, "rgba(91,168,245,0.14)"], completada: [C.success, "rgba(92,232,154,0.14)"], cancelada: [C.danger, "rgba(240,96,96,0.14)"] };
  const [c, bg] = m[status] || m.programada;
  return <span style={{ background: bg, color: c, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{status}</span>;
}

function ModBadge({ modality }) {
  const mod = MODALITIES.find(m => m.key === modality);
  if (!mod) return null;
  return <span style={{ background: mod.color + "22", color: mod.color, padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>{mod.icon} {mod.label.replace("Entrenamiento ", "")}</span>;
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, width: wide ? "94%" : "92%", maxWidth: wide ? 740 : 500, maxHeight: "90vh", overflowY: "auto", animation: "fadeUp .22s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, color: C.accent, fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textDim, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Inp({ label, ...p }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={{ display: "block", marginBottom: 4, fontSize: 12, color: C.textDim, fontWeight: 600 }}>{label}</label>}
      <input {...p} style={{ width: "100%", padding: "9px 11px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", ...p.style }} />
    </div>
  );
}

function Sel({ label, options, ...p }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={{ display: "block", marginBottom: 4, fontSize: 12, color: C.textDim, fontWeight: 600 }}>{label}</label>}
      <select {...p} style={{ width: "100%", padding: "9px 11px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }}>
        {options.map(o => <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>{typeof o === "string" ? o : o.label}</option>)}
      </select>
    </div>
  );
}

function Btn({ children, variant = "primary", small, ...p }) {
  const s = { primary: { background: C.accent, color: C.bg, fontWeight: 700 }, secondary: { background: C.surfaceAlt, color: C.text, border: `1px solid ${C.border}` }, danger: { background: "rgba(240,96,96,0.14)", color: C.danger }, ghost: { background: "transparent", color: C.textDim } };
  return <button {...p} style={{ padding: small ? "5px 11px" : "9px 16px", borderRadius: 8, border: "none", fontSize: small ? 12 : 13, cursor: "pointer", transition: "all .15s", ...s[variant], ...p.style }}>{children}</button>;
}

function Stat({ label, value, icon, color, sub }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", flex: "1 1 130px", minWidth: 130 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || C.text }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Toast({ message, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, [onDone]);
  const bg = type === "success" ? C.success : type === "error" ? C.danger : C.info;
  return <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: bg, color: "#000", padding: "10px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700, zIndex: 2000, animation: "fadeUp .2s ease", boxShadow: `0 4px 20px ${bg}44` }}>{message}</div>;
}

// ─── GOOGLE CALENDAR VIA MCP ───
async function gcalCreate(session, clientName, calendarEmail) {
  const start = `${session.date}T${session.time}:00`;
  const end = new Date(`${session.date}T${session.time}:00`);
  end.setMinutes(end.getMinutes() + (session.duration || 45));
  const endStr = end.toISOString().replace("Z", "").split(".")[0];
  const calInstr = calendarEmail ? ` Use the calendar for ${calendarEmail}.` : "";
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 1000,
      messages: [{ role: "user", content: `Create a calendar event: Title "🏋️ ${clientName} — ${session.type}", Start ${start} Europe/Madrid, End ${endStr} Europe/Madrid, Description "Sesión de ${session.type} con ${clientName}. ${session.duration}min. ${session.notes || ""}", Location "RC Training, Verín".${calInstr} Create it now.` }],
      mcp_servers: [{ type: "url", url: "https://gcal.mcp.claude.com/mcp", name: "google-calendar" }],
    }),
  });
  const data = await resp.json();
  const tr = data.content?.find(b => b.type === "mcp_tool_result");
  if (tr?.content?.[0]?.text) { try { const p = JSON.parse(tr.content[0].text); return p.id || p.eventId || "synced"; } catch { return "synced"; } }
  const txt = data.content?.find(b => b.type === "text");
  if (txt?.text?.toLowerCase().match(/creat/)) return "synced";
  throw new Error("Failed");
}

async function gcalDelete(eventId) {
  await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 1000,
      messages: [{ role: "user", content: `Delete the Google Calendar event with ID "${eventId}".` }],
      mcp_servers: [{ type: "url", url: "https://gcal.mcp.claude.com/mcp", name: "google-calendar" }],
    }),
  });
}

// ─── EXCEL IMPORT ───
function ExcelImportModal({ onClose, onImport }) {
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [rawData, setRawData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();

  const fields = [
    { key: "name", label: "Nombre", required: true },
    { key: "email", label: "Email" },
    { key: "phone", label: "Teléfono" },
    { key: "modality", label: "Modalidad" },
    { key: "frequency", label: "Frecuencia (2/3/4)" },
    { key: "startDate", label: "Fecha inicio" },
    { key: "notes", label: "Notas" },
  ];

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(null);
    try {
      const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      if (!json.length) { setError("Archivo vacío"); return; }
      const hdrs = Object.keys(json[0]);
      setHeaders(hdrs); setRawData(json); setPreview(json.slice(0, 5));
      const auto = {};
      fields.forEach(f => {
        const m = hdrs.find(h => {
          const l = h.toLowerCase().trim();
          if (f.key === "name") return l.includes("nombre") || l.includes("name") || l === "cliente";
          if (f.key === "email") return l.includes("email") || l.includes("correo") || l.includes("mail");
          if (f.key === "phone") return l.includes("tel") || l.includes("móvil") || l.includes("movil") || l.includes("phone");
          if (f.key === "modality") return l.includes("modal") || l.includes("plan") || l.includes("tipo") || l.includes("tarifa");
          if (f.key === "frequency") return l.includes("frec") || l.includes("veces") || l.includes("dias") || l.includes("entrenam");
          if (f.key === "startDate") return l.includes("fecha") || l.includes("inicio") || l.includes("alta");
          if (f.key === "notes") return l.includes("nota") || l.includes("observ") || l.includes("comen");
          return false;
        });
        if (m) auto[f.key] = m;
      });
      setMapping(auto);
    } catch (err) { setError("Error: " + err.message); }
  };

  const parseModality = (val) => {
    const v = String(val).toLowerCase().trim();
    if (v.includes("personal")) return "personal";
    if (v.includes("guiado") || v.includes("guiad")) return "libre_guiado";
    if (v.includes("libre")) return "libre_total";
    if (v.includes("grupal") || v.includes("grupo")) return "grupal";
    return "grupal";
  };

  const parseFrequency = (val) => {
    const n = parseInt(String(val));
    if ([2, 3, 4].includes(n)) return n;
    return 3;
  };

  const doImport = () => {
    if (!mapping.name) { setError("Mapea al menos el campo Nombre"); return; }
    setImporting(true);
    const clients = rawData.map(row => {
      let sd = "";
      if (mapping.startDate && row[mapping.startDate]) {
        const v = row[mapping.startDate];
        if (v instanceof Date) sd = v.toISOString().split("T")[0];
        else if (typeof v === "string" && v.match(/\d{4}-\d{2}-\d{2}/)) sd = v;
        else { try { const d = new Date(v); if (!isNaN(d)) sd = d.toISOString().split("T")[0]; } catch {} }
      }
      return {
        id: uid(), name: String(row[mapping.name] || "").trim(),
        email: mapping.email ? String(row[mapping.email] || "").trim() : "",
        phone: mapping.phone ? String(row[mapping.phone] || "").trim() : "",
        modality: mapping.modality ? parseModality(row[mapping.modality]) : "grupal",
        frequency: mapping.frequency ? parseFrequency(row[mapping.frequency]) : 3,
        startDate: sd || getToday(),
        notes: mapping.notes ? String(row[mapping.notes] || "").trim() : "",
        schedule: [], matriculaPaid: false, active: true,
      };
    }).filter(c => c.name.length > 0);
    onImport(clients);
    setImporting(false);
  };

  return (
    <Modal title="📥 Importar desde Excel" onClose={onClose} wide>
      {!rawData ? (
        <div>
          <p style={{ color: C.textDim, fontSize: 13, marginBottom: 16 }}>Sube tu archivo Excel o CSV. Las columnas se detectan automáticamente. Si tienes columnas de "modalidad" o "plan", el sistema reconoce: grupal, personal, libre, guiado.</p>
          <div onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: 36, textAlign: "center", cursor: "pointer", transition: "all .2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.accent} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
            <div style={{ fontSize: 34, marginBottom: 6 }}>📄</div>
            <div style={{ color: C.text, fontWeight: 600 }}>Seleccionar archivo</div>
            <div style={{ color: C.textDim, fontSize: 11 }}>.xlsx, .xls, .csv</div>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: "none" }} />
          {error && <div style={{ marginTop: 10, padding: 8, background: "rgba(240,96,96,0.1)", borderRadius: 8, color: C.danger, fontSize: 12 }}>{error}</div>}
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 14, padding: 10, background: C.bg, borderRadius: 10 }}>
            <div style={{ color: C.success, fontWeight: 700, fontSize: 13 }}>✓ {rawData.length} filas detectadas</div>
            <div style={{ color: C.textDim, fontSize: 11 }}>Columnas: {headers.join(", ")}</div>
          </div>
          <h4 style={{ color: C.text, fontSize: 13, marginBottom: 8 }}>Mapeo de columnas</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {fields.map(f => (
              <Sel key={f.key} label={`${f.label}${f.required ? " *" : ""}`}
                options={[{ value: "", label: "— No mapear —" }, ...headers.map(h => ({ value: h, label: h }))]}
                value={mapping[f.key] || ""} onChange={e => setMapping({ ...mapping, [f.key]: e.target.value })} />
            ))}
          </div>
          {preview && (
            <div style={{ marginTop: 10 }}>
              <h4 style={{ color: C.text, fontSize: 12, marginBottom: 6 }}>Vista previa</h4>
              <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${C.border}` }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                  <thead><tr>{fields.filter(f => mapping[f.key]).map(f => <th key={f.key} style={{ padding: "5px 7px", background: C.surfaceAlt, color: C.accent, textAlign: "left", fontWeight: 700 }}>{f.label}</th>)}</tr></thead>
                  <tbody>{preview.map((row, i) => <tr key={i}>{fields.filter(f => mapping[f.key]).map(f => <td key={f.key} style={{ padding: "4px 7px", borderTop: `1px solid ${C.border}`, color: C.text }}>{String(row[mapping[f.key]] || "—")}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </div>
          )}
          {error && <div style={{ marginTop: 8, padding: 6, background: "rgba(240,96,96,0.1)", borderRadius: 8, color: C.danger, fontSize: 11 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
            <Btn variant="secondary" onClick={() => { setRawData(null); setPreview(null); setHeaders([]); setMapping({}); }}>Cambiar archivo</Btn>
            <Btn onClick={doImport} disabled={importing}>{importing ? "..." : `Importar ${rawData.length} clientes`}</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── PRICING CARD ───
function PricingView() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
      {MODALITIES.map(mod => (
        <div key={mod.key} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, borderTop: `3px solid ${mod.color}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>{mod.icon}</span>
            <div>
              <div style={{ fontWeight: 700, color: mod.color, fontSize: 14 }}>{mod.label.replace("Entrenamiento ", "")}</div>
              <div style={{ fontSize: 10, color: C.textDim }}>{mod.capacity}{mod.duration ? ` · ${mod.duration} min` : ""}</div>
            </div>
          </div>
          {Object.entries(PRICING[mod.key]).map(([freq, price]) => (
            <div key={freq} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 12, color: C.textDim }}>{freq} entrenos/semana</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{price}€<span style={{ fontSize: 10, color: C.textDim, fontWeight: 400 }}>/mes</span></span>
            </div>
          ))}
          {mod.matricula > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, color: C.accent, fontWeight: 600 }}>Matrícula: {mod.matricula}€ (pago único)</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── MAIN ───
export default function GymDashboard() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [clients, setClients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [tab, setTab] = useState("Panel");
  const [showCF, setShowCF] = useState(false);
  const [showSF, setShowSF] = useState(false);
  const [editC, setEditC] = useState(null);
  const [editS, setEditS] = useState(null);
  const [wOff, setWOff] = useState(0);
  const [detail, setDetail] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [toast, setToast] = useState(null);
  const [calSync, setCalSync] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [modFilter, setModFilter] = useState("todas");
  const [calAccounts, setCalAccounts] = useState([]);
  const [selectedCal, setSelectedCal] = useState("");
  const [showCalSettings, setShowCalSettings] = useState(false);

  const today = getToday();
  const notify = (msg, type = "success") => setToast({ message: msg, type });
  const activeC = clients.filter(c => c.active);
  const todayS = sessions.filter(s => s.date === today && s.status !== "cancelada");
  const wkDates = getWeekDates(0);
  const wkS = sessions.filter(s => wkDates.includes(s.date) && s.status !== "cancelada");
  const wkDone = wkS.filter(s => s.status === "completada").length;
  const getName = id => clients.find(c => c.id === id)?.name || "—";
  const getClient = id => clients.find(c => c.id === id);

  const monthlyRevenue = activeC.reduce((sum, c) => {
    const price = PRICING[c.modality]?.[c.frequency] || 0;
    return sum + price;
  }, 0);

  // Map Supabase row to app format
  const mapClient = r => ({ id: r.id, name: r.name, email: r.email || "", phone: r.phone || "", birthdate: r.birthdate || "", modality: r.modality, frequency: r.frequency, schedule: r.schedule || [], notes: r.notes || "", matriculaPaid: r.matricula_paid, active: r.active });
  const mapSession = r => ({ id: r.id, clientId: r.client_id, date: r.date, time: r.time, duration: r.duration, type: r.type, status: r.status, notes: r.notes || "", calEventId: r.cal_event_id });

  const loadData = async () => {
    try {
      const [cl, ss, st] = await Promise.all([
        sbGet("clients", "select=*"),
        sbGet("sessions", "select=*"),
        sbGet("settings", "key=eq.gcal_accounts").catch(() => [])
      ]);
      setClients(cl.map(mapClient));
      setSessions(ss.map(mapSession));
      if (st?.[0]?.value) { setCalAccounts(st[0].value.accounts || []); setSelectedCal(st[0].value.selected || ""); }
    } catch (e) { console.error("Load error:", e); }
    setLoaded(true);
  };

  useEffect(() => { loadData(); }, []);

  // Save calendar accounts to Supabase when they change
  useEffect(() => {
    if (!loaded) return;
    const data = { accounts: calAccounts, selected: selectedCal };
    sbPost("settings", { key: "gcal_accounts", value: data }).catch(() =>
      sbPatch("settings", "key=eq.gcal_accounts", { value: data }).catch(() => {})
    );
  }, [calAccounts, selectedCal, loaded]);

  const handleLogin = async () => {
    try {
      const users = await sbGet("users", `username=eq.${loginUser.toLowerCase()}&password_hash=eq.${loginPass}`);
      if (users.length > 0) { setLoggedIn(true); setLoginError(""); }
      else { setLoginError("Usuario o contraseña incorrectos"); }
    } catch { setLoginError("Error de conexion"); }
  };

  const handleLogout = () => setLoggedIn(false);

  // ── Client Form ──
  function CForm({ client, onClose }) {
    const [f, setF] = useState(client || { name: "", email: "", phone: "", birthdate: "", modality: "grupal", frequency: 3, schedule: [{day:0,time:"09:00"},{day:2,time:"09:00"},{day:4,time:"09:00"}], startDate: getNextMonday(today), notes: "", matriculaPaid: false, active: true });
    const price = PRICING[f.modality]?.[f.frequency] || 0;
    const mod = MODALITIES.find(m => m.key === f.modality);
    const sched = f.schedule || [];
    const selectedDays = sched.map(s => s.day);

    const toggleDay = (dayIdx) => {
      let ns = [...sched];
      const idx = ns.findIndex(s => s.day === dayIdx);
      if (idx >= 0) ns.splice(idx, 1);
      else { if (ns.length >= f.frequency) return; ns.push({ day: dayIdx, time: "09:00" }); }
      ns.sort((a, b) => a.day - b.day);
      setF({ ...f, schedule: ns });
    };

    const setDayTime = (dayIdx, time) => setF({ ...f, schedule: sched.map(s => s.day === dayIdx ? { ...s, time } : s) });

    const save = async () => {
      if (!f.name.trim() || sched.length === 0) return;
      const row = { name: f.name, email: f.email, phone: f.phone, birthdate: f.birthdate || null, modality: f.modality, frequency: sched.length, schedule: sched, notes: f.notes, matricula_paid: f.matriculaPaid, active: f.active };
      try {
        if (client) {
          await sbPatch("clients", `id=eq.${client.id}`, row);
        } else {
          await sbPost("clients", row);
        }
        await loadData();
        notify(client ? "Cliente actualizado" : "Cliente añadido"); onClose();
      } catch { notify("Error al guardar", "error"); }
    };

    return (
      <Modal title={client ? "Editar Cliente" : "Nuevo Cliente"} onClose={onClose} wide>
        <Inp label="Nombre completo" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Nombre y apellidos" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Inp label="Email" type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
          <Inp label="Teléfono" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
        </div>
        <Inp label="Fecha de nacimiento" type="date" value={f.birthdate || ""} onChange={e => setF({ ...f, birthdate: e.target.value })} />

        <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: C.textDim, fontWeight: 600 }}>Modalidad</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
          {MODALITIES.map(m => (
            <div key={m.key} onClick={() => setF({ ...f, modality: m.key })}
              style={{ padding: "10px 12px", borderRadius: 10, border: `2px solid ${f.modality === m.key ? m.color : C.border}`, background: f.modality === m.key ? m.color + "15" : C.bg, cursor: "pointer", transition: "all .15s" }}>
              <div style={{ fontSize: 14, marginBottom: 2 }}>{m.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: f.modality === m.key ? m.color : C.text }}>{m.label.replace("Entrenamiento ", "")}</div>
              <div style={{ fontSize: 10, color: C.textDim }}>{m.capacity}</div>
            </div>
          ))}
        </div>

        <Sel label="Frecuencia semanal" options={FREQ_OPTIONS} value={f.frequency} onChange={e => {
          const nf = Number(e.target.value);
          let ns = [...sched]; if (ns.length > nf) ns = ns.slice(0, nf);
          setF({ ...f, frequency: nf, schedule: ns });
        }} />

        <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: C.textDim, fontWeight: 600 }}>
          Horario fijo semanal <span style={{ color: C.accent }}>({sched.length}/{f.frequency})</span>
        </label>
        <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
          {DAY_NAMES.map((day, i) => {
            const selected = selectedDays.includes(i);
            const canSelect = selected || sched.length < f.frequency;
            return (
              <div key={i} onClick={() => { if (canSelect || selected) toggleDay(i); }}
                style={{ flex: 1, textAlign: "center", padding: "8px 2px", borderRadius: 8, background: selected ? getModColor(f.modality) + "30" : C.bg, border: `2px solid ${selected ? getModColor(f.modality) : C.border}`, cursor: canSelect || selected ? "pointer" : "not-allowed", opacity: canSelect || selected ? 1 : 0.3, transition: "all .15s" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: selected ? getModColor(f.modality) : C.text }}>{day}</div>
              </div>
            );
          })}
        </div>

        {sched.length > 0 && (
          <div style={{ background: C.bg, borderRadius: 10, padding: 10, marginBottom: 14 }}>
            {sched.map(s => (
              <div key={s.day} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.border}33` }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: getModColor(f.modality), minWidth: 70 }}>{DAY_NAMES_FULL[s.day]}</span>
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap", flex: 1 }}>
                  {GYM_TIME_SLOTS.map(time => (
                    <button key={time} onClick={() => setDayTime(s.day, time)}
                      style={{ padding: "4px 7px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: s.time === time ? 800 : 500, background: s.time === time ? getModColor(f.modality) : C.surfaceAlt, color: s.time === time ? C.bg : C.textDim, cursor: "pointer", transition: "all .1s" }}>
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {sched.length > 0 && sched.length < f.frequency && (
          <div style={{ fontSize: 11, color: C.accent, marginBottom: 10, marginTop: -8 }}>Selecciona {f.frequency - sched.length} día{f.frequency - sched.length > 1 ? "s" : ""} más</div>
        )}

        <div style={{ background: C.bg, borderRadius: 10, padding: 12, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: C.textDim }}>Cuota mensual</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.accent }}>{price}€</div>
          </div>
          {mod?.matricula > 0 && (
            <div onClick={() => setF({ ...f, matriculaPaid: !f.matriculaPaid })} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, background: f.matriculaPaid ? C.success : C.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.bg, fontWeight: 800 }}>{f.matriculaPaid ? "✓" : ""}</div>
              <span style={{ fontSize: 11, color: C.textDim }}>Matrícula pagada ({mod.matricula}€)</span>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 4, fontSize: 12, color: C.textDim, fontWeight: 600 }}>Notas</label>
          <textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} rows={2} placeholder="Lesiones, objetivos..." style={{ width: "100%", padding: "9px 11px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={save}>{client ? "Guardar" : "Añadir"}</Btn>
        </div>
      </Modal>
    );
  }

  // ── Session Form ──
  function SForm({ session, onClose, presetCid }) {
    const defaultType = presetCid ? (() => {
      const c = getClient(presetCid);
      if (!c) return "Grupal";
      const map = { grupal: "Grupal", personal: "Personal", libre_total: "Libre Total", libre_guiado: "Libre Guiado" };
      return map[c.modality] || "Grupal";
    })() : "Grupal";

    const [f, setF] = useState(session || { clientId: presetCid || (clients[0]?.id || ""), date: today, time: "09:00", duration: 45, type: defaultType, status: "programada", notes: "", calEventId: null });
    const [syncG, setSyncG] = useState(!session);
    const [saving, setSaving] = useState(false);

    const save = async () => {
      if (!f.clientId) return;
      const fHour = parseInt(f.time.split(":")[0]);
      const validHours = [...GYM_MORNING, ...GYM_AFTERNOON];
      if (!validHours.includes(fHour)) {
        notify("⛔ Hora fuera del horario del gimnasio (07-13h / 16-22h)", "error");
        return;
      }
      const slotSessions = sessions.filter(s => s.date === f.date && s.status !== "cancelada" && parseInt(s.time.split(":")[0]) === fHour && (!session || s.id !== session.id));
      if (slotSessions.length >= MAX_SLOT) {
        notify(`⛔ Franja de las ${fHour}:00 completa (${MAX_SLOT}/${MAX_SLOT})`, "error");
        return;
      }
      setSaving(true);
      const row = { client_id: Number(f.clientId), date: f.date, time: f.time, duration: f.duration, type: f.type, status: f.status, notes: f.notes, cal_event_id: f.calEventId || null };
      try {
        let savedId;
        if (session) {
          await sbPatch("sessions", `id=eq.${session.id}`, row);
          savedId = session.id;
        } else {
          const res = await sbPost("sessions", row);
          savedId = res?.[0]?.id;
        }
        if (syncG && f.status === "programada") {
          setCalSync(true);
          try {
            const eid = await gcalCreate({ ...f, id: savedId }, getName(Number(f.clientId)), selectedCal);
            await sbPatch("sessions", `id=eq.${savedId}`, { cal_event_id: typeof eid === "string" ? eid : "synced" });
            notify("✅ Sesion + Google Calendar");
          } catch { notify("Sesion guardada (error calendario)", "info"); }
          setCalSync(false);
        } else { notify(session ? "Sesion actualizada" : "Sesion reservada"); }
        await loadData();
      } catch { notify("Error al guardar", "error"); }
      setSaving(false); onClose();
    };

    const cancel = async () => {
      setCalSync(true);
      try { if (session.calEventId && session.calEventId !== "synced") await gcalDelete(session.calEventId); } catch {}
      try {
        await sbPatch("sessions", `id=eq.${session.id}`, { status: "cancelada", cal_event_id: null });
        await loadData();
      } catch {}
      notify("❌ Cita cancelada"); setCalSync(false); onClose();
    };

    return (
      <Modal title={session ? "Editar Sesion" : "Reservar Sesion"} onClose={onClose}>
        <Sel label="Cliente" options={activeC.map(c => ({ value: c.id, label: `${c.name} (${getPlanShort(c.modality, c.frequency, c.schedule)})` }))} value={f.clientId} onChange={e => setF({ ...f, clientId: Number(e.target.value) })} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Inp label="Fecha" type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
          <Inp label="Hora" type="time" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Sel label="Tipo" options={SESSION_TYPES} value={f.type} onChange={e => setF({ ...f, type: e.target.value })} />
          <Inp label="Duración (min)" type="number" value={f.duration} onChange={e => setF({ ...f, duration: Number(e.target.value) })} />
        </div>
        {session && <Sel label="Estado" options={STATUS_OPTIONS.map(s => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))} value={f.status} onChange={e => setF({ ...f, status: e.target.value })} />}
        
        {/* Capacity + schedule indicator */}
        {(() => {
          const fHour = parseInt(f.time.split(":")[0]);
          const validHours = [...GYM_MORNING, ...GYM_AFTERNOON];
          const isOpen = validHours.includes(fHour);
          const slotCount = sessions.filter(s => s.date === f.date && s.status !== "cancelada" && parseInt(s.time.split(":")[0]) === fHour && (!session || s.id !== session.id)).length;
          const remaining = MAX_SLOT - slotCount;
          const pct = Math.min((slotCount / MAX_SLOT) * 100, 100);
          const barColor = !isOpen ? C.danger : remaining <= 0 ? C.danger : remaining <= 3 ? "#f59e0b" : remaining <= 6 ? C.info : C.success;
          return (
            <div style={{ padding: "10px 12px", background: C.bg, borderRadius: 10, marginBottom: 12, border: `1px solid ${!isOpen || remaining <= 0 ? C.danger + "44" : C.border}` }}>
              {!isOpen ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🔒</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.danger }}>Gimnasio cerrado a esta hora</div>
                    <div style={{ fontSize: 10, color: C.textDim }}>Horario: 07:00–13:00 y 16:00–22:00</div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: C.textDim, fontWeight: 600 }}>Ocupación {f.date} a las {String(fHour).padStart(2,"0")}:00</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: barColor }}>{slotCount}/{MAX_SLOT}</span>
                  </div>
                  <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 3, transition: "width .3s" }} />
                  </div>
                  <div style={{ fontSize: 10, color: remaining <= 0 ? C.danger : C.textDim, fontWeight: 600, marginTop: 4 }}>
                    {remaining <= 0 ? "⛔ FRANJA COMPLETA — No se pueden añadir más reservas" : `${remaining} plaza${remaining !== 1 ? "s" : ""} disponible${remaining !== 1 ? "s" : ""}`}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 4, fontSize: 12, color: C.textDim, fontWeight: 600 }}>Notas</label>
          <textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} rows={2} style={{ width: "100%", padding: "9px 11px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div onClick={() => setSyncG(!syncG)} style={{ display: "flex", alignItems: "center", gap: 10, padding: 11, background: syncG ? C.accentGlow : C.bg, border: `1px solid ${syncG ? C.accent : C.border}`, borderRadius: syncG && calAccounts.length > 0 ? "10px 10px 0 0" : 10, cursor: "pointer" }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: syncG ? C.accent : C.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: C.bg, fontWeight: 800, flexShrink: 0 }}>{syncG ? "✓" : ""}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>📅 Google Calendar</div>
              <div style={{ fontSize: 10, color: C.textDim }}>Crear evento automáticamente</div>
            </div>
            <button onClick={e => { e.stopPropagation(); setShowCalSettings(true); }} style={{ background: "none", border: "none", color: C.textDim, fontSize: 14, cursor: "pointer", padding: 4 }}>⚙️</button>
          </div>
          {syncG && calAccounts.length > 0 && (
            <div style={{ padding: "8px 11px", background: C.bg, border: `1px solid ${C.accent}`, borderTop: "none", borderRadius: "0 0 10px 10px" }}>
              <label style={{ fontSize: 11, color: C.textDim, fontWeight: 600 }}>Cuenta</label>
              <select value={selectedCal} onChange={e => setSelectedCal(e.target.value)} style={{ width: "100%", marginTop: 4, padding: "7px 9px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, outline: "none" }}>
                <option value="">Cuenta por defecto</option>
                {calAccounts.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}
          {syncG && calAccounts.length === 0 && (
            <div style={{ padding: "6px 11px", fontSize: 10, color: C.textDim, background: C.bg, border: `1px solid ${C.accent}`, borderTop: "none", borderRadius: "0 0 10px 10px" }}>
              Usa ⚙️ para añadir cuentas de Google Calendar
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {session && session.status === "programada" && <Btn variant="danger" onClick={cancel}>Cancelar cita</Btn>}
          <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "⏳" : session ? "Guardar" : "Reservar"}</Btn>
        </div>
      </Modal>
    );
  }

  // ── Client Detail ──
  function DetailView({ client }) {
    const cs = sessions.filter(s => s.clientId === client.id).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
    const done = cs.filter(s => s.status === "completada").length, next = cs.filter(s => s.status === "programada" && s.date >= today).length;
    const price = PRICING[client.modality]?.[client.frequency] || 0;
    const mod = MODALITIES.find(m => m.key === client.modality);
    return (
      <Modal title={client.name} onClose={() => setDetail(null)} wide>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          <ModBadge modality={client.modality} />
          <span style={{ background: C.accentGlow, color: C.accent, padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>{client.frequency}x/semana · {price}€/mes</span>
          {client.schedule && client.schedule.length > 0 && (
            <span style={{ background: C.surfaceAlt, color: C.text, padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>📅 {getScheduleLabel(client.schedule)}</span>
          )}
          {mod?.matricula > 0 && (
            <span style={{ background: client.matriculaPaid ? "rgba(92,232,154,0.14)" : "rgba(240,96,96,0.14)", color: client.matriculaPaid ? C.success : C.danger, padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
              Matrícula: {client.matriculaPaid ? "Pagada ✓" : `Pendiente (${mod.matricula}€)`}
            </span>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[[done, "Completadas", C.success], [next, "Próximas", C.info], [cs.length, "Total", C.text]].map(([v, l, c], i) => (
            <div key={i} style={{ background: C.bg, borderRadius: 10, padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: c }}>{v}</div>
              <div style={{ fontSize: 10, color: C.textDim }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12, fontSize: 12 }}>
          <div><span style={{ color: C.textDim }}>Email:</span> {client.email || "—"}</div>
          <div><span style={{ color: C.textDim }}>Tel:</span> {client.phone || "—"}</div>
          <div><span style={{ color: C.textDim }}>Nacimiento:</span> {client.birthdate ? fmtDate(client.birthdate) : "—"}</div>
          <div><span style={{ color: C.textDim }}>Desde:</span> {fmtDate(client.startDate)}</div>
        </div>
        {client.notes && <div style={{ background: C.bg, borderRadius: 8, padding: 8, fontSize: 11, color: C.textDim, marginBottom: 12 }}>📝 {client.notes}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h4 style={{ margin: 0, color: C.text, fontSize: 13 }}>Historial</h4>
          <Btn small onClick={() => { setDetail(null); setEditS(null); setShowSF({ presetCid: client.id }); }}>+ Sesion</Btn>
        </div>
        <div style={{ maxHeight: 200, overflowY: "auto" }}>
          {cs.length === 0 ? <div style={{ textAlign: "center", color: C.textDim, padding: 16, fontSize: 12 }}>Sin sesiones</div> : cs.map(s => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 9px", background: C.surfaceAlt, borderRadius: 7, marginBottom: 4, fontSize: 11 }}>
              <div><span style={{ color: C.text, fontWeight: 600 }}>{fmtDate(s.date)}</span><span style={{ color: C.textDim, marginLeft: 5 }}>{s.time} · {s.duration}min · {s.type}</span>{s.calEventId && <span style={{ marginLeft: 4 }}>📅</span>}</div>
              <Badge status={s.status} />
            </div>
          ))}
        </div>
      </Modal>
    );
  }

  // ── Panel ──
  function Panel() {
    const up = sessions.filter(s => s.date >= today && s.status === "programada").sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).slice(0, 6);
    const byMod = MODALITIES.map(m => ({ ...m, count: activeC.filter(c => c.modality === m.key).length }));
    return (
      <div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          <Stat label="Clientes" value={activeC.length} icon="👥" color={C.accent} />
          <Stat label="Hoy" value={todayS.length} icon="📅" color={C.info} />
          <Stat label="Semana" value={wkS.length} icon="🗓" />
          <Stat label="Ingresos/mes" value={`${monthlyRevenue}€`} icon="💰" color={C.success} sub="cuotas activas" />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", justifyContent: "center" }}>
          {byMod.map(m => (
            <div key={m.key} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, borderLeft: `3px solid ${m.color}` }}>
              <span style={{ fontSize: 16 }}>{m.icon}</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: m.color }}>{m.count}</div>
                <div style={{ fontSize: 9, color: C.textDim }}>{m.label.replace("Entrenamiento ", "")}</div>
              </div>
            </div>
          ))}
        </div>

        <PricingView />

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: C.text, fontWeight: 700 }}>Próximas sesiones</h3>
            <Btn small onClick={() => { setEditS(null); setShowSF(true); }}>+ Reservar</Btn>
          </div>
          {up.length === 0 ? <div style={{ textAlign: "center", color: C.textDim, padding: 20, fontSize: 12 }}>Sin sesiones</div> : up.map(s => {
            const cl = getClient(s.clientId);
            return (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 11px", background: C.surfaceAlt, borderRadius: 10, marginBottom: 5, cursor: "pointer", borderLeft: `3px solid ${cl ? getModColor(cl.modality) : C.accent}` }}
                onClick={() => { setEditS(s); setShowSF(true); }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: C.accentGlow, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.accent }}>{s.date.split("-")[2]}</div>
                  <div>
                    <div style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>{getName(s.clientId)}</div>
                    <div style={{ fontSize: 11, color: C.textDim }}>{s.time} · {s.duration}min · {s.type}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {s.calEventId && <span style={{ fontSize: 12 }}>📅</span>}
                  <Badge status={s.status} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Clients ──
  function Clients() {
    const [search, setSearch] = useState("");
    const f = clients.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
      const matchMod = modFilter === "todas" || c.modality === modFilter;
      return matchSearch && matchMod;
    });
    return (
      <div>
        <div style={{ display: "flex", gap: 7, marginBottom: 10, flexWrap: "wrap" }}>
          <input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 100, padding: "9px 11px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, outline: "none" }} />
          <Btn variant="secondary" onClick={() => setShowImport(true)} style={{ fontSize: 12 }}>📥 Excel</Btn>
          <Btn onClick={() => { setEditC(null); setShowCF(true); }}>+ Nuevo</Btn>
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
          <button onClick={() => setModFilter("todas")} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: modFilter === "todas" ? C.accent : C.surfaceAlt, color: modFilter === "todas" ? C.bg : C.textDim, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Todas</button>
          {MODALITIES.map(m => (
            <button key={m.key} onClick={() => setModFilter(m.key)} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: modFilter === m.key ? m.color + "33" : C.surfaceAlt, color: modFilter === m.key ? m.color : C.textDim, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {m.icon} {m.label.replace("Entrenamiento ", "")}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.textDim, marginBottom: 8 }}>{f.length} cliente{f.length !== 1 ? "s" : ""}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
        {f.map(c => {
          const ts = sessions.filter(s => s.clientId === c.id).length;
          const price = PRICING[c.modality]?.[c.frequency] || 0;
          return (
            <div key={c.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, cursor: "pointer", opacity: c.active ? 1 : 0.4, borderLeft: `3px solid ${getModColor(c.modality)}` }}
              onClick={() => setDetail(c)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 9, alignItems: "center", minWidth: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: getModColor(c.modality) + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: getModColor(c.modality), flexShrink: 0 }}>{c.name.charAt(0)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{c.name}{hasPathology(c.notes) ? " ⛑️" : ""}</div>
                    <div style={{ fontSize: 10, color: C.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.phone}{c.email ? ` · ${c.email}` : ""}</div>
                    <div style={{ fontSize: 10, marginTop: 2, display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                      <ModBadge modality={c.modality} />
                      <span style={{ color: C.accent, fontWeight: 700 }}>{c.frequency}x · {price}€</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                  <Btn variant="ghost" small onClick={e => { e.stopPropagation(); setEditC(c); setShowCF(true); }}>✏️</Btn>
                  <Btn variant="ghost" small onClick={e => { e.stopPropagation(); (async()=>{ try { await sbPatch("clients", `id=eq.${c.id}`, { active: !c.active }); await loadData(); } catch {} })(); }}>{c.active ? "⏸" : "▶️"}</Btn>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    );
  }

  // ── Canceladas ──
  function Canceladas() {
    const cancelled = [...sessions].filter(s => s.status === "cancelada").sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, color: C.text, fontWeight: 700 }}>Sesiones canceladas</h3>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>{cancelled.length} cancelada{cancelled.length !== 1 ? "s" : ""}</div>
          </div>
        </div>
        {cancelled.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: C.textDim, fontSize: 14 }}>No hay sesiones canceladas</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 6 }}>
            {cancelled.map(s => {
              const cl = getClient(s.clientId);
              return (
                <div key={s.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, borderLeft: `3px solid ${C.danger}`, opacity: 0.7 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>{getName(s.clientId)}</div>
                      <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{fmtDate(s.date)} · {s.time} · {s.duration}min · {s.type}</div>
                      {s.notes && <div style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>📝 {s.notes}</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                      <Badge status="cancelada" />
                      <Btn variant="ghost" small onClick={() => { (async()=>{ try { await sbPatch("sessions", `id=eq.${s.id}`, { status: "programada" }); await loadData(); notify("Sesion reprogramada ✓"); } catch {} })(); }}>↩️</Btn>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Calendar ──
  const MAX_SLOT = 12;
  const GYM_MORNING = [7,8,9,10,11,12];
  const GYM_AFTERNOON = [16,17,18,19,20,21];

  function Cal() {
    const wd = getWeekDates(wOff);
    const dn = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

    // Generate recurring sessions from active clients' schedules for this week
    const recurring = [];
    activeC.forEach(c => {
      if (!c.schedule || c.schedule.length === 0) return;
      const modLabel = MODALITIES.find(m => m.key === c.modality)?.label.replace("Entrenamiento ", "") || c.modality;
      const dur = MODALITIES.find(m => m.key === c.modality)?.duration || 45;
      c.schedule.forEach(s => {
        const date = wd[s.day];
        if (!date) return;
        // Check if there's already a manual session for this client on this date+time
        const exists = sessions.some(ss => ss.clientId === c.id && ss.date === date && ss.time === s.time);
        if (!exists) {
          recurring.push({ id: `rec-${c.id}-${s.day}`, clientId: c.id, date, time: s.time, duration: dur, type: modLabel, status: "programada", notes: "", calEventId: null, recurring: true });
        }
      });
    });
    const allSessions = [...sessions, ...recurring];

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Btn variant="secondary" onClick={() => setWOff(w => w - 1)}>← Anterior</Btn>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{fmtDate(wd[0])} — {fmtDate(wd[4])}</div>
            {wOff !== 0 && <button onClick={() => setWOff(0)} style={{ background: "none", border: "none", color: C.accent, fontSize: 12, cursor: "pointer", marginTop: 4, fontWeight: 600 }}>← Volver a hoy</button>}
          </div>
          <Btn variant="secondary" onClick={() => setWOff(w => w + 1)}>Siguiente →</Btn>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6, marginBottom: 16 }}>
          {wd.map((date, i) => {
            const ds = allSessions.filter(s => s.date === date && s.status !== "cancelada");
            const canc = allSessions.filter(s => s.date === date && s.status === "cancelada");
            const isT = date === today;
            return (
              <div key={date} style={{ background: isT ? C.accentGlow : C.surface, border: `2px solid ${isT ? C.accent : C.border}`, borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: C.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{dn[i]}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: isT ? C.accent : C.text, lineHeight: 1 }}>{date.split("-")[2]}</div>
                <div style={{ fontSize: 11, color: ds.length > 0 ? C.info : C.textDim, fontWeight: 600, marginTop: 4 }}>
                  {ds.length === 0 ? "Sin citas" : `${ds.length} sesiones`}
                </div>
                {canc.length > 0 && <div style={{ fontSize: 10, color: C.danger, fontWeight: 600 }}>⚠️ {canc.length} cancel.</div>}
              </div>
            );
          })}
        </div>

        {/* Gym schedule notice */}
        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textDim }}>☀️ Mañanas 07:00–13:00</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.danger + "99" }}>🔒 Cerrado 13:00–16:00</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textDim }}>🌙 Tardes 16:00–22:00</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textDim }}>👥 Máx {MAX_SLOT}/franja</div>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "64px repeat(5,1fr)", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ padding: "10px 6px", fontSize: 10, color: C.textDim, fontWeight: 700, textAlign: "center" }}>HORA</div>
            {wd.map((date, i) => {
              const isT = date === today;
              return (
                <div key={date} style={{ padding: "10px 4px", textAlign: "center", background: isT ? C.accentGlow : "transparent", borderLeft: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: 1 }}>{dn[i].substring(0, 3)}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: isT ? C.accent : C.text }}>{date.split("-")[2]}</div>
                </div>
              );
            })}
          </div>

          <div style={{ maxHeight: 620, overflowY: "auto" }}>
            {/* Render a block of hour rows */}
            {[GYM_MORNING, GYM_AFTERNOON].map((block, bi) => (
              <div key={bi}>
                {bi === 1 && (
                  <div style={{ display: "grid", gridTemplateColumns: "64px 1fr", background: "rgba(240,96,96,0.05)", borderBottom: `1px solid ${C.border}33`, borderTop: `1px solid ${C.border}33` }}>
                    <div style={{ padding: "12px 4px", fontSize: 11, color: C.danger + "88", fontWeight: 600, textAlign: "center", borderRight: `1px solid ${C.border}33` }}>13–16h</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 0", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>🔒</span>
                      <span style={{ fontSize: 13, color: C.danger + "88", fontWeight: 700, letterSpacing: 1 }}>CERRADO — Descanso mediodía</span>
                    </div>
                  </div>
                )}
                {block.map(hour => {
                  const hStr = String(hour).padStart(2, "0");
                  const isMorning = hour < 13;
                  return (
                    <div key={hour} style={{ display: "grid", gridTemplateColumns: "64px repeat(5,1fr)", minHeight: 64, borderBottom: `1px solid ${C.border}22` }}>
                      <div style={{ padding: "6px 4px 0", fontSize: 11, color: C.textDim, fontWeight: 600, textAlign: "center", borderRight: `1px solid ${C.border}33`, background: isMorning ? "rgba(92,232,154,0.03)" : "rgba(91,168,245,0.03)" }}>
                        {hStr}:00
                        <div style={{ fontSize: 8, color: C.textDim, marginTop: 2 }}>{isMorning ? "☀️" : "🌙"}</div>
                      </div>
                      {wd.map(date => {
                        const isT = date === today;
                        const allCellS = allSessions.filter(s => s.date === date && parseInt(s.time.split(":")[0]) === hour).sort((a, b) => a.time.localeCompare(b.time));
                        const activeS = allCellS.filter(s => s.status !== "cancelada");
                        const count = activeS.length;
                        const full = count >= MAX_SLOT;
                        const pct = Math.min((count / MAX_SLOT) * 100, 100);
                        const barColor = pct >= 100 ? C.danger : pct >= 75 ? "#f59e0b" : pct >= 50 ? C.info : C.success;
                        return (
                          <div key={date} style={{ borderLeft: `1px solid ${C.border}22`, padding: 3, background: isT ? "rgba(212,162,78,0.03)" : "transparent" }}>
                            {/* Capacity bar */}
                            {count > 0 && (
                              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3, padding: "0 2px" }}>
                                <div style={{ flex: 1, height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                                  <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 2, transition: "width .3s" }} />
                                </div>
                                <span style={{ fontSize: 8, color: full ? C.danger : C.textDim, fontWeight: 700, whiteSpace: "nowrap" }}>{count}/{MAX_SLOT}</span>
                              </div>
                            )}
                            {allCellS.map(s => {
                              const cl = getClient(s.clientId);
                              const mc = cl ? getModColor(cl.modality) : C.accent;
                              const isCancelled = s.status === "cancelada";
                              const isRecurring = s.recurring;
                              const handleClick = async () => {
                                if (isRecurring) {
                                  // Materialize recurring into a real session in Supabase
                                  try {
                                    const row = { client_id: s.clientId, date: s.date, time: s.time, duration: s.duration, type: s.type, status: "programada", notes: "", cal_event_id: null };
                                    const res = await sbPost("sessions", row);
                                    await loadData();
                                    if (res?.[0]) { setEditS(mapSession(res[0])); setShowSF(true); }
                                  } catch { notify("Error al crear sesion", "error"); }
                                } else {
                                  setEditS(s); setShowSF(true);
                                }
                              };
                              return (
                                <div key={s.id} onClick={handleClick}
                                  style={{ background: isCancelled ? C.danger + "12" : mc + "20", borderLeft: `3px solid ${isCancelled ? C.danger : mc}`, borderRadius: 6, padding: "5px 7px", marginBottom: 3, cursor: "pointer", transition: "transform .1s", opacity: isCancelled ? 0.55 : 1 }}
                                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
                                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: isCancelled ? C.danger : mc, textDecoration: isCancelled ? "line-through" : "none" }}>{s.time}</span>
                                    <div style={{ display: "flex", gap: 3 }}>
                                      {isRecurring && <span style={{ fontSize: 10 }}>🔄</span>}
                                      {s.calEventId && <span style={{ fontSize: 10 }}>📅</span>}
                                      {s.status === "completada" && <span style={{ fontSize: 10 }}>✅</span>}
                                      {isCancelled && <span style={{ fontSize: 10 }}>⚠️</span>}
                                    </div>
                                  </div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: isCancelled ? C.textDim : C.text, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: isCancelled ? "line-through" : "none" }}>{getName(s.clientId)}{cl && hasPathology(cl.notes) ? " ⛑️" : ""}</div>
                                  <div style={{ fontSize: 10, color: C.textDim }}>{s.type} · {s.duration}min</div>
                                </div>
                              );
                            })}
                            {full && <div style={{ textAlign: "center", fontSize: 9, color: C.danger, fontWeight: 700, padding: 2 }}>COMPLETO</div>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 10 }}>
          <Btn onClick={() => { setEditS(null); setShowSF(true); }}>+ Reservar Sesion</Btn>
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {MODALITIES.map(m => (
            <div key={m.key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.textDim }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: m.color }} />
              {m.label.replace("Entrenamiento ", "")}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleImport = async (imported) => {
    try {
      const rows = imported.map(c => ({ name: c.name, email: c.email || "", phone: c.phone || "", birthdate: c.birthdate || null, modality: c.modality || "grupal", frequency: c.frequency || 2, schedule: c.schedule || [], notes: c.notes || "", matricula_paid: c.matriculaPaid || false, active: true }));
      await sbPost("clients", rows);
      await loadData();
      notify(`📥 ${imported.length} clientes importados`);
    } catch { notify("Error al importar", "error"); }
    setShowImport(false);
  };

  // ── Calendar Settings Modal ──
  function CalSettings({ onClose }) {
    const [newEmail, setNewEmail] = useState("");
    const addAccount = () => {
      const email = newEmail.trim().toLowerCase();
      if (!email || !email.includes("@")) return;
      if (calAccounts.includes(email)) { setNewEmail(""); return; }
      setCalAccounts(p => [...p, email]);
      if (!selectedCal) setSelectedCal(email);
      setNewEmail("");
    };
    return (
      <Modal title="⚙️ Google Calendar" onClose={onClose}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: C.textDim, fontWeight: 600 }}>Cuentas de Google Calendar</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && addAccount()}
              placeholder="email@gmail.com" style={{ flex: 1, padding: "9px 11px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, outline: "none" }} />
            <Btn onClick={addAccount}>+ Añadir</Btn>
          </div>
          {calAccounts.length === 0 ? (
            <div style={{ textAlign: "center", color: C.textDim, padding: 20, fontSize: 12 }}>No hay cuentas configuradas</div>
          ) : (
            <div>
              {calAccounts.map(email => (
                <div key={email} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 11px", background: selectedCal === email ? C.accentGlow : C.bg, border: `1px solid ${selectedCal === email ? C.accent : C.border}`, borderRadius: 8, marginBottom: 5, cursor: "pointer" }}
                  onClick={() => setSelectedCal(email)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: selectedCal === email ? C.accent : C.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.bg, fontWeight: 800 }}>{selectedCal === email ? "✓" : ""}</div>
                    <span style={{ fontSize: 13, color: C.text, fontWeight: selectedCal === email ? 700 : 400 }}>{email}</span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setCalAccounts(p => p.filter(a => a !== email)); if (selectedCal === email) setSelectedCal(calAccounts.find(a => a !== email) || ""); }}
                    style={{ background: "none", border: "none", color: C.danger, fontSize: 14, cursor: "pointer", padding: 4 }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: C.textDim, padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
          La cuenta seleccionada se usará al crear eventos. Asegúrate de que la cuenta está conectada a Google Calendar en Claude.
        </div>
      </Modal>
    );
  }
  const handleReset = async () => {
    await loadData();
    notify("Datos recargados");
  };

  // ── LOGIN SCREEN ──
  if (!loggedIn) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
          @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
          *{box-sizing:border-box}
        `}</style>
        <div style={{ width: "90%", maxWidth: 380, animation: "fadeUp .4s ease" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h1 style={{ margin: 0, fontSize: 32, fontFamily: "'Arial Black', Gadget, sans-serif", color: C.text, fontWeight: 800, letterSpacing: 3 }}>RC <span style={{ color: "#2dd4bf" }}>TRAINING</span></h1>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 6 }}>Panel de gestión</div>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", marginBottom: 5, fontSize: 12, color: C.textDim, fontWeight: 600 }}>Usuario</label>
              <input value={loginUser} onChange={e => { setLoginUser(e.target.value); setLoginError(""); }}
                placeholder="admin" onKeyDown={e => e.key === "Enter" && handleLogin()}
                style={{ width: "100%", padding: "12px 14px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: "block", marginBottom: 5, fontSize: 12, color: C.textDim, fontWeight: 600 }}>Contraseña</label>
              <input type="password" value={loginPass} onChange={e => { setLoginPass(e.target.value); setLoginError(""); }}
                placeholder="••••••" onKeyDown={e => e.key === "Enter" && handleLogin()}
                style={{ width: "100%", padding: "12px 14px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
            </div>
            {loginError && <div style={{ marginBottom: 14, padding: "8px 12px", background: "rgba(240,96,96,0.1)", borderRadius: 8, color: C.danger, fontSize: 12, fontWeight: 600 }}>{loginError}</div>}
            <button onClick={handleLogin}
              style={{ width: "100%", padding: "13px", background: "#2dd4bf", color: C.bg, border: "none", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer", letterSpacing: 1 }}>
              Entrar
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: C.textDim }}>RC Training · Verín</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
        select option{background:${C.bg};color:${C.text}}
      `}</style>

      <div style={{ background: "#0a0c10", borderBottom: `1px solid ${C.border}`, padding: "10px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 920, margin: "0 auto" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontFamily: "'Arial Black', Gadget, sans-serif", color: C.text, fontWeight: 800, letterSpacing: 2 }}>RC <span style={{ color: "#2dd4bf" }}>TRAINING</span></h1>
            <div style={{ fontSize: 10, color: C.textDim }}>{fmtDateFull(today)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {calSync && <span style={{ fontSize: 11, color: C.info, animation: "fadeUp .3s" }}>⏳ Sync...</span>}
            <button onClick={handleReset} style={{ background: "none", border: "none", color: C.textDim, fontSize: 10, cursor: "pointer" }}>↺</button>
            <button onClick={handleLogout} style={{ background: "none", border: "none", color: C.textDim, fontSize: 10, cursor: "pointer" }}>Salir ⏻</button>
          </div>
        </div>
      </div>

      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 16px" }}>
        <div style={{ display: "flex", maxWidth: 920, margin: "0 auto" }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 15px", background: "none", border: "none", borderBottom: `2px solid ${tab === t ? C.accent : "transparent"}`, color: tab === t ? C.accent : C.textDim, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: tab === "Panel" ? 920 : 1200, margin: "0 auto", padding: "14px 14px", transition: "max-width .2s" }}>
        {tab === "Panel" && <Panel />}
        {tab === "Clientes" && <Clients />}
        {tab === "Calendario" && <Cal />}
        {tab === "Canceladas" && <Canceladas />}
      </div>

      {showCF && <CForm client={editC} onClose={() => { setShowCF(false); setEditC(null); }} />}
      {showSF && <SForm session={editS} presetCid={showSF?.presetCid} onClose={() => { setShowSF(false); setEditS(null); }} />}
      {detail && <DetailView client={detail} />}
      {showImport && <ExcelImportModal onClose={() => setShowImport(false)} onImport={handleImport} />}
      {showCalSettings && <CalSettings onClose={() => setShowCalSettings(false)} />}
      {showCalSettings && <CalSettings onClose={() => setShowCalSettings(false)} />}
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
