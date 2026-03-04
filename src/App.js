import { useState, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, ComposedChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from "recharts";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const FMP_KEY = process.env.REACT_APP_FMP_KEY || "demo"; // ← replace with your FMP key from financialmodelingprep.com

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const C = {
  bg:       "#080b0f",
  surface:  "#0d1117",
  border:   "#1a2332",
  borderHi: "#243447",
  amber:    "#f0a500",
  green:    "#00c48c",
  red:      "#ff4d4d",
  blue:     "#4d9fff",
  muted:    "#4a5568",
  dim:      "#2d3748",
  text:     "#e8edf3",
  textSoft: "#8899aa",
  textDim:  "#4a5a6a",
};

// ─── UTILITIES ────────────────────────────────────────────────────────────────
const fB = (n, dec = 1) => {
  if (n == null || isNaN(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(dec)}T`;
  if (abs >= 1e9)  return `${sign}$${(abs / 1e9).toFixed(dec)}B`;
  if (abs >= 1e6)  return `${sign}$${(abs / 1e6).toFixed(dec)}M`;
  return `${sign}$${abs.toFixed(0)}`;
};
const fP = (n, dec = 1) => (n == null || isNaN(n)) ? "—" : `${(n * 100).toFixed(dec)}%`;
const fN = (n, dec = 1) => (n == null || isNaN(n)) ? "—" : n.toFixed(dec);
const fX = (n, dec = 1) => (n == null || isNaN(n)) ? "—" : `${n.toFixed(dec)}x`;
const pct = (a, b) => (b && b !== 0) ? (a - b) / Math.abs(b) : null;
const cagr = (first, last, years) => years > 0 && first > 0 ? Math.pow(last / first, 1 / years) - 1 : null;

// ─── DCF ENGINE ───────────────────────────────────────────────────────────────
function runDCF({ baseFCF, growthRate, terminalGrowth, wacc, years, cash, debt, shares }) {
  const flows = [];
  let fcf = baseFCF, pv = 0;
  for (let i = 1; i <= years; i++) {
    fcf *= (1 + growthRate);
    const d = fcf / Math.pow(1 + wacc, i);
    flows.push({ year: `Y+${i}`, fcf, discounted: d });
    pv += d;
  }
  const tv = (fcf * (1 + terminalGrowth)) / (wacc - terminalGrowth);
  const pvTv = tv / Math.pow(1 + wacc, years);
  const ev = pv + pvTv;
  const eq = ev + cash - debt;
  return { flows, pv, pvTerminal: pvTv, terminalValue: tv, enterpriseValue: ev, equityValue: eq,
    intrinsicPrice: shares > 0 ? eq / shares : null };
}

// ─── DEMO DATA ────────────────────────────────────────────────────────────────
function getDemoData(ticker) {
  const T = ticker || "AAPL";
  const years = ["2019","2020","2021","2022","2023"];
  return {
    profile: { name: `${T} Corporation`, price: 189.30, mktCap: 2.94e12, sector: "Technology", beta: 1.24, sharesOutstanding: 15.5e9 },
    income: years.map((y, i) => ({
      date: y, revenue: [260e9,274e9,365e9,394e9,383e9][i],
      grossProfit: [98e9,105e9,153e9,170e9,169e9][i],
      operatingIncome: [64e9,66e9,109e9,119e9,114e9][i],
      netIncome: [55e9,57e9,95e9,100e9,97e9][i],
      ebitda: [76e9,81e9,123e9,133e9,129e9][i],
    })),
    cashflow: years.map((y, i) => ({
      date: y,
      operatingCashFlow: [69e9,80e9,104e9,122e9,110e9][i],
      capitalExpenditure: [-8e9,-7.3e9,-11e9,-10.7e9,-10.9e9][i],
      freeCashFlow: [61e9,73e9,93e9,111e9,99e9][i],
      netIncome: [55e9,57e9,95e9,100e9,97e9][i],
    })),
    balance: years.map((y, i) => ({
      date: y,
      cashAndCashEquivalents: [48e9,38e9,34e9,23e9,30e9][i],
      totalDebt: [108e9,112e9,124e9,120e9,109e9][i],
      totalStockholdersEquity: [90e9,65e9,63e9,50e9,62e9][i],
      totalAssets: [338e9,323e9,351e9,352e9,352e9][i],
      totalLiabilities: [248e9,258e9,287e9,302e9,290e9][i],
    })),
    ratios: years.map((y, i) => ({
      date: y,
      peRatio: [22,35,29,24,30][i],
      evToEbitda: [16,22,24,18,22][i],
      priceToFreeCashFlowsRatio: [27,35,34,27,30][i],
      returnOnEquity: [0.61,0.88,1.50,1.96,1.56][i],
      returnOnAssets: [0.16,0.18,0.27,0.28,0.27][i],
      debtToEquity: [1.19,1.72,1.97,2.39,1.76][i],
      grossProfitMargin: [0.378,0.382,0.418,0.433,0.441][i],
      operatingProfitMargin: [0.247,0.241,0.298,0.302,0.297][i],
      netProfitMargin: [0.212,0.209,0.259,0.253,0.253][i],
      freeCashFlowPerShare: [3.93,4.71,5.56,7.26,6.43][i],
    })),
  };
}

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.borderHi}`, padding: "8px 12px", fontSize: 12, fontFamily: "inherit" }}>
      <div style={{ color: C.amber, marginBottom: 4, fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || C.text, display: "flex", gap: 10 }}>
          <span style={{ color: C.textSoft }}>{p.name}</span>
          <span>{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── SECTION HEADER ──────────────────────────────────────────────────────────
const SectionHead = ({ n, label, sub }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
    <span style={{ fontSize: 10, color: C.amber, fontWeight: 700, letterSpacing: 2, border: `1px solid ${C.amber}44`, padding: "2px 6px" }}>{String(n).padStart(2,"0")}</span>
    <span style={{ fontSize: 16, fontWeight: 700, color: C.text, letterSpacing: -0.3 }}>{label}</span>
    {sub && <span style={{ fontSize: 11, color: C.textSoft }}>{sub}</span>}
  </div>
);

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
const KPI = ({ label, value, sub, color, trend }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "14px 16px", borderLeft: `2px solid ${color || C.amber}` }}>
    <div style={{ fontSize: 10, color: C.textSoft, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 700, color: color || C.text, letterSpacing: -0.5 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: trend > 0 ? C.green : trend < 0 ? C.red : C.textSoft, marginTop: 4 }}>
      {trend != null ? (trend > 0 ? "▲" : "▼") + " " : ""}{sub}
    </div>}
  </div>
);

