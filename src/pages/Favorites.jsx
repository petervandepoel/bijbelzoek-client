// client/src/pages/Favorites.jsx
import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import WordFrequencyChart from "../components/WordFrequencyChart";
import AiResultCard from "../components/AiResultCard";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "";

/* Helpers */
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
  try { return await fetch(input, { ...(init || {}), signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

function safeJsonParse(maybe) {
  if (!maybe) return null;
  let txt = String(maybe).trim();
  const fence = txt.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) txt = fence[1];
  const s = txt.indexOf("{"), e = txt.lastIndexOf("}");
  if (s !== -1 && e !== -1 && e > s) txt = txt.slice(s, e + 1);
  try { return JSON.parse(txt); } catch { return null; }
}

/* Fallback renderer */
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
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*-\s+/, "")); i++; }
      i--; blocks.push({ t: "ul", v: items });
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

/* Main */
export default function Favorites() {
  const {
    generalNotes,
    favTexts, removeFavText, updateFavTextNote,
    favCharts, removeFavChart, updateFavChartNote,
    version, searchMode,
    aiResults, addAiResult, removeAiResult, setAiResults,
  } = useApp();

  /* ── zoekwoorden bewaren voor de zoekbalk ── */
  useEffect(() => {
    const all = (favCharts || []).flatMap((c) => c.words || []);
    const words = Array.from(new Set(all.filter(Boolean)));
    localStorage.setItem("bz.searchWords", words.join(","));
  }, [favCharts]);

  /* ── state ── */
  const [mode, setMode] = useState("bijbelstudie");
  const [extra, setExtra] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");

  // Live stream state
  const [live, setLive] = useState({
    running: false,
    text: "",
    error: "",
    preview: null, // { textsCount, chartsCount, wordsCount, topBooks[], notesSummary }
  });

  // Actueel + Media (gecombineerd blok)
  const [am, setAM] = useState({ loading: false, error: "", news: [], media: [] });

  /* ── boek-hits ── */
  async function fetchBookHits(words) {
    const uniq = Array.from(new Set((words || []).filter(Boolean)));
    if (!uniq.length) return null;
    try {
      const url = HITS_ENDPOINT({ version, mode: searchMode, words: uniq });
      const res = await fetchWithTimeout(url, { method: "GET" });
      if (!res.ok) return null;
      const data = await res.json();
      const arr = Array.isArray(data?.data) ? data.data : [];
      const out = {};
      for (const row of arr) if (row?.book) out[row.book] = Number(row?.hits || 0);
      return out;
    } catch { return null; }
  }

  /* ── context + preview ── */
  async function buildContextAndPreview() {
    const parts = [];
    let textsCount = 0;
    let chartsCount = 0;
    let wordsSet = new Set();

    if (generalNotes?.trim()) parts.push(`# Algemene notities\n${generalNotes.trim()}`);

    if (favTexts?.length) {
      textsCount = favTexts.length;
      parts.push("# ⭐ Favoriete teksten");
      favTexts.slice(0, 30).forEach((t) => {
        const note = t.note ? `\n_notitie:_ ${t.note}` : "";
        parts.push(`**${t.ref || ""}**\n${t.text || ""}${note}`);
      });
    }

    if (favCharts?.length) {
      chartsCount = favCharts.length;
      parts.push("# 📊 Grafiek-woorden (keywords)");
      favCharts.slice(0, 10).forEach((c) => {
        const words = (c.words || []).filter(Boolean);
        words.forEach((w) => wordsSet.add(w));
        parts.push(`- ${c.title || words.join(", ")}`);
      });
    }

    const wordsArr = Array.from(wordsSet);
    const hits = await fetchBookHits(wordsArr);
    let topBooks = [];
    if (hits && Object.keys(hits).length) {
      topBooks = Object.entries(hits)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([book, cnt]) => `${book} (${cnt})`);
      parts.push("## Boek-hits\n" + topBooks.map((x) => `- ${x}`).join("\n"));
    }

    const notesSummary = generalNotes?.trim()?.slice(0, 140) || "";

    return {
      context: parts.filter(Boolean).join("\n\n"),
      preview: {
        textsCount, chartsCount, wordsCount: wordsArr.length, topBooks, notesSummary,
      }
    };
  }

  /* ── streaming generate ── */
  async function generateStream() {
    setAiError("");
    const { context, preview } = await buildContextAndPreview();

    setLive({ running: true, text: "", error: "", preview });
    setAiBusy(true);

    try {
      const res = await fetch(`${API_BASE}/api/ai/compose/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, extra: extra.trim(), context, format: "prose" }),
      });
      if (!res.ok || !res.body) {
        throw new Error(res.status === 401 ? "AI-sleutel ontbreekt of ongeldig (401)" : `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

      const pump = async () => {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const packet = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 2);
            if (!packet) continue;
            // accept `data: ...` or raw
            const line = packet.startsWith("data:") ? packet.slice(5).trim() : packet;
            if (!line || line === "[DONE]") continue;

            try {
              const j = JSON.parse(line);
              // chunk could be "text", or { delta }, or { content }
              const delta =
                typeof j === "string" ? j :
                j.delta ?? j.content ?? j.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                acc += delta;
                setLive((s) => ({ ...s, text: acc }));
              }
            } catch {
              // maybe it was plain quoted text without JSON
              const unquoted = line.replace(/^"+|"+$/g, "");
              if (unquoted && unquoted !== "[DONE]") {
                acc += unquoted;
                setLive((s) => ({ ...s, text: acc }));
              }
            }
          }
        }
      };

      await pump();

