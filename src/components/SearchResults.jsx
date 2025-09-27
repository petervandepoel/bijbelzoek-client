// client/src/components/SearchResults.jsx
import React, { useMemo } from "react";
import { useApp } from "../context/AppContext";
import { Star } from "lucide-react";
import ReadChapterButton from "./ReadChapterButton.jsx";
import * as BooksMod from "../utils/books";

/* ──────────────────────────────────────────────────────────────────────────────
   Canonieke boekenlijst en volgorde (Genesis → Openbaring) + robuuste matching
   ─────────────────────────────────────────────────────────────────────────── */
const BOOKS = BooksMod?.BOOKS || BooksMod?.default || [];

function normalizeBookName(str) {
  if (!str) return "";
  let x = String(str).toLowerCase();
  try {
    x = x.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // strip diacritics
  } catch {}
  x = x.replace(/\u00a0/g, " "); // nbsp → space
  x = x.replace(/[.\-_,]/g, " "); // punctuation → space
  x = x.replace(/\s+/g, " ").trim();

  // NL varianten grof normaliseren
  x = x
    .replace(/\bkorint(iers|iers|iersen|he|he?rs)\b/g, "korinthe")
    .replace(/\befe(z|z)iers\b/g, "efeziers")
    .replace(/\befe(z|z)e\b/g, "efeze")
    .replace(/\bfilip+enzen\b/g, "filippenzen")
    .replace(/\bezechiel\b/g, "ezechiel")
    .replace(/\bezechi(e|ë)l\b/g, "ezechiel")
    .replace(/\bdaniel\b/g, "daniel")
    .replace(/\bdanie(l|̈)l\b/g, "daniel");

  // roman cijfers aan het begin → arabisch
  x = x.replace(/^(i{1,3})\s+/, (m, r) => (r === "i" ? "1 " : r === "ii" ? "2 " : "3 "));
  return x;
}

function addIndex(map, key, idx) {
  if (!key) return;
  if (!map.has(key)) map.set(key, idx);
}

function makeBookOrderMap() {
  const map = new Map();

  if (Array.isArray(BOOKS) && BOOKS.length) {
    BOOKS.forEach((b, idx) => {
      const candidates = [b?.name, b?.nl, b?.short, b?.abbr, b?.slug].filter(Boolean);
      for (const c of candidates) {
        const base = normalizeBookName(c);
        addIndex(map, base, idx);

        // Variaties: "1 Samuel" / "1Samuel" / "1-Samuel" / "I Samuel"
        const m = base.match(/^([123])\s+(.*)$/);
        if (m) {
          addIndex(map, `${m[1]}${m[2]}`, idx);
          addIndex(map, `${m[1]}-${m[2]}`, idx);
        }
        const roman = base.replace(/^([123])\s+/, (__, n) => (n === "1" ? "i " : n === "2" ? "ii " : "iii "));
        addIndex(map, roman, idx);
        addIndex(map, roman.replace(/\s+/g, ""), idx);
      }
    });
  } else {
    // Fallback NL-volgorde met veelgebruikte varianten
    const fallback = [
      "Genesis","Exodus","Leviticus","Numeri","Deuteronomium",
      "Jozua","Richteren","Ruth","1 Samuel","2 Samuel",
      "1 Koningen","2 Koningen","1 Kronieken","2 Kronieken","Ezra",
      "Nehemia","Ester","Job","Psalmen","Spreuken",
      "Prediker","Hooglied","Jesaja","Jeremia","Klaagliederen",
      "Ezechiel","Ezechiël","Daniel","Daniël","Hosea","Joël","Amos",
      "Obadja","Jona","Micha","Nahum","Habakuk",
      "Sefanja","Haggai","Zacharia","Maleachi",
      "Mattheus","Mattheüs","Markus","Lukas","Johannes","Handelingen",
      "Romeinen","1 Korinthe","2 Korinthe","1 Korintiers","2 Korintiers","1 Korintiërs","2 Korintiërs",
      "Galaten","Efeze","Efeziers","Efeziërs",
      "Filippenzen","Kolossenzen","1 Thessalonicenzen","2 Thessalonicenzen",
      "1 Timotheus","2 Timotheus","1 Timotheüs","2 Timotheüs",
      "Titus","Filemon","Hebreeen","Hebreeën","Jakobus",
      "1 Petrus","2 Petrus","1 Johannes","2 Johannes","3 Johannes",
      "Judas","Openbaring"
    ];
    fallback.forEach((n, idx) => {
      const base = normalizeBookName(n);
      addIndex(map, base, idx);
      const m = base.match(/^([123])\s+(.*)$/);
      if (m) {
        addIndex(map, `${m[1]}${m[2]}`, idx);
        addIndex(map, `${m[1]}-${m[2]}`, idx);
      }
      const roman = base.replace(/^([123])\s+/, (__, n) => (n === "1" ? "i " : n === "2" ? "ii " : "iii "));
      addIndex(map, roman, idx);
      addIndex(map, roman.replace(/\s+/g, ""), idx);
    });
  }

  return map;
}
const BOOK_ORDER = makeBookOrderMap();

