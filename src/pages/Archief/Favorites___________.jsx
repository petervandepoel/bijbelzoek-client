// client/src/pages/Favorites.jsx
import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import WordFrequencyChart from "../components/WordFrequencyChart";
import AiResultCard from "../components/AiResultCard";
import AiPretty from "../components/AiPretty";
import { Link } from "react-router-dom";
import BeginOpnieuwButton from "../components/BeginOpnieuwButton";

const API_BASE = import.meta.env.VITE_API_BASE || "";
const API = (API_BASE || "/api").replace(/\/+$/, "");

const newId = () => Math.random().toString(36).slice(2, 10);

/** Try to parse JSON at end of a streamed transcript. Supports ```json fences. */
function safeJsonParse(maybe) {
  if (!maybe) return null;
  let txt = String(maybe).trim();
  const fence = txt.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) txt = fence[1];
  const s = txt.indexOf("{"), e = txt.lastIndexOf("}");
  if (s !== -1 && e !== -1 && e > s) txt = txt.slice(s, e + 1);
  try { return JSON.parse(txt); } catch { return null; }
}

/** ---------- Harvest 'Nieuws' & 'Media' from prose (fallback/merge) ---------- */
const SOURCE_DOMAINS = {
  "CIP": "cip.nl",
  "EO": "eo.nl",
  "EO/BEAM": "eo.nl",
  "Reformatorisch Dagblad": "rd.nl",
  "NU.nl": "nu.nl",
  "NPO Radio 1": "nporadio1.nl",
  "YouTube": "youtube.com"
};

function ddgUrl(title, source) {
  const dom = SOURCE_DOMAINS[(source || "").trim()] || "";
  if (dom) return `https://duckduckgo.com/?q=${encodeURIComponent(title)}+site%3A${encodeURIComponent(dom)}`;
  return `https://duckduckgo.com/?q=${encodeURIComponent(title + " " + (source || ""))}`;
}

function extractSection(text, header) {
  const re = new RegExp(`(^|\\n)#{0,3}\\s*${header}\\s*\\n([\\s\\S]*?)(?=\\n#{1,3}\\s*\\S|\\n\\s*$)`, "i");
  const m = text.match(re);
  return m ? m[2].trim() : "";
}

function inferType(why, title, source) {
  const s = `${why || ""} ${title || ""} ${source || ""}`.toLowerCase();
  if (s.includes("podcast")) return "audio";
  if (s.includes("documentaire") || s.includes("video") || s.includes("lezing") || s.includes("worship")) return "video";
  return "link";
}

function harvestActueelMediaFromProse(prose) {
  const text = (prose || "").replace(/\r/g, "");
  const newsRaw = extractSection(text, "Nieuws");
  const mediaRaw = extractSection(text, "Media");

  const cleanup = (line) => line.replace(/^[-•]\s*/, "").trim();

  const news = [];
  if (newsRaw) {
    newsRaw.split(/\n+/).forEach((ln) => {
      const line = cleanup(ln);
      if (!line || /^```/.test(line)) return;
      // "Titel" — Bron (datum): samenvatting
      const m = line.match(/^"([^"]+)"\s+—\s*([^:(]+?)(?:\s*\(([^)]+)\))?:\s*(.+)$/);
      if (m) {
        const [, title, source, date, summary] = m;
        news.push({
          title: title.trim(),
          source: (source || "").trim(),
          date: (date || "").trim() || undefined,
          summary: (summary || "").trim() || undefined,
          url: ddgUrl(title, source)
        });
      }
    });
  }

  const media = [];
  if (mediaRaw) {
    mediaRaw.split(/\n+/).forEach((ln) => {
      const line = cleanup(ln);
      if (!line || /^```/.test(line)) return;
      // "Titel" — Bron: waarom / samenvatting
      const m = line.match(/^"([^"]+)"\s+—\s*([^:]+):\s*(.+)$/);
      if (m) {
        const [, title, source, why] = m;
        media.push({
          title: title.trim(),
          source: (source || "").trim(),
          type: inferType(why, title, source),
          summary: (why || "").trim() || undefined,
          url: ddgUrl(title, source)
        });
      }
    });
  }
  return { news, media };
}

function mergeUnique(a = [], b = [], key = "title") {
  const map = new Map();
  [...(a || []), ...(b || [])].forEach((it) => {
    if (!it) return;
    const k = (it[key] || "").toLowerCase();
    if (!k) return;
    if (!map.has(k)) map.set(k, it);
  });
  return Array.from(map.values());
}