// Streaming done: fetch the structured JSON (non-stream) so we can render it mooi
let structured = null;
try {
  const res2 = await fetch(`${API_BASE}/api/ai/compose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, extra: extra.trim(), context }),
  });
  if (res2.ok) {
    const json = await res2.json();
    structured = json?.structured || safeJsonParse(json);
  }
} catch (_) { /* ignore, fallback to prose */ }

const label =
  mode === "bijbelstudie" ? "Bijbelstudie" :
  mode === "preek"        ? "Preek"        :
  mode === "liederen"     ? "Liederen"     :
  "Actueel & Media";

if (structured && typeof structured === "object") {
  addAiResult({
    id: newId(),
    kind: mode,
    title: `${label} — gegenereerde opzet`,
    structured,
    createdAt: new Date().toISOString(),
  });
  // clear live block after success
  setLive({ running: false, text: "", error: "", preview: null });
} else {
  // keep the streamed text (prose) as a fallback result
  addAiResult({
    id: newId(),
    kind: mode,
    title: `${label} — (stream, proza)`,
    text: acc,
    createdAt: new Date().toISOString(),
  });
  setLive({ running: false, text: "", error: "", preview: null });
}eam, ongestructureerd)`,
          text: acc,
          createdAt: new Date().toISOString(),
        });
        setLive({ running: false, text: "", error: "", preview: null });
      }
    } catch (e) {
      setLive((s) => ({ ...s, running: false, error: e.message || "AI-stream-fout" }));
      setAiError(e.message || "AI-stream-fout");
    } finally {
      setAiBusy(false);
    }
  }

  /* ── Actueel + Media samen ── */
  async function fetchActueelEnMedia() {
    const theme =
      (extra && extra.trim()) ||
      (favCharts?.[0]?.title || (favCharts?.[0]?.words || []).join(", ")) ||
      "Bijbelstudie";

    const keywords = Array.from(
      new Set((favCharts || []).flatMap((c) => c.words || []).filter(Boolean))
    ).slice(0, 10);

    setAM({ loading: true, error: "", news: [], media: [] });
    try {
      const [newsRes, mediaRes] = await Promise.all([
        fetch(`${API_BASE}/api/ai/actueel`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme, keywords }),
        }),
        fetch(`${API_BASE}/api/ai/media`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme, keywords }),
        }),
      ]);
      if (!newsRes.ok) throw new Error(`Actueel HTTP ${newsRes.status}`);
      if (!mediaRes.ok) throw new Error(`Media HTTP ${mediaRes.status}`);

      const news = await newsRes.json();
      const media = await mediaRes.json();
      setAM({ loading: false, error: "", news: news?.links || [], media: media?.media || [] });
    } catch (e) {
      setAM({ loading: false, error: e.message || "Kon actueel/media niet laden.", news: [], media: [] });
    }
  }

  /* ── UI ── */
  return (
    <section className="max-w-6xl mx-auto p-3 sm:p-4 space-y-6">
      {/* ====== Genereer opzet ====== */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-3">🧠 Genereer opzet</h2>

        <div className="grid sm:grid-cols-4 gap-3 mb-3">
          {[
            { id: "bijbelstudie", title: "Bijbelstudie", desc: "Indeling, gedeelten, vragen, toepassing." },
            { id: "preek",        title: "Preek",        desc: "Hoofdlijnen, Christus centraal, achtergrond." },
            { id: "liederen",     title: "Liederen",     desc: "Psalmen • Opwekking • Op Toonhoogte." },
                      { id: "actueelmedia", title: "Actueel & Media", desc: "Recente artikelen • video • beelden." },
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

        {/* Context preview */}
        {live.preview ? (
          <div className="rounded-lg border p-3 bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 mb-3">
            <div className="text-sm font-semibold mb-1">Context (wat ik zie en ga doorgeven aan de AI)</div>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li>{live.preview.textsCount} favoriete teksten</li>
              <li>{live.preview.chartsCount} grafieken met {live.preview.wordsCount} unieke zoekwoorden</li>
              {live.preview.topBooks?.length ? (
                <li>Top boeken (op basis van hits): {live.preview.topBooks.join(", ")}</li>
              ) : null}
              {live.preview.notesSummary ? <li>Samenvatting notities: “{live.preview.notesSummary}…”</li> : null}
            </ul>
          </div>
        ) : null}

        <textarea
          className="w-full p-2 rounded border dark:bg-gray-900 dark:border-gray-700"
          rows={2}
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="Extra instructies (optioneel): doelgroep, toon, accenten…"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            disabled={aiBusy}
            onClick={generateStream}
            className={"px-3 py-1.5 rounded text-sm " + (aiBusy ? "bg-gray-300" : "bg-indigo-600 text-white hover:bg-indigo-700")}
          >
            Genereer (stream)
          </button>
          {aiBusy && <span className="text-sm text-gray-600 dark:text-gray-300">⏳ Bezig…</span>}
          {aiError && <span className="text-sm text-amber-600">{aiError}</span>}

          <button
            onClick={fetchActueelEnMedia}
            className="ml-auto px-3 py-1.5 rounded text-sm border bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Actueel & Media zoeken
          </button>
        </div>

        {/* Gecombineerd Actueel + Media blok */}
        <div className="mt-4 rounded-lg border p-3 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-semibold">Actueel & Media</div>
            {am.loading ? <div className="text-xs text-gray-500">laden…</div> : null}
          </div>
          {am.error && <div className="text-xs text-red-600 mb-2">{am.error}</div>}
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Nieuws / Artikelen</div>
              <ul className="text-sm space-y-1">
                {am.news.map((lnk, i) => (
                  <li key={i}>
                    <a className="text-indigo-600 hover:underline" href={lnk.url} target="_blank" rel="noreferrer">
                      {lnk.title}
                    </a>
                    <span className="ml-2 text-xs text-gray-500">({lnk.source})</span>
                  </li>
                ))}
                {!am.loading && !am.news.length && !am.error && <li className="text-xs text-gray-500">Nog niets — klik “Actueel & Media zoeken”.</li>}
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Beelden / Kunst / Video</div>
              <ul className="text-sm space-y-1">
                {am.media.map((m, i) => (
                  <li key={i}>
                    <a className="text-indigo-600 hover:underline" href={m.url} target="_blank" rel="noreferrer">
                      {m.title}
                    </a>
                    <span className="ml-2 text-xs text-gray-500">({m.source}, {m.type})</span>
                  </li>
                ))}
                {!am.loading && !am.media.length && !am.error && <li className="text-xs text-gray-500">Nog niets — klik “Actueel & Media zoeken”.</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* Live streaming output (ruwe tekst totdat JSON compleet is) */}
        {live.running || live.text ? (
          <div className="mt-4 rounded-lg border p-3 bg-indigo-50/40 dark:bg-indigo-900/20 border-indigo-200/60 dark:border-indigo-700">
            <div className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-2">AI (live)</div>
            {live.error ? (
              <div className="text-sm text-red-600">{live.error}</div>
            ) : (
              <AiPretty text={live.text || "…"} />
            )}
          </div>
        ) : null}
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
                {r.structured ? <AiResultCard result={r} /> : <AiPretty text={r.text} />}
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