// ─── METRIC ROW TABLE ─────────────────────────────────────────────────────────
const MetricTable = ({ rows, years }) => (
  <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "8px 12px", color: C.textSoft, fontWeight: 600, borderBottom: `1px solid ${C.border}`, width: 180 }}>Metric</th>
          {years.map(y => <th key={y} style={{ textAlign: "right", padding: "8px 12px", color: C.amber, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{y}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "#0a0f1500" }}>
            <td style={{ padding: "7px 12px", color: C.textSoft, borderBottom: `1px solid ${C.border}22` }}>{row.label}</td>
            {row.values.map((v, j) => {
              const prev = row.values[j - 1];
              const delta = prev != null ? pct(v?.raw ?? v, prev?.raw ?? prev) : null;
              const color = row.noColor ? C.text : delta == null ? C.text : delta > 0 ? C.green : delta < 0 ? C.red : C.text;
              return <td key={j} style={{ textAlign: "right", padding: "7px 12px", color, fontWeight: 500, borderBottom: `1px solid ${C.border}22`, fontVariantNumeric: "tabular-nums" }}>
                {typeof v === "object" ? v.display : v}
              </td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function DCFAnalyser() {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  // DCF assumptions
  const [wacc, setWacc] = useState(0.10);
  const [termGrowth, setTermGrowth] = useState(0.025);
  const [projYears, setProjYears] = useState(5);
  const [growthAdj, setGrowthAdj] = useState(0);

  const fmp = useCallback(async (path) => {
    if (FMP_KEY === "demo") return null;
    const res = await fetch(`https://financialmodelingprep.com/api${path}&apikey=${FMP_KEY}`);
    if (!res.ok) throw new Error(`FMP error: ${res.status}`);
    return res.json();
  }, []);

  const analyse = useCallback(async () => {
    if (!ticker.trim()) return;
    setLoading(true); setError(""); setData(null);
    const sym = ticker.trim().toUpperCase();
    try {
      if (FMP_KEY === "demo") {
        await new Promise(r => setTimeout(r, 900));
        setData(getDemoData(sym));
      } else {
        const [profile, income, cashflow, balance, ratios] = await Promise.all([
          fmp(`/v3/profile/${sym}?`),
          fmp(`/v3/income-statement/${sym}?limit=5&`),
          fmp(`/v3/cash-flow-statement/${sym}?limit=5&`),
          fmp(`/v3/balance-sheet-statement/${sym}?limit=5&`),
          fmp(`/v3/ratios/${sym}?limit=5&`),
        ]);
        if (!profile?.length) throw new Error("Ticker not found. Check the symbol and try again.");
        const rev = [...income].reverse();
        const rcf = [...cashflow].reverse();
        const rbs = [...balance].reverse();
        const rrt = [...ratios].reverse();
        setData({ profile: profile[0], income: rev, cashflow: rcf, balance: rbs, ratios: rrt });
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [ticker, fmp]);

  // ── derived chart data ──────────────────────────────────────────────────────
  const years = data?.income?.map(d => d.date.slice(0, 4)) ?? [];

  const incomeChart = data?.income?.map((d, i) => ({
    year: d.date.slice(0, 4),
    Revenue: +(d.revenue / 1e9).toFixed(1),
    "Gross Profit": +(d.grossProfit / 1e9).toFixed(1),
    EBITDA: +(d.ebitda / 1e9).toFixed(1),
    "Net Income": +(d.netIncome / 1e9).toFixed(1),
  }));

  const marginChart = data?.income?.map((d) => ({
    year: d.date.slice(0, 4),
    "Gross Margin": +((d.grossProfit / d.revenue) * 100).toFixed(1),
    "Op Margin": +((d.operatingIncome / d.revenue) * 100).toFixed(1),
    "Net Margin": +((d.netIncome / d.revenue) * 100).toFixed(1),
  }));

  const fcfChart = data?.cashflow?.map((d) => ({
    year: d.date.slice(0, 4),
    "Operating CF": +(d.operatingCashFlow / 1e9).toFixed(1),
    CapEx: +(Math.abs(d.capitalExpenditure) / 1e9).toFixed(1),
    FCF: +(d.freeCashFlow / 1e9).toFixed(1),
    "Net Income": +(d.netIncome / 1e9).toFixed(1),
  }));

  const balanceChart = data?.balance?.map((d) => ({
    year: d.date.slice(0, 4),
    Cash: +(d.cashAndCashEquivalents / 1e9).toFixed(1),
    Debt: +(d.totalDebt / 1e9).toFixed(1),
    Equity: +(d.totalStockholdersEquity / 1e9).toFixed(1),
  }));

  const valChart = data?.ratios?.map((d) => ({
    year: d.date.slice(0, 4),
    "P/E": +fN(d.peRatio),
    "EV/EBITDA": +fN(d.evToEbitda),
    "P/FCF": +fN(d.priceToFreeCashFlowsRatio),
  }));

  // ── DCF auto-population ──────────────────────────────────────────────────────
  const fcfHistory = data?.cashflow?.map(d => d.freeCashFlow) ?? [];
  const latestFCF = fcfHistory[fcfHistory.length - 1] ?? 0;
  const fcfCAGR = fcfHistory.length >= 2 ? cagr(fcfHistory[0], fcfHistory[fcfHistory.length - 1], fcfHistory.length - 1) : 0.08;
  const suggestedGrowth = Math.min(Math.max((fcfCAGR ?? 0.08) * 0.7, 0.02), 0.25);
  const effectiveGrowth = suggestedGrowth + growthAdj;
  const cash = data?.balance?.[data.balance.length - 1]?.cashAndCashEquivalents ?? 0;
  const debt = data?.balance?.[data.balance.length - 1]?.totalDebt ?? 0;
  const shares = data?.profile?.sharesOutstanding ?? 1;
  const currentPrice = data?.profile?.price ?? 0;

  const dcf = data ? runDCF({ baseFCF: latestFCF, growthRate: effectiveGrowth, terminalGrowth: termGrowth, wacc, years: projYears, cash, debt, shares }) : null;
  const upside = dcf?.intrinsicPrice && currentPrice ? (dcf.intrinsicPrice - currentPrice) / currentPrice : null;

  // ── income table rows ────────────────────────────────────────────────────────
  const incomeRows = data ? [
    { label: "Revenue", values: data.income.map(d => fB(d.revenue)) },
    { label: "Gross Profit", values: data.income.map(d => fB(d.grossProfit)) },
    { label: "Gross Margin", values: data.income.map(d => fP(d.grossProfit / d.revenue)), noColor: false },
    { label: "EBITDA", values: data.income.map(d => fB(d.ebitda)) },
    { label: "Operating Income", values: data.income.map(d => fB(d.operatingIncome)) },
    { label: "Op Margin", values: data.income.map(d => fP(d.operatingIncome / d.revenue)), noColor: false },
    { label: "Net Income", values: data.income.map(d => fB(d.netIncome)) },
    { label: "Net Margin", values: data.income.map(d => fP(d.netIncome / d.revenue)), noColor: false },
  ] : [];

  const cfRows = data ? [
    { label: "Operating Cash Flow", values: data.cashflow.map(d => fB(d.operatingCashFlow)) },
    { label: "CapEx", values: data.cashflow.map(d => fB(d.capitalExpenditure)) },
    { label: "Free Cash Flow", values: data.cashflow.map(d => fB(d.freeCashFlow)) },
    { label: "FCF Margin", values: data.cashflow.map((d, i) => fP(d.freeCashFlow / (data.income[i]?.revenue || 1))) },
    { label: "FCF / Net Income", values: data.cashflow.map(d => fN(d.freeCashFlow / (d.netIncome || 1))) },
  ] : [];

  const bsRows = data ? [
    { label: "Cash & Equivalents", values: data.balance.map(d => fB(d.cashAndCashEquivalents)) },
    { label: "Total Assets", values: data.balance.map(d => fB(d.totalAssets)) },
    { label: "Total Liabilities", values: data.balance.map(d => fB(d.totalLiabilities)), noColor: true },
    { label: "Total Debt", values: data.balance.map(d => fB(d.totalDebt)), noColor: true },
    { label: "Shareholders' Equity", values: data.balance.map(d => fB(d.totalStockholdersEquity)) },
    { label: "Debt / Equity", values: data.balance.map(d => fN(d.totalDebt / (d.totalStockholdersEquity || 1))), noColor: true },
  ] : [];

  const valRows = data ? [
    { label: "P/E Ratio", values: data.ratios.map(d => fX(d.peRatio)), noColor: true },
    { label: "EV / EBITDA", values: data.ratios.map(d => fX(d.evToEbitda)), noColor: true },
    { label: "P / FCF", values: data.ratios.map(d => fX(d.priceToFreeCashFlowsRatio)), noColor: true },
    { label: "Return on Equity", values: data.ratios.map(d => fP(d.returnOnEquity)) },
    { label: "Return on Assets", values: data.ratios.map(d => fP(d.returnOnAssets)) },
    { label: "Debt / Equity", values: data.ratios.map(d => fN(d.debtToEquity)), noColor: true },
  ] : [];

  const TABS = ["Income Statement", "Cash Flow & FCF", "Balance Sheet", "Valuation Ratios", "DCF Model"];

  // ── styles ──────────────────────────────────────────────────────────────────
  const section = { background: C.surface, border: `1px solid ${C.border}`, padding: 24, marginBottom: 2 };
  const slider = { display: "flex", alignItems: "center", gap: 12, marginBottom: 10 };
  const sliderLabel = { color: C.textSoft, fontSize: 12, width: 170, flexShrink: 0 };
  const sliderVal = { color: C.amber, fontSize: 13, fontWeight: 700, width: 56, textAlign: "right", fontVariantNumeric: "tabular-nums" };

  return (
    <div style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace", background: C.bg, minHeight: "100vh", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=range] { accent-color: ${C.amber}; cursor: pointer; flex: 1; }
        input[type=text]:focus { outline: none; border-color: ${C.amber} !important; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.dim}; border-radius: 2px; }
        .tab-btn { background: none; border: none; cursor: pointer; font-family: inherit; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; padding: 10px 16px; transition: all 0.15s; white-space: nowrap; }
        .tab-btn:hover { color: ${C.amber} !important; }
        .analyse-btn { transition: all 0.15s; }
        .analyse-btn:hover { background: ${C.amber} !important; color: ${C.bg} !important; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>

        {/* ── HEADER ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 3, height: 20, background: C.amber }} />
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: C.text }}>DCF ANALYSER</span>
            <span style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, marginLeft: 4, paddingTop: 2 }}>FUNDAMENTAL ANALYSIS TERMINAL</span>
          </div>
          <div style={{ fontSize: 11, color: C.textDim, paddingLeft: 13 }}>
            5-year historical data · Income · Cash Flow · Balance Sheet · Valuation · DCF Model
          </div>
        </div>

        {/* ── SEARCH ── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <input
            type="text" value={ticker} placeholder="Enter ticker  —  AAPL · MSFT · NVDA · TSLA"
            onChange={e => setTicker(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && analyse()}
            style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 0, padding: "11px 16px", color: C.text, fontSize: 14, fontFamily: "inherit", letterSpacing: 1 }}
          />
          <button className="analyse-btn" onClick={analyse} disabled={loading}
            style={{ background: "transparent", border: `1px solid ${C.amber}`, color: C.amber, padding: "11px 28px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, letterSpacing: 2, cursor: "pointer", textTransform: "uppercase" }}>
            {loading ? "LOADING…" : "ANALYSE →"}
          </button>
        </div>

        {FMP_KEY === "demo" && !data && (
          <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16, padding: "8px 12px", border: `1px solid ${C.border}`, background: C.surface }}>
            ⬡ DEMO MODE — showing simulated data for any ticker. Replace <span style={{ color: C.amber }}>FMP_KEY</span> with your key from{" "}
            <a href="https://financialmodelingprep.com" target="_blank" rel="noreferrer" style={{ color: C.blue }}>financialmodelingprep.com</a> for live data.
          </div>
        )}

        {error && (
          <div style={{ padding: "10px 14px", border: `1px solid ${C.red}44`, background: "#ff4d4d08", color: C.red, fontSize: 12, marginBottom: 16 }}>
            ✗ {error}
          </div>
        )}

        {/* ── COMPANY HEADER ── */}
        {data && (
          <>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.amber}`, padding: "16px 20px", marginBottom: 2, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: C.text }}>{data.profile.name}</div>
                <div style={{ fontSize: 11, color: C.textSoft, marginTop: 3 }}>
                  {ticker} · {data.profile.sector} · {fB(data.profile.mktCap)} market cap · β {fN(data.profile.beta, 2)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.amber, fontVariantNumeric: "tabular-nums" }}>${data.profile.price?.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: C.textSoft }}>current price</div>
              </div>
            </div>

            {/* ── KPI ROW ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, marginBottom: 2 }}>
              {(() => {
                const latestI = data.income[data.income.length - 1];
                const latestCF = data.cashflow[data.cashflow.length - 1];
                const revGrowth = pct(data.income[data.income.length-1]?.revenue, data.income[data.income.length-2]?.revenue);
                const fcfMargin = latestCF.freeCashFlow / latestI.revenue;
                const netMargin = latestI.netIncome / latestI.revenue;
                const roic = data.ratios[data.ratios.length-1]?.returnOnEquity;
                return [
                  <KPI key="rev" label="TTM Revenue" value={fB(latestI.revenue)} sub={`${revGrowth >= 0 ? "+" : ""}${fP(revGrowth)} YoY`} trend={revGrowth} />,
                  <KPI key="fcf" label="Free Cash Flow" value={fB(latestCF.freeCashFlow)} sub={`${fP(fcfMargin)} FCF margin`} color={C.green} />,
                  <KPI key="margin" label="Net Margin" value={fP(netMargin)} sub={`${fB(latestI.netIncome)} net income`} />,
                  <KPI key="roe" label="Return on Equity" value={fP(roic)} sub="latest fiscal year" color={C.blue} />,
                ];
              })()}
            </div>

            {/* ── TABS ── */}
            <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.surface, marginBottom: 2, overflowX: "auto" }}>
              {TABS.map((t, i) => (
                <button key={i} className="tab-btn"
                  onClick={() => setActiveTab(i)}
                  style={{ color: activeTab === i ? C.amber : C.textSoft, borderBottom: activeTab === i ? `2px solid ${C.amber}` : "2px solid transparent" }}>
                  {t}
                </button>
              ))}
            </div>

            {/* ══════════════════════════════════════════
                TAB 0 — INCOME STATEMENT
            ══════════════════════════════════════════ */}
            {activeTab === 0 && (
              <div style={section}>
                <SectionHead n={1} label="Income Statement" sub="5-year trend" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 10, letterSpacing: 1 }}>REVENUE & PROFIT ($B)</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={incomeChart} barGap={2}>
                        <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="year" tick={{ fill: C.textSoft, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: C.textSoft, fontSize: 10 }} axisLine={false} tickLine={false} width={35} tickFormatter={v => `${v}B`} />
                        <Tooltip content={<ChartTip formatter={v => `$${v}B`} />} />
                        <Bar dataKey="Revenue" fill={C.blue} opacity={0.7} radius={[1,1,0,0]} />
                        <Bar dataKey="Gross Profit" fill={C.amber} opacity={0.8} radius={[1,1,0,0]} />
                        <Bar dataKey="Net Income" fill={C.green} radius={[1,1,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 10, letterSpacing: 1 }}>MARGIN TRENDS (%)</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={marginChart}>
                        <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="year" tick={{ fill: C.textSoft, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: C.textSoft, fontSize: 10 }} axisLine={false} tickLine={false} width={32} tickFormatter={v => `${v}%`} />
                        <Tooltip content={<ChartTip formatter={v => `${v}%`} />} />
                        <Line type="monotone" dataKey="Gross Margin" stroke={C.amber} strokeWidth={2} dot={{ fill: C.amber, r: 3 }} />
                        <Line type="monotone" dataKey="Op Margin" stroke={C.blue} strokeWidth={2} dot={{ fill: C.blue, r: 3 }} />
                        <Line type="monotone" dataKey="Net Margin" stroke={C.green} strokeWidth={2} dot={{ fill: C.green, r: 3 }} />
                        <Legend wrapperStyle={{ fontSize: 11, color: C.textSoft }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <MetricTable rows={incomeRows} years={years} />
              </div>
            )}

            {/* ══════════════════════════════════════════
                TAB 1 — CASH FLOW & FCF
            ══════════════════════════════════════════ */}
            {activeTab === 1 && (
              <div style={section}>
                <SectionHead n={2} label="Cash Flow & FCF Quality" sub="Operating CF · CapEx · Free Cash Flow" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 10, letterSpacing: 1 }}>CASH FLOW WATERFALL ($B)</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={fcfChart} barGap={2}>
                        <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="year" tick={{ fill: C.textSoft, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: C.textSoft, fontSize: 10 }} axisLine={false} tickLine={false} width={35} tickFormatter={v => `${v}B`} />
                        <Tooltip content={<ChartTip formatter={v => `$${v}B`} />} />
                        <Bar dataKey="Operating CF" fill={C.blue} opacity={0.7} radius={[1,1,0,0]} />
                        <Bar dataKey="CapEx" fill={C.red} opacity={0.7} radius={[1,1,0,0]} />
                        <Bar dataKey="FCF" fill={C.green} radius={[1,1,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 10, letterSpacing: 1 }}>FCF vs NET INCOME ($B) — QUALITY CHECK</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart data={fcfChart}>
                        <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="year" tick={{ fill: C.textSoft, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: C.textSoft, fontSize: 10 }} axisLine={false} tickLine={false} width={35} tickFormatter={v => `${v}B`} />
                        <Tooltip content={<ChartTip formatter={v => `$${v}B`} />} />
                        <Area type="monotone" dataKey="FCF" fill={C.green + "22"} stroke={C.green} strokeWidth={2} />
                        <Line type="monotone" dataKey="Net Income" stroke={C.amber} strokeWidth={2} strokeDasharray="4 2" dot={{ fill: C.amber, r: 3 }} />
                        <Legend wrapperStyle={{ fontSize: 11, color: C.textSoft }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <div style={{ fontSize: 10, color: C.textDim, marginTop: 6 }}>
                      ↑ FCF tracking above net income = high earnings quality
                    </div>
                  </div>
                </div>
                <MetricTable rows={cfRows} years={years} />
              </div>
            )}

            {/* ══════════════════════════════════════════
                TAB 2 — BALANCE SHEET
            ══════════════════════════════════════════ */}
            {activeTab === 2 && (
              <div style={section}>
                <SectionHead n={3} label="Balance Sheet Health" sub="Assets · Liabilities · Debt · Equity" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 10, letterSpacing: 1 }}>CASH vs DEBT ($B)</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={balanceChart} barGap={4}>
                        <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="year" tick={{ fill: C.textSoft, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: C.textSoft, fontSize: 10 }} axisLine={false} tickLine={false} width={35} tickFormatter={v => `${v}B`} />
                        <Tooltip content={<ChartTip formatter={v => `$${v}B`} />} />
                        <Bar dataKey="Cash" fill={C.green} radius={[2,2,0,0]} />
                        <Bar dataKey="Debt" fill={C.red} opacity={0.75} radius={[2,2,0,0]} />
                        <Legend wrapperStyle={{ fontSize: 11, color: C.textSoft }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 10, letterSpacing: 1 }}>EQUITY TREND ($B)</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart data={balanceChart}>
                        <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="year" tick={{ fill: C.textSoft, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: C.textSoft, fontSize: 10 }} axisLine={false} tickLine={false} width={35} tickFormatter={v => `${v}B`} />
                        <Tooltip content={<ChartTip formatter={v => `$${v}B`} />} />
                        <Area type="monotone" dataKey="Equity" fill={C.blue + "22"} stroke={C.blue} strokeWidth={2} />
                        <ReferenceLine y={0} stroke={C.muted} strokeDasharray="3 3" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <MetricTable rows={bsRows} years={years} />
              </div>
            )}

            {/* ══════════════════════════════════════════
                TAB 3 — VALUATION RATIOS
            ══════════════════════════════════════════ */}
            {activeTab === 3 && (
              <div style={section}>
                <SectionHead n={4} label="Valuation Ratios" sub="P/E · EV/EBITDA · P/FCF · ROE · ROA" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 10, letterSpacing: 1 }}>MULTIPLES OVER TIME</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={valChart}>
                        <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="year" tick={{ fill: C.textSoft, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: C.textSoft, fontSize: 10 }} axisLine={false} tickLine={false} width={28} tickFormatter={v => `${v}x`} />
                        <Tooltip content={<ChartTip formatter={v => `${v}x`} />} />
                        <Line type="monotone" dataKey="P/E" stroke={C.amber} strokeWidth={2} dot={{ fill: C.amber, r: 3 }} />
                        <Line type="monotone" dataKey="EV/EBITDA" stroke={C.blue} strokeWidth={2} dot={{ fill: C.blue, r: 3 }} />
                        <Line type="monotone" dataKey="P/FCF" stroke={C.green} strokeWidth={2} dot={{ fill: C.green, r: 3 }} />
                        <Legend wrapperStyle={{ fontSize: 11, color: C.textSoft }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 10, letterSpacing: 1 }}>RETURNS (ROE / ROA)</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={data.ratios.map(d => ({ year: d.date.slice(0,4), ROE: +(d.returnOnEquity * 100).toFixed(1), ROA: +(d.returnOnAssets * 100).toFixed(1) }))}>
                        <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="year" tick={{ fill: C.textSoft, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: C.textSoft, fontSize: 10 }} axisLine={false} tickLine={false} width={32} tickFormatter={v => `${v}%`} />
                        <Tooltip content={<ChartTip formatter={v => `${v}%`} />} />
                        <Line type="monotone" dataKey="ROE" stroke={C.amber} strokeWidth={2} dot={{ fill: C.amber, r: 3 }} />
                        <Line type="monotone" dataKey="ROA" stroke={C.green} strokeWidth={2} dot={{ fill: C.green, r: 3 }} />
                        <Legend wrapperStyle={{ fontSize: 11, color: C.textSoft }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <MetricTable rows={valRows} years={years} />
              </div>
            )}

            {/* ══════════════════════════════════════════
                TAB 4 — DCF MODEL
            ══════════════════════════════════════════ */}
            {activeTab === 4 && dcf && (
              <div style={section}>
                <SectionHead n={5} label="DCF Model" sub="Auto-populated from historical FCF · adjust assumptions below" />

                {/* FCF History context */}
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 24, flexWrap: "wrap" }}>
                  <div><span style={{ fontSize: 10, color: C.textDim, display: "block", marginBottom: 3 }}>BASE FCF (latest)</span><span style={{ color: C.green, fontWeight: 700 }}>{fB(latestFCF)}</span></div>
                  <div><span style={{ fontSize: 10, color: C.textDim, display: "block", marginBottom: 3 }}>HISTORICAL FCF CAGR</span><span style={{ color: C.amber, fontWeight: 700 }}>{fP(fcfCAGR)}</span></div>
                  <div><span style={{ fontSize: 10, color: C.textDim, display: "block", marginBottom: 3 }}>SUGGESTED GROWTH (70% of CAGR)</span><span style={{ color: C.amber, fontWeight: 700 }}>{fP(suggestedGrowth)}</span></div>
                  <div><span style={{ fontSize: 10, color: C.textDim, display: "block", marginBottom: 3 }}>NET CASH / (DEBT)</span><span style={{ color: cash - debt >= 0 ? C.green : C.red, fontWeight: 700 }}>{fB(cash - debt)}</span></div>
                </div>

                {/* Assumptions sliders */}
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, padding: "16px 20px", marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: C.amber, letterSpacing: 2, marginBottom: 14, fontWeight: 700 }}>ASSUMPTIONS</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
                    <div>
                      <div style={slider}>
                        <span style={sliderLabel}>Growth Rate Adjustment</span>
                        <input type="range" min={-0.1} max={0.15} step={0.005} value={growthAdj} onChange={e => setGrowthAdj(+e.target.value)} />
                        <span style={sliderVal}>{growthAdj >= 0 ? "+" : ""}{fP(growthAdj)}</span>
                      </div>
                      <div style={slider}>
                        <span style={sliderLabel}>WACC (Discount Rate)</span>
                        <input type="range" min={0.04} max={0.25} step={0.005} value={wacc} onChange={e => setWacc(+e.target.value)} />
                        <span style={sliderVal}>{fP(wacc)}</span>
                      </div>
                    </div>
                    <div>
                      <div style={slider}>
                        <span style={sliderLabel}>Terminal Growth Rate</span>
                        <input type="range" min={0.005} max={0.05} step={0.005} value={termGrowth} onChange={e => setTermGrowth(+e.target.value)} />
                        <span style={sliderVal}>{fP(termGrowth)}</span>
                      </div>
                      <div style={slider}>
                        <span style={sliderLabel}>Projection Years</span>
                        <input type="range" min={3} max={10} step={1} value={projYears} onChange={e => setProjYears(+e.target.value)} />
                        <span style={sliderVal}>{projYears}Y</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: C.textDim, marginTop: 8 }}>
                    Effective growth rate: <span style={{ color: C.amber }}>{fP(effectiveGrowth)}</span> (suggested {fP(suggestedGrowth)} {growthAdj >= 0 ? "+" : ""} {fP(growthAdj)} adjustment)
                  </div>
                </div>

                {/* DCF output KPIs */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, marginBottom: 20 }}>
                  <KPI label="Intrinsic Value" value={dcf.intrinsicPrice ? `$${dcf.intrinsicPrice.toFixed(2)}` : "—"} color={C.amber} />
                  <KPI label="Upside / Downside" value={upside != null ? `${upside >= 0 ? "+" : ""}${fP(upside)}` : "—"}
                    color={upside == null ? C.text : upside > 0.15 ? C.green : upside > 0 ? C.green : C.red}
                    sub={`vs $${currentPrice.toFixed(2)} current`} trend={upside} />
                  <KPI label="Enterprise Value" value={fB(dcf.enterpriseValue)} color={C.blue} />
                  <KPI label="PV of Terminal Value" value={fB(dcf.pvTerminal)} sub={`${fP(dcf.pvTerminal / dcf.enterpriseValue)} of EV`} />
                </div>

                {/* FCF projection table */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {["Year", "Projected FCF", "Growth", "Discount Factor", "PV of FCF"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: C.textSoft, fontWeight: 600, borderBottom: `1px solid ${C.border}`, background: C.bg }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dcf.flows.map((row, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.border}22` }}>
                          <td style={{ padding: "8px 12px", color: C.amber, fontWeight: 600 }}>{row.year}</td>
                          <td style={{ padding: "8px 12px", color: C.text }}>{fB(row.fcf)}</td>
                          <td style={{ padding: "8px 12px", color: C.green }}>{fP(effectiveGrowth)}</td>
                          <td style={{ padding: "8px 12px", color: C.textSoft }}>{(1 / Math.pow(1 + wacc, i + 1)).toFixed(4)}</td>
                          <td style={{ padding: "8px 12px", color: C.text, fontVariantNumeric: "tabular-nums" }}>{fB(row.discounted)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: C.border + "44", borderTop: `1px solid ${C.amber}44` }}>
                        <td style={{ padding: "8px 12px", color: C.amber, fontWeight: 700 }}>Terminal</td>
                        <td style={{ padding: "8px 12px", color: C.amber, fontWeight: 700 }}>{fB(dcf.terminalValue)}</td>
                        <td style={{ padding: "8px 12px", color: C.textSoft }}>{fP(termGrowth)} (terminal)</td>
                        <td style={{ padding: "8px 12px", color: C.textSoft }}>{(1 / Math.pow(1 + wacc, projYears)).toFixed(4)}</td>
                        <td style={{ padding: "8px 12px", color: C.amber, fontWeight: 700 }}>{fB(dcf.pvTerminal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Value bridge */}
                <div style={{ marginTop: 20, background: C.bg, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
                  <div style={{ fontSize: 10, color: C.amber, letterSpacing: 2, marginBottom: 14, fontWeight: 700 }}>EQUITY VALUE BRIDGE</div>
                  {[
                    { label: "PV of FCF (projection)", value: dcf.pv, max: Math.abs(dcf.equityValue), color: C.blue },
                    { label: "PV of Terminal Value", value: dcf.pvTerminal, max: Math.abs(dcf.equityValue), color: C.amber },
                    { label: "+ Cash & Equivalents", value: cash, max: Math.abs(dcf.equityValue), color: C.green },
                    { label: "− Total Debt", value: -debt, max: Math.abs(dcf.equityValue), color: C.red },
                  ].map((row, i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: C.textSoft }}>{row.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: row.color, fontVariantNumeric: "tabular-nums" }}>{fB(row.value)}</span>
                      </div>
                      <div style={{ background: C.border, borderRadius: 1, height: 4 }}>
                        <div style={{ width: `${Math.min(100, Math.abs(row.value / row.max) * 100)}%`, height: 4, background: row.color, borderRadius: 1 }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 12, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: C.textSoft, fontWeight: 600 }}>Equity Value</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: C.amber }}>{fB(dcf.equityValue)}</span>
                  </div>
                </div>

                <div style={{ fontSize: 10, color: C.textDim, marginTop: 12 }}>
                  ⚠ For educational purposes only. Not financial advice. DCF models are highly sensitive to assumptions.
                </div>
              </div>
            )}
          </>
        )}

        {!data && !loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.textDim }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>⬡</div>
            <div style={{ fontSize: 13 }}>Enter a ticker symbol to begin analysis</div>
            <div style={{ fontSize: 11, marginTop: 6 }}>Try AAPL · MSFT · NVDA · GOOGL · AMZN</div>
          </div>
        )}
      </div>
    </div>
  );
}
