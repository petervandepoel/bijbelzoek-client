// client/src/pages/Favorites.jsx
import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import html2canvas from "html2canvas";

import { useApp } from "../context/AppContext";
import WordFrequencyChart from "../components/WordFrequencyChart";
import AiResultCard from "../components/AiResultCard";
import AiPretty from "../components/AiPretty";
import BeginOpnieuwButton from "../components/BeginOpnieuwButton";

// ---- API base ----
const API_BASE = import.meta.env.VITE_API_BASE || "";
const API = (API_BASE || "/api").replace(/\/+$/, "");

// ---- Helpers ----
const newId = () => Math.random().toString(36).slice(2, 10);

function getDownloadFilename(res, fallback) {
  const cd = res.headers.get("content-disposition") || "";
  const star = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (star) {
    try {
      return decodeURIComponent(star[1]);
    } catch {}
  }
  const normal = cd.match(/filename="?(.*?)"?(\s*;|$)/i);
  return normal?.[1] || fallback;
}

// ---------- STREAM HELPERS (AI) ----------
function safeJsonParse(maybe) {
  if (!maybe) return null;
  let txt = String(maybe).trim();
  const fence = txt.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) txt = fence[1];
  const s = txt.indexOf("{"),
    e = txt.lastIndexOf("}");
  if (s !== -1 && e !== -1 && e > s) txt = txt.slice(s, e + 1);
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}
function stripTrailingJsonBlock(text) {
  if (!text) return text;
  let t = String(text);
  const fences = [...t.matchAll(/```(?:json)?[\s\S]*?```/gi)];
  if (fences.length) {
    const last = fences[fences.length - 1];
    const before = t.slice(0, last.index).trimEnd();
    const after = t.slice(last.index + last[0].length).trim();
    if (!after) return before;
  }
  const sIdx = t.lastIndexOf("{");
  const eIdx = t.lastIndexOf("}");
  if (sIdx !== -1 && eIdx !== -1 && eIdx > sIdx && t.length - eIdx < 100) {
    return t.slice(0, sIdx).trimEnd();
  }
  return t;
}
function injectSummaryUnderContext(prose, summary) {
  if (!summary || !prose) return prose;
  const lines = String(prose).replaceAll("\r\n", "\n").split("\n");
  const headerRe = /^##\s*.*contextanalyse.*$/i;
  let idx = lines.findIndex((l) => headerRe.test(l));
  if (idx === -1) idx = lines.findIndex((l) => /^##\s*introductie\s*$/i.test(l));
  const summaryBlock = `\n**Samenvatting:** ${summary}\n`;
  if (idx !== -1) {
    const insertAt = lines[idx + 1]?.trim() === "" ? idx + 2 : idx + 1;
    lines.splice(insertAt, 0, summaryBlock.trim());
    return lines.join("\n");
  }
  return `## Contextanalyse / Introductie\n${summaryBlock.trim()}\n\n` + lines.join("\n");
}

// ---------- ACTUEEL/MEDIA HELPERS ----------
const SOURCE_DOMAINS = {
  CIP: "cip.nl",
  EO: "eo.nl",
  "EO/BEAM": "eo.nl",
  "Reformatorisch Dagblad": "rd.nl",
  ND: "nd.nl",
  "NU.nl": "nu.nl",
  "NPO Radio 1": "nporadio1.nl",
  YouTube: "youtube.com",
  NOS: "nos.nl",
  Trouw: "trouw.nl",
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
function sectionize(text) {
  const lines = (text || "").replace(/\r/g, "").split(/\n/);
  const out = { news: [], media: [] };
  let section = null;
  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const isHeader = /^(#{0,6}\s*)?(Nieuws|Media)\s*:?\s*$/i.test(line);
    if (isHeader) {
      section = /Nieuws/i.test(line) ? "news" : "media";
      continue;
    }
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
function parseNewsLine(line) {
  const L = normalizeQuotes(line);
  const D = dashPattern();
  let re = new RegExp(`^"([^"]+)"${D}([^:(]+?)(?:\\s*\\(([^)]+)\\))?:\\s*(.+)$`);
  let m = L.match(re);
  if (m) {
    const [, title, source, date, summary] = m;
    return {
      title: title.trim(),
      source: (source || "").trim(),
      date: (date || "").trim() || undefined,
      summary: (summary || "").trim() || undefined,
      url: ddgUrl(title, source),
    };
  }
  re = new RegExp(`^"([^"]+)"${D}([^:]+):\\s*(.+)$`);
  m = L.match(re);
  if (m) {
    const [, title, source, summary] = m;
    return {
      title: title.trim(),
      source: (source || "").trim(),
      summary: (summary || "").trim() || undefined,
      url: ddgUrl(title, source),
    };
  }
  re = new RegExp(`^(.+?)${D}([^:(]+?)(?:\\s*\\(([^)]+)\\))?:\\s*(.+)$`);
  m = L.match(re);
  if (m) {
    const [, title, source, date, summary] = m;
    return {
      title: title.trim(),
      source: (source || "").trim(),
      date: (date || "").trim() || undefined,
      summary: (summary || "").trim() || undefined,
      url: ddgUrl(title, source),
    };
  }
  re = new RegExp(`^(.+?)${D}([^:]+):\\s*(.+)$`);
  m = L.match(re);
  if (m) {
    const [, title, source, summary] = m;
    return {
      title: title.trim(),
      source: (source || "").trim(),
      summary: (summary || "").trim() || undefined,
      url: ddgUrl(title, source),
    };
  }
  return null;
}
function parseMediaLine(line) {
  const L = normalizeQuotes(line);
  const D = dashPattern();
  let re = new RegExp(
    `^"([^"]+)"${D}([^:\\[\\(]+?)(?:\\s*\\[([^\\]]+)\\])?(?:\\s*\\(([^\\)]+)\\))?:\\s*(.+)$`
  );
  let m = L.match(re);
  if (m) {
    const [, title, sourceA, typ, sourceB, why] = m;
    const source = (sourceB || sourceA || "").trim();
    const type = (typ || "").trim() || inferType(why, title, source);
    return {
      title: title.trim(),
      source,
      type,
      summary: (why || "").trim() || undefined,
      url: ddgUrl(title, source),
    };
  }
  re = new RegExp(`^(.+?)${D}([^:]+):\\s*(.+)$`);
  m = L.match(re);
  if (m) {
    const [, title, source, why] = m;
    return {
      title: title.trim(),
      source: (source || "").trim(),
      type: inferType(why, title, source),
      summary: (why || "").trim() || undefined,
      url: ddgUrl(title, source),
    };
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
function mergeUnique(
  a = [],
  b = [],
  keyFn = (x) => `${(x.title || "").toLowerCase()}__${(x.source || "").toLowerCase()}`
) {
  const map = new Map();
  [...(a || []), ...(b || [])].forEach((it) => {
    if (!it) return;
    const k = keyFn(it);
    if (!k) return;
    if (!map.has(k)) map.set(k, it);
  });
  return Array.from(map.values());
}

// ---------- CAPTURE HELPERS (cruciaal) ----------

// Wacht tot surface rendert (canvas/svg) en fonts klaar zijn
async function waitForStableLayout(el, frames = 2) {
  for (let i = 0; i < frames; i++) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 16)));
  }
  if (document?.fonts?.ready) {
    // eslint-disable-next-line no-await-in-loop
    await document.fonts.ready.catch(() => {});
  }
}

// Zoek de JUISTE container: de hoogste DIV die “Woordfrequentie per boek” bevat
// én binnenin de echte chart (.recharts-wrapper/svg/canvas) heeft.
function findExportBlock(rootEl) {
  if (!rootEl) return null;
  const all = Array.from(
    rootEl.querySelectorAll("div,section,article,main,aside,header,footer")
  );
  const re = /Woordfrequentie\s*per\s*boek/i;
  // Vind de hoogste kandidaat binnen rootEl
  const candidates = all.filter((el) => re.test(el.textContent || ""));
  for (const el of candidates) {
    if (el.querySelector(".recharts-wrapper, svg, canvas")) return el;
  }
  return null;
}

// Inline computed styles in SVG zodat tekst/kleuren blijven staan
function inlineComputedStyles(svgEl) {
  const walker = document.createTreeWalker(svgEl, NodeFilter.SHOW_ELEMENT, null);
  while (walker.nextNode()) {
    const el = walker.currentNode;
    const cs = window.getComputedStyle(el);
    const keys = [
      "fill",
      "stroke",
      "stroke-width",
      "stroke-linecap",
      "stroke-linejoin",
      "color",
      "opacity",
      "font",
      "font-family",
      "font-size",
      "font-weight",
      "font-style",
      "text-anchor",
      "letter-spacing",
      "word-spacing",
      "dominant-baseline",
      "paint-order",
      "shape-rendering",
    ];
    const style = keys
      .map((k) => {
        const v = cs.getPropertyValue(k);
        return v ? `${k}:${v}` : "";
      })
      .filter(Boolean)
      .join(";");
    if (style) el.setAttribute("style", style);
  }
  return svgEl;
}

function canvasSnap(canvas) {
  const r = canvas.getBoundingClientRect?.() || {};
  const w = canvas.width || Math.ceil(r.width || 800);
  const h = canvas.height || Math.ceil(r.height || 400);
  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: w,
    height: h,
    src: "canvas",
  };
}

async function svgToPng(svgNode, scale = 2) {
  const rect = svgNode.getBoundingClientRect();
  const cloned = svgNode.cloneNode(true);
  inlineComputedStyles(cloned);

  if (!cloned.getAttribute("xmlns"))
    cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (!cloned.getAttribute("xmlns:xlink"))
    cloned.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  const hasVB = !!cloned.getAttribute("viewBox");
  const w = Math.ceil(
    hasVB
      ? cloned.viewBox.baseVal?.width || rect.width || 800
      : rect.width || 800
  );
  const h = Math.ceil(
    hasVB
      ? cloned.viewBox.baseVal?.height || rect.height || 400
      : rect.height || 400
  );
  if (!cloned.getAttribute("width")) cloned.setAttribute("width", `${w}`);
  if (!cloned.getAttribute("height")) cloned.setAttribute("height", `${h}`);
  if (!hasVB) cloned.setAttribute("viewBox", `0 0 ${w} ${h}`);

  const xml = new XMLSerializer().serializeToString(cloned);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = new Image();
    const loaded = new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    img.src = url;
    await loaded;

    const cnv = document.createElement("canvas");
    cnv.width = Math.max(1, w * scale);
    cnv.height = Math.max(1, h * scale);
    const ctx = cnv.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cnv.width, cnv.height);
    ctx.drawImage(img, 0, 0, cnv.width, cnv.height);
    return {
      dataUrl: cnv.toDataURL("image/png"),
      width: cnv.width,
      height: cnv.height,
      src: "svg",
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function domSnap(el) {
  const r = el.getBoundingClientRect();
  const scale = window.devicePixelRatio > 1 ? 2 : 2;
  const canvas = await html2canvas(el, {
    backgroundColor: "#ffffff",
    scale,
    useCORS: true,
    width: Math.ceil(r.width),
    height: Math.ceil(r.height),
    logging: false,
    onclone: (doc) => {
      // zorg dat overflow geen labels/ticks wegknipt
      const w = doc.querySelector(`[data-chart-id="${el.dataset.chartId}"]`);
      if (w) w.style.overflow = "visible";
      const rw = w?.querySelector?.(".recharts-wrapper");
      if (rw) rw.style.overflow = "visible";
    },
  });
  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width || Math.ceil(r.width) || 800,
    height: canvas.height || Math.ceil(r.height) || 400,
    src: "html2canvas",
  };
}

// **DE** capture-functie: snap van de DIV met "Woordfrequentie per boek"
async function captureChartElement(rootEl) {
  if (!rootEl) return null;
  await waitForStableLayout(rootEl, 3);

  // Pak de hoogste container met "Woordfrequentie per boek"
  const exportBlock = findExportBlock(rootEl) || rootEl;

  // (1) DOM-snapshot eerst → pakt legend/labels in kleur mee
  try {
    const snap = await domSnap(exportBlock);
    if (snap?.dataUrl) return snap;
  } catch {}

  // (2) Fallback: surface binnen de exportBlock (canvas/svg)
async function waitForChartSurface(root, timeoutMs = 1500) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const canvas = root.querySelector("canvas");
    if (canvas && (canvas.width || canvas.getBoundingClientRect().width) > 100) {
      return canvas;
    }
    const svg = root.querySelector(".recharts-wrapper svg, svg");
    if (svg) return svg;

    // één animation frame wachten
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 16)));
  }
  return null;
}

  if (surface?.tagName?.toLowerCase() === "canvas") {
    try { return canvasSnap(surface); } catch {}
  }

  if (surface?.tagName?.toLowerCase() === "svg") {
    try {
      const png = await svgToPng(surface, 2);
      if (png?.dataUrl) return png;
    } catch {}
  }

  // (3) Laatste redmiddel: nogmaals DOM-snapshot
  return domSnap(exportBlock);
}

