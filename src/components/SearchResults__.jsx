// client/src/components/SearchResults.jsx
import React, { useMemo } from "react";
import { Star } from "lucide-react";
import { useApp } from "../context/AppContext";

// Kleine normalizer voor referenties
const normRef = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();

function StarButton({ on, onClick }) {
  return (
    <button
      onClick={onClick}
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

/**
 * Props (optioneel):
 * - results: array van { ref, text, ... }
 * - onSelect: callback(item) bij klik op resultaat (optioneel)
 */
export default function SearchResults({ results: propResults, onSelect }) {
  const app = useApp();

  const {
    // uit context
    savedState,
    isFavText,
    addFavText,
    removeFavText,
  } = app || {};

  // Resultaten kunnen uit props komen of uit savedState
  const results = useMemo(() => {
    const list = propResults ?? savedState?.results ?? [];
    return Array.isArray(list) ? list : [];
  }, [propResults, savedState]);

  if (!results.length) {
    return <p className="text-sm text-gray-500">Geen resultaten.</p>;
  }

  return (
    <div className="space-y-3">
      {results.map((item, idx) => {
        const ref = item.ref || item.reference || item.verse || item.title || "";
        const text = item.text || item.snippet || item.content || "";

        const favOn = typeof isFavText === "function" ? isFavText(ref) : false;

        const toggleFav = (e) => {
          e.preventDefault();
          e.stopPropagation();
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

        const handleSelect = () => {
          if (typeof onSelect === "function") onSelect(item);
        };

        return (
          <div
            key={item.id || item._id || `${normRef(ref)}_${idx}`}
            className="border rounded-lg p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
            onClick={handleSelect}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-indigo-700 dark:text-indigo-300 font-medium truncate">
                  {ref || <span className="opacity-60">[zonder referentie]</span>}
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap">
                  {text || <span className="opacity-60">[geen tekst]</span>}
                </p>
              </div>
              <StarButton on={!!favOn} onClick={toggleFav} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
