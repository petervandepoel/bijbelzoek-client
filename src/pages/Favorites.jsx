// client/src/pages/Favorites.jsx
import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import WordFrequencyChart from "../components/WordFrequencyChart";
import AiResultCard from "../components/AiResultCard";
import { Link } from "react-router-dom";

// Gebruik same-origin als default (belangrijk voor Vercel)
const API_BASE = import.meta.env.VITE_API_BASE || "";

/* ────────────────────────────────────────────────────────────────
   Helper endpoints
   ──────────────────────────────────────────────────────────────── */
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

/* ────────────────────────────────────────────────────────────────
   Kleine renderer voor platte AI-tekst (fallback)
   ──────────────────────────────────────────────────────────────── */
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

  const hi = (s) =>
    s.replace(verseRefRe, (m) => `<span class="font-semibold text-indigo-700">${m}</span>`);

  return (
    <div className="text-[0.95rem] leading-6 space-y-3">
      {blocks.map((b, idx) => {
        if (b.t === "h2")
          return <h3 key={idx} className="text-lg font-semibold border-b border-gray-200 pb-1">{b.v}</h3>;
        if (b.t === "h3")
          return <h4 key={idx} className="text-base font-semibold text-indigo-700">{b.v}</h4>;
        if (b.t === "ul")
          return (
            <ul key={idx} className="list-disc pl-6 space-y-1">
              {b.v.map((it, i2) => (
                <li key={i2} dangerouslySetInnerHTML={{ __html: hi(it) }} />
              ))}
            </ul>
          );
        if (b.t === "space") return <div key={idx} className="h-2" />;
        return <p key={idx} className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: hi(b.v) }} />;
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────────────── */
export default function Favorites() {
  const {
    generalNotes, setGeneralNotes,
    favTexts, removeFavText, updateFavTextNote,
    favCharts, removeFavChart, updateFavChartNote,
    version, searchMode,
    aiResults, addAiResult, removeAiResult, setAiResults,
  } = useApp();

  // Paneel "Genereer opzet"
  const [mode, setMode] = useState("bijbelstudie"); // "bijbelstudie" | "preek" | "liederen"
  const [extra, setExtra] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");

  // “Snelkoppelingen” Actueel & Media in hetzelfde paneel
  const [newsState, setNewsState] = useState({ loading: false, error: "", links: [] });
  const [mediaState, setMediaState] = useState({ loading: false, error: "", items: [] });

  /* ── Bewaar zoekwoorden bij wisselen van pagina’s ───────────────── */
  // Neem alle woorden uit favoriete grafieken en zet in localStorage.
  useEffect(() => {
    const all = (favCharts || []).flatMap((c) => c.words || []);
    const words = Array.from(new Set(all.filter(Boolean)));
    // wordt door de zoekpagina opgepikt op mount
    localStorage.setItem("bz.searchWords", words.join(","));
  }, [favCharts]);

  /* ── Boek-hits opvragen voor context ───────────────────────────── */
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
      for (const row of arr) if (row?.book) out[row.book] = Number(row?.hits || 0);
      return out;
    } catch {
      return null;
    }
  }

  /* ── Context opbouwen voor AI ──────────────────────────────────── */
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

  /* ── AI: gestructureerd resultaat genereren ────────────────────── */
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

  /* ── Actueel / Media: snelkoppelingen in dit paneel ────────────── */
  function deriveThemeAndKeywords() {
    // Thema: neem “extra” of fallback op eerste grafiektitel
    const fallbackTitle =
      (favCharts && favCharts[0] && (favCharts[0].title || (favCharts[0].words || []).join(", "))) || "";
    const theme = (extra && extra.trim()) || fallbackTitle || "Bijbelstudie";
    // Keywords: alle unieke woorden uit favoriete grafieken
    const keywords = Array.from(
      new Set((favCharts || []).flatMap((c) => c.words || []).filter(Boolean))
    ).slice(0, 10);
    return { theme, keywords };
  }

  async function fetchActueel() {
    const { theme, keywords } = deriveThemeAndKeywords();
    setNewsState({ loading: true, error: "", links: [] });
    try {
      const res = await fetch(`${API_BASE}/api/ai/actueel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, keywords }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNewsState({ loading: false, error: "", links: data?.links || [] });
    } catch (e) {
      setNewsState({ loading: false, error: "Kon actueel niet laden.", links: [] });
    }
  }

  async function fetchMedia() {
    const { theme, keywords } = deriveThemeAndKeywords();
    setMediaState({ loading: true, error: "", items: [] });
    try {
      const res = await fetch(`${API_BASE}/api/ai/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, keywords }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMediaState({ loading: false, error: "", items: data?.media || [] });
    } catch (e) {
      setMediaState({ loading: false, error: "Kon media niet laden.", items: [] });
    }
  }

  /* ── UI ────────────────────────────────────────────────────────── */
  return (
    <section className="max-w-6xl mx-auto p-3 sm:p-4 space-y-6">
      {/* ====== Genereer opzet ====== */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-3">🧠 Genereer opzet</h2>

        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          {[
            { id: "bijbelstudie", title: "Bijbelstudie", desc: "Indeling, gedeelten, vragen, toepassing." },
            { id: "preek",        title: "Preek",        desc: "Hoofdlijnen, Christus centraal, achtergrond." },
            { id: "liederen",     title: "Liederen",     desc: "Psalmen • Opwekking • Op Toonhoogte." },
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

        <textarea
          className="w-full p-2 rounded border dark:bg-gray-900 dark:border-gray-700"
          rows={2}
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="Extra instructies (optioneel): doelgroep, toon, accenten…"
        />

        <div className="mt-3 flex items-center gap-2">
          <button
            disabled={aiBusy}
            onClick={generate}
            className={"px-3 py-1.5 rounded text-sm " + (aiBusy ? "bg-gray-300" : "bg-indigo-600 text-white hover:bg-indigo-700")}
          >
            Genereer
          </button>
          {aiBusy && <span className="text-sm text-gray-600 dark:text-gray-300">⏳ Bezig…</span>}
          {aiError && <span className="text-sm text-amber-600">{aiError}</span>}
          <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            Context: notities, favoriete teksten & grafiek-woorden (+ boek-hits).
          </div>
        </div>

        {/* Actueel & Media blok in dit paneel */}
        <div className="mt-4 grid md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-amber-200/60 dark:border-amber-700 p-3 bg-amber-50/50 dark:bg-amber-900/20">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-amber-800 dark:text-amber-300">Actueel</div>
              <button
                onClick={fetchActueel}
                className="px-2 py-1 rounded text-xs bg-amber-100 dark:bg-amber-800/50 text-amber-900 dark:text-amber-100 border border-amber-300/60 dark:border-amber-700"
              >
                {newsState.loading ? "Laden…" : "Zoek"}
              </button>
            </div>
            {newsState.error && <div className="text-xs text-red-600 mt-2">{newsState.error}</div>}
            <ul className="mt-2 text-sm space-y-1">
              {newsState.links.map((lnk, i) => (
                <li key={i}>
                  <a className="text-indigo-600 hover:underline" href={lnk.url} target="_blank" rel="noreferrer">
                    {lnk.title}
                  </a>
                  <span className="ml-2 text-xs text-gray-500">({lnk.source})</span>
                </li>
              ))}
              {!newsState.loading && !newsState.links.length && !newsState.error && (
                <li className="text-xs text-gray-500">Klik op <em>Zoek</em> voor relevante nieuws/achtergrond-links.</li>
              )}
            </ul>
          </div>

          <div className="rounded-lg border border-indigo-200/60 dark:border-indigo-700 p-3 bg-indigo-50/40 dark:bg-indigo-900/20">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">Media</div>
              <button
                onClick={fetchMedia}
                className="px-2 py-1 rounded text-xs bg-indigo-100 dark:bg-indigo-800/50 text-indigo-900 dark:text-indigo-100 border border-indigo-300/60 dark:border-indigo-700"
              >
                {mediaState.loading ? "Laden…" : "Zoek"}
              </button>
            </div>
            {mediaState.error && <div className="text-xs text-red-600 mt-2">{mediaState.error}</div>}
            <ul className="mt-2 text-sm space-y-1">
              {mediaState.items.map((m, i) => (
                <li key={i}>
                  <a className="text-indigo-600 hover:underline" href={m.url} target="_blank" rel="noreferrer">
                    {m.title}
                  </a>
                  <span className="ml-2 text-xs text-gray-500">({m.source}, {m.type})</span>
                </li>
              ))}
              {!mediaState.loading && !mediaState.items.length && !mediaState.error && (
                <li className="text-xs text-gray-500">Klik op <em>Zoek</em> voor beelden/kunst/filmpjes bij dit thema.</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* ====== AI-resultaten ====== */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">🤖 AI-resultaten</h3>
          <div className="flex items-center gap-2">
            <label className="text-xs cursor-pointer px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-700">
              Import JSON
              <input
                hidden type="file" accept="application/json"
                onChange={(e) => e.target.files?.[0] && (() => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    try {
                      const data = JSON.parse(reader.result);
                      if (Array.isArray(data.aiResults)) setAiResults(data.aiResults);
                    } catch { alert("Kon JSON niet lezen"); }
                  };
                  reader.readAsText(e.target.files[0]);
                })()}
              />
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
          <p className="text-gray-500">
            Nog geen AI-resultaten. Zorg ervoor dat je eerst (<Link to="/" className="text-blue-600 hover:underline">Ga naar Zoeken »</Link>) relevante teksten en grafieken bewaard.
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
                  <AiPretty text={r.text} />
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {/* ====== Favoriete teksten ====== */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">⭐ Teksten</h3>
        {favTexts.length === 0 ? (
          <p className="text-gray-500">
            Nog geen teksten toegevoegd. Ga naar (<Link to="/" className="text-blue-600 hover:underline">Zoeken »</Link>) om te kiezen.
          </p>
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
          <p className="text-gray-500">
            Nog geen grafieken toegevoegd. Ga naar (<Link to="/" className="text-blue-600 hover:underline">Zoeken »</Link>) om te kiezen.
          </p>
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

      <style>{`@media print { header, footer, nav { display:none !important; } }`}</style>
    </section>
  );
}
