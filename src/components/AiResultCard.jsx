// ============================================================================
// AiResultCard.jsx — Rich, section-aware markdown renderer for AI results
// ----------------------------------------------------------------------------
// - Always expanded; no JSON required (stream-friendly)
// - Section-aware styling (Contextanalyse, Handvatten, etc.)
// - Optional image grid + link list panel for Kunst & Lied / Nieuws
// - Shows selected model badge
// - Adds Table of Contents (auto from markdown headers)
// - Actions: Kopieer, Download .md, Download .html, Favoriet (callback)
// - Optional stats panel (per bijbelboek) to align with grafiek/voorkomens
// ============================================================================

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import cx from "classnames";
import {
  BookOpen,
  Mic,
  Palette,
  Newspaper,
  Globe2,
  Loader2,
  Copy,
  Download,
  Star,
  ListTree,
} from "lucide-react";

/**
 * @typedef {{src:string, alt?:string}} Img
 * @typedef {{href:string, label?:string, meta?:string}} LinkMeta
 * @typedef {{[book:string]: number}} StatsMap
 */

/**
 * AiResultCard Props
 * @param {'BIJBELSTUDIE'|'PREEK'|'KUNST_LIED'|'NIEUWS'} block
 * @param {string} content - markdown
 * @param {boolean} isStreaming
 * @param {string} model
 * @param {Img[]} images
 * @param {LinkMeta[]} links
 * @param {StatsMap} stats - optional counts per bijbelboek
 * @param {string} className
 * @param {(payload:any)=>void} onAddFavorite - optional callback
 * @param {string} title - optional custom title
 */
