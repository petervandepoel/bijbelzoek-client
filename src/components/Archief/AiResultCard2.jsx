import React from "react";
import ReactMarkdown from "react-markdown";
import cx from "classnames";
import {
  BookOpen,
  Mic,
  Music2,
  Palette,
  Globe2,
  Newspaper,
  Loader2,
} from "lucide-react";

export function AiResultCard({
  block = "BIJBELSTUDIE",
  content = "",
  isStreaming = false,
  model = "",
  images = [], // optional: array of { src, alt }
  links = [], // optional: array of { href, label, meta }
  className,
}) {
  const icon = {
    BIJBELSTUDIE: BookOpen,
    PREEK: Mic,
    KUNST_LIED: Palette,
    NIEUWS: Newspaper,
  }[block] || Globe2;

  const Icon = icon;

  return (
    <div
      className={cx(
        "w-full rounded-2xl border bg-white/70 shadow-sm backdrop-blur p-4 md:p-6",
        className
      )}
    >
      <header className="flex items-center gap-3 mb-4">
        <div className="inline-flex items-center justify-center rounded-xl border p-2">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">
            {block === "KUNST_LIED" ? "Kunst & Lied" : block}
          </h3>
          {model && (
            <div className="text-xs text-gray-500">Model: {model}</div>
          )}
        </div>
        {isStreaming && (
          <span className="inline-flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Genereren…
          </span>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <article className={cx(links?.length || images?.length ? "lg:col-span-8" : "lg:col-span-12")}
        >
          <MarkdownThemed>{content || ""}</MarkdownThemed>
        </article>

        {(images?.length > 0 || links?.length > 0) && (
          <aside className="lg:col-span-4 space-y-6">
            {images?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Afbeeldingen</h4>
                <div className="grid grid-cols-2 gap-2">
                  {images.slice(0, 6).map((im, i) => (
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
                  {links.slice(0, 12).map((l, i) => (
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

// ----------------------------------------------------------------------------
// Minimal styling note: ensure Tailwind is enabled in your project.
// If you don't use Tailwind, replace classes with your own CSS.
// ----------------------------------------------------------------------------

// ============================================================================
// END OF FILES
// ============================================================================
