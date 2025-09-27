import { useEffect, useState } from "react";
import { X, Star } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function ChapterModal({ open, onClose, version, book, chapter, onChangeChapter }) {
  const { addFavText, isFavText, removeFavText } = useApp();
  const [verses, setVerses] = useState([]);

  useEffect(() => {
    if (!open || !book || !chapter) return;
    (async () => {
      try {
        const res = await fetch(`/api/chapter?version=${encodeURIComponent(version || "HSV")}&book=${encodeURIComponent(book)}&chapter=${encodeURIComponent(chapter)}`);
        const json = await res.json();
        setVerses(Array.isArray(json.verses) ? json.verses : []);
      } catch {
        setVerses([]);
      }
    })();
  }, [open, version, book, chapter]);

  if (!open) return null;

  const navButtons = (
    <div className="flex justify-between mb-4">
      <button
        disabled={chapter <= 1}
        onClick={() => onChangeChapter?.(chapter - 1)}
        className="px-3 py-1 rounded bg-indigo-100 dark:bg-indigo-800 disabled:opacity-50">
        ← Vorige
      </button>
      <button
        onClick={() => onChangeChapter?.(chapter + 1)}
        className="px-3 py-1 rounded bg-indigo-100 dark:bg-indigo-800">
        Volgende →
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow max-w-3xl w-full max-h-[85vh] overflow-auto">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="font-semibold text-indigo-600">
            {book} {chapter}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500" title="Sluiten">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {navButtons}
          {verses.map((v, idx) => {
            const ref =
              v.ref || (v.verse != null ? `${book} ${chapter}:${v.verse}` : `${book} ${chapter}`);
            const text = v.text || v.content || "";
            const fav = typeof isFavText === "function" ? isFavText(ref) : false;
            const toggleFav = () => {
              if (!ref) return;
              if (fav) {
                typeof removeFavText === "function" ? removeFavText(ref) : null;
              } else {
                typeof addFavText === "function" ? addFavText({ ref, text }) : null;
              }
            };
            return (
              <div key={v._id || ref || `${book}-${chapter}-${v.verse ?? idx}`} className="bg-gray-50 dark:bg-gray-900 rounded p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-indigo-600">{ref}</span>
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
                    <Star className="w-4 h-4" stroke="currentColor" fill={fav ? "currentColor" : "none"} />
                    <span>{fav ? "Favoriet" : "Bewaar"}</span>
                  </button>
                </div>
                <p className="text-sm whitespace-pre-wrap">{text}</p>
              </div>
            );
          })}
          {(!verses || verses.length === 0) && <p className="text-sm text-gray-500">Geen verzen gevonden.</p>}
          {navButtons}
        </div>
      </div>
    </div>
  );
}