export function AiResultCard({
  block = "BIJBELSTUDIE",
  content = "",
  isStreaming = false,
  model = "",
  images = [],
  links = [],
  stats = null,
  className,
  onAddFavorite = null,
  title = null,
}) {
  const icon = {
    BIJBELSTUDIE: BookOpen,
    PREEK: Mic,
    KUNST_LIED: Palette,
    NIEUWS: Newspaper,
  }[block] || Globe2;

  const Icon = icon;

  const headings = useMemo(() => extractHeadings(content), [content]);
  const hasSidebar = (images?.length || links?.length || stats) ? true : false;

  function copyToClipboard() {
    if (!content) return;
    try {
      navigator.clipboard?.writeText(content);
    } catch {}
  }

  function download(filename, text, type = "text/plain") {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportMarkdown() {
    if (!content) return;
    download(`${(title || block).toLowerCase().replace(/\s+/g, "-")}.md`, content, "text/markdown");
  }

  function exportHtml() {
    const html = `<!doctype html>
<html lang="nl"><meta charset="utf-8"><title>${title || block}</title>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial,sans-serif;max-width:860px;margin:24px auto;padding:0 16px;line-height:1.6">
<h1>${title || (block === "KUNST_LIED" ? "Kunst & Lied" : block)}</h1>
<pre style="white-space:pre-wrap">${escapeHtml(content)}</pre>
</body></html>`;
    download(`${(title || block).toLowerCase().replace(/\s+/g, "-")}.html`, html, "text/html");
  }

  return (
    <div
      className={cx(
        "w-full rounded-2xl border bg-white/70 shadow-sm backdrop-blur p-4 md:p-6",
        className
      )}
    >
      <header className="flex flex-wrap items-center gap-3 mb-4">
        <div className="inline-flex items-center justify-center rounded-xl border p-2">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-[240px]">
          <h3 className="font-semibold text-lg">
            {title || (block === "KUNST_LIED" ? "Kunst & Lied" : block)}
          </h3>
          {model && <div className="text-xs text-gray-500">Model: {model}</div>}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border hover:bg-gray-50"
            onClick={copyToClipboard}
            title="Kopieer inhoud"
          >
            <Copy className="h-4 w-4" /> Kopieer
          </button>
          <button
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border hover:bg-gray-50"
            onClick={exportMarkdown}
            title="Download als Markdown"
          >
            <Download className="h-4 w-4" /> .md
          </button>
          <button
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border hover:bg-gray-50"
            onClick={exportHtml}
            title="Download als HTML"
          >
            <Download className="h-4 w-4" /> .html
          </button>
          {onAddFavorite && (
            <button
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border hover:bg-gray-50"
              onClick={() => onAddFavorite({ block, content, model })}
              title="Voeg toe aan favorieten"
            >
              <Star className="h-4 w-4" /> Favoriet
            </button>
          )}
          {isStreaming && (
            <span className="inline-flex items-center gap-2 text-xs text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Genereren…
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <article className={cx(hasSidebar ? "lg:col-span-8" : "lg:col-span-12")}>
          {content ? (
            <MarkdownThemed>{content}</MarkdownThemed>
          ) : (
            <EmptyState block={block} />
          )}
        </article>

        {hasSidebar && (
          <aside className="lg:col-span-4 space-y-6">
            {headings?.length > 0 && (
              <div className="rounded-xl border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ListTree className="h-4 w-4" />
                  <h4 className="font-semibold">Inhoud</h4>
                </div>
                <ul className="text-sm space-y-1">
                  {headings.map((h, i) => (
                    <li key={i} className="truncate">
                      <span className="text-gray-500 mr-1">•</span>
                      <span className="align-middle">{h.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {stats && (
              <div className="rounded-xl border p-3">
                <h4 className="font-semibold mb-2">Voorkomens per bijbelboek</h4>
                <ul className="text-sm grid grid-cols-2 gap-x-3 gap-y-1">
                  {Object.entries(stats).map(([book, count]) => (
                    <li key={book} className="flex justify-between">
                      <span className="text-gray-700">{book}</span>
                      <span className="text-gray-500">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {images?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Afbeeldingen</h4>
                <div className="grid grid-cols-2 gap-2">
                  {images.slice(0, 8).map((im, i) => (
                    <figure key={i} className="overflow-hidden rounded-xl border">
                      <img
                        src={im.src}
                        alt={im.alt || "Kunst & Lied"}
                        className="w-full h-28 object-cover"
                        loading="lazy"
                      />
                      {im.alt && (
                        <figcaption className="text-[11px] px-2 py-1 text-gray-600">
                          {im.alt}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              </div>
            )}

            {links?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Links & bronnen</h4>
                <ul className="space-y-2 text-sm">
                  {links.slice(0, 16).map((l, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1">•</span>
                      <div>
                        <a
                          className="text-blue-700 hover:underline break-all"
                          href={l.href}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          {l.label || l.href}
                        </a>
                        {l.meta && (
                          <div className="text-[11px] text-gray-500">{l.meta}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function MarkdownThemed({ children }) {
  return (
    <ReactMarkdown
      components={{
        h1: (p) => <h1 className="text-xl font-bold mb-3" {...p} />,
        h2: (p) => <h2 className="text-lg font-semibold mt-6 mb-2" {...p} />,
        h3: (p) => <h3 className="text-base font-semibold mt-5 mb-2" {...p} />,
        p: (p) => <p className="mb-3 leading-relaxed" {...p} />,
        ul: (p) => <ul className="list-disc ml-6 mb-3 space-y-1" {...p} />,
        ol: (p) => <ol className="list-decimal ml-6 mb-3 space-y-1" {...p} />,
        li: (p) => <li className="leading-relaxed" {...p} />,
        blockquote: (p) => (
          <blockquote
            className="border-l-4 pl-3 italic text-gray-700 my-4"
            {...p}
          />
        ),
        code: (p) => (
          <code className="bg-gray-100 rounded px-1 py-0.5 text-[85%]" {...p} />
        ),
        a: (p) => (
          <a
            className="text-blue-700 hover:underline break-words"
            target="_blank"
            rel="noreferrer noopener"
            {...p}
          />
        ),
        hr: () => <div className="my-6 border-t" />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

function EmptyState({ block }) {
  return (
    <div className="text-sm text-gray-500">
      Nog geen inhoud gegenereerd voor <strong>{block}</strong>. Start een AI-run en
      de tekst verschijnt hier live.
    </div>
  );
}

// ---- Helpers ----------------------------------------------------------------
function extractHeadings(md = "") {
  const out = [];
  const lines = md.split(/\r?\n/);
  for (const line of lines) {
    const m = /^(#{1,6})\s+(.*)/.exec(line);
    if (m) out.push({ level: m[1].length, text: m[2].trim() });
  }
  return out;
}

function escapeHtml(s = "") {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export default AiResultCard;

// ============================================================================
// END OF AiResultCard.jsx
// ============================================================================
