// client/src/pages/Favorites.jsx
import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import WordFrequencyChart from "../components/WordFrequencyChart";
import AiResultCard from "../components/AiResultCard";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const newId = () => Math.random().toString(36).slice(2, 10);

function safeJsonParse(maybe) {
  if (!maybe) return null;
  let txt = String(maybe).trim();
  const fence = txt.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) txt = fence[1];
  const s = txt.indexOf("{"), e = txt.lastIndexOf("}");
  if (s !== -1 && e !== -1 && e > s) txt = txt.slice(s, e + 1);
  try { return JSON.parse(txt); } catch { return null; }
}

/* Fallback renderer for streaming prose */
function AiPretty({ text = "" }) {
  const verseRefRe =
    /\b((Gen|Ex|Lev|Num|Deut|Joz|Richt|Rut|1 Sam|2 Sam|1 Kon|2 Kon|1 Kron|2 Kron|Ezra|Neh|Est|Job|Ps(?:alm|almen)?|Spr|Pred|Hoogl|Jes|Jer|Kla|Ezech|Dan|Hos|Joël|Amos|Obad|Jona|Micha|Nah|Hab|Zef|Hag|Zach|Mal|Mat|Matt|Marcus|Mar|Luk|Lucas|Joh|Johannes|Hand|Rom|Romeinen|1 Kor|2 Kor|Gal|Ef|Efeze|Fil|Filippenzen|Kol|1 Thess|2 Thess|1 Tim|2 Tim|Tit|Filem|Hebr?|Jak|1 Petr|2 Petr|1 Joh|2 Joh|3 Joh|Judas|Openb?|Openbaring)\.?\s*\d+:\d+(?:-\d+)?)\b/gi;

  const lines = String(text).replaceAll("\r\n", "\n").split("\n");
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith("### ")) blocks.push({ t: "h3", v: l.slice(4) });
    else if (l.startsWith("## ")) blocks.push({ t: "h2", v: l.slice(3) });
    else if (/^\s*-\s+/.test(l)) {
      const items = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*-\s+/, ""));
        i++;
      }
      i--;
      blocks.push({ t: "ul", v: items });
    } else if (!l.trim()) blocks.push({ t: "space" });
    else blocks.push({ t: "p", v: l });
  }
  const hi = (s) => s.replace(verseRefRe, (m) => `<span class="font-semibold text-indigo-700">${m}</span>`);
  return (
    <div className="text-[0.95rem] leading-6 space-y-3">
      {blocks.map((b, idx) => {
        if (b.t === "h2") return <h3 key={idx} className="text-lg font-semibold border-b border-gray-200 pb-1">{b.v}</h3>;
        if (b.t === "h3") return <h4 key={idx} className="text-base font-semibold text-indigo-700">{b.v}</h4>;
        if (b.t === "ul") return <ul key={idx} className="list-disc pl-6 space-y-1">{b.v.map((it, i2) => <li key={i2} dangerouslySetInnerHTML={{ __html: hi(it) }} />)}</ul>;
        if (b.t === "space") return <div key={idx} className="h-2" />;
        return <p key={idx} className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: hi(b.v) }} />;
      })}
    </div>
  );
}

