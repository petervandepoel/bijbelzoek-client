import React from "react";

/**
 * Robuuster schema + weergave:
 * - Nieuwe velden: study_questions, conversation_questions, places_people, central_passages[].key_phrases
 * - NL/EN sleutelvarianten blijven ondersteund.
 * - Tolerant voor { structured: {...} } wrappers.
 */
export default function AiResultCard({ result }) {
  const src =
    result && typeof result === "object" && result.structured && typeof result.structured === "object"
      ? result.structured
      : (result || {});

  const norm = {
    type: src.type,
    title: src.title || src.titel,
    date: src.date || src.datum,
    summary: src.summary || src.inleiding || src.samenvatting,

    outline: src.outline || src.kopjes || src.kopjes_en_inhoud || src.hoofdstukken || src.inhoud,

    central_passages: src.central_passages || src.bijbelteksten,
    background: src.background || src.achtergrond || src.context || src.contextanalyse,
    application: src.application || src.toepassing,

    // vragen
    study_questions: src.study_questions || src.studievragen,
    conversation_questions: src.conversation_questions || src.gespreksvragen,
    discussion: src.discussion || src.vragen, // backward-compat

    // preek specifiek
    children_block: src.children_block || src.kinderen,
    homiletical_tips: src.homiletical_tips || src.homiletische_tips,
    places_people: src.places_people || src.plaatsen_personen || src.plaatsen || src.personen,

    // muziek
    songs: src.songs || src.liederen,

    // actueel
    news: src.news || src.nieuws,
    media: src.media || src.mediaitems,

    text: src.text,
    raw: src.raw,
  };

  const Section = ({ icon, title, children }) => (
    <section className="border-t pt-3 mt-3 first:border-t-0 first:pt-0 first:mt-0">
      <h4 className="font-semibold text-indigo-700 mb-1">
        {icon} {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </section>
  );

  const outlineArr = Array.isArray(norm.outline)
    ? norm.outline
    : (norm.outline ? [norm.outline] : null);

  const renderKeyPhrases = (kp) =>
    Array.isArray(kp) && kp.length > 0 ? (
      <div className="text-sm text-gray-700">
        <span className="font-medium">Kernzinnen:</span>{" "}
        {kp.join(" • ")}
      </div>
    ) : null;

  return (
    <div className="ai-card space-y-4 bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
      {norm.title && <h3 className="text-xl font-bold mb-2">{norm.title}</h3>}
      {norm.date && <p className="text-sm text-gray-500">{norm.date}</p>}

      {norm.summary && (
        <Section icon="📝" title="Samenvatting">
          <p className="bg-gray-50 p-2 rounded">{norm.summary}</p>
        </Section>
      )}

      {/* Structuur */}
      {outlineArr && (
        <Section icon="🗂" title="Structuur">
          {outlineArr.map((o, i) =>
            typeof o === "string" ? (
              <p key={i}>{o}</p>
            ) : (
              <div key={i} className="mb-2">
                {o.kop || o.kopje || o.title ? (
                  <div className="font-medium">{o.kop || o.kopje || o.title}</div>
                ) : null}
                {o.tekst && <p>{o.tekst}</p>}
                {Array.isArray(o.inhoud) && (
                  <ul className="list-disc pl-5 space-y-1">
                    {o.inhoud.map((line, j) => (
                      <li key={j}>{line}</li>
                    ))}
                  </ul>
                )}
                {Array.isArray(o.opsomming) && (
                  <ul className="list-disc pl-5 space-y-1">
                    {o.opsomming.map((line, j) => (
                      <li key={j}>{line}</li>
                    ))}
                  </ul>
                )}
                {Array.isArray(o.bijbelteksten) && (
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {o.bijbelteksten.map((b, j) => (
                      <li key={j}>{b.referentie || b.ref}</li>
                    ))}
                  </ul>
                )}
              </div>
            )
          )}
        </Section>
      )}

      {/* Centrale gedeelten (bijbelstudie / preek) */}
      {Array.isArray(norm.central_passages) && (
        <Section icon="📖" title="Centrale gedeelten">
          {norm.central_passages.map((c, i) => (
            <div key={i}>
              <div className="font-medium">{c.ref || c.referentie}</div>
              {renderKeyPhrases(c.key_phrases || c.kernzinnen)}
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

      {/* Achtergrond / verbanden */}
      {Array.isArray(norm.background) && (
        <Section icon="📚" title="Achtergrond & Verbanden">
          <ul className="list-disc pl-5 space-y-1">
            {norm.background.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Vragen */}
      {Array.isArray(norm.study_questions) && (
        <Section icon="📘" title="Studievragen">
          <ul className="list-disc pl-5 space-y-1">
            {norm.study_questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </Section>
      )}
      {Array.isArray(norm.conversation_questions) && (
        <Section icon="💬" title="Gespreksvragen">
          <ul className="list-disc pl-5 space-y-1">
            {norm.conversation_questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </Section>
      )}
      {/* Backward compat */}
      {norm.type === "bijbelstudie" && !norm.conversation_questions && Array.isArray(norm.discussion) && (
        <Section icon="💬" title="Gespreksvragen">
          <ul className="list-disc pl-5 space-y-1">
            {norm.discussion.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Kinderen & tips (preek) */}
      {norm.children_block && (
        <Section icon="👧" title="Voor de kinderen">
          <p>{norm.children_block}</p>
        </Section>
      )}
      {Array.isArray(norm.homiletical_tips) && (
        <Section icon="🗣️" title="Homiletische tips">
          <ul className="list-disc pl-5 space-y-1">
            {norm.homiletical_tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </Section>
      )}
      {Array.isArray(norm.places_people) && (
        <Section icon="🗺️" title="Belangrijke plaatsen / personen">
          <ul className="list-disc pl-5 space-y-1">
            {norm.places_people.map((pp, i) => (
              <li key={i}>{pp}</li>
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
                        href={
                          l.url ||
                          `https://www.youtube.com/results?search_query=${encodeURIComponent(l.title || "")}`
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        {l.title}
                      </a>
                      {l.number && <span className="ml-1 text-xs text-gray-500">({l.number})</span>}
                      {l.composer && <span className="ml-1 text-xs text-gray-500">– {l.composer}</span>}
                      {l.note && <span className="ml-2 text-xs text-gray-600">{l.note}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          ))}
        </>
      )}

      {/* Actueel & Media */}
      {Array.isArray(norm.news) && norm.type === "actueelmedia" && (
        <Section icon="📰" title="Nieuws">
          <ul className="list-disc pl-5 space-y-2">
            {norm.news.map((n, i) => (
              <li key={i}>
                {n.url ? (
                  <a className="text-blue-600 hover:underline" href={n.url} target="_blank" rel="noreferrer">
                    {n.title}
                  </a>
                ) : (
                  <span className="font-medium">{n.title}</span>
                )}
                {n.source && <span className="ml-1 text-xs text-gray-500">({n.source})</span>}
                {n.summary && <p className="text-sm text-gray-700">{n.summary}</p>}
                {n.date && <span className="ml-1 text-xs text-gray-400">{n.date}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {Array.isArray(norm.media) && norm.type === "actueelmedia" && (
        <Section icon="🎥" title="Media">
          <ul className="list-disc pl-5 space-y-2">
            {norm.media.map((m, i) => (
              <li key={i}>
                {m.url ? (
                  <a className="text-blue-600 hover:underline" href={m.url} target="_blank" rel="noreferrer">
                    {m.title || m.url}
                  </a>
                ) : (
                  <span className="font-medium">{m.title}</span>
                )}
                {m.type && <span className="ml-1 text-xs text-gray-500">[{m.type}]</span>}
                {m.source && <span className="ml-1 text-xs text-gray-500">({m.source})</span>}
                {m.summary && <p className="text-sm text-gray-700">{m.summary}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Toepassing */}
      {Array.isArray(norm.application) && (
        <Section icon="💡" title="Toepassing">
          <ul className="list-disc pl-5 space-y-1">
            {norm.application.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Fallbacks */}
      {norm.text && !norm.type && (
        <Section icon="📝" title="Resultaat">
          <pre className="whitespace-pre-wrap">{norm.text}</pre>
        </Section>
      )}
      {norm.raw && (
        <Section icon="⚠️" title="Ongestructureerde output">
          <pre className="whitespace-pre-wrap text-sm">{norm.raw}</pre>
        </Section>
      )}
    </div>
  );
}