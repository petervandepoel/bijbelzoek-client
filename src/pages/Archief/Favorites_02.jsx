import React, { useEffect, useState, useRef } from "react";
import { useApp } from "../context/AppContext";
import WordFrequencyChart from "../components/WordFrequencyChart";
import AiResultCard from "../components/AiResultCard";
import AiPretty from "../components/AiPretty";
import { Link } from "react-router-dom";
import BeginOpnieuwButton from "../components/BeginOpnieuwButton";

const API_BASE = import.meta.env.VITE_API_BASE || "";
const API = (API_BASE || "/api").replace(/\/+$/, "");

const newId = () => Math.random().toString(36).slice(2, 10);

/** Parse JSON at end of a streamed transcript. Supports ```json fences. */
function safeJsonParse(maybe) {
  if (!maybe) return null;
  let txt = String(maybe).trim();
  const fence = txt.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) txt = fence[1];
  const s = txt.indexOf("{"), e = txt.lastIndexOf("}");
  if (s !== -1 && e !== -1 && e > s) txt = txt.slice(s, e + 1);
  try { return JSON.parse(txt); } catch { return null; }
}

/** Remove trailing JSON code block (```json ... ```), or a trailing { ... } JSON chunk. */
function stripTrailingJsonBlock(text) {
  if (!text) return text;
  let t = String(text);

  // Remove last fenced block if present and likely json
  const fences = [...t.matchAll(/```(?:json)?[\s\S]*?```/gi)];
  if (fences.length) {
    const last = fences[fences.length - 1];
    const before = t.slice(0, last.index).trimEnd();
    const after = t.slice(last.index + last[0].length).trim();
    // if nothing meaningful after, assume it's the JSON and strip it
    if (!after) return before;
  }

  // Heuristic: if last '}' is very close to end and we had a '{' before, drop it
  const sIdx = t.lastIndexOf("{");
  const eIdx = t.lastIndexOf("}");
  if (sIdx !== -1 && eIdx !== -1 && eIdx > sIdx && (t.length - eIdx) < 100) {
    return t.slice(0, sIdx).trimEnd();
  }
  return t;
}

/** Insert "**Samenvatting:** <summary>" under the first "## Contextanalyse" header.
 *  If no such header exists, create one at the top. */
function injectSummaryUnderContext(prose, summary) {
  if (!summary || !prose) return prose;
  const lines = String(prose).replaceAll("\r\n", "\n").split("\n");
  const headerRe = /^##\s*.*contextanalyse.*$/i;
  let idx = lines.findIndex(l => headerRe.test(l));
  if (idx === -1) {
    // Try variant "Contextanalyse / Introductie"
    const comboRe = /^##\s*contextanalyse\s*\/\s*introductie\s*$/i;
    idx = lines.findIndex(l => comboRe.test(l));
  }
  if (idx === -1) {
    // Try simple "## Introductie"
    const introRe = /^##\s*introductie\s*$/i;
    idx = lines.findIndex(l => introRe.test(l));
  }
  const summaryBlock = `\n**Samenvatting:** ${summary}\n`;
  if (idx !== -1) {
    // Insert after the header line; skip any immediate blank line once
    const insertAt = (lines[idx + 1] && lines[idx + 1].trim() === "") ? (idx + 2) : (idx + 1);
    lines.splice(insertAt, 0, summaryBlock.trim());
    return lines.join("\n");
  } else {
    return `## Contextanalyse / Introductie\n${summaryBlock.trim()}\n\n` + lines.join("\n");
  }
}

/** ---------- Harvest 'Nieuws' & 'Media' from prose (fallback/merge) ---------- */
const SOURCE_DOMAINS = {
  "CIP": "cip.nl",
  "EO": "eo.nl",
  "EO/BEAM": "eo.nl",
  "Reformatorisch Dagblad": "rd.nl",
  "ND": "nd.nl",
  "NU.nl": "nu.nl",
  "NPO Radio 1": "nporadio1.nl",
  "YouTube": "youtube.com",
  "NOS": "nos.nl",
  "Trouw": "trouw.nl"
};