export default function Favorites() {
  const {
    generalNotes,
    favTexts, removeFavText, updateFavTextNote,
    favCharts, removeFavChart, updateFavChartNote,
    aiResults, addAiResult, removeAiResult,
  } = useApp();

  const [mode, setMode] = useState("bijbelstudie");
  const [extra, setExtra] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [live, setLive] = useState({ running: false, text: "", error: "" });

  async function buildContext() {
    const parts = [];
    if (generalNotes?.trim()) parts.push(`# Algemene notities\n${generalNotes.trim()}`);
    if (favTexts?.length) {
      parts.push("# ⭐ Favoriete teksten");
      favTexts.slice(0, 20).forEach((t) => {
        parts.push(`**${t.ref || ""}**\n${t.text || ""}` + (t.note ? `\n_notitie:_ ${t.note}` : ""));
      });
    }
    if (favCharts?.length) {
      parts.push("# 📊 Grafieken");
      favCharts.slice(0, 5).forEach((c) => {
        parts.push(`- ${c.title || (c.words || []).join(", ")}`);
      });
    }
    return parts.join("\n\n");
  }

  async function generateStream() {
    setAiError("");
    const context = await buildContext();
    setLive({ running: true, text: "", error: "" });
    setAiBusy(true);

    try {
      const res = await fetch(`${API_BASE}/api/ai/compose/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, extra: extra.trim(), context }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const packet = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          if (!packet) continue;
          const line = packet.startsWith("data:") ? packet.slice(5).trim() : packet;
          if (!line || line === "[DONE]") continue;
          try {
            const j = JSON.parse(line);
            const delta = typeof j === "string" ? j : j.delta ?? j.content ?? j.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              acc += delta;
              setLive((s) => ({ ...s, text: acc }));
            }
          } catch {
            const unquoted = line.replace(/^"+|"+$/g, "");
            if (unquoted && unquoted !== "[DONE]") {
              acc += unquoted;
              setLive((s) => ({ ...s, text: acc }));
            }
          }
        }
      }

      const structured = safeJsonParse(acc);
      const label =
        mode === "bijbelstudie" ? "Bijbelstudie" :
        mode === "preek" ? "Preek" :
        mode === "liederen" ? "Liederen" :
        "Actueel & Media";

      if (structured && typeof structured === "object") {
        addAiResult({ id: newId(), kind: mode, title: `${label} — gegenereerde opzet`, structured, createdAt: new Date().toISOString() });
      } else {
        addAiResult({ id: newId(), kind: mode, title: `${label} — (stream, ongestructureerd)`, text: acc, createdAt: new Date().toISOString() });
      }
      setLive({ running: false, text: "", error: "" });
    } catch (e) {
      setLive({ running: false, text: "", error: e.message || "AI-stream-fout" });
      setAiError(e.message || "AI-stream-fout");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <section className="max-w-6xl mx-auto p-3 sm:p-4 space-y-6">
      {/* Genereer opzet */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-3">🧠 Genereer opzet</h2>
        <div className="grid sm:grid-cols-4 gap-3 mb-3">
          {[
            { id: "bijbelstudie", title: "Bijbelstudie" },
            { id: "preek", title: "Preek" },
            { id: "liederen", title: "Liederen" },
            { id: "actueelmedia", title: "Actueel & Media" },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setMode(opt.id)}
              className={
                "p-3 rounded-lg border transition " +
                (mode === opt.id
                  ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30"
                  : "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700")
              }
            >
              <div className="font-medium">{opt.title}</div>
            </button>
          ))}
        </div>

        <textarea
          className="w-full p-2 rounded border dark:bg-gray-900 dark:border-gray-700"
          rows={2}
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="Extra instructies (optioneel)…"
        />

        <div className="mt-3 flex items-center gap-2">
          <button
            disabled={aiBusy}
            onClick={generateStream}
            className={"px-3 py-1.5 rounded text-sm " + (aiBusy ? "bg-gray-300" : "bg-indigo-600 text-white hover:bg-indigo-700")}
          >
            Genereer (stream)
          </button>
          {aiBusy && <span className="text-sm text-gray-600">⏳ Bezig…</span>}
          {aiError && <span className="text-sm text-amber-600">{aiError}</span>}
        </div>

        {live.running || live.text ? (
          <div className="mt-4 rounded-lg border p-3 bg-indigo-50/40">
            <div className="text-sm font-semibold mb-2">AI (live)</div>
            {live.error ? (
              <div className="text-sm text-red-600">{live.error}</div>
            ) : (
              <AiPretty text={live.text || "…"} />
            )}
          </div>
        ) : null}
      </div>

      {/* AI-resultaten */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">🤖 AI-resultaten</h3>
        {aiResults.length === 0 ? (
          <p className="text-gray-500">Nog geen AI-resultaten. (<Link to="/" className="text-blue-600 hover:underline">Zoeken »</Link>)</p>
        ) : (
          <div className="grid gap-4">
            {aiResults.map((r) => (
              <article key={r.id} className="border rounded-lg p-3 bg-white dark:bg-gray-900">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium">{r.title}</div>
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-600 text-sm"
                    onClick={() => removeAiResult(r.id)}
                  >
                    Verwijderen
                  </button>
                </div>
                {r.structured ? <AiResultCard result={r} /> : <AiPretty text={r.text} />}
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Favoriete teksten */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">⭐ Teksten</h3>
        {favTexts.length === 0 ? (
          <p className="text-gray-500">Nog geen teksten toegevoegd. (<Link to="/" className="text-blue-600 hover:underline">Zoeken »</Link>)</p>
        ) : (
          <div className="grid gap-4">
            {favTexts.map((t) => (
              <div key={t._id || t.ref} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{t.ref}</span>
                  <button className="text-red-500 hover:text-red-600" onClick={() => removeFavText(t._id || t.ref)}>Verwijderen</button>
                </div>
                <p className="text-sm mb-3 whitespace-pre-wrap">{t.text}</p>
                <input
                  className="w-full text-sm p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900"
                  value={t.note || ""}
                  onChange={(e) => updateFavTextNote(t._id || t.ref, e.target.value)}
                  placeholder="Notitie bij deze tekst."
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Favoriete grafieken */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">📊 Grafieken</h3>
        {favCharts.length === 0 ? (
          <p className="text-gray-500">Nog geen grafieken toegevoegd. (<Link to="/" className="text-blue-600 hover:underline">Zoeken »</Link>)</p>
        ) : (
          <div className="grid gap-4">
            {favCharts.map((c) => (
              <div key={c.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium">{c.title}</div>
                    <div className="text-xs text-gray-500">Woorden: {(c.words || []).join(", ")}</div>
                  </div>
                  <button className="text-red-500 hover:text-red-600" onClick={() => removeFavChart(c.id)}>Verwijderen</button>
                </div>
                <WordFrequencyChart
                  queryWords={c.words}
                  version={c.version}
                  onClickDrill={null}
                  onFavChart={null}
                />
                <input
                  className="mt-3 w-full text-sm p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900"
                  value={c.note || ""}
                  onChange={(e) => updateFavChartNote(c.id, e.target.value)}
                  placeholder="Notitie bij deze grafiek."
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
