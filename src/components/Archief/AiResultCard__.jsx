// client/src/components/AiResultCard.jsx
import React, { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || ""; // bijv. "" voor proxy of "http://localhost:3000"

/* Helpers */
const fmtDate = (ts) =>
  new Date(ts || Date.now()).toLocaleString("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  });

function Section({ title, children, right }) {
  if (!children && !right) return null;
  return (
    <section className="mt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
          {title}
        </h4>
        {right ? <div className="ml-4">{right}</div> : null}
      </div>
      {children ? (
        <div className="mt-2 prose prose-sm dark:prose-invert max-w-none">{children}</div>
      ) : null}
    </section>
  );
}

function VerseCard({ v }) {
  if (!v) return null;
  const ref = v.ref || v.reference || "";
  const text = v.text || v.content || "";
  return (
    <div className="rounded-lg border border-amber-200/60 dark:border-amber-400/30 bg-amber-50/60 dark:bg-amber-950/30 p-3">
      <div className="text-amber-800 dark:text-amber-300 text-xs font-semibold">{ref}</div>
      <div className="text-[0.95rem] leading-6 mt-1">
        <span className="bg-amber-100/70 dark:bg-amber-900/30 rounded px-1 py-0.5">{text}</span>
      </div>
    </div>
  );
}

function VerseList({ verses }) {
  if (!Array.isArray(verses) || !verses.length) return null;
  return (
    <div className="grid gap-2">
      {verses.map((v, i) => (
        <VerseCard key={v.ref || i} v={v} />
      ))}
    </div>
  );
}

function BulletList({ items }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <ul className="list-disc pl-5 grid gap-1">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
}

function SongsTable({ songs }) {
  if (!songs) return null;
  const blocks = [
    { key: "Psalmen", title: "Psalmen" },
    { key: "Opwekking", title: "Opwekking" },
    { key: "Op Toonhoogte", title: "Op Toonhoogte" },
    { key: "Even Wat Anders", title: "Even wat anders" },
  ];
  return (
    <div className="grid md:grid-cols-4 gap-3">
      {blocks.map(({ key, title }) => {
        const list = songs[key] || [];
        return (
          <div key={key} className="rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-3">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</div>
            {list?.length ? (
              <ul className="mt-2 text-sm grid gap-1">
                {list.map((s, i) => (
                  <li key={s.number != null ? `${key}-${s.number}` : `${key}-${i}`} className="flex items-start gap-2">
                    <span className="text-slate-500 dark:text-slate-400 w-12 shrink-0">
                      {s.number != null ? s.number : (s.category || "—")}
                    </span>
                    <span className="flex-1">
                      {s.title || "—"}
                      {s.composer ? <span className="text-slate-500"> — {s.composer}</span> : null}
                      {s.link ? (
                        <a
                          className="ml-2 text-indigo-600 hover:underline"
                          href={s.link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          link
                        </a>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 text-sm text-slate-500">Geen suggesties.</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AiResultCard({ result }) {
  const r = result || {};
  const s = r.structured || {};
  const kind = (r.kind || s.type || "").toLowerCase();

  const theme = s.title || r.title || s.theme || "";
  const keywords = s.keywords || s.insights || [];

  const [news, setNews] = useState(null);
  const [media, setMedia] = useState(null);
  const [loadingNews, setLoadingNews] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [errNews, setErrNews] = useState("");
  const [errMedia, setErrMedia] = useState("");

  async function fetchActueel() {
    try {
      setLoadingNews(true);
      setErrNews("");
      const res = await fetch(`${API_BASE}/api/ai/actueel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, keywords }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNews(data);
    } catch (e) {
      setErrNews("Kon actueel niet laden.");
    } finally {
      setLoadingNews(false);
    }
  }

  async function fetchMedia() {
    try {
      setLoadingMedia(true);
      setErrMedia("");
      const res = await fetch(`${API_BASE}/api/ai/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, keywords }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMedia(data);
    } catch (e) {
      setErrMedia("Kon media niet laden.");
    } finally {
      setLoadingMedia(false);
    }
  }

  const Actions = (
    <div className="flex gap-2">
      <button
        onClick={fetchActueel}
        className="px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300/60 dark:border-amber-700 text-xs font-medium hover:brightness-110"
      >
        {loadingNews ? "Actueel…" : "Actueel"}
      </button>
      <button
        onClick={fetchMedia}
        className="px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 border border-indigo-300/60 dark:border-indigo-700 text-xs font-medium hover:brightness-110"
      >
        {loadingMedia ? "Media…" : "Media"}
      </button>
    </div>
  );

  return (
    <article className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {kind === "bijbelstudie" ? "Bijbelstudie"
              : kind === "preek" ? "Preek"
              : kind === "liederen" ? "Liederen"
              : "AI-resultaat"}
          </div>
          <h3 className="text-lg font-semibold text-indigo-700 dark:text-indigo-300">
            {s.title || r.title || "AI-resultaat"}
          </h3>
          {r.createdAt && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {fmtDate(r.createdAt)}
            </div>
          )}
        </div>
        {Actions}
      </header>

      {/* Contextanalyse */}
      {(s.context?.summary || (s.context?.insights || []).length || (s.context?.answered_questions || []).length) ? (
        <Section title="Contextanalyse">
          {s.context?.summary ? <p>{s.context.summary}</p> : null}
          {Array.isArray(s.context?.insights) && s.context.insights.length ? (
            <>
              <h5 className="mt-3 mb-1 font-semibold">Belangrijkste inzichten</h5>
              <BulletList items={s.context.insights} />
            </>
          ) : null}
          {Array.isArray(s.context?.answered_questions) && s.context.answered_questions.length ? (
            <>
              <h5 className="mt-3 mb-1 font-semibold">Beantwoorde vragen</h5>
              <BulletList items={s.context.answered_questions} />
            </>
          ) : null}
        </Section>
      ) : null}

      {/* Bijbelteksten */}
      {Array.isArray(s.verses) && s.verses.length > 0 && (
        <Section title="Bijbelteksten">
          <VerseList verses={s.verses} />
        </Section>
      )}

      {/* Structuur per type */}
      {kind === "bijbelstudie" && (
        <>
          <Section title="Inleiding">{s.summary}</Section>
          <Section title="Centrale gedeelten">
            <BulletList items={(s.central_passages || []).map(p => `${p.ref} — ${p.reason}`)} />
          </Section>
          <Section title="Opzet / Indeling"><BulletList items={s.outline} /></Section>
          <Section title="Exegese & Achtergrond"><BulletList items={s.background} /></Section>
          <Section title="Gespreksvragen"><BulletList items={s.discussion} /></Section>
          <Section title="Toepassing"><BulletList items={s.application} /></Section>
          <Section title="Gebed">{s.prayer}</Section>
          {s.songs && (
            <Section title="Liederen (bij dit thema)">
              <SongsTable songs={s.songs} />
            </Section>
          )}
        </>
      )}

      {kind === "preek" && (
        <>
          <Section title="Inleiding">{s.summary}</Section>
          <Section title="Centrale gedeelten">
            <BulletList items={(s.central_passages || []).map(p => `${p.ref} — ${p.reason}`)} />
          </Section>
          <Section title="Preekopbouw (hoofdlijnen)"><BulletList items={s.outline} /></Section>
          <Section title="Christus centraal">{s.christocentric}</Section>
          <Section title="Achtergrond / Exegese"><BulletList items={s.background} /></Section>
          <Section title="Toepassing"><BulletList items={s.application} /></Section>
          <Section title="Gebed">{s.prayer}</Section>
          {s.songs && (
            <Section title="Liederen (bij dit thema)">
              <SongsTable songs={s.songs} />
            </Section>
          )}
        </>
      )}

      {kind === "liederen" && (
        <>
          <Section title="Korte toelichting">{s.summary}</Section>
          <Section title="Centrale gedeelten">
            <BulletList items={(s.central_passages || []).map(p => `${p.ref} — ${p.reason}`)} />
          </Section>
          <Section title="Suggesties per bundel">
            <SongsTable songs={s.songs} />
          </Section>
          {Array.isArray(s.notes) && s.notes.length > 0 && (
            <Section title="Opmerkingen">
              <BulletList items={s.notes} />
            </Section>
          )}
        </>
      )}

      {/* Actueel */}
      <Section
        title="Actueel"
        right={loadingNews ? <span className="text-xs text-slate-500">laden…</span> : null}
      >
        {errNews ? <div className="text-sm text-red-600">{errNews}</div> : null}
        {news?.links?.length ? (
          <ul className="grid gap-1">
            {news.links.map((lnk, i) => (
              <li key={i} className="text-sm">
                <a className="text-indigo-600 hover:underline" href={lnk.url} target="_blank" rel="noreferrer">
                  {lnk.title}
                </a>
                <span className="ml-2 text-slate-500">({lnk.source})</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-slate-500">Klik op <em>Actueel</em> om recente artikelen/headers te zoeken.</p>}
      </Section>

      {/* Media */}
      <Section
        title="Media"
        right={loadingMedia ? <span className="text-xs text-slate-500">laden…</span> : null}
      >
        {errMedia ? <div className="text-sm text-red-600">{errMedia}</div> : null}
        {media?.media?.length ? (
          <ul className="grid gap-1">
            {media.media.map((m, i) => (
              <li key={i} className="text-sm">
                <a className="text-indigo-600 hover:underline" href={m.url} target="_blank" rel="noreferrer">
                  {m.title}
                </a>
                <span className="ml-2 text-slate-500">({m.source}, {m.type})</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-slate-500">Klik op <em>Media</em> voor beelden/kunst/filmpjes bij dit thema.</p>}
      </Section>

      {/* Fallback: plain text */}
      {!s || Object.keys(s).length === 0 ? (
        <Section title="Resultaat">
          <div className="whitespace-pre-wrap">{r.text || "—"}</div>
        </Section>
      ) : null}
    </article>
  );
}