function bookIndex(name) {
  const k = normalizeBookName(name);
  return BOOK_ORDER.has(k) ? BOOK_ORDER.get(k) : 999;
}
/* ─────────────────────────────────────────────────────────────────────────── */

export default function SearchResults({
  results = [],
  queryWords = [],
  version,
  onClickWord,
  onReadChapter,
}) {
  const { isFavText, addFavText, removeFavText } = useApp();

  const sorted = useMemo(() => {
    if (!Array.isArray(results) || !results.length) return results;
    return [...results].sort((a, b) => {
      const ai = bookIndex(a.book || "");
      const bi = bookIndex(b.book || "");
      if (ai !== bi) return ai - bi;
      const ac = Number(a.chapter || 0) - Number(b.chapter || 0);
      if (ac !== 0) return ac;
      return Number(a.verse || 0) - Number(b.verse || 0);
    });
  }, [results]);

  if (!sorted || sorted.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 text-sm">
        Geen resultaten gevonden.
      </p>
    );
  }

  const highlightHtml = (text) => {
    if (!queryWords?.length) return text;
    let safe = text?.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[c])) ?? "";

    queryWords.forEach((word) => {
      if (!word) return;
      const regex = new RegExp(`(${word})`, "gi");
      safe = safe.replace(
        regex,
        `<mark class="bg-yellow-200 dark:bg-yellow-600">$1</mark>`
      );
    });
    return safe;
  };

  return (
    <div className="space-y-4">
      {sorted.map((item, idx) => {
        const ref =
          item.ref ||
          (item.book && item.chapter && item.verse
            ? `${item.book} ${item.chapter}:${item.verse}`
            : "") ||
          "";

        const text =
          item.text ?? item.snippet ?? item.content ?? "[geen tekst beschikbaar]";

        const fav = typeof isFavText === "function" ? isFavText(ref) : false;

        const toggleFav = () => {
          if (!ref) return;
          if (fav) {
            typeof removeFavText === "function" ? removeFavText(ref) : null;
          } else {
            typeof addFavText === "function" ? addFavText({ ref, text }) : null;
          }
        };

        const key =
          item._id ||
          ref ||
          `${item.book || "?"}-${item.chapter || "?"}-${item.verse || idx}`;

        return (
          <div
            key={key}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-indigo-600 dark:text-indigo-300">
                {ref || "[geen ref]"}
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={toggleFav}
                  className={
                    "inline-flex items-center gap-1 text-xs px-2 py-1 rounded border transition " +
                    (fav
                      ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-900/20 dark:text-amber-300"
                      : "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-indigo-700 dark:text-indigo-300")
                  }
                  aria-pressed={fav}
                  title={fav ? "Verwijderen uit favorieten" : "Toevoegen aan favorieten"}
                >
                  <Star
                    className="w-4 h-4"
                    stroke="currentColor"
                    fill={fav ? "currentColor" : "none"}
                  />
                  <span>{fav ? "Favoriet" : "Bewaar"}</span>
                </button>

                {item.book && (
                  <ReadChapterButton
                    book={item.book}
                    chapter={item.chapter}
                    onClick={onReadChapter}
                  />
                )}
              </div>
            </div>
            <p
              className="mt-2 text-gray-800 dark:text-gray-200 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: highlightHtml(text) }}
            />
            <div className="mt-2 space-x-2">
              {queryWords.map((word) => (
                <button
                  key={word}
                  onClick={() => onClickWord?.(word)}
                  className="inline-block text-xs bg-indigo-100 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-200 px-2 py-1 rounded hover:bg-indigo-200 dark:hover:bg-indigo-600 transition"
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
