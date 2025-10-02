// client/src/utils/exporter.js
import html2canvas from "html2canvas";

const API_BASE = import.meta.env.VITE_API_BASE || "";
const API = (API_BASE || "/api").replace(/\/+$/, "");

// --- helpers uit Favorites.jsx (licht ingekort & generiek gemaakt) ---
function getDownloadFilename(res, fallback) {
  const cd = res.headers.get("content-disposition") || "";
  const star = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (star) {
    try { return decodeURIComponent(star[1]); } catch {}
  }
  const normal = cd.match(/filename="?(.*?)"?(\s*;|$)/i);
  return normal?.[1] || fallback;
}

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

function findExportBlock(rootEl) {
  if (!rootEl) return null;
  const all = Array.from(rootEl.querySelectorAll("div,section,article,main,aside,header,footer"));
  const re = /Woordfrequentie\s*per\s*boek/i;
  const candidates = all.filter((el) => re.test(el.textContent || ""));
  for (const el of candidates) {
    if (el.querySelector(".recharts-wrapper, svg, canvas")) return el;
  }
  return null;
}

function inlineComputedStyles(svgEl) {
  const walker = document.createTreeWalker(svgEl, NodeFilter.SHOW_ELEMENT, null);
  while (walker.nextNode()) {
    const el = walker.currentNode;
    const cs = window.getComputedStyle(el);
    const keys = [
      "fill","stroke","stroke-width","stroke-linecap","stroke-linejoin","color","opacity",
      "font","font-family","font-size","font-weight","font-style","text-anchor","letter-spacing",
      "word-spacing","dominant-baseline","paint-order","shape-rendering"
    ];
    const style = keys.map((k) => {
      const v = cs.getPropertyValue(k);
      return v ? `${k}:${v}` : "";
    }).filter(Boolean).join(";");
    if (style) el.setAttribute("style", style);
  }
  return svgEl;
}

function canvasSnap(canvas) {
  const r = canvas.getBoundingClientRect?.() || {};
  const w = canvas.width || Math.ceil(r.width || 800);
  const h = canvas.height || Math.ceil(r.height || 400);
  return { dataUrl: canvas.toDataURL("image/png"), width: w, height: h, src: "canvas" };
}

async function svgToPng(svgNode, scale = 2) {
  const rect = svgNode.getBoundingClientRect();
  const cloned = svgNode.cloneNode(true);
  inlineComputedStyles(cloned);
  if (!cloned.getAttribute("xmlns")) cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (!cloned.getAttribute("xmlns:xlink")) cloned.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  const hasVB = !!cloned.getAttribute("viewBox");
  const w = Math.ceil(hasVB ? cloned.viewBox.baseVal?.width || rect.width || 800 : rect.width || 800);
  const h = Math.ceil(hasVB ? cloned.viewBox.baseVal?.height || rect.height || 400 : rect.height || 400);
  if (!cloned.getAttribute("width")) cloned.setAttribute("width", `${w}`);
  if (!cloned.getAttribute("height")) cloned.setAttribute("height", `${h}`);
  if (!hasVB) cloned.setAttribute("viewBox", `0 0 ${w} ${h}`);

  const xml = new XMLSerializer().serializeToString(cloned);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    const loaded = new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
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
    return { dataUrl: cnv.toDataURL("image/png"), width: cnv.width, height: cnv.height, src: "svg" };
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

async function captureChartElement(rootEl) {
  if (!rootEl) return null;
  await waitForStableLayout(rootEl, 3);
  const exportBlock = findExportBlock(rootEl) || rootEl;

  try {
    const snap = await domSnap(exportBlock);
    if (snap?.dataUrl) return snap;
  } catch {}

  // try surface
  const t0 = Date.now();
  let surface = null;
  while (Date.now() - t0 < 1500 && !surface) {
    const c = exportBlock.querySelector("canvas");
    if (c && (c.width || c.getBoundingClientRect().width) > 100) surface = c;
    const s = exportBlock.querySelector(".recharts-wrapper svg, svg");
    if (!surface && s) surface = s;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 16)));
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
  return domSnap(exportBlock);
}

// --- hoofd exportfunctie ---
// appState: { generalNotes, favTexts, favCharts, aiResults, version, searchMode }
// root: optioneel root element om grafiek-DOM in te zoeken (default: document)
export async function exportAllFromAnywhere(fmt, appState, root = document) {
  const RAW_BASE = (API_BASE || "/api").replace(/\/+$/, "");
  const EXP_API = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;
  const url = `${EXP_API}/export/${fmt}`;

  // Probeer grafieken uit DOM te capturen (als ze in de pagina staan).
  const chartsWithImages = [];
  const favCharts = appState?.favCharts || [];

  for (let i = 0; i < favCharts.length; i++) {
    const c = favCharts[i];

    // Zoek een element dat Favorites gebruikt (data-chart-id = `${id}-${index}`)
    let el =
      root.querySelector(`[data-chart-id="${c.id}-${i}"]`) ||
      // fallback: enig wf-export-scope element (minder precies, maar beter dan niets)
      root.querySelector(".wf-export-scope");

    let snap = null;
    if (el) {
      // wacht 1 frame zodat labels/legend echt staan
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 16)));
      // eslint-disable-next-line no-await-in-loop
      snap = await captureChartElement(el);
    }

    chartsWithImages.push({
      ...c,
      imageData: snap?.dataUrl || null,
      docxWidth: Math.max(1, snap?.width || 640),
      docxHeight: Math.max(1, snap?.height || 360),
      _captureSrc: snap?.src || (snap ? "html2canvas" : "none"),
    });
  }

  const payload = {
    generalNotes: appState?.generalNotes,
    favoritesTexts: appState?.favTexts || [],
    favoritesCharts: chartsWithImages,
    aiResults: appState?.aiResults || [],
    version: appState?.version,
    searchMode: appState?.searchMode,
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
  const fallbackName = fmt === "pdf" ? "Bijbelzoek.nl_Export.pdf" : "Bijbelzoek.nl_Export.docx";
  a.download = getDownloadFilename(res, fallbackName);
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
}
