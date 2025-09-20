// client/src/pages/SearchPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Search as SearchIcon, BookOpen } from "lucide-react";
import FilterPanel from "../components/FilterPanel";
import WordFrequencyChart from "../components/WordFrequencyChart";
import SearchResults from "../components/SearchResults";
import ChapterModal from "../components/ChapterModal";
import { useApp } from "../context/AppContext";

export default function SearchPage() {
  const { version, searchMode, savedState, setSavedState, addFavChart } = useApp();

  // UI state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loading, setLoading] = useState(false);

  // Thema’s (zoals Home)
  const [themes, setThemes] = useState([]);
  const [showThemes, setShowThemes] = useState(false);

  // Hoofdstuk modal (zoals Home)
  const [chapter, setChapter] = useState({ open: false, book: "", chapter: 1 });

  // Querywoorden voor grafiek/highlight
  const queryWords = useMemo(() => {
    const fromSaved = (savedState?.chartWords?.length ? savedState.chartWords : null);
    const base = fromSaved ?? query.split(",").map((w) => w.trim()).filter(Boolean);
    return base;
  }, [savedState?.chartWords, query]);

  // Initial: zet startquery per versie en haal resultaten
  useEffect(() => {
    const initial = version === "HSV" ? "geloof, genade" : "faith, grace";
    setQuery(initial);
  }, [version]);

  // Thema’s laden (zoals Home)
  useEffect(() => {
    (async () => {
      try {
        const text = await import("../utils/themes.txt?raw");
        const lines = text.default.split("\n").map((l) => l.trim()).filter(Boolean);
        const parsed = lines.map((l) => {
          const [ver, theme, words] = l.split(":").map((s) => s.trim());
          return { version: ver, theme, words: words.split(",").map((w) => w.trim()) };
        });
        setThemes(parsed);
      } catch {
        // optioneel: console.warn("Kon themes.txt niet laden");
      }
    })();
  }, []);

  // Herstel eerder opgeslagen state (zoals Home)
  useEffect(() => {
    if (savedState?.query !== undefined) {
      setQuery(savedState.query || "");
      setResults(savedState.results || []);
    }
  }, []); // alleen bij mount

  // Zoekfunctie (sluit aan op nieuwe backend /api/search)
  const performSearch = useCallback(
    async (q, book) => {
      const words = (q || "").split(",").map((w) => w.trim()).filter(Boolean);
      if (!words.length) { setResults([]); return; }

      setLoading(true);
      try {
        const qs = new URLSearchParams({
          version,
          mode: searchMode || "or",
          q: words.join(","),                // server ondersteunt q ALIAS
          ...(book ? { book } : {}),
          page: "1",
          resultLimit: "50",
        }).toString();

        const res = await fetch(`/api/search?${qs}`);
        const data = await res.json();
        setResults(Array.isArray(data.results) ? data.results : []);
        setSavedState?.({ query: q, results: data.results, chartWords: words });
      } finally {
        setLoading(false);
      }
    },
    [version, searchMode, setSavedState]
  );

  // Initieel en bij wijzigingen opnieuw zoeken
  useEffect(() => {
    if (!query) return;
    performSearch(query, selectedBook);
  }, [version, searchMode, query, selectedBook, performSearch]);

  // Handlers — identiek aan Home-gedrag
  const handleSearchSubmit = async (e) => {
    e?.preventDefault();
    setSelectedBook(null);
    await performSearch(query, null);
  };

  const handleThemeSelect = (t) => {
    const q = t.words.join(", ");
    setQuery(q);
    setShowThemes(false);
    setSelectedBook(null);
    performSearch(q, null);
  };

  const onChartDrill = ({ book, word }) => {
    setSelectedBook(book);
    // zelfde logica als Home: gebruik bestaande query als die er is, anders enkel het aangeklikte woord
    const nextQ = (query && query.trim().length) ? query : (word || "");
    performSearch(nextQ, book);
  };

  const onFavChart = (chart) => addFavChart?.(chart);

  const onClickWord = (w) => {
    const current = query.split(",").map((s) => s.trim()).filter(Boolean);
    if (!current.includes(w)) {
      const newQ = [...current, w].join(", ");
      setQuery(newQ);
      setSelectedBook(null);
      performSearch(newQ, null);
    }
  };

  const onReadChapter = (book, ch) => setChapter({ open: true, book, chapter: ch });

  return (
    <section className="max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      {/* STICKY: grafiek + zoekbalk */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700">
        {/* grafiek */}
        <div className="pt-3 px-1">
          <WordFrequencyChart
            queryWords={queryWords}
            onClickDrill={onChartDrill}
            onFavChart={onFavChart}
          />
        </div>

        {/* zoekbalk + thema-button */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 px-1 pb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek in de Bijbel... (meerdere woorden met ,)"
            className="flex-1 p-3 rounded-lg border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800"
          />
          <button type="submit" className="bg-indigo-500 text-white px-4 py-3 rounded-lg hover:bg-indigo-600">
            <SearchIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowThemes((s) => !s)}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 shadow-md rounded-lg px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <BookOpen className="w-5 h-5 text-indigo-500" /> Thema’s
          </button>
        </form>
      </div>

      {/* Thema-lijst */}
      {showThemes && (
        <div className="grid gap-4 mb-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow overflow-y-auto max-h-60">
          {themes.filter((t) => t.version === version).map((t, idx) => (
            <div
              key={idx}
              className="p-3 bg-white dark:bg-gray-700 rounded-lg shadow hover:bg-indigo-50 dark:hover:bg-indigo-600 cursor-pointer"
              onClick={() => handleThemeSelect(t)}
            >
              <h4 className="font-semibold text-indigo-600 dark:text-indigo-300">{t.theme}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">{t.words.join(", ")}</p>
            </div>
          ))}
        </div>
      )}

      {/* content: resultaten + filters */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-6 flex-1 overflow-hidden">
        {/* resultaten scrollen */}
        <div className="overflow-y-auto pr-2">
          <SearchResults
            results={results}
            queryWords={queryWords}
            version={version}
            onClickWord={onClickWord}
            onReadChapter={onReadChapter}
          />
        </div>

        {/* filters rechts */}
        <div>
          <FilterPanel
            queryWords={queryWords}
            onSelectBook={(b) => {
              setSelectedBook(b);
              performSearch(query, b);
            }}
          />
        </div>
      </div>

      {/* hoofdstukmodal */}
      <ChapterModal
        open={chapter.open}
        onClose={() => setChapter({ open: false, book: "", chapter: 1 })}
        version={version}
        book={chapter.book}
        chapter={chapter.chapter}
      />
    </section>
  );
}
