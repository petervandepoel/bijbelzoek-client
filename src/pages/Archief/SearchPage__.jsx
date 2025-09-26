// client/src/pages/SearchPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search as SearchIcon, BookOpen, ArrowUp } from "lucide-react";
import FilterPanel from "../components/FilterPanel";
import WordFrequencyChart from "../components/WordFrequencyChart";
import SearchResults from "../components/SearchResults";
import ChapterModal from "../components/ChapterModal";
import { useApp } from "../context/AppContext";
import API_BASE from "../config";   // 🔹 API base url

export default function SearchPage() {
  const { version, searchMode, savedState, setSavedState, addFavChart } = useApp();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loading, setLoading] = useState(false);

  const [themes, setThemes] = useState([]);
  const [showThemes, setShowThemes] = useState(false);

  const [chapter, setChapter] = useState({ open: false, book: "", chapter: 1 });

  const [showTop, setShowTop] = useState(false);
  const topRef = useRef(null);

  const queryWords = useMemo(() => {
    return query.split(",").map((w) => w.trim()).filter(Boolean);
  }, [query]);

  // Initieel zoekwoorden per versie
  useEffect(() => {
    const initial = version === "HSV" ? "geloof, genade" : "faith, grace";
    setQuery(initial);
    performSearch(initial, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, searchMode]);

  // Thema’s laden
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
        console.warn("Kon themes.txt niet laden");
      }
    })();
  }, []);

  // Scroll detector voor TOP-knop
  useEffect(() => {
    const handleScroll = () => {
      setShowTop(window.scrollY > 200);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const performSearch = useCallback(
    async (q, book) => {
      const words = (q || "").split(",").map((w) => w.trim()).filter(Boolean);
      if (!words.length) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const qs = new URLSearchParams({
          version,
          mode: searchMode || "or",
          words: words.join(","), // altijd words=
          ...(book ? { book } : {}),
          page: "1",
          resultLimit: "50",
        }).toString();

        // 🔧 ROBUUST: forceer altijd '/api' in de basis-URL en voorkom dubbele slashes
        const RAW_BASE = (API_BASE || "/api").replace(/\/+$/, "");
        const API = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;
        const url = `${API}/search?${qs}`;
        console.log("🔎 Fetching:", url);

        const res = await fetch(url);
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status} at ${url}\n${text.slice(0, 160)}`);
        const data = JSON.parse(text);

        setResults(Array.isArray(data.results) ? data.results : []);
        setSavedState?.({ query: q, results: data.results, chartWords: words });
      } catch (err) {
        console.error("❌ Search fetch error:", err);
      } finally {
        setLoading(false);
      }
    },
    [version, searchMode, setSavedState]
  );

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
    const nextQ = word ? word : query;
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    topRef.current?.focus();
  };

  return (
    <section ref={topRef} className="max-w-7xl mx-auto flex flex-col">
      {/* Grafiek */}
      <div className="py-3 px-1">
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

      {/* content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-6">
        <div>
          {loading && <p className="text-sm text-gray-500 mb-2">Zoeken…</p>}
          <SearchResults
            results={results}
            queryWords={queryWords}
            version={version}
            onClickWord={onClickWord}
            onReadChapter={onReadChapter}
          />
        </div>
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

      {/* TOP helper button */}
      {showTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-indigo-600 text-white rounded-full p-3 shadow-lg hover:bg-indigo-700"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </section>
  );
}
