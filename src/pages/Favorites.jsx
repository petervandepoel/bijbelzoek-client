// client/src/pages/Favorites.jsx
import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import WordFrequencyChart from "../components/WordFrequencyChart";
import AiResultCard from "../components/AiResultCard";
import { Link } from "react-router-dom";

// helemaal bovenin, bij je imports
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

// ...vervang HITS_ENDPOINT door:
const HITS_ENDPOINT = ({ version, mode, words }) =>
  `${API_BASE}/api/stats/hitsByBook?version=${encodeURIComponent(
    version || "HSV"
  )}&mode=${encodeURIComponent(mode || "exact")}&words=${encodeURIComponent(
    (words || []).join(",")
  )}`;

const newId = () => Math.random().toString(36).slice(2, 10);

async function fetchWithTimeout(input, init, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort("timeout"), ms);
  try {
    const res = await fetch(input, { ...(init || {}), signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

/** Kleine, dependency-vrije “renderer”
 *  - ## en ### → koppen
 *  - - bullets → lijsten
 *  - > blokken → “vers/quote” kaartje
 *  - herkent liedregels: Psalm N, Opwekking N, Op Toonhoogte N
 *  - highlight vers-verwijzingen  (Rom. 8:1, Johannes 3:16, Ps. 23:1-6, etc.)
 */
function AiPretty({ text = "", mode = "bijbelstudie" }) {
  const lines = String(text).replaceAll("\r\n", "\n").split("\n");

  const verseRefRe =
    /\b((Gen|Ex|Lev|Num|Deut|Joz|Richt|Rut|1 Sam|2 Sam|1 Kon|2 Kon|1 Kron|2 Kron|Ezra|Neh|Est|Job|Ps(?:alm|almen)?|Spr|Pred|Hoogl|Jes|Jer|Kla|Ezech|Dan|Hos|Joël|Amos|Obad|Jona|Micha|Nah|Hab|Zef|Hag|Zach|Mal|Mat|Matt|Marcus|Mar|Luk|Lucas|Joh|Johannes|Hand|Rom|Romeinen|1 Kor|2 Kor|Gal|Ef|Efeze|Fil|Filippenzen|Kol|1 Thess|2 Thess|1 Tim|2 Tim|Tit|Filem|Hebr?|Jak|1 Petr|2 Petr|1 Joh|2 Joh|3 Joh|Judas|Openb?|Openbaring)\.?\s*\d+:\d+(?:-\d+)?)\b/gi;

  const songRe = /^(Psalm(?:en)?|Opwekking|Op\s*Toonhoogte)\s+(\d{1,4})\b/i;

  // Groepeer achter elkaar volgende bullets in één <ul>
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];

    if (l.startsWith("### ")) {
      blocks.push({ type: "h3", text: l.slice(4) });
      i++;
      continue;
    }
    if (l.startsWith("## ")) {
      blocks.push({ type: "h2", text: l.slice(3) });
      i++;
      continue;
    }
    if (l.startsWith(">")) {
      // verzamel doorlopende blockquote
      const buf = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", text: buf.join("\n") });
      continue;
    }
    if (/^\s*-\s+/.test(l)) {
      const items = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*-\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    if (/^\s*\d+\.\s+/.test(l)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // lege regel => witruimte
    if (!l.trim()) {
      blocks.push({ type: "space" });
      i++;
      continue;
    }

    // reguliere paragraaf
    blocks.push({ type: "p", text: l });
    i++;
  }

  function highlightRefs(s) {
    return s.replace(verseRefRe, (m) => `<span class="font-semibold text-indigo-700">${m}</span>`);
  }

  function SongBadge({ line }) {
    const m = line.match(songRe);
    if (!m) return null;
    const serie = m[1].replace(/\s+/g, " ");
    const nr = m[2];
    return (
      <span className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 mr-2">
        {serie} {nr}
      </span>
    );
  }

  return (
    <div className="text-[0.95rem] leading-6 space-y-3">
      {blocks.map((b, idx) => {
        if (b.type === "h2")
          return <h3 key={idx} className="text-lg font-semibold border-b border-gray-200 pb-1">{b.text}</h3>;
        if (b.type === "h3")
          return <h4 key={idx} className="text-base font-semibold text-indigo-700">{b.text}</h4>;
        if (b.type === "ul")
          return (
            <ul key={idx} className="list-disc pl-6 space-y-1">
              {b.items.map((it, i2) => (
                <li key={i2} dangerouslySetInnerHTML={{ __html: highlightRefs(it) }} />
              ))}
            </ul>
          );
        if (b.type === "ol")
          return (
            <ol key={idx} className="list-decimal pl-6 space-y-1">
              {b.items.map((it, i2) => (
                <li key={i2} dangerouslySetInnerHTML={{ __html: highlightRefs(it) }} />
              ))}
            </ol>
          );
        if (b.type === "quote") {
          // verzen: laat opvallen
          return (
            <div key={idx} className="rounded-lg border-l-4 border-amber-400 bg-amber-50/60 dark:bg-amber-900/20 p-3">
              <div className="text-[0.95rem]" dangerouslySetInnerHTML={{ __html: highlightRefs(b.text) }} />
            </div>
          );
        }
        if (b.type === "space") return <div key={idx} className="h-2" />;
        // paragraaf + eventuele liedbadge vooraan
        return (
          <p key={idx} className="whitespace-pre-wrap">
            {songRe.test(b.text) ? <SongBadge line={b.text} /> : null}
            <span dangerouslySetInnerHTML={{ __html: highlightRefs(b.text) }} />
          </p>
        );
      })}
    </div>
  );
}

export default function Favorites() {
  const {
    // Globale state uit context
    generalNotes, setGeneralNotes,
    favTexts, removeFavText, updateFavTextNote,
    favCharts, removeFavChart, updateFavChartNote,
    version, searchMode,

    // AI-resultaten uit context
    aiResults, addAiResult, removeAiResult, setAiResults,
  } = useApp();

  // geïntegreerde generator
  const [mode, setMode] = useState("bijbelstudie"); // "bijbelstudie" | "preek" | "liederen"
  const [extra, setExtra] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [streamText, setStreamText] = useState("");

  // ───────── Boek-hits (op basis van woorden uit favoriete grafieken) ─────────
  async function fetchBookHits(allWords) {
    const words = Array.from(new Set((allWords || []).filter(Boolean)));
    if (!words.length) return null;

    try {
      const url = HITS_ENDPOINT({ version, mode: searchMode, words });
      const res = await fetchWithTimeout(url, { method: "GET" });
      if (!res.ok) return null;

      const data = await res.json();
      const arr = Array.isArray(data?.data) ? data.data : [];
      const out = {};
      for (const row of arr) {
        if (row?.book) out[row.book] = Number(row?.hits || 0);
      }
      return out; // { Genesis: 4, Psalmen: 31, ... }
    } catch {
      return null;
    }
  }

  // ───────── Context opbouwen (notities, teksten, grafiek-woorden + boek-hits) ─────────
  async function buildContextAsync() {
    const parts = [];

    if (generalNotes) parts.push(`# Algemene notities\n${generalNotes}`);

    if (favTexts?.length) {
      parts.push("# ⭐ Favoriete teksten");
      favTexts.slice(0, 24).forEach((t) => {
        const note = t.note ? `\n_notitie:_ ${t.note}` : "";
        parts.push(`**${t.ref || ""}**\n${t.text || ""}${note}`);
      });
    }

    let allWords = [];
    if (favCharts?.length) {
      parts.push("# 📊 Grafiek-woorden (keywords)");
      favCharts.slice(0, 8).forEach((c) => {
        const words = (c.words || []).filter(Boolean);
        parts.push(`- ${c.title || words.join(", ")}`);
        allWords = allWords.concat(words);
      });
    }

    const boekHits = await fetchBookHits(allWords);
    if (boekHits && Object.keys(boekHits).length) {
      const rows = Object.entries(boekHits)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([book, cnt]) => `- ${book}: ${cnt}`);
      parts.push("## Boek-hits\n" + rows.join("\n"));
    }

    return parts.filter(Boolean).join("\n\n");
  }

  // ───────── STREAM: opzet genereren ─────────
  async function generate() {
  setAiBusy(true); setAiError("");
  try {
    const context = await buildContextAsync();
    const res = await fetch(`${API_BASE}/api/ai/compose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, extra: extra.trim(), context }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { structured } = await res.json();
    const label =
      mode === "bijbelstudie" ? "Bijbelstudie" :
      mode === "preek"        ? "Preek"        : "Liederen";
    addAiResult({
      id: newId(),
      kind: mode,
      title: `${label} — gegenereerde opzet`,
      structured,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    setAiError(e.message || "AI-fout");
  } finally {
    setAiBusy(false);
  }
}

  // ───────── UI ─────────
  return (
    <section className="max-w-6xl mx-auto p-3 sm:p-4 space-y-6">
      {/* ====== Geïntegreerde generator (bovenaan) ====== */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-3">🧠 Genereer opzet</h2>

        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          {[
            { id: "bijbelstudie", title: "Bijbelstudie", desc: "Globale indeling, tekstgedeelten, gesprekvragen, toepassingen." },
            { id: "preek",        title: "Preek",        desc: "Hoofdlijnen, Christus centraal, achtergronden, toepassingen." },
            { id: "liederen",     title: "Liederen",     desc: "Psalmen / Opwekking / Op Toonhoogte met nummering." },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setMode(opt.id)}
              className={
                "text-left p-3 rounded-lg border transition " +
                (mode === opt.id
                  ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30"
                  : "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700")
              }
            >
              <div className="font-medium">{opt.title}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">{opt.desc}</div>
            </button>
          ))}
        </div>

        {/* Alleen extra instructies (zoals je vroeg) */}
        <textarea
          className="w-full p-2 rounded border dark:bg-gray-900 dark:border-gray-700"
          rows={2}
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="Extra instructies (optioneel): doelgroep, toon, accenten, tijdsduur…"
        />

        <div className="mt-3 flex items-center gap-2">
          <button
            disabled={aiBusy}
            onClick={generate}
            className={"px-3 py-1.5 rounded text-sm " + (aiBusy ? "bg-gray-300" : "bg-indigo-600 text-white hover:bg-indigo-700")}
          >
            Genereer
          </button>
          {aiBusy && <span className="text-sm text-gray-600 dark:text-gray-300">⏳ Bezig met genereren…</span>}
          {aiError && <span className="text-sm text-amber-600">{aiError}</span>}
          <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            Context: notities, favoriete teksten & grafiek-woorden (+ Boek-hits).
          </div>
        </div>

        {/* Live stream (preview) */}
        {aiBusy && (
          <div className="mt-3 rounded border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/30 p-3 text-sm whitespace-pre-wrap">
            <div className="text-xs mb-1 text-indigo-700 dark:text-indigo-300">Live resultaat (stream):</div>
            {streamText || "…"}
          </div>
        )}
      </div>

      {/* ====== AI-resultaten (mooi gerenderd) ====== */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">🤖 AI-resultaten</h3>
          <div className="flex items-center gap-2">
            <label className="text-xs cursor-pointer px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-700">
              Import JSON
              <input hidden type="file" accept="application/json" onChange={(e) => e.target.files?.[0] && (() => {
                const reader = new FileReader();
                reader.onload = () => {
                  try {
                    const data = JSON.parse(reader.result);
                    if (Array.isArray(data.aiResults)) setAiResults(data.aiResults);
                  } catch { alert("Kon JSON niet lezen"); }
                };
                reader.readAsText(e.target.files[0]);
              })()} />
            </label>
            <button
              onClick={() => {
                const payload = { version: 1, exportedAt: new Date().toISOString(), aiResults };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = "ai-resultaten.json"; a.click();
                URL.revokeObjectURL(url);
              }}
              className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Export JSON
            </button>
          </div>
        </div>

        {aiResults.length === 0 ? (
          <p className="text-gray-500">Nog geen AI-resultaten. Zorg ervoor dat je eerst (<Link to="/" className="text-blue-600 hover:underline">
        Ga naar Zoeken »
  </Link>) relevante teksten en grafieken bewaard voor een beter resultaat.
  </p>
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
    {r.structured ? (
      <AiResultCard result={r} />
    ) : (
      <AiPretty
        text={r.text}
        mode={(r.kind || "").includes("liederen")
          ? "liederen"
          : (r.kind || "").includes("preek")
            ? "preek"
            : "bijbelstudie"}
      />
    )}
  </article>
))}

      {/* ====== Favoriete teksten ====== */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">⭐ Teksten</h3>
        {favTexts.length === 0 ? (
          <p className="text-gray-500">Nog geen teksten toegevoegd. Zorg ervoor dat je eerst (<Link to="/" className="text-blue-600 hover:underline">
        Ga naar Zoeken »
  </Link>) relevante teksten en grafieken bewaard voor een beter resultaat.</p>
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

      {/* ====== Favoriete grafieken ====== */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">📊 Grafieken</h3>
        {favCharts.length === 0 ? (
          <p className="text-gray-500">Nog geen grafieken toegevoegd. Zorg ervoor dat je eerst (<Link to="/" className="text-blue-600 hover:underline">
        Ga naar Zoeken »
  </Link>)  relevante teksten en grafieken bewaard voor een beter resultaat.</p>
        ) : (
          <div className="grid gap-4">
            {favCharts.map((c) => (
              <div key={c.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium">{c.title}</div>
                    <div className="text-xs text-gray-500">Versie: {c.version} • Woorden: {(c.words || []).join(", ")}</div>
                  </div>
                  <button className="text-red-500 hover:text-red-600" onClick={() => removeFavChart(c.id)}>Verwijderen</button>
                </div>
                <WordFrequencyChart queryWords={c.words} version={c.version} onClickDrill={null} onFavChart={null} />
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

      <style>{`@media print { header, footer, nav { display:none !important; } }`}</style>
    </section>
  );
}
