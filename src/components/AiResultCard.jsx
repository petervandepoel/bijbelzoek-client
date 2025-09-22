// client/src/components/AiResultCard.jsx
import React from "react";

export default function AiResultCard({ result }) {
  const highlightRefs = (text) => {
    if (!text) return null;
    return String(text).split(/(\b[A-Z][a-z]+\.? ?\d+:\d+\b)/g).map((part, i) =>
      part.match(/\d+:\d+/) ? <strong key={i}>{part}</strong> : part
    );
  };

  const Section = ({ icon, title, children }) => (
    <section className="border-t pt-3 mt-3 first:border-t-0 first:pt-0 first:mt-0">
      <h4 className="font-semibold text-indigo-700 mb-1">{icon} {title}</h4>
      <div className="space-y-2">{children}</div>
    </section>
  );

  // ---- Bijbelstudie ----
  const renderBibleStudy = () => (
    <>
      {result.central_passages && (
        <Section icon="📖" title="Centrale gedeelten">
          {result.central_passages.map((c, i) => (
            <div key={i} className="mb-3">
              <div className="font-medium">{c.ref}</div>
              {c.text && <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-2 rounded">{c.text}</pre>}
              {c.reason && <p className="text-sm italic">{c.reason}</p>}
            </div>
          ))}
        </Section>
      )}
      {result.discussion && (
        <Section icon="💬" title="Gespreksvragen">
          <ul className="list-disc pl-5 space-y-1">{result.discussion.map((q, i) => <li key={i}>{q}</li>)}</ul>
        </Section>
      )}
    </>
  );

  // ---- Preek ----
  const renderSermon = () => (
    <>
      {result.outline && (
        <Section icon="🗂" title="Hoofdlijnen">
          <ul className="list-disc pl-5 space-y-1">{result.outline.map((o, i) => <li key={i}>{o}</li>)}</ul>
        </Section>
      )}
      {result.background && (
        <Section icon="📚" title="Achtergrond & Verbanden">
          <ul className="list-disc pl-5 space-y-1">{result.background.map((b, i) => <li key={i}>{highlightRefs(b)}</li>)}</ul>
        </Section>
      )}
      {result.children_block && (
        <Section icon="👧" title="Voor de kinderen">
          <p>{highlightRefs(result.children_block)}</p>
        </Section>
      )}
      {result.homiletical_tips && (
        <Section icon="🗣️" title="Homiletische tips">
          <ul className="list-disc pl-5 space-y-1">{result.homiletical_tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </Section>
      )}
    </>
  );

  // ---- Liederen ----
  const renderSongs = () => {
    const songs = result.songs || {};
    const renderList = (arr) =>
      !arr || arr.length === 0 ? <p className="text-sm text-gray-500">Geen</p> :
      <ul className="list-disc pl-5 space-y-1">
        {arr.map((l, i) => {
          const url = l.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(l.title)}`;
          return (
            <li key={i}>
              <a className="text-blue-600 hover:underline" href={url} target="_blank" rel="noreferrer">{l.title || "Onbekend lied"}</a>
              {l.number && <span className="ml-1 text-xs text-gray-500">({l.number})</span>}
              {l.composer && <span className="ml-1 text-xs text-gray-500">– {l.composer}</span>}
            </li>
          );
        })}
      </ul>;
    return (
      <>
        <Section icon="🎶" title="Psalmen">{renderList(songs.psalms)}</Section>
        <Section icon="🎶" title="Opwekking">{renderList(songs.opwekking)}</Section>
        <Section icon="🎶" title="Op Toonhoogte">{renderList(songs.op_toonhoogte)}</Section>
        <Section icon="🎶" title="Overige">{renderList(songs.others)}</Section>
      </>
    );
  };

  // ---- Actueel & Media ----
  const renderNewsMedia = () => (
    <>
      {result.news && (
        <Section icon="📰" title="Nieuws">
          <ul className="list-disc pl-5 space-y-2">
            {result.news.map((n, i) => (
              <li key={i}>
                <a className="text-blue-600 hover:underline" href={n.url} target="_blank" rel="noreferrer">{n.title}</a>
                {n.source && <span className="ml-1 text-xs text-gray-500">({n.source})</span>}
                {n.summary && <p className="text-sm text-gray-700">{n.summary}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {result.media && (
        <Section icon="🎥" title="Media">
          <ul className="list-disc pl-5 space-y-2">
            {result.media.map((m, i) => (
              <li key={i}>
                <a className="text-blue-600 hover:underline" href={m.url} target="_blank" rel="noreferrer">{m.title || m.url}</a>
                {m.type && <span className="ml-1 text-xs text-gray-500">[{m.type}]</span>}
                {m.source && <span className="ml-1 text-xs text-gray-500">({m.source})</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );

  return (
    <div className="ai-card space-y-4 bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
      <h3 className="text-xl font-bold mb-2">{result.title}</h3>

      {result.summary && (
        <Section icon="📝" title="Samenvatting">
          <p className="bg-gray-50 p-2 rounded">{highlightRefs(result.summary)}</p>
        </Section>
      )}

      {result.type === "bijbelstudie" && renderBibleStudy()}
      {result.type === "preek" && renderSermon()}
      {result.type === "liederen" && renderSongs()}
      {result.type === "actueelmedia" && renderNewsMedia()}

      {result.application && (
        <Section icon="💡" title="Toepassing">
          {Array.isArray(result.application)
            ? <ul className="list-disc pl-5 space-y-1">{result.application.map((a, i) => <li key={i}>{highlightRefs(a)}</li>)}</ul>
            : <p>{highlightRefs(result.application)}</p>}
        </Section>
      )}

      {result.prayer && (
        <Section icon="🙏" title="Gebed">
          <p className="italic bg-indigo-50 p-2 rounded">{result.prayer}</p>
        </Section>
      )}

      {/* fallback text-only */}
      {result.text && !result.type && (
        <Section icon="📝" title="Resultaat">
          <pre className="whitespace-pre-wrap">{result.text}</pre>
        </Section>
      )}
    </div>
  );
}
