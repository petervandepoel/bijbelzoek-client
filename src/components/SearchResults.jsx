// client/src/components/SearchResults.jsx
import React from "react";
import { useApp } from "../context/AppContext";
import { Star } from "lucide-react";
import ReadChapterButton from "./ReadChapterButton.jsx";

export default function SearchResults({
  results = [],
  queryWords = [],
  version,
  onClickWord,
  onReadChapter,
}) {
  const { isFavText, addFavText, removeFavText } = useApp();

  if (!results || results.length === 0) {
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
      {results.map((item, idx) => {
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

        return (
          <div
            key={idx}
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