/** ---------- Fetch helpers ---------- */
async function fetchBookHits(words, version, searchMode) {
  if (!words?.length) return [];
  const url = `${API}/stats/hitsByBook?version=${encodeURIComponent(version)}&mode=${encodeURIComponent(searchMode)}&words=${encodeURIComponent(words.join(","))}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.data)) return [];
    return data.data
      .filter(r => r.book && r.hits)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 8)
      .map(r => `${r.book} (${r.hits})`);
  } catch { return []; }
}

function getDownloadFilename(res, fallback) {
  const cd = res.headers.get("content-disposition") || "";
  const star = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (star) { try { return decodeURIComponent(star[1]); } catch {} }
  const normal = cd.match(/filename="?(.*?)"?(\s*;|$)/i);
  return normal?.[1] || fallback;
}

export default function Favorites() {
  const {
    generalNotes,
    favTexts, removeFavText, updateFavTextNote,
    favCharts, removeFavChart, updateFavChartNote,
    aiResults, addAiResult, removeAiResult,
    version, searchMode
  } = useApp();

  const [mode, setMode] = useState("bijbelstudie");
  const [extra, setExtra] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [live, setLive] = useState({ running: false, text: "", error: "" });
  const [busyExport, setBusyExport] = useState(false);

  async function exportAll(fmt) {
    try {
      setBusyExport(true);
      const RAW_BASE = (API_BASE || "/api").replace(/\/+$/, "");
      const EXP_API = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;
      const url = `${EXP_API}/export/${fmt}`;
      const payload = {
        generalNotes,
        favoritesTexts: favTexts,
        favoritesCharts: favCharts,
        aiResults,
        version,
        searchMode,
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Export mislukt (${res.status})`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const fallbackName = fmt === "pdf" ? "Bijbelzoek.nl_Export.pdf" : "Bijbelzoek.nl_Export.docx";
      a.download = getDownloadFilename(res, fallbackName);
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert(e.message || "Export mislukt");
    } finally {
      setBusyExport(false);
    }
  }

  async function buildContext() {
    const parts = [];
    let wordsSet = new Set();

    if (generalNotes?.trim()) parts.push(`# Algemene notities\n${generalNotes.trim()}`);

    if (favTexts?.length) {
      parts.push("# ⭐ Favoriete teksten");
      favTexts.slice(0, 30).forEach((t) => {
        parts.push(`**${t.ref || ""}**\n${t.text || ""}` + (t.note ? `\n_notitie:_ ${t.note}` : ""));
      });
    }

    if (favCharts?.length) {
      parts.push("# 📊 Grafieken");
      favCharts.slice(0, 10).forEach((c) => {
        const words = (c.words || []).filter(Boolean);
        words.forEach((w) => wordsSet.add(w));
        parts.push(`- ${c.title || words.join(", ")}`);
      });
    }

    const wordsArr = Array.from(wordsSet);
    if (wordsArr.length) {
      parts.push("## Totaal verzamelde zoekwoorden");
      parts.push(wordsArr.join(", "));
    }

    const topBooks = await fetchBookHits(wordsArr, version, searchMode);
    if (topBooks?.length) {
      parts.push("## Topboeken (meeste treffers)");
      topBooks.forEach((b) => parts.push(`- ${b}`));
    }

    parts.push("## Metadata");
    parts.push(`Bijbelversie: ${version}`);
    parts.push(`Zoekmodus: ${searchMode}`);

    return parts.join("\n\n");
  }

  async function generateStream() {
    setAiError("");
    const context = await buildContext();
    setLive({ running: true, text: "", error: "" });
    setAiBusy(true);

    try {
      let url = `${API}/compose/stream`;
      let res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, extra: extra.trim(), context }),
      });
      if (res.status === 404) {
        url = `${API}/ai/compose/stream`;
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, extra: extra.trim(), context }),
        });
      }
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
            if (delta) { acc += delta; setLive((s) => ({ ...s, text: acc })); }
          } catch {
            const unquoted = line.replace(/^\"+|\"+$/g, "");
            if (unquoted && unquoted !== "[DONE]") { acc += unquoted; setLive((s) => ({ ...s, text: acc })); }
          }
        }
      }

      // 1) JSON (indien aanwezig)
      let structured = safeJsonParse(acc);

      // 2) Als het om Actueel & Media gaat: harvest extra uit proza en merge
      if (mode === "actueelmedia") {
        const harvested = harvestActueelMediaFromProse(acc);
        if (!structured) {
          structured = {
            type: "actueelmedia",
            title: "Actueel & Media",
            summary: "",
            news: harvested.news,
            media: harvested.media
          };
        } else {
          structured.news = mergeUnique(structured.news, harvested.news, "title");
          structured.media = mergeUnique(structured.media, harvested.media, "title");
        }
      }

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

  const hasAnyFav = (favTexts?.length || 0) > 0 || (favCharts?.length || 0) > 0;

  return (
    <section className="max-w-6xl mx-auto p-3 sm:p-4 space-y-6">
      <div className="sticky top-0 z-20 -mx-3 sm:-mx-4">
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg sm:text-xl font-semibold m-0">Verrijk, AI &amp; Export</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              disabled={busyExport}
              onClick={() => exportAll("pdf")}
              className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700 disabled:opacity-60 transition"
              title="Exporteer alle favorieten (PDF)"
            >
              Export PDF
            </button>
            <button
              disabled={busyExport}
              onClick={() => exportAll("docx")}
              className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700 disabled:opacity-60 transition"
              title="Exporteer alle favorieten (DOCX)"
            >
              Export DOCX
            </button>
            <span className="hidden md:inline-block w-px h-5 bg-gray-300 mx-1" aria-hidden="true" />
            <BeginOpnieuwButton
              label="Begin opnieuw"
              className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md border border-gray-400 bg-gray-300 text-gray-900 hover:bg-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {!hasAnyFav ? (
        <div className="max-w-3xl">
          <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
            Je hebt nog geen teksten en/of grafieken geselecteerd. Maak eerst relevante items favoriet.
          </div>
          <div className="mt-3">
            <Link to="/" className="text-blue-600 hover:underline">» Ga naar Zoeken</Link>
          </div>
        </div>
      ) : (
        <>
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

            {(live.running || live.text) && (
              <div className="mt-4 bg-white dark:bg-gray-900 p-4 rounded-lg shadow border">
                <h4 className="text-indigo-700 font-semibold mb-2">📝 AI (live)</h4>
                {live.error ? (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{live.error}</div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <AiPretty text={live.text || "…"} />
                  </div>
                )}
              </div>
            )}
          </div>

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
                    {r.structured ? <AiResultCard result={r.structured} /> : <AiPretty text={r.text} />}
                  </article>
                ))}
              </div>
            )}
          </div>

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
        </>
      )}
    </section>
  );
}
