import { useState, useEffect, useCallback } from "react";
import { Search, BookOpen } from "lucide-react";
import SearchResults from "../components/SearchResults";
import WordFrequencyChart from "../components/WordFrequencyChart";
import FilterPanel from "../components/FilterPanel";
import ChapterModal from "../components/ChapterModal";
import { useApp } from "../context/AppContext";

export default function Home() {
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState("");
  const [themes, setThemes] = useState([]);
  const [showThemes, setShowThemes] = useState(false);
  const [filterBook, setFilterBook] = useState(null);
  const [chapter, setChapter] = useState({ open: false, book: "", chapter: 1 });
  const { version, searchMode, savedState, setSavedState, addFavChart } = useApp();

// Initial values  
useEffect(() => {
  const initialQ = version === "HSV" ? "geloof, genade" : "faith, grace";
  setQuery(initialQ);             // zoekbalk vullen
  performSearch(initialQ);        // resultaten en filters laden
}, [version]);

  // Restore saved results and query on mount
  useEffect(() => {
    if (savedState.query !== undefined) {
      setQuery(savedState.query || "");
      setResults(savedState.results || []);
    }
  }, []);

  // Load themes.txt via Vite raw import
  useEffect(() => {
    (async () => {
      const text = await import("../utils/themes.txt?raw");
      const lines = text.default.split("\n").map((l) => l.trim()).filter(Boolean);
      const parsed = lines.map((l) => {
        const [ver, theme, words] = l.split(":").map((s) => s.trim());
        return { version: ver, theme, words: words.split(",").map((w) => w.trim()) };
      });
      setThemes(parsed);
    })();
  }, []);

  const performSearch = useCallback(
    async (q, book) => {
      const words = (q || "").split(",").map((w) => w.trim()).filter(Boolean);
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(words.join(","))}&version=${version}&mode=${searchMode}${
          book ? `&book=${encodeURIComponent(book)}` : ""
        }`
      );
      const data = await res.json();
      setResults(data.results || []);
      setSavedState({ query: q, results: data.results, chartWords: words });
    },
    [version, searchMode]
  );

  const handleSearch = async (e) => {
    e?.preventDefault();
    setFilterBook(null);
    await performSearch(query, null);
  };

  const handleThemeSelect = (t) => {
    const q = t.words.join(", ");
    setQuery(q);
    setShowThemes(false);
    setFilterBook(null);
    performSearch(q, null);
  };

  const onChartDrill = ({ book, word }) => {
    setFilterBook(book);
    performSearch(query || word, book);
  };

  const onFavChart = (chart) => addFavChart(chart);

  const queryWords = (savedState.chartWords?.length ? savedState.chartWords : query.split(","))
    .map((w) => w.trim())
    .filter(Boolean);

  const onClickWord = (w) => {
  const current = query.split(",").map((s) => s.trim()).filter(Boolean);
  if (!current.includes(w)) {
    const newQ = [...current, w].join(", ");
    setQuery(newQ);
    setFilterBook(null);
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
        <form onSubmit={handleSearch} className="flex items-center gap-2 px-1 pb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek in de Bijbel... (meerdere woorden met ,)"
            className="flex-1 p-3 rounded-lg border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800"
          />
          <button type="submit" className="bg-indigo-500 text-white px-4 py-3 rounded-lg hover:bg-indigo-600">
            <Search className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowThemes(!showThemes)}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 shadow-md rounded-lg px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <BookOpen className="w-5 h-5 text-indigo-500" /> Thema’s
          </button>
        </form>
      </div>

      {/* niet-sticky: themalijst */}
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

        {/* filters rechts (blijft gewoon meescrollen met pagina, niet sticky) */}
        <div>
          <FilterPanel
            queryWords={queryWords}
            onSelectBook={(b) => {
              setFilterBook(b);
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
