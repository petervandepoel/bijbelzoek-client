import { useApp } from "../context/AppContext";
import WordFrequencyChart from "../components/WordFrequencyChart";
import React, { useState } from "react";

// HITS-ENDPOINT: afgestemd op jouw statsRoutes.js
const HITS_ENDPOINT = ({ version, mode, words }) =>
  `/api/stats/hitsByBook?version=${encodeURIComponent(
    version || "HSV"
  )}&mode=${encodeURIComponent(mode || "exact")}&words=${encodeURIComponent(
    words.join(",")
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

export default function Favorites() {
  const {
    // global state uit context
    generalNotes, setGeneralNotes,
    favTexts, removeFavText, updateFavTextNote,
    favCharts, removeFavChart, updateFavChartNote,
    version, searchMode,
    // << NIEUW uit context
    aiResults, addAiResult, removeAiResult, setAiResults,
  } = useApp();

  // geïntegreerde generator
  const [mode, setMode] = useState("bijbelstudie"); // "bijbelstudie" | "preek" | "sing-in"
  const [extra, setExtra] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [streamText, setStreamText] = useState("");

  // ---------- Boek-hits ----------
  async function fetchBookHits(allWords) {
    const words = Array.from(new Set((allWords || []).filter(Boolean)));
    if (!words.length) return null;

    try {
      const url = HITS_ENDPOINT({ version, mode: searchMode, words });
      const res = await fetchWithTimeout(url, { method: "GET" });
      if (!res.ok) return null;

      const data = await res.json();
      // jouw endpoint geeft { data: [{ book, hits }, ...] }
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

  // ---------- Context samenstellen ----------
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

    // keywords uit favoriete grafieken
    let allWords = [];
    if (favCharts?.length) {
      parts.push("# 📊 Grafiek-woorden (keywords)");
      favCharts.slice(0, 8).forEach((c) => {
        const words = (c.words || []).filter(Boolean);
        parts.push(`- ${c.title || words.join(", ")}`);
        allWords = allWords.concat(words);
      });
    }

    // hits per boek
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

  // ---------- STREAM: opzet genereren ----------
  async function generate() {
    setAiBusy(true);
    setAiError("");
    setStreamText("");
    try {
      const context = await buildContextAsync();

      const res = await fetch("/api/ai/compose/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, extra: extra.trim(), context }),
      });
      if (!res.ok || !res.body) throw new Error(`Stream HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let acc = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const event = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          const lines = event.split("\n").map((l) => l.trim());
          let isEnd = false;

          for (const line of lines) {
            if (line.startsWith("event:") && line.slice(6).trim() === "end") {
              isEnd = true;
              continue;
            }
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();

            try {
              const obj = JSON.parse(data);
              const chunk =
                typeof obj === "string" ? obj : obj?.delta || obj?.content || "";
              if (!isEnd && chunk) {
                acc += chunk;
                setStreamText((prev) => prev + chunk);
              }
            } catch {
              if (!isEnd && data) {
                acc += data;
                setStreamText((prev) => prev + data);
              }
            }
          }

          if (isEnd) {
            const label =
              mode === "bijbelstudie" ? "Bijbelstudie" :
              mode === "preek"       ? "Preek"        : "Sing-in";

            addAiResult({
              id: newId(),
              kind: `compose_${mode}`,
              title: `${label} — gegenereerde opzet`,
              text: acc,
              createdAt: new Date().toISOString(),
            });

            setStreamText("");
            setAiBusy(false);
          }
        }
      }
    } catch (e) {
      setAiError(e.message || "AI-stream-fout");
      setAiBusy(false);
    }
  }

  // ---------- JSON import/export voor AI-resultaten ----------
  function exportJSON() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      aiResults,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ai-resultaten.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data.aiResults)) setAiResults(data.aiResults);
      } catch {
        alert("Kon JSON niet lezen");
      }
    };
    reader.readAsText(file);
  }

  // ---------- UI ----------
  return (
    <section className="max-w-6xl mx-auto p-3 sm:p-4 space-y-6">
      {/* ====== Geïntegreerde generator (bovenaan) ====== */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-3">🧠 Genereer opzet</h2>

        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          {[
            { id: "bijbelstudie", title: "Bijbelstudie", desc: "Globale indeling, tekstgedeelten, gesprekvragen, toepassingen." },
            { id: "preek", title: "Preek", desc: "Hoofdlijnen preekopbouw, Christus centraal, achtergronden, toepassingen." },
            { id: "sing-in", title: "Sing-in", desc: "Liederen per blok (aanbidding/woord/reactie), lezingen, korte overgangsteksten." },
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

        {/* Alleen extra instructies (geen Onderwerp) */}
        <div className="grid gap-3">
          <textarea
            className="w-full p-2 rounded border dark:bg-gray-900 dark:border-gray-700"
            rows={2}
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="Extra instructies (optioneel): doelgroep, toon, accenten, tijdsduur..."
          />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            disabled={aiBusy}
            onClick={generate}
            className={
              "px-3 py-1.5 rounded text-sm " +
              (aiBusy ? "bg-gray-300" : "bg-indigo-600 text-white hover:bg-indigo-700")
            }
          >
            Genereer
          </button>
          {aiBusy && <span className="text-sm text-gray-600 dark:text-gray-300">⏳ Bezig met genereren…</span>}
          {aiError && <span className="text-sm text-amber-600">{aiError}</span>}
          <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            Gebruikt notities, favoriete teksten, grafiek-woorden én boek-hits.
          </div>
        </div>

        {aiBusy && (
          <div className="mt-3 rounded border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/30 p-3 text-sm whitespace-pre-wrap">
            <div className="text-xs mb-1 text-indigo-700 dark:text-indigo-300">Live resultaat (stream):</div>
            {streamText || "…"}
          </div>
        )}
      </div>

      {/* ====== Algemene notities ====== */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">📝 Algemene notities</h3>
        <textarea
          className="w-full min-h-[120px] p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900"
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="Schrijf hier je algemene notities..."
        />
      </div>

      {/* ====== AI-resultaten ====== */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">🧠 AI-resultaten</h3>
          <div className="flex gap-2">
            <button onClick={exportJSON} className="px-3 py-1 rounded border text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Export JSON</button>
            <label className="px-3 py-1 rounded border text-sm hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
              Import JSON
              <input type="file" accept="application/json" className="hidden" onChange={(e)=> e.target.files?.[0] && importJSON(e.target.files[0])} />
            </label>
          </div>
        </div>
        {aiResults.length === 0 ? (
          <p className="text-gray-500 mt-2">Nog geen AI-resultaten. Gebruik de generator bovenaan.</p>
        ) : (
          <div className="grid gap-3 mt-3">
            {aiResults.map((r) => (
              <div key={r.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium">{r.title}</div>
                  <button className="text-red-500 hover:text-red-600 text-sm" onClick={() => removeAiResult(r.id)}>Verwijderen</button>
                </div>
                <div className="text-sm whitespace-pre-wrap">{r.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ====== Favoriete teksten ====== */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">⭐ Teksten</h3>
        {favTexts.length === 0 ? (
          <p className="text-gray-500">Nog geen teksten toegevoegd.</p>
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
                  placeholder="Notitie bij deze tekst..."
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
          <p className="text-gray-500">Nog geen grafieken toegevoegd.</p>
        ) : (
          <div className="grid gap-4">
            {favCharts.map((c) => (
              <div key={c.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium">{c.title}</div>
                    <div className="text-xs text-gray-500">Versie: {c.version} • Woorden: {c.words.join(", ")}</div>
                  </div>
                  <button className="text-red-500 hover:text-red-600" onClick={() => removeFavChart(c.id)}>Verwijderen</button>
                </div>
                <WordFrequencyChart queryWords={c.words} onClickDrill={null} onFavChart={null} />
                <input
                  className="mt-3 w-full text-sm p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900"
                  value={c.note || ""}
                  onChange={(e) => updateFavChartNote(c.id, e.target.value)}
                  placeholder="Notitie bij deze grafiek..."
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
