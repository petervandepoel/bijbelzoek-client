// client/src/components/AiResultCard.jsx
import React from "react";

export default function AiResultCard({ result }) {
  // normaliseer keys
  const norm = {
    type: result.type,
    title: result.title || result.titel,
    summary: result.summary || result.inleiding,
    central_passages: result.central_passages,
    discussion: result.discussion,
    outline:
      result.outline ||
      result.kopjes?.map((k) => ({
        title: k.titel || k,
        content: k.inhoud || [],
      })),
    background: result.background,
    application: result.application,
    prayer: result.prayer,
    children_block: result.children_block,
    homiletical_tips: result.homiletical_tips,
    songs: result.songs,
    news: result.news,
    media: result.media,
    text: result.text,
  };

  const Section = ({ icon, title, children }) => (
    <section className="border-t pt-3 mt-3 first:border-t-0 first:pt-0 first:mt-0">
      <h4 className="font-semibold text-indigo-700 mb-1">
        {icon} {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </section>
  );

  return (
    <div className="ai-card space-y-4 bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
      {norm.title && <h3 className="text-xl font-bold mb-2">{norm.title}</h3>}

      {norm.summary && (
        <Section icon="📝" title="Samenvatting">
          <p className="bg-gray-50 p-2 rounded">{norm.summary}</p>
        </Section>
      )}

      {/* Bijbelstudie */}
      {norm.type === "bijbelstudie" && norm.central_passages && (
        <Section icon="📖" title="Centrale gedeelten">
          {norm.central_passages.map((c, i) => (
            <div key={i} className="mb-3">
              <div className="font-medium">{c.ref}</div>
              {c.text && (
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-2 rounded">
                  {c.text}
                </pre>
              )}
              {c.reason && <p className="italic text-sm">{c.reason}</p>}
            </div>
          ))}
        </Section>
      )}
      {norm.type === "bijbelstudie" && norm.discussion && (
        <Section icon="💬" title="Gespreksvragen">
          <ul className="list-disc pl-5 space-y-1">
            {norm.discussion.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Preek */}
      {norm.type === "preek" && norm.outline && (
        <Section icon="🗂" title="Hoofdlijnen">
          <ul className="list-disc pl-5 space-y-1">
            {Array.isArray(norm.outline)
              ? norm.outline.map((o, i) =>
                  typeof o === "string" ? (
                    <li key={i}>{o}</li>
                  ) : (
                    <li key={i}>
                      <div className="font-medium">{o.title}</div>
                      {o.content && (
                        <ul className="list-disc pl-5 space-y-1">
                          {o.content.map((c, j) => (
                            <li key={j}>{c}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                )
              : null}
          </ul>
        </Section>
      )}
      {norm.type === "preek" && norm.background && (
        <Section icon="📚" title="Achtergrond & Verbanden">
          <ul className="list-disc pl-5 space-y-1">
            {norm.background.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </Section>
      )}
      {norm.type === "preek" && norm.children_block && (
        <Section icon="👧" title="Voor de kinderen">
          <p>{norm.children_block}</p>
        </Section>
      )}
      {norm.type === "preek" && norm.homiletical_tips && (
        <Section icon="🗣️" title="Homiletische tips">
          <ul className="list-disc pl-5 space-y-1">
            {norm.homiletical_tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Liederen */}
      {norm.type === "liederen" && norm.songs && (
        <>
          {Object.entries(norm.songs).map(([cat, arr]) => (
            <Section key={cat} icon="🎶" title={cat}>
              {!arr || arr.length === 0 ? (
                <p className="text-sm text-gray-500">Geen</p>
              ) : (
                <ul className="list-disc pl-5 space-y-1">
                  {arr.map((l, i) => (
                    <li key={i}>
                      <a
                        className="text-blue-600 hover:underline"
                        href={l.url}
                        target="_blank"
                      >
                        {l.title}
                      </a>
                      {l.number && (
                        <span className="ml-1 text-xs text-gray-500">
                          ({l.number})
                        </span>
                      )}
                      {l.composer && (
                        <span className="ml-1 text-xs text-gray-500">
                          – {l.composer}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          ))}
        </>
      )}

      {/* Actueel & Media */}
      {norm.type === "actueelmedia" && norm.news && (
        <Section icon="📰" title="Nieuws">
          <ul className="list-disc pl-5 space-y-2">
            {norm.news.map((n, i) => (
              <li key={i}>
                <a
                  className="text-blue-600 hover:underline"
                  href={n.url}
                  target="_blank"
                >
                  {n.title}
                </a>
                {n.source && (
                  <span className="ml-1 text-xs text-gray-500">
                    ({n.source})
                  </span>
                )}
                {n.summary && (
                  <p className="text-sm text-gray-700">{n.summary}</p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {norm.type === "actueelmedia" && norm.media && (
        <Section icon="🎥" title="Media">
          <ul className="list-disc pl-5 space-y-2">
            {norm.media.map((m, i) => (
              <li key={i}>
                <a
                  className="text-blue-600 hover:underline"
                  href={m.url}
                  target="_blank"
                >
                  {m.title || m.url}
                </a>
                {m.type && (
                  <span className="ml-1 text-xs text-gray-500">
                    [{m.type}]
                  </span>
                )}
                {m.source && (
                  <span className="ml-1 text-xs text-gray-500">
                    ({m.source})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Application / Gebed */}
      {norm.application && (
        <Section icon="💡" title="Toepassing">
          <ul className="list-disc pl-5 space-y-1">
            {norm.application.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </Section>
      )}
      {norm.prayer && (
        <Section icon="🙏" title="Gebed">
          <p className="italic bg-indigo-50 p-2 rounded">{norm.prayer}</p>
        </Section>
      )}

      {/* Fallback */}
      {norm.text && !norm.type && (
        <Section icon="📝" title="Resultaat">
          <pre className="whitespace-pre-wrap">{norm.text}</pre>
        </Section>
      )}
    </div>
  );
}
