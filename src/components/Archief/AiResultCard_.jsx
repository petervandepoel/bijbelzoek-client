// client/src/components/AiResultCard.jsx
import React from "react";

// Kleine helpers
const fmtDate = (ts) =>
  new Date(ts || Date.now()).toLocaleString("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  });

function Section({ title, children }) {
  if (!children) return null;
  return (
    <section className="mt-4">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
        {title}
      </h4>
      <div className="mt-2 prose prose-sm dark:prose-invert max-w-none">{children}</div>
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
  ];
  return (
    <div className="grid md:grid-cols-3 gap-3">
      {blocks.map(({ key, title }) => {
        const list = songs[key] || [];
        return (
          <div key={key} className="rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-3">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</div>
            {list?.length ? (
              <ul className="mt-2 text-sm grid gap-1">
                {list.map((s, i) => (
                  <li key={s.number || i} className="flex items-start gap-2">
                    <span className="text-slate-500 dark:text-slate-400 w-10 shrink-0">
                      {s.number != null ? s.number : "—"}
                    </span>
                    <span className="flex-1">{s.title || "—"}</span>
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
  // result: { id, kind, title, createdAt, structured?, text? }
  const r = result || {};
  const s = r.structured || {};
  const kind = (r.kind || s.type || "").toLowerCase();

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
            {r.title || s.title || "AI-resultaat"}
          </h3>
          {r.createdAt && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {fmtDate(r.createdAt)}
            </div>
          )}
        </div>
      </header>

      {/* Verzen */}
      {Array.isArray(s.verses) && s.verses.length > 0 && (
        <Section title="Bijbelteksten">
          <VerseList verses={s.verses} />
        </Section>
      )}

      {/* Structuur per type */}
      {kind === "bijbelstudie" && (
        <>
          <Section title="Inleiding">{s.summary}</Section>
          <Section title="Opzet / Indeling">
            <BulletList items={s.outline} />
          </Section>
          <Section title="Exegese & Achtergrond">
            <BulletList items={s.background} />
          </Section>
          <Section title="Gespreksvragen">
            <BulletList items={s.discussion} />
          </Section>
          <Section title="Toepassing">
            <BulletList items={s.application} />
          </Section>
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
          <Section title="Preekopbouw (hoofdlijnen)">
            <BulletList items={s.outline} />
          </Section>
          <Section title="Christus centraal">{s.christocentric}</Section>
          <Section title="Achtergrond / Exegese">
            <BulletList items={s.background} />
          </Section>
          <Section title="Toepassing">
            <BulletList items={s.application} />
          </Section>
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

      {/* Fallback als structured ontbreekt → toon plain tekst toch netjes */}
      {!s || Object.keys(s).length === 0 ? (
        <Section title="Resultaat">
          <div className="whitespace-pre-wrap">{r.text || "—"}</div>
        </Section>
      ) : null}
    </article>
  );
}
