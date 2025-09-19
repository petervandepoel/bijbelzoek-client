import { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { BOOKS_NL, BOOKS_EN } from "../utils/books";

export default function FilterPanel({ queryWords, onSelectBook }) {
  const { version, setVersion, searchMode, setSearchMode } = useApp();
  const [hits, setHits] = useState({});

  const books = useMemo(() => (version === "HSV" ? BOOKS_NL : BOOKS_EN), [version]);

  useEffect(() => {
    const load = async () => {
      const wordsParam = encodeURIComponent(queryWords.join(","));
      if (!wordsParam) {
        setHits({});
        return;
      }
      const res = await fetch(
        `/api/stats/hitsByBook?version=${version}&mode=${searchMode}&words=${wordsParam}`
      );
      const json = await res.json();
      const map = {};
      (json.data || []).forEach((row) => {
        map[row.book] = row.hits;
      });
      setHits(map);
    };
    load();
  }, [version, searchMode, queryWords.join(",")]);

  return (
    <aside className="w-full lg:w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg h-max">
      <h3 className="text-sm font-semibold mb-3">Filters</h3>

      {/* Version toggle */}
      <div className="mb-4 text-sm">
        <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 mb-2">
          <button
            onClick={() => setVersion("HSV")}
            className={`flex-1 px-4 py-2 font-medium transition-colors ${
              version === "HSV"
                ? "bg-indigo-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            HSV
          </button>
          <button
            onClick={() => setVersion("NKJV")}
            className={`flex-1 px-4 py-2 font-medium transition-colors ${
              version === "NKJV"
                ? "bg-indigo-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            NKJV
          </button>
        </div>

        {/* Exact/Fuzzy toggle */}
        <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
          <button
            onClick={() => setSearchMode("exact")}
            className={`flex-1 px-4 py-2 font-medium transition-colors ${
              searchMode === "exact"
                ? "bg-indigo-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Exact
          </button>
          <button
            onClick={() => setSearchMode("fuzzy")}
            className={`flex-1 px-4 py-2 font-medium transition-colors ${
              searchMode === "fuzzy"
                ? "bg-indigo-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Fuzzy
          </button>
        </div>
      </div>

      {/* Book list */}
      <div>
        <div className="text-sm font-medium mb-2">Boeken</div>
        <div className="max-h-80 overflow-y-auto text-sm">
          {books
            .filter((b) => (hits[b] || 0) > 0) // alleen tonen als er >0 hits zijn
            .map((b) => (
              <button
                key={b}
                className="w-full text-left px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between"
                onClick={() => onSelectBook(b)}
              >
                <span>{b}</span>
                <span className="text-gray-500">({hits[b]})</span>
              </button>
            ))}
        </div>
      </div>
    </aside>
  );
}
