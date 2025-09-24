import { useMemo } from "react";
import { Star, BookOpen } from "lucide-react";
import { useApp } from "../context/AppContext";
import { STOPWORDS_EN, STOPWORDS_NL } from "../utils/stopwords";

const palette = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#14b8a6", "#a855f7"];

export default function SearchResults({ results, queryWords, version, onClickWord, onReadChapter }) {
  const { addFavText, removeFavText, isFavText } = useApp();

  const stopwords = useMemo(() => (version === "HSV" ? STOPWORDS_NL : STOPWORDS_EN), [version]);

  const tokens = useMemo(() => {
    const arr = (queryWords || []).map(w => w.trim()).filter(Boolean);
    return arr;
  }, [queryWords]);

  const colorMap = useMemo(() => {
    const map = new Map();
    tokens.forEach((w, i) => map.set(w.toLowerCase(), palette[i % palette.length]));
    return map;
  }, [tokens]);

  const highlight = (text) => {
    if (!tokens.length) return text;
    // simpele case-insensitive highlight per woord
    let out = text;
    tokens.forEach(t => {
      const c = colorMap.get(t.toLowerCase());
      if (!c) return;
      const re = new RegExp(`(${t})`, "gi");
      out = out.replace(re, `<mark style="background:${c}33;border-radius:4px;padding:0 2px;">$1</mark>`);
    });
    return out;
  };

  const clickableText = (text) => {
    // maak woorden klikbaar (excl. stopwoorden)
    return text.split(/(\b)/).map((frag, idx) => {
      const clean = frag.replace(/[^\p{L}\p{N}'-]+/gu, "");
      const isWord = /[\p{L}\p{N}]/u.test(clean);
      const lower = clean.toLowerCase();
      if (isWord && !stopwords.has(lower)) {
        return (
          <span
            key={idx}
            className="cursor-pointer underline decoration-dotted hover:text-indigo-600"
            onClick={() => onClickWord?.(clean)}
            dangerouslySetInnerHTML={{ __html: highlight(frag) }}
          />
        );
      }
      return <span key={idx} dangerouslySetInnerHTML={{ __html: highlight(frag) }} />;
    });
  };

  if (!results || results.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">Geen resultaten gevonden.</p>;
  }

  return (
    <div className="grid gap-4">
      {results.map((res) => {
        const fav = isFavText(res);
        return (
          <div
            key={res._id || `${res.book}-${res.chapter}-${res.verse}`}
            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                {res.ref || `${res.book} ${res.chapter}:${res.verse}`}
              </span>
              <div className="flex items-center gap-3">
                <button
                  className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  onClick={() => onReadChapter?.(res.book, res.chapter)}
                >
                  <BookOpen className="w-4 h-4" /> Lees hoofdstuk
                </button>
                <button
                  className={fav ? "text-yellow-500" : "text-gray-400 hover:text-yellow-500"}
                  onClick={() => fav ? removeFavText(res._id || res.ref) : addFavText(res)}
                  title={fav ? "Verwijderen uit favorieten" : "Toevoegen aan favorieten"}
                >
                  <Star className="w-5 h-5" fill={fav ? "currentColor" : "none"} />
                </button>
              </div>
            </div>
            <p className="prose prose-sm dark:prose-invert max-w-none">
              {clickableText(res.text)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