// ---------- Component ----------
export default function Favorites() {
  const {
    generalNotes,
    favTexts,
    favCharts,
    aiResults,
    version,
    searchMode,
    removeFavText,
    updateFavTextNote,
    removeFavChart,
    updateFavChartNote,
    addAiResult,
    removeAiResult,
  } = useApp();

  const [mode, setMode] = useState("bijbelstudie");
  const [extra, setExtra] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [live, setLive] = useState({ running: false, text: "", error: "" });
  const [busyExport, setBusyExport] = useState(false);
  const [showHelp, setShowHelp] = useState(true);

  // refs per grafiek
  const chartRefs = useRef(new Map());
  const registerChartRef = (key) => (el) => {
    if (!chartRefs.current) chartRefs.current = new Map();
    if (el) {
      el.dataset.chartId = key; // gebruikt in onclone
      chartRefs.current.set(key, el);
    } else {
      chartRefs.current.delete(key);
    }
  };

  useEffect(() => {
    const dismissed = localStorage.getItem("favorites_help_dismissed") === "1";
    if (dismissed) setShowHelp(false);
  }, []);
  function dismissHelp() {
    setShowHelp(false);
    localStorage.setItem("favorites_help_dismissed", "1");
  }

  // ---------- Export ----------
 // ---------- Export ----------
async function exportAll(fmt) {
  try {
    setBusyExport(true);

    const RAW_BASE = (API_BASE || "/api").replace(/\/+$/, "");
    const EXP_API = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;
    const url = `${EXP_API}/export/${fmt}`;

    // Sequentieel capturen per DOM-element (iedere grafiek eigen snapshot!)
    const chartsWithImages = [];
    for (let i = 0; i < (favCharts || []).length; i++) {
      const c = favCharts[i];
      const key = `${c.id}-${i}`;
      const el =
        chartRefs.current?.get(key) ||
        document.querySelector(`[data-chart-id="${key}"]`);

      // wacht 1 frame zodat labels/legend echt staan
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) =>
        requestAnimationFrame(() => setTimeout(r, 16))
      );

      // Dom-snapshot van de volledige container (incl. legend/labels)
      // eslint-disable-next-line no-await-in-loop
      const snap = await captureChartElement(el);

      chartsWithImages.push({
        ...c,
        imageData: snap?.dataUrl || null,
        // gebruik de echte maat → juiste aspect ratio
        docxWidth: Math.max(1, snap?.width || 640),
        docxHeight: Math.max(1, snap?.height || 360),
        _captureSrc: snap?.src || "html2canvas",
      });
    } // <-- deze sluit de for-lus af (ontbrak eerder)

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
      try {
        const j = await res.json();
        if (j?.error) msg += `: ${j.error}`;
      } catch {}
      throw new Error(msg);
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    const fallbackName =
      fmt === "pdf" ? "Bijbelzoek.nl_Export.pdf" : "Bijbelzoek.nl_Export.docx";
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


  // ---------- AI (stream) ----------
  async function buildContext() {
    const parts = [];
    let wordsSet = new Set();

    if (generalNotes?.trim())
      parts.push(`# Algemene notities\n${generalNotes.trim()}`);

    if ((favTexts || []).length) {
      parts.push("# ⭐ Favoriete teksten");
      favTexts.slice(0, 30).forEach((t) => {
        parts.push(
          `**${t.ref || ""}**\n${t.text || ""}` +
            (t.note ? `\n_notitie:_ ${t.note}` : "")
        );
      });
    }

    if ((favCharts || []).length) {
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
            const delta =
              typeof j === "string"
                ? j
                : j.delta ?? j.content ?? j.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              acc += delta;
              setLive((s) => ({ ...s, text: acc }));
            }
          } catch {
            const unquoted = line.replace(/^\"+|\"+$/g, "");
            if (unquoted && unquoted !== "[DONE]") {
              acc += unquoted;
              setLive((s) => ({ ...s, text: acc }));
            }
          }
        }
      }

      let structured = safeJsonParse(acc);
      let summary = structured?.summary || structured?.samenvatting || "";

      let proseOnly = stripTrailingJsonBlock(acc);
      if ((mode === "bijbelstudie" || mode === "preek") && summary) {
        proseOnly = injectSummaryUnderContext(proseOnly, summary);
      }

      if (mode === "actueelmedia") {
        const blocks = harvestActueelMediaFromProse(acc);
        if (!structured) {
          structured = {
            type: "actueelmedia",
            title: "Actueel & Media",
            summary: "",
            news: blocks.news,
            media: blocks.media,
          };
        } else {
          structured.news = mergeUnique(structured.news, blocks.news);
          structured.media = mergeUnique(structured.media, blocks.media);
        }
      }

      const label =
        mode === "bijbelstudie"
          ? "Bijbelstudie"
          : mode === "preek"
          ? "Preek"
          : mode === "liederen"
          ? "Liederen"
          : "Actueel & Media";

      const payload = {
        id: newId(),
        kind: mode,
        title: `${label} — gegenereerde opzet`,
        text: proseOnly,
        summary: summary || undefined,
        createdAt: new Date().toISOString(),
      };
      if (
        (mode === "actueelmedia" || mode === "liederen") &&
        structured &&
        typeof structured === "object" &&
        structured.type
      ) {
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

  const hasAnyFav =
    (favTexts?.length || 0) > 0 || (favCharts?.length || 0) > 0;

  return (
    <section className="max-w-6xl mx-auto p-3 sm:p-4 space-y-6">
      {/* Uitleg */}
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
              <h2 className="text-base sm:text-lg font-semibold text-sky-900 dark:text-sky-100 mb-1">
                Uitleg
              </h2>
               <p className="text-sm text-sky-900/90 dark:text-sky-100/90">
                Op deze pagina vind je al je <strong>Bijbelteksten</strong> en <strong>Grafieken</strong> die je op <em>Zoek</em> hebt samengesteld.
                Voeg in de notitie-blokken onder de teksten en grafieken je eigen inzichten, vragen en opmerkingen toe.
                Gebruik daarna het AI-blok bovenin om op basis van jouw samengestelde input suggesties te krijgen voor
                een <strong>Preek</strong>, <strong>Bijbelstudie</strong>, <strong>Sing-In</strong> of
                <strong> Relevante nieuwsartikelen</strong> Na afloop kun je je resultaten export naar <strong>PDF</strong> of <strong>DOCX</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sticky top bar */}
    {/* Sticky top bar */}
<div className="sticky top-0 z-20 -mx-3 sm:-mx-4">
  <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-2">
    <h1 className="text-lg sm:text-xl font-semibold m-0">Exporteren</h1>
    <div className="flex items-center gap-2 flex-wrap">
      <button
        disabled={busyExport}
        onClick={() => exportAll("pdf")}
        className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700 disabled:opacity-60 transition"
      >
        Export PDF
      </button>
      <button
        disabled={busyExport}
        onClick={() => exportAll("docx")}
        className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700 disabled:opacity-60 transition"
      >
        Export DOCX
      </button>
    </div>
  </div>
</div>

      {!hasAnyFav ? (
        <div className="max-w-3xl">
          <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
            Je hebt nog geen teksten en/of grafieken geselecteerd. Maak eerst items favoriet.
          </div>
          <div className="mt-3">
            <Link to="/zoeken" className="text-blue-600 hover:underline">» Ga naar Zoeken</Link>
          </div>
        </div>
      ) : (
        <>
          {/* AI blok */}
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
                className={
                  "px-3 py-1.5 rounded text-sm " +
                  (aiBusy ? "bg-gray-300" : "bg-indigo-600 text-white hover:bg-indigo-700")
                }
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
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {live.error}
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <AiPretty text={live.text || "…"} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI-resultaten */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">🤖 AI-resultaten</h3>
            {aiResults.length === 0 ? (
              <p className="text-gray-500">
                Nog geen AI-resultaten. (
                <Link to="/" className="text-blue-600 hover:underline">Zoeken »</Link>
                )
              </p>
            ) : (
              <div className="grid gap-4">
                {aiResults.map((r) => {
                  const isProseOnly = r.kind === "bijbelstudie" || r.kind === "preek";
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
                        r.text ? (
                          <AiPretty text={r.text} />
                        ) : (
                          <p className="text-gray-500">Geen inhoud gevonden.</p>
                        )
                      ) : (
                        <>{r.structured ? <AiResultCard result={r.structured} /> : <AiPretty text={r.text} />}</>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Teksten */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">⭐ Teksten</h3>
            {favTexts.length === 0 ? (
              <p className="text-gray-500">
                Nog geen teksten toegevoegd. (
                <Link to="/" className="text-blue-600 hover:underline">Zoeken »</Link>
                )
              </p>
            ) : (
              <div className="grid gap-4">
                {favTexts.map((t) => (
                  <div key={t._id || t.ref} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        {t.ref}
                      </span>
                      <button
                        className="text-red-500 hover:text-red-600"
                        onClick={() => removeFavText(t._id || t.ref)}
                      >
                        Verwijderen
                      </button>
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

          {/* Grafieken */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">📊 Grafieken</h3>
            {favCharts.length === 0 ? (
              <p className="text-gray-500">
                Nog geen grafieken toegevoegd. (
                <Link to="/" className="text-blue-600 hover:underline">Zoeken »</Link>
                )
              </p>
            ) : (
              <div className="grid gap-4">
                {favCharts.map((c, idx) => (
                  <div key={c.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">{c.title}</div>
                        <div className="text-xs text-gray-500">
                          Woorden: {(c.words || []).join(", ")}
                        </div>
                      </div>
                      <button
                        className="text-red-500 hover:text-red-600"
                        onClick={() => removeFavChart(c.id)}
                      >
                        Verwijderen
                      </button>
                    </div>

                    {/* BELANGRIJK: wrapper ALLEEN om het “Woordfrequentie per boek”-blok */}
                    <div
                      data-chart-id={`${c.id}-${idx}`}
                      ref={registerChartRef(`${c.id}-${idx}`)}
                      className="wf-export-scope"
                      style={{ overflow: "visible", position: "relative" }}
                    >
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
