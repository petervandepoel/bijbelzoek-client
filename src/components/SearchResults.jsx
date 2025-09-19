// client/src/components/SearchResults.jsx
import React, { useMemo } from "react";
import { Star, BookOpen } from "lucide-react";
import { useApp } from "../context/AppContext";

// Normalizer voor veilige keys
const normRef = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();

// Probeer boek + hoofdstuk uit een referentie te halen, bv.
// "Genesis 1:1-3", "1 Korinthe 13:4", "Rom. 8:1", "Psalmen 23:1".
function parseBookChapter(item) {
  const ref = item?.ref || item?.reference || item?.verse || item?.title || "";
  const bookFromItem = item?.book || item?.Book || null;
  const chapterFromItem = item?.chapter || item?.Chapter || null;

  if (bookFromItem && chapterFromItem) {
    return { book: String(bookFromItem), chapter: Number(chapterFromItem) || 1 };
  }
  if (!ref) return { book: bookFromItem || null, chapter: chapterFromItem || null };

  // "Boek 3:17"
  let m = ref.match(/^(.+?)\s+(\d+)\s*:\s*\d/);
  if (m) return { book: m[1].trim(), chapter: Number(m[2]) || 1 };

  // "Boek 3"
  m = ref.match(/^(.+?)\s+(\d+)\s*$/);
  if (m) return { book: m[1].trim(), chapter: Number(m[2]) || 1 };

  return { book: bookFromItem || null, chapter: chapterFromItem || null };
}

// Escape HTML om XSS te voorkomen
function escHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Highlight enkel de aangeleverde queryWords in de (ge-escapete) tekst
function highlightHtml(text, queryWords = []) {
  if (!text || !Array.isArray(queryWords) || queryWords.length === 0) {
    return escHtml(text || "");
  }
  // escape text eerst
  let out = escHtml(text);
  // Unieke woorden, langste eerst (voorkomt overlappende short matches)
  const uniq = Array.from(
    new Set(
      queryWords
        .filter(Boolean)
        .map((w) => String(w).trim())
        .filter((w) => w.length > 0)
    )
  ).sort((a, b) => b.length - a.length);

  for (const w of uniq) {
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${esc})`, "gi");
    // Gebruik een semantisch <mark> met eigen klasse voor kleur
    out = out.replace(re, `<mark class="sr-mark">$1</mark>`);
  }
  return out;
}

function StarButton({ on, onClick }) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
      className={
        "inline-flex items-center gap-1 text-xs px-2 py-1 rounded border transition " +
        (on
          ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-900/20 dark:text-amber-300"
          : "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-indigo-700 dark:text-indigo-300")
      }
      aria-pressed={on}
      title={on ? "Verwijderen uit favorieten" : "Toevoegen aan favorieten"}
    >
      <Star className="w-4 h-4" stroke="currentColor" fill={on ? "currentColor" : "none"} />
      <span>{on ? "Favoriet" : "Bewaar"}</span>
    </button>
  );
}

function ReadChapterButton({ item, onReadChapter }) {
  const { book, chapter } = parseBookChapter(item);
  const disabled = !book || !chapter;
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) onReadChapter?.(book, chapter);
      }}
      disabled={disabled}
      className={
        "inline-flex items-center gap-1 text-xs px-2 py-1 rounded border transition " +
        (disabled
          ? "border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500 cursor-not-allowed"
          : "border-indigo-400 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-600 dark:text-indigo-300 dark:hover:bg-indigo-900/20")
      }
      title={disabled ? "Geen boek/hoofdstuk gevonden" : `Open ${book} ${chapter}`}
    >
      <BookOpen className="w-4 h-4" />
      <span>Lees hoofdstuk</span>
    </button>
  );
}

/**
 * Props:
 * - results: array van { ref, text, book?, chapter?, ... }
 * - queryWords: string[] (ALLEEN deze woorden worden gehighlight)
 * - onReadChapter: (book, chapter) => void  (opent jouw ChapterModal)
 */
export default function SearchResults({ results: propResults, queryWords = [], onReadChapter }) {
  const { savedState, isFavText, addFavText, removeFavText } = useApp() || {};

  // Resultaten komen uit props of uit savedState
  const results = useMemo(() => {
    const list = propResults ?? savedState?.results ?? [];
    return Array.isArray(list) ? list : [];
  }, [propResults, savedState]);

  if (!results.length) {
    return <p className="text-sm text-gray-500">Geen resultaten.</p>;
  }

  return (
    <div className="space-y-3">
      {/* mark-styling: consistente amber-kleur, klein randje, goede contrast */}
      <style>{`
        .sr-mark {
          background-color: #fef08a; /* amber-200 */
          color: inherit;
          padding: 0 2px;
          border-radius: 2px;
        }
      `}</style>

      {results.map((item, idx) => {
        const ref = item.ref || item.reference || item.verse || item.title || "";
        const text = item.text || item.snippet || item.content || "";

        const favOn = typeof isFavText === "function" ? isFavText(ref) : false;

        const toggleFav = () => {
          if (!ref) return;
          if (favOn) {
            typeof removeFavText === "function"
              ? removeFavText(ref)
              : console.warn("removeFavText ontbreekt in context");
          } else {
            typeof addFavText === "function"
              ? addFavText({ ref, text })
              : console.warn("addFavText ontbreekt in context");
          }
        };

        return (
          <article
            key={item.id || item._id || `${normRef(ref)}_${idx}`}
            className="border rounded-lg p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            {/* BOVENSTE REGEL: referentie links, acties rechts */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-indigo-700 dark:text-indigo-300 font-medium truncate">
                  {ref || <span className="opacity-60">[zonder referentie]</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StarButton on={!!favOn} onClick={toggleFav} />
                <ReadChapterButton item={item} onReadChapter={onReadChapter} />
              </div>
            </div>

            {/* Tekst met highlight — ruime plek voor resultaat */}
            <p
              className="text-sm mt-2 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: highlightHtml(text, queryWords) }}
            />
          </article>
        );
      })}
    </div>
  );
}
