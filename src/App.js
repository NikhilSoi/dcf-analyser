import { useState, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from "recharts";

const FMP = process.env.REACT_APP_FMP_KEY || "demo";
const BASE = "/fmpapi";

const fmt = (n, dec = 1) => {
  if (n == null || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(dec) + "T";
  if (abs >= 1e9)  return (n / 1e9).toFixed(dec) + "B";
  if (abs >= 1e6)  return (n / 1e6).toFixed(dec) + "M";
  if (abs >= 1e3)  return (n / 1e3).toFixed(dec) + "K";
  return n.toFixed(dec);
};
const pct = (n) => n == null || isNaN(n) ? "—" : (n * 100).toFixed(1) + "%";
const fmtN = (n, dec = 2) => n == null || isNaN(n) ? "—" : Number(n).toFixed(dec);
const yoy = (arr, key, i) => {
  if (i >= arr.length - 1 || !arr[i + 1][key] || !arr[i][key]) return null;
  return (arr[i][key] - arr[i + 1][key]) / Math.abs(arr[i + 1][key]);
};

const COLORS = {
  bg: "#080b0f", card: "#0d1117", border: "#1e2530",
  amber: "#f0a500", green: "#00c48c", red: "#ff4d4d",
  blue: "#4da6ff", muted: "#6b7280", text: "#e2e8f0", dim: "#94a3b8"
};

const S = {
  app: { background: COLORS.bg, minHeight: "100vh", color: COLORS.text, fontFamily: "'JetBrains Mono', 'Courier New', monospace", fontSize: 13 },
  card: { background: COLORS.card, border: `1px solid ${COLORS.border}`, padding: 16, marginBottom: 12 },
  input: { background: "#111827", border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "8px 12px", fontFamily: "inherit", fontSize: 13, outline: "none", width: 160 },
  btn: { background: COLORS.amber, color: "#000", border: "none", padding: "8px 20px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  tab: (active) => ({ padding: "8px 18px", cursor: "pointer", borderBottom: active ? `2px solid ${COLORS.amber}` : "2px solid transparent", color: active ? COLORS.amber : COLORS.muted, background: "none", fontFamily: "inherit", fontSize: 12, fontWeight: active ? 700 : 400, letterSpacing: 1 }),
  th: { padding: "6px 12px", color: COLORS.muted, fontWeight: 400, fontSize: 11, textAlign: "right", borderBottom: `1px solid ${COLORS.border}`, letterSpacing: 0.5 },
  td: { padding: "6px 12px", textAlign: "right", borderBottom: `1px solid ${COLORS.border}` },
  tdL: { padding: "6px 12px", textAlign: "left", borderBottom: `1px solid ${COLORS.border}`, color: COLORS.dim },
  label: { fontSize: 11, color: COLORS.muted, marginBottom: 2, letterSpacing: 0.5 },
  val: { fontSize: 22, fontWeight: 700, color: COLORS.text },
  kpiCard: { background: COLORS.card, border: `1px solid ${COLORS.border}`, padding: "12px 16px", minWidth: 140 },
};

const tooltipStyle = { backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, fontFamily: "inherit", fontSize: 11 };

async function fmpFetch(path) {
  const isLocal = window.location.hostname === "localhost";
  let url;
  if (isLocal) {
    url = `/fmpapi${path}&apikey=${FMP}`;
  } else {
    const [endpoint, qs] = path.split('?');
    url = `/api/fmp?path=${endpoint}&${qs}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

const colorVal = (v, good = "pos") => {
  if (v == null || isNaN(v)) return COLORS.text;
  if (good === "pos") return v >= 0 ? COLORS.green : COLORS.red;
  return v <= 0 ? COLORS.green : COLORS.red;
};

// ── TABS ──────────────────────────────────────────────────────────────────────

function IncomeTab({ income }) {
  const rows = [...income].reverse();
  const chartData = rows.map((d, i) => ({
    year: d.date?.slice(0, 4),
    Revenue: d.revenue / 1e9,
    GrossProfit: d.grossProfit / 1e9,
    NetIncome: d.netIncome / 1e9,
    EBITDA: d.ebitda / 1e9,
    GrossMargin: (d.grossProfit / d.revenue) * 100,
    NetMargin: (d.netIncome / d.revenue) * 100,
    OpMargin: (d.operatingIncome / d.revenue) * 100,
  }));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: COLORS.amber, fontSize: 11, letterSpacing: 1, marginBottom: 12 }}>REVENUE & PROFIT (USD Billions)</div>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
            <XAxis dataKey="year" tick={{ fill: COLORS.muted, fontSize: 11 }} />
            <YAxis tick={{ fill: COLORS.muted, fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => `$${v.toFixed(1)}B`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Revenue" fill={COLORS.blue} opacity={0.7} />
            <Bar dataKey="GrossProfit" fill={COLORS.green} opacity={0.7} />
            <Line type="monotone" dataKey="NetIncome" stroke={COLORS.amber} strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ color: COLORS.amber, fontSize: 11, letterSpacing: 1, marginBottom: 12 }}>MARGIN TRENDS (%)</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
            <XAxis dataKey="year" tick={{ fill: COLORS.muted, fontSize: 11 }} />
            <YAxis tick={{ fill: COLORS.muted, fontSize: 11 }} unit="%" />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v.toFixed(1)}%`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="GrossMargin" stroke={COLORS.green} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="OpMargin" stroke={COLORS.blue} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="NetMargin" stroke={COLORS.amber} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...S.th, textAlign: "left" }}>METRIC</th>
            {income.map(d => <th key={d.date} style={S.th}>{d.date?.slice(0, 4)}</th>)}
          </tr>
        </thead>
        <tbody>
          {[
            ["Revenue", "revenue"],
            ["Gross Profit", "grossProfit"],
            ["EBITDA", "ebitda"],
            ["Operating Income", "operatingIncome"],
            ["Net Income", "netIncome"],
            ["EPS (Diluted)", "epsdiluted"],
          ].map(([label, key]) => (
            <tr key={key}>
              <td style={S.tdL}>{label}</td>
              {income.map((d, i) => (
                <td key={d.date} style={{ ...S.td, color: key === "epsdiluted" ? COLORS.text : COLORS.text }}>
                  {key === "epsdiluted" ? `$${fmtN(d[key])}` : `$${fmt(d[key])}`}
                  {i < income.length - 1 && yoy(income, key, i) != null && (
                    <span style={{ fontSize: 10, marginLeft: 4, color: colorVal(yoy(income, key, i)) }}>
                      {yoy(income, key, i) >= 0 ? "▲" : "▼"}{Math.abs(yoy(income, key, i) * 100).toFixed(0)}%
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CashFlowTab({ cashflow, profile }) {
  const rows = [...cashflow].reverse();
  const marketCap = profile?.[0]?.mktCap;
  const chartData = rows.map(d => ({
    year: d.date?.slice(0, 4),
    OperatingCF: d.operatingCashFlow / 1e9,
    CapEx: Math.abs(d.capitalExpenditure) / 1e9,
    FCF: (d.operatingCashFlow + d.capitalExpenditure) / 1e9,
  }));

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {cashflow[0] && (() => {
          const fcf = cashflow[0].operatingCashFlow + cashflow[0].capitalExpenditure;
          const conv = fcf / (cashflow[0].netIncome || 1);
          const fcfYield = marketCap ? fcf / marketCap : null;
          return (
            <>
              <div style={S.kpiCard}>
                <div style={S.label}>TTM FREE CASH FLOW</div>
                <div style={S.val}>${fmt(fcf)}</div>
              </div>
              <div style={S.kpiCard}>
                <div style={S.label}>FCF CONVERSION</div>
                <div style={{ ...S.val, color: conv >= 0.8 ? COLORS.green : COLORS.red }}>{fmtN(conv)}x</div>
                <div style={{ fontSize: 10, color: COLORS.muted }}>FCF / Net Income {conv < 0.8 ? "⚠ LOW" : "✓ HEALTHY"}</div>
              </div>
              {fcfYield != null && (
                <div style={S.kpiCard}>
                  <div style={S.label}>FCF YIELD</div>
                  <div style={S.val}>{pct(fcfYield)}</div>
                </div>
              )}
            </>
          );
        })()}
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ color: COLORS.amber, fontSize: 11, letterSpacing: 1, marginBottom: 12 }}>CASH FLOW BREAKDOWN (USD Billions)</div>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
            <XAxis dataKey="year" tick={{ fill: COLORS.muted, fontSize: 11 }} />
            <YAxis tick={{ fill: COLORS.muted, fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => `$${v.toFixed(1)}B`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="OperatingCF" fill={COLORS.blue} opacity={0.8} />
            <Bar dataKey="CapEx" fill={COLORS.red} opacity={0.6} />
            <Line type="monotone" dataKey="FCF" stroke={COLORS.amber} strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...S.th, textAlign: "left" }}>METRIC</th>
            {cashflow.map(d => <th key={d.date} style={S.th}>{d.date?.slice(0, 4)}</th>)}
          </tr>
        </thead>
        <tbody>
          {[
            ["Operating Cash Flow", "operatingCashFlow"],
            ["Capital Expenditure", "capitalExpenditure"],
            ["Free Cash Flow", null],
            ["Dividends Paid", "dividendsPaid"],
            ["Share Buybacks", "commonStockRepurchased"],
          ].map(([label, key]) => (
            <tr key={label}>
              <td style={S.tdL}>{label}</td>
              {cashflow.map(d => {
                const v = key ? d[key] : d.operatingCashFlow + d.capitalExpenditure;
                return <td key={d.date} style={{ ...S.td, color: v >= 0 ? COLORS.text : COLORS.red }}>${fmt(v)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BalanceSheetTab({ balance }) {
  const rows = [...balance].reverse();
  const chartData = rows.map(d => ({
    year: d.date?.slice(0, 4),
    Assets: d.totalAssets / 1e9,
    Liabilities: d.totalLiabilities / 1e9,
    Equity: d.totalStockholdersEquity / 1e9,
  }));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: COLORS.amber, fontSize: 11, letterSpacing: 1, marginBottom: 12 }}>ASSETS vs LIABILITIES vs EQUITY (USD Billions)</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
            <XAxis dataKey="year" tick={{ fill: COLORS.muted, fontSize: 11 }} />
            <YAxis tick={{ fill: COLORS.muted, fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => `$${v.toFixed(1)}B`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Assets" fill={COLORS.blue} opacity={0.8} />
            <Bar dataKey="Liabilities" fill={COLORS.red} opacity={0.7} />
            <Bar dataKey="Equity" fill={COLORS.green} opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {balance[0] && (() => {
          const d = balance[0];
          const currentRatio = d.totalCurrentAssets / (d.totalCurrentLiabilities || 1);
          const debtEquity = d.totalDebt / (d.totalStockholdersEquity || 1);
          const netDebt = d.totalDebt - d.cashAndCashEquivalents;
          return (
            <>
              <div style={S.kpiCard}>
                <div style={S.label}>CURRENT RATIO</div>
                <div style={{ ...S.val, color: currentRatio >= 1.5 ? COLORS.green : currentRatio >= 1 ? COLORS.amber : COLORS.red }}>{fmtN(currentRatio)}x</div>
              </div>
              <div style={S.kpiCard}>
                <div style={S.label}>DEBT / EQUITY</div>
                <div style={{ ...S.val, color: debtEquity <= 1 ? COLORS.green : debtEquity <= 2 ? COLORS.amber : COLORS.red }}>{fmtN(debtEquity)}x</div>
              </div>
              <div style={S.kpiCard}>
                <div style={S.label}>CASH & EQUIVALENTS</div>
                <div style={S.val}>${fmt(d.cashAndCashEquivalents)}</div>
              </div>
              <div style={S.kpiCard}>
                <div style={S.label}>NET DEBT</div>
                <div style={{ ...S.val, color: netDebt <= 0 ? COLORS.green : COLORS.text }}>${fmt(netDebt)}</div>
              </div>
            </>
          );
        })()}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...S.th, textAlign: "left" }}>METRIC</th>
            {balance.map(d => <th key={d.date} style={S.th}>{d.date?.slice(0, 4)}</th>)}
          </tr>
        </thead>
        <tbody>
          {[
            ["Total Assets", "totalAssets"],
            ["Total Liabilities", "totalLiabilities"],
            ["Shareholders Equity", "totalStockholdersEquity"],
            ["Cash & Equivalents", "cashAndCashEquivalents"],
            ["Total Debt", "totalDebt"],
            ["Net Receivables", "netReceivables"],
          ].map(([label, key]) => (
            <tr key={key}>
              <td style={S.tdL}>{label}</td>
              {balance.map(d => <td key={d.date} style={S.td}>${fmt(d[key])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ValuationTab({ metrics }) {
  const rows = [...metrics].reverse();
  const chartData = rows.map(d => ({
    year: d.date?.slice(0, 4),
    PE: d.peRatio,
    EVEBITDA: d.evToEbitda,
    PFCF: d.priceToFreeCashFlowsRatio,
    PB: d.pbRatio,
  }));

  const avg = (key) => {
    const vals = metrics.map(d => d[key]).filter(v => v != null && v > 0 && v < 500);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const current = metrics[0] || {};
  const ratios = [
    ["P/E Ratio", "peRatio"],
    ["EV/EBITDA", "evToEbitda"],
    ["P/FCF", "priceToFreeCashFlowsRatio"],
    ["P/Book", "pbRatio"],
    ["P/Sales", "priceToSalesRatio"],
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: COLORS.amber, fontSize: 11, letterSpacing: 1, marginBottom: 12 }}>VALUATION MULTIPLES OVER TIME</div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
            <XAxis dataKey="year" tick={{ fill: COLORS.muted, fontSize: 11 }} />
            <YAxis tick={{ fill: COLORS.muted, fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtN(v) + "x"} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="PE" stroke={COLORS.amber} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="EVEBITDA" stroke={COLORS.green} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="PFCF" stroke={COLORS.blue} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...S.th, textAlign: "left" }}>RATIO</th>
            <th style={S.th}>CURRENT</th>
            <th style={S.th}>5Y AVG</th>
            <th style={S.th}>vs AVG</th>
            <th style={S.th}>SIGNAL</th>
          </tr>
        </thead>
        <tbody>
          {ratios.map(([label, key]) => {
            const cur = current[key];
            const a = avg(key);
            const diff = cur && a ? (cur - a) / a : null;
            return (
              <tr key={key}>
                <td style={S.tdL}>{label}</td>
                <td style={S.td}>{cur ? fmtN(cur) + "x" : "—"}</td>
                <td style={{ ...S.td, color: COLORS.muted }}>{a ? fmtN(a) + "x" : "—"}</td>
                <td style={{ ...S.td, color: diff != null ? colorVal(-diff) : COLORS.text }}>
                  {diff != null ? (diff >= 0 ? "+" : "") + (diff * 100).toFixed(0) + "%" : "—"}
                </td>
                <td style={{ ...S.td, color: diff != null && diff > 0.5 ? COLORS.amber : COLORS.green, fontSize: 10 }}>
                  {diff != null ? (diff > 0.5 ? "⚠ ELEVATED" : diff > 0.2 ? "ABOVE AVG" : "FAIR") : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DCFTab({ cashflow, income, profile }) {
  const fcfHistory = cashflow.slice(0, 5).map(d => d.operatingCashFlow + d.capitalExpenditure).filter(v => v > 0);
  const fcfCagr = fcfHistory.length >= 2
    ? Math.pow(fcfHistory[0] / fcfHistory[fcfHistory.length - 1], 1 / (fcfHistory.length - 1)) - 1
    : 0.08;

  const sharesOut = profile?.[0]?.sharesOutstanding || income?.[0]?.weightedAverageShsOutDil || 1e9;
  const currentPrice = profile?.[0]?.price || 0;
  const latestFCF = fcfHistory[0] || 0;

  const [wacc, setWacc] = useState(10);
  const [growth, setGrowth] = useState(Math.min(Math.max(Math.round(fcfCagr * 100), 0), 20));
  const [terminal, setTerminal] = useState(3);
  const [years, setYears] = useState(5);

  const calcDCF = (g, w, t, yr) => {
    if (!latestFCF || latestFCF <= 0) return null;
    let pv = 0;
    let fcf = latestFCF;
    for (let i = 1; i <= yr; i++) {
      fcf *= (1 + g / 100);
      pv += fcf / Math.pow(1 + w / 100, i);
    }
    const tv = (fcf * (1 + t / 100)) / ((w / 100) - (t / 100));
    pv += tv / Math.pow(1 + w / 100, yr);
    return pv / sharesOut;
  };

  const intrinsic = calcDCF(growth, wacc, terminal, years);
  const upside = intrinsic && currentPrice ? (intrinsic - currentPrice) / currentPrice : null;

  const waccRange = [7, 8, 9, 10, 11, 12, 13];
  const growthRange = [0, 3, 5, 8, 10, 12, 15];

  const sliderStyle = { width: "100%", accentColor: COLORS.amber };

  return (
    <div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ ...S.card, marginBottom: 0 }}>
            <div style={{ color: COLORS.amber, fontSize: 11, letterSpacing: 1, marginBottom: 16 }}>DCF ASSUMPTIONS</div>
            {[
              ["Revenue Growth Rate", growth, setGrowth, 0, 30, "%", `Auto from FCF CAGR: ${(fcfCagr * 100).toFixed(1)}%`],
              ["WACC", wacc, setWacc, 5, 20, "%", "Weighted avg cost of capital"],
              ["Terminal Growth Rate", terminal, setTerminal, 0, 5, "%", "Long-run GDP growth assumption"],
              ["Projection Years", years, setYears, 3, 10, "yr", ""],
            ].map(([label, val, setter, min, max, unit, hint]) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: COLORS.muted }}>{label}</span>
                  <span style={{ color: COLORS.amber, fontWeight: 700 }}>{val}{unit}</span>
                </div>
                <input type="range" min={min} max={max} value={val}
                  onChange={e => setter(Number(e.target.value))} style={sliderStyle} />
                {hint && <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>{hint}</div>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ ...S.card, marginBottom: 12, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 1, marginBottom: 8 }}>INTRINSIC VALUE</div>
            <div style={{ fontSize: 42, fontWeight: 700, color: COLORS.amber }}>
              {intrinsic ? `$${intrinsic.toFixed(2)}` : "—"}
            </div>
            <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>per share</div>
            {currentPrice > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 11, color: COLORS.muted }}>CURRENT PRICE</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>${currentPrice.toFixed(2)}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: upside >= 0 ? COLORS.green : COLORS.red, marginTop: 8 }}>
                  {upside != null ? (upside >= 0 ? "▲ " : "▼ ") + Math.abs(upside * 100).toFixed(1) + "% " : ""}
                  {upside != null ? (upside >= 0 ? "UNDERVALUED" : "OVERVALUED") : ""}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {[
              ["BEAR", growth - 5, wacc + 2],
              ["BASE", growth, wacc],
              ["BULL", growth + 5, wacc - 2],
            ].map(([label, g, w]) => {
              const v = calcDCF(Math.max(g, 0), Math.max(w, 5), terminal, years);
              const up = v && currentPrice ? (v - currentPrice) / currentPrice : null;
              return (
                <div key={label} style={{ flex: 1, ...S.card, marginBottom: 0, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: label === "BULL" ? COLORS.green : label === "BEAR" ? COLORS.red : COLORS.amber }}>
                    {v ? `$${v.toFixed(2)}` : "—"}
                  </div>
                  <div style={{ fontSize: 10, color: up >= 0 ? COLORS.green : COLORS.red }}>
                    {up != null ? (up >= 0 ? "+" : "") + (up * 100).toFixed(0) + "%" : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ color: COLORS.amber, fontSize: 11, letterSpacing: 1, marginBottom: 12 }}>SENSITIVITY: INTRINSIC VALUE vs WACC × GROWTH RATE</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ ...S.th, textAlign: "center", minWidth: 60 }}>G↓ W→</th>
              {waccRange.map(w => <th key={w} style={{ ...S.th, minWidth: 70 }}>{w}%</th>)}
            </tr>
          </thead>
          <tbody>
            {growthRange.map(g => (
              <tr key={g}>
                <td style={{ ...S.tdL, textAlign: "center", color: COLORS.amber }}>{g}%</td>
                {waccRange.map(w => {
                  const v = calcDCF(g, w, terminal, years);
                  const up = v && currentPrice ? (v - currentPrice) / currentPrice : null;
                  return (
                    <td key={w} style={{
                      ...S.td,
                      background: up == null ? "transparent" : up > 0.3 ? "#0d2b1a" : up > 0 ? "#1a2b0d" : up > -0.3 ? "#2b1a0d" : "#2b0d0d",
                      color: up == null ? COLORS.text : up > 0 ? COLORS.green : COLORS.red,
                      fontWeight: g === growth && w === wacc ? 700 : 400,
                      border: g === growth && w === wacc ? `1px solid ${COLORS.amber}` : `1px solid ${COLORS.border}`,
                    }}>
                      {v ? `$${v.toFixed(0)}` : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────

export default function App() {
  const [ticker, setTicker] = useState("");
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [tab, setTab] = useState("income");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const search = useCallback(async (sym) => {
    if (!sym) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const [profile, income, balance, cashflow, metrics] = await Promise.all([
        fmpFetch(`/stable/profile?symbol=${sym}`),
        fmpFetch(`/stable/income-statement?symbol=${sym}&period=annual&limit=5`),
        fmpFetch(`/stable/balance-sheet-statement?symbol=${sym}&period=annual&limit=5`),
        fmpFetch(`/stable/cash-flow-statement?symbol=${sym}&period=annual&limit=5`),
        fmpFetch(`/stable/key-metrics?symbol=${sym}&period=annual&limit=5`),
      ]);

      if (!income?.length) throw new Error(`No data found for "${sym}". Check the ticker symbol.`);
      setData({ profile, income, balance, cashflow, metrics });
      setTicker(sym.toUpperCase());
      setTab("income");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const p = data?.profile?.[0];
  const TABS = [
    { id: "income", label: "INCOME STATEMENT" },
    { id: "cashflow", label: "CASH FLOW" },
    { id: "balance", label: "BALANCE SHEET" },
    { id: "valuation", label: "VALUATION" },
    { id: "dcf", label: "DCF MODEL" },
  ];

  return (
    <div style={S.app}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 2, marginBottom: 4 }}>DCF FINANCIAL ANALYSER</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.amber, letterSpacing: 1 }}>
              {ticker || "ENTER TICKER"}
            </div>
            {p && <div style={{ fontSize: 11, color: COLORS.dim }}>{p.companyName} · {p.sector} · {p.exchange}</div>}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
            <input
              style={S.input}
              placeholder="Search company or ticker..."
              value={input}
              onChange={e => handleTickerInput(e.target.value)}
              onKeyDown={e => { if(e.key === "Enter") { setSuggestions([]); search(input); } }}
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <div style={{ position: "absolute", top: "100%", right: 0, minWidth: 320, background: "#131820", border: `1px solid ${COLORS.border}`, zIndex: 100, maxHeight: 240, overflowY: "auto" }}>
                {suggestions.map(s => (
                  <div key={s.symbol} onClick={() => { setInput(s.symbol); setSuggestions([]); search(s.symbol); }}
                    style={{ padding: "8px 14px", cursor: "pointer", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onMouseEnter={e => e.currentTarget.style.background = COLORS.card}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ color: COLORS.amber, fontWeight: 700, fontSize: 13 }}>{s.symbol}</span>
                    <span style={{ color: COLORS.dim, fontSize: 12, marginLeft: 10 }}>{s.name}</span>
                    <span style={{ color: COLORS.muted, fontSize: 11, marginLeft: 10 }}>{s.exchangeShortName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <input style={{display:"none"}}
            />
            <button style={S.btn} onClick={() => search(input)} disabled={loading}>
              {loading ? "LOADING..." : "ANALYSE →"}
            </button>
          </div>
        </div>

        {/* KPI STRIP */}
        {p && data && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {[
              ["PRICE", `$${p.price?.toFixed(2) || "—"}`],
              ["MKT CAP", `$${fmt(p.mktCap)}`],
              ["BETA", fmtN(p.beta)],
              ["52W HIGH", `$${p.range?.split("-")?.[1]?.trim() || "—"}`],
              ["52W LOW", `$${p.range?.split("-")?.[0]?.trim() || "—"}`],
              ["P/E", fmtN(p.pe) + "x"],
              ["DIV YIELD", pct(p.lastDiv / p.price)],
              ["EMPLOYEES", fmt(p.fullTimeEmployees, 0)],
            ].map(([label, value]) => (
              <div key={label} style={{ ...S.kpiCard, minWidth: 100, flex: 1 }}>
                <div style={S.label}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div style={{ ...S.card, borderColor: COLORS.red, color: COLORS.red, padding: 16 }}>
            ⚠ {error}
          </div>
        )}

        {/* EMPTY STATE */}
        {!data && !loading && !error && (
          <div style={{ ...S.card, textAlign: "center", padding: 60, color: COLORS.muted }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⬡</div>
            <div style={{ fontSize: 14, marginBottom: 8 }}>Enter a ticker symbol to begin analysis</div>
            <div style={{ fontSize: 11 }}>Try: AAPL · MSFT · GOOGL · TSLA · AMZN · NVDA</div>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div style={{ ...S.card, textAlign: "center", padding: 60, color: COLORS.amber }}>
            <div style={{ fontSize: 14 }}>FETCHING DATA FOR {input}...</div>
          </div>
        )}

        {/* TABS + CONTENT */}
        {data && !loading && (
          <div>
            <div style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}`, marginBottom: 20, overflowX: "auto" }}>
              {TABS.map(t => (
                <button key={t.id} style={S.tab(tab === t.id)} onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            <div style={S.card}>
              {tab === "income" && <IncomeTab income={data.income} />}
              {tab === "cashflow" && <CashFlowTab cashflow={data.cashflow} profile={data.profile} />}
              {tab === "balance" && <BalanceSheetTab balance={data.balance} />}
              {tab === "valuation" && <ValuationTab metrics={data.metrics} />}
              {tab === "dcf" && <DCFTab cashflow={data.cashflow} income={data.income} profile={data.profile} />}
            </div>

            {p?.description && (
              <div style={{ ...S.card, marginTop: 12 }}>
                <div style={{ color: COLORS.amber, fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>COMPANY OVERVIEW</div>
                <div style={{ fontSize: 11, color: COLORS.dim, lineHeight: 1.6 }}>
                  {p.description?.slice(0, 500)}...
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: 10, color: COLORS.muted, marginTop: 24 }}>
          DATA: Financial Modeling Prep · FOR EDUCATIONAL USE ONLY · NOT FINANCIAL ADVICE
        </div>
      </div>
    </div>
  );
}// Wed  4 Mar 2026 16:48:09 GMT
// build Thu  5 Mar 2026 20:26:38 GMT