function normalizeQuotes(s) {
  return (s || "")
    .replace(/[“”„‟]/g, '"')
    .replace(/[’‘‛‹›]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
const dashPattern = () => "\\s*[—–-]\\s*";

function ddgUrl(title, source) {
  const dom = SOURCE_DOMAINS[(source || "").trim()] || "";
  if (dom) return `https://duckduckgo.com/?q=${encodeURIComponent(title)}+site%3A${encodeURIComponent(dom)}`;
  return `https://duckduckgo.com/?q=${encodeURIComponent(title + " " + (source || ""))}`;
}

/** Sectionize tolerant: '# Nieuws', 'Nieuws:' of 'Nieuws' */
function sectionize(text) {
  const lines = (text || "").replace(/\r/g, "").split(/\n/);
  const out = { news: [], media: [] };
  let section = null;
  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const isHeader = /^(#{0,6}\s*)?(Nieuws|Media)\s*:?\s*$/i.test(line);
    if (isHeader) { section = /Nieuws/i.test(line) ? "news" : "media"; continue; }
    if (!section) continue;
    out[section].push(line);
  }
  return out;
}

function inferType(why, title, source) {
  const s = `${why || ""} ${title || ""} ${source || ""}`.toLowerCase();
  if (/\b(podcast|radio)\b/.test(s)) return "audio";
  if (/\b(documentaire|video|lezing|stream|worship|clip)\b/.test(s)) return "video";
  return "link";
}

/** Parse NEWS line → {title, source, date?, summary?, url} */
function parseNewsLine(line) {
  const L = normalizeQuotes(line);
  const D = dashPattern();

  let re = new RegExp(`^"([^"]+)"${D}([^:(]+?)(?:\\s*\\(([^)]+)\\))?:\\s*(.+)$`);
  let m = L.match(re);
  if (m) {
    const [, title, source, date, summary] = m;
    return { title: title.trim(), source: (source||"").trim(), date: (date||"").trim() || undefined, summary: (summary||"").trim() || undefined, url: ddgUrl(title, source) };
  }

  re = new RegExp(`^"([^"]+)"${D}([^:]+):\\s*(.+)$`);
  m = L.match(re);
  if (m) {
    const [, title, source, summary] = m;
    return { title: title.trim(), source: (source||"").trim(), summary: (summary||"").trim() || undefined, url: ddgUrl(title, source) };
  }

  re = new RegExp(`^(.+?)${D}([^:(]+?)(?:\\s*\\(([^)]+)\\))?:\\s*(.+)$`);
  m = L.match(re);
  if (m) {
    const [, title, source, date, summary] = m;
    return { title: title.trim(), source: (source||"").trim(), date: (date||"").trim() || undefined, summary: (summary||"").trim() || undefined, url: ddgUrl(title, source) };
  }

  re = new RegExp(`^(.+?)${D}([^:]+):\\s*(.+)$`);
  m = L.match(re);
  if (m) {
    const [, title, source, summary] = m;
    return { title: title.trim(), source: (source||"").trim(), summary: (summary||"").trim() || undefined, url: ddgUrl(title, source) };
  }
  return null;
}

/** Parse MEDIA line → {title, source, type, summary?, url} */
function parseMediaLine(line) {
  const L = normalizeQuotes(line);
  const D = dashPattern();

  let re = new RegExp(`^"([^"]+)"${D}([^:\\[\\(]+?)(?:\\s*\\[([^\\]]+)\\])?(?:\\s*\\(([^\\)]+)\\))?:\\s*(.+)$`);
  let m = L.match(re);
  if (m) {
    const [, title, sourceA, typ, sourceB, why] = m;
    const source = (sourceB || sourceA || "").trim();
    const type = (typ || "").trim() || inferType(why, title, source);
    return { title: title.trim(), source, type, summary: (why||"").trim() || undefined, url: ddgUrl(title, source) };
  }

  re = new RegExp(`^(.+?)${D}([^:]+):\\s*(.+)$`);
  m = L.match(re);
  if (m) {
    const [, title, source, why] = m;
    return { title: title.trim(), source: (source||"").trim(), type: inferType(why, title, source), summary: (why||"").trim() || undefined, url: ddgUrl(title, source) };
  }

  return null;
}

function harvestActueelMediaFromProse(prose) {
  const blocks = sectionize(prose);
  const cleanup = (line) => line.replace(/^[-•\d\.\)]\s*/, "").trim();

  const news = [];
  (blocks.news || []).forEach((raw) => {
    const line = cleanup(raw);
    if (!line || /^```/.test(line)) return;
    const item = parseNewsLine(line);
    if (item) news.push(item);
  });

  const media = [];
  (blocks.media || []).forEach((raw) => {
    const line = cleanup(raw);
    if (!line || /^```/.test(line)) return;
    const item = parseMediaLine(line);
    if (item) media.push(item);
  });

  return { news, media };
}

function mergeUnique(a = [], b = [], keyFn = (x)=>`${(x.title||'').toLowerCase()}__${(x.source||'').toLowerCase()}`) {
  const map = new Map();
  [...(a || []), ...(b || [])].forEach((it) => {
    if (!it) return;
    const k = keyFn(it);
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
  const [showHelp, setShowHelp] = useState(true);

  /** ---------- Capture helpers (FIX: richt je ref op de grafiek zelf) ---------- */
  const chartRefs = useRef(new Map());
  function registerChartRef(id) {
    return (el) => {
      if (!chartRefs.current) chartRefs.current = new Map();
      if (el) chartRefs.current.set(id, el);
      else chartRefs.current.delete(id);
    };
  }

  // Kies grootste canvas/svg in de wrapper; serialiseer SVG → PNG; canvas -> toDataURL
  function pickBiggestElement(els) {
    if (!els?.length) return null;
    const scored = els.map((el) => {
      const rect = el.getBoundingClientRect?.() || { width: el.width || 0, height: el.height || 0 };
      const w = rect.width || el.width || 0;
      const h = rect.height || el.height || 0;
      return { el, area: (w || 0) * (h || 0), w, h };
    });
    scored.sort((a, b) => b.area - a.area);
    return scored[0]?.el || null;
  }

  async function getChartImageDataAsync(id) {
    const root = chartRefs.current?.get(id);
    if (!root) return null;

    // 1) Grootste canvas binnen de wrapper
    const canvases = Array.from(root.querySelectorAll("canvas"));
    const bestCanvas = pickBiggestElement(canvases);
    if (bestCanvas && (bestCanvas.width || bestCanvas.getBoundingClientRect().width) > 100) {
      try {
        const dataUrl = bestCanvas.toDataURL("image/png");
        const w = bestCanvas.width || Math.ceil(bestCanvas.getBoundingClientRect().width) || 800;
        const h = bestCanvas.height || Math.ceil(bestCanvas.getBoundingClientRect().height) || 400;
        return { dataUrl, width: w, height: h, src: "canvas" };
      } catch {}
    }

    // 2) Grootste SVG binnen de wrapper
    const svgs = Array.from(root.querySelectorAll("svg"));
    const bestSvg = pickBiggestElement(svgs);
    if (bestSvg && (bestSvg.getBoundingClientRect().width || 0) > 100) {
      try {
        const serializer = new XMLSerializer();
        let svgStr = serializer.serializeToString(bestSvg);
        if (!/^<svg[^>]+xmlns=/.test(svgStr)) svgStr = svgStr.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        if (!/xmlns:xlink=/.test(svgStr)) svgStr = svgStr.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
        const vb = bestSvg.viewBox && bestSvg.viewBox.baseVal;
        const rect = bestSvg.getBoundingClientRect();
        const wAttr = bestSvg.width?.baseVal?.value;
        const hAttr = bestSvg.height?.baseVal?.value;
        const w = Math.ceil(vb?.width || wAttr || rect.width || 800);
        const h = Math.ceil(vb?.height || hAttr || rect.height || 400);
        const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        const loaded = new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
        img.src = url; await loaded;
        const cnv = document.createElement("canvas");
        cnv.width = w; cnv.height = h;
        const ctx = cnv.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        const dataUrl = cnv.toDataURL("image/png");
        return { dataUrl, width: w, height: h, src: "svg" };
      } catch {}
    }
    return null;
  }

  useEffect(() => {
    const dismissed = localStorage.getItem("favorites_help_dismissed") === "1";
    if (dismissed) setShowHelp(false);
  }, []);

  function dismissHelp() {
    setShowHelp(false);
    localStorage.setItem("favorites_help_dismissed", "1");
  }

  // --- Export met exacte grafiekbeelden + veilige download ---
  async function exportAll(fmt) {
    try {
      setBusyExport(true);
      const RAW_BASE = (API_BASE || "/api").replace(/\/+$/, "");
      const EXP_API = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;
      const url = `${EXP_API}/export/${fmt}`;

      // Capture alle grafieken (PNG) – exact zoals op scherm
      const chartsWithImages = await Promise.all(
        (favCharts || []).map(async (c) => {
          const snap = await getChartImageDataAsync(c.id);
          return {
            ...c,
            imageData: snap?.dataUrl || null, // data:image/png;base64,...
            docxWidth: 640,
            docxHeight: 360,
            _captureSrc: snap?.src || null,   // optioneel debug
          };
        })
      );

      const payload = {
        generalNotes,
        favoritesTexts: favTexts,
        favoritesCharts: chartsWithImages,
        aiResults,
        version,
        searchMode,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = `Export mislukt (${res.status})`;
        try { const j = await res.json(); if (j?.error) msg += `: ${j.error}`; } catch {}
        throw new Error(msg);
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      const fallbackName = fmt === "pdf" ? "Bijbelzoek.nl_Export.pdf" : "Bijbelzoek.nl_Export.docx";
      a.download = getDownloadFilename(res, fallbackName);
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
    } catch (e) {
      alert(e?.message || "Export mislukt");
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
        const note = c.note ? ` — notitie: ${c.note}` : "";
        parts.push(`- ${c.title || words.join(", ")}${note}`);
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
    const context = await buildContext();
    setAiError("");
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

      // Parse JSON for summary, but do not show JSON in results for preek/bijbelstudie
      let structured = safeJsonParse(acc);
      let summary = structured?.summary || structured?.samenvatting || "";

      // Build display prose: strip JSON and inject summary under Contextanalyse
      let proseOnly = stripTrailingJsonBlock(acc);
      if ((mode === "bijbelstudie" || mode === "preek") && summary) {
        proseOnly = injectSummaryUnderContext(proseOnly, summary);
      }

      // For actueelmedia, still harvest from prose and keep structured for links
      if (mode === "actueelmedia") {
        const blocks = harvestActueelMediaFromProse(acc);
        if (!structured) {
          structured = { type: "actueelmedia", title: "Actueel & Media", summary: "", news: blocks.news, media: blocks.media };
        } else {
          structured.news = mergeUnique(structured.news, blocks.news);
          structured.media = mergeUnique(structured.media, blocks.media);
        }
      }

      // If stream didn't yield valid JSON and mode needs card (actueel/liederen), do a compose fallback
      if ((!structured || !structured.type) && (mode === "actueelmedia" || mode === "liederen")) {
        try {
          let cUrl = `${API}/compose`;
          let cRes = await fetch(cUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode, extra: extra.trim(), context }),
          });
          if (cRes.status === 404) {
            cUrl = `${API}/ai/compose`;
            cRes = await fetch(cUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mode, extra: extra.trim(), context }),
            });
          }
          if (cRes.ok) {
            const j = await cRes.json();
            if (j && j.type) {
              structured = j;
            }
          }
        } catch {}
      }

      const label =
        mode === "bijbelstudie" ? "Bijbelstudie" :
        mode === "preek" ? "Preek" :
        mode === "liederen" ? "Liederen" :
        "Actueel & Media";

      // Store result:
      // - Preek/Bijbelstudie: ONLY prose (with summary injected), no card rendering
      // - Liederen/Actueel: keep existing behavior (store structured for card)
      const payload = {
        id: newId(),
        kind: mode,
        title: `${label} — gegenereerde opzet`,
        text: proseOnly,                // full stream prose WITHOUT trailing JSON
        summary: summary || undefined,  // keep summary for export if needed
        createdAt: new Date().toISOString()
      };
      if ((mode === "actueelmedia" || mode === "liederen") && structured && typeof structured === "object" && structured.type) {
        payload.structured = structured;
      }

      addAiResult(payload);
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
      {/* help / uitleg banner */}
      {showHelp && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 dark:bg-sky-900/30 dark:border-sky-800 p-4 relative shadow-sm">
          <button
            onClick={dismissHelp}
            className="absolute top-2 right-2 text-sky-700 dark:text-sky-200 hover:opacity-80"
            aria-label="Uitleg sluiten"
            title="Sluiten"
          >
            ×
          </button>
          <div className="flex items-start gap-3">
            <div className="text-2xl">📚</div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-sky-900 dark:text-sky-100 mb-1">Uitleg</h2>
              <p className="text-sm text-sky-900/90 dark:text-sky-100/90">
                Op deze pagina vind je al je <strong>Bijbelteksten</strong> en <strong>Grafieken</strong> die je op <em>Zoeken</em> hebt samengesteld.
                Voeg in de notitie-blokken onder de teksten en grafieken je eigen inzichten, vragen en opmerkingen toe.
                Gebruik daarna het AI-blok bovenin om op basis van jouw samengestelde input suggesties te krijgen voor
                een <strong>Preek</strong>, <strong>Bijbelstudie</strong>, <strong>Sing-In</strong> of
                <strong> Relevante nieuwsartikelen</strong> Na afloop kun je je resultaten export naar <strong>PDF</strong> of <strong>DOCX</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

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
                {aiResults.map((r) => {
                  const isProseOnly = (r.kind === "bijbelstudie" || r.kind === "preek");
                  return (
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

                      {isProseOnly ? (
                        r.text ? <AiPretty text={r.text} /> : <p className="text-gray-500">Geen inhoud gevonden.</p>
                      ) : (
                        <>
                          {r.structured ? <AiResultCard result={r.structured} /> : <AiPretty text={r.text} />}
                        </>
                      )}
                    </article>
                  );
                })}
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

                    {/* BELANGRIJK: ref nu op ÉCHTE grafiek-wrapper, zodat geen iconen/SVG's uit de header worden gesnapt */}
                    <div ref={registerChartRef(c.id)}>
                      <WordFrequencyChart
                        queryWords={c.words}
                        version={c.version}
                        onClickDrill={null}
                        onFavChart={null}
                      />
                    </div>

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