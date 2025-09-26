// client/src/pages/SearchPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search as SearchIcon, BookOpen, ArrowUp } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import FilterPanel from "../components/FilterPanel";
import WordFrequencyChart from "../components/WordFrequencyChart";
import SearchResults from "../components/SearchResults";
import ChapterModal from "../components/ChapterModal";
import { useApp } from "../context/AppContext";
import API_BASE from "../config";
import * as BooksMod from "../utils/books";

// 🔹 Canonieke boekenlijst en volgorde (Genesis → Openbaring)
const BOOKS = BooksMod?.BOOKS || BooksMod?.default || [];
function makeBookOrderMap() {
  const map = new Map();
  BOOKS.forEach((b, idx) => {
    const candidates = [b?.name, b?.nl, b?.short, b?.abbr, b?.slug].filter(Boolean);
    candidates.forEach((c) => map.set(String(c).toLowerCase(), idx));
  });
  return map;
}
const BOOK_ORDER = makeBookOrderMap();

export default function SearchPage() {
  const { version, searchMode, savedState, setSavedState, addFavChart } = useApp();
  const [params] = useSearchParams();

  // 🧭 Wegklikbare uitleg bovenaan (zelfde stijl als Favorites)
  const [showHelp, setShowHelp] = useState(true);
  useEffect(() => {
    const dismissed = localStorage.getItem("search_help_dismissed") === "1";
    if (dismissed) setShowHelp(false);
  }, []);
  function dismissHelp() {
    setShowHelp(false);
    localStorage.setItem("search_help_dismissed", "1");
  }

  // 🟢 Bereken INIT-query vóór de eerste render (URL → favoriet → fallback)
  const initialQuery = useMemo(() => {
    const wordsParam = params.get("words");
    if (wordsParam) {
      return wordsParam.split(",").map(s => s.trim()).filter(Boolean).join(", ");
    }
    if (savedState?.query?.trim()) {
      return savedState.query.trim();
    }
    return "genade, vrede, verlossing";
    // we willen dit bij mount bepalen; savedState en params zijn stabiel genoeg voor init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loading, setLoading] = useState(false);

  const [themes, setThemes] = useState([]);
  const [showThemes, setShowThemes] = useState(false);

  const [chapter, setChapter] = useState({ open: false, book: "", chapter: 1 });
  const [showTop, setShowTop] = useState(false);
  const topRef = useRef(null);
  const didInitSearch = useRef(false);

  const queryWords = useMemo(
    () => query.split(",").map((w) => w.trim()).filter(Boolean),
    [query]
  );

  // 🔎 Zoeken (altijd ALLE woorden)
  const performSearch = useCallback(
    async (q, book = null, opt = {}) => {
      const words = (q || "").split(",").map((w) => w.trim()).filter(Boolean);
      if (!words.length) {
        setResults([]);
        setSavedState?.((prev) => ({ ...(prev || {}), query: q || "", results: [], chartWords: [] }));
        return;
      }

      const useVersion = opt.version || version;
      const useMode = opt.mode || searchMode;

      setLoading(true);
      try {
        const qs = new URLSearchParams({
          version: useVersion,
          mode: useMode || "or",
          words: words.join(","), // ✅ stuur ALLE woorden mee
          ...(book ? { book } : {}),
          page: "1",
          resultLimit: "50",
        }).toString();

        const RAW_BASE = (API_BASE || "/api").replace(/\/+$/, "");
        const API = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;
        const url = `${API}/search?${qs}`;
        console.log("🔎 Fetching:", url);

        const res = await fetch(url);
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status} at ${url}\n${text.slice(0, 160)}`);
        const data = JSON.parse(text);

        const incoming = Array.isArray(data.results) ? data.results : [];
        setResults(incoming);
        // sla favoriet op als laatste zoekwoorden
        setSavedState?.({ query: q, results: incoming, chartWords: words });
      } catch (err) {
        console.error("❌ Search fetch error:", err);
      } finally {
        setLoading(false);
      }
    },
    [version, searchMode, setSavedState]
  );

  // ⛳ INIT-zoekopdracht — één keer:
  // - Als er ?words= in URL staat (landing), wordt dat favoriet + eerste zoekopdracht.
  // - Anders savedState.query (al in initialQuery), anders fallback.
  useEffect(() => {
    if (didInitSearch.current) return;
    didInitSearch.current = true;

    const modeParam = params.get("mode");
    const versionParam = params.get("version");

    performSearch(initialQuery, null, {
      mode: modeParam || searchMode,
      version: versionParam || version,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // slechts 1x

  // 🔁 Re-search bij wissel van versie/modus (na init) – met ALLE woorden
  useEffect(() => {
    if (!didInitSearch.current) return;
    if (!query.trim()) return;
    performSearch(query, selectedBook || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, searchMode]);

  // Thema’s laden (optioneel)
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
    const handleScroll = () => setShowTop(window.scrollY > 200);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // UI handlers
  const handleSearchSubmit = async (e) => {
    e?.preventDefault();
    setSelectedBook(null);
    await performSearch(query, null);
  };

  const handleThemeSelect = (t) => {
    const q = t.words.join(", ");
    setQuery(q);
    setSavedState?.((prev) => ({ ...(prev || {}), query: q })); // typen/keuze = nieuwe favoriet
    setShowThemes(false);
    setSelectedBook(null);
    performSearch(q, null);
  };

  // ✅ Drill-down: altijd met ALLE huidige woorden (niet terugvallen op enkel één woord)
  const onChartDrill = ({ book /*, word*/ }) => {
    setSelectedBook(book);
    performSearch(query, book);
  };

  const onFavChart = (chart) => addFavChart?.(chart);

  // ✅ TYPEN = nieuwe favoriet (live opslaan), zonder direct te zoeken
  const onInputChange = (val) => {
    setQuery(val);
    setSavedState?.((prev) => ({ ...(prev || {}), query: val })); // favoriet updaten
  };

  // 🔹 Woord aan query toevoegen via klik uit resultaten (zonder bestaande te verliezen)
  const onClickWord = (w) => {
    const current = query.split(",").map((s) => s.trim()).filter(Boolean);
    if (!current.includes(w)) {
      const newQ = [...current, w].join(", ");
      setQuery(newQ);
      setSavedState?.((prev) => ({ ...(prev || {}), query: newQ })); // favoriet bijwerken
      setSelectedBook(null);
      performSearch(newQ, null);
    }
  };

  const onReadChapter = (book, ch) => setChapter({ open: true, book, chapter: ch });
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // ✅ Canonieke sortering (Genesis → Openbaring)
  const sortedResults = useMemo(() => {
    if (!Array.isArray(results) || !results.length || BOOK_ORDER.size === 0) return results;
    return [...results].sort((a, b) => {
      const an = String(a.book || "").toLowerCase();
      const bn = String(b.book || "").toLowerCase();
      const ai = BOOK_ORDER.has(an) ? BOOK_ORDER.get(an) : 999;
      const bi = BOOK_ORDER.has(bn) ? BOOK_ORDER.get(bn) : 999;
      if (ai !== bi) return ai - bi;
      const ac = Number(a.chapter || 0) - Number(b.chapter || 0);
      if (ac !== 0) return ac;
      return Number(a.verse || 0) - Number(b.verse || 0);
    });
  }, [results]);

  // 🔑 Forceer stabiele remount van de grafiek bij wijziging van woorden of versie
  const chartKey = useMemo(
    () => `chart-${version}-${queryWords.join("|")}`,
    [version, queryWords]
  );

  return (
    <section ref={topRef} className="max-w-7xl mx-auto flex flex-col">
      {/* 🔷 Uitleg / help banner */}
      {showHelp && (
        <div className="mx-1 mb-3 rounded-xl border border-sky-200 bg-sky-50 dark:bg-sky-900/30 dark:border-sky-800 p-4 relative shadow-sm">
          <button
            onClick={dismissHelp}
            className="absolute top-2 right-2 text-sky-700 dark:text-sky-200 hover:opacity-80"
            aria-label="Uitleg sluiten"
            title="Sluiten"
          >
            ×
          </button>
          <div className="flex items-start gap-3">
            <div className="text-2xl">📚</div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-sky-900 dark:text-sky-100 mb-1">Uitleg</h2>
              <p className="text-sm text-sky-900/90 dark:text-sky-100/90">
                Zoek op basis van <strong>zoekwoorden</strong> of <strong>thema’s</strong> naar relevante teksten in de Bijbel.
                Bewaar daarna <strong>teksten</strong> en de <strong>grafiek</strong> als favoriet: zo bouw je je eigen selectie op.
                Klaar met samenstellen? Ga door naar <Link to="/favorites" className="text-indigo-700 underline hover:no-underline">Studeer</Link> om je resultaten te
                verrijken met AI en te exporteren naar <strong>PDF/DOCX</strong>.
              </p>
              {/* Voorbeeldje dat visueel lijkt op de echte UI (niet interactief) */}
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-xs text-gray-600 dark:text-gray-300">Johannes 3:16</div>
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-900/30">⭐ Bewaar</span>
                  </div>
                  <p className="text-sm line-clamp-3">
                    Want alzo lief heeft God de wereld gehad, dat Hij Zijn eniggeboren Zoon gegeven heeft...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔹 Zoekbalk boven de grafiek */}
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 px-1 pb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Zoek in de Bijbel… (meerdere woorden met ,)"
          className="flex-1 p-3 rounded-lg border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800"
        />
        <button type="submit" className="bg-indigo-500 text-white px-4 py-3 rounded-lg hover:bg-indigo-600" aria-label="Zoek">
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

      {/* Optioneel: thema’s lijst */}
      {showThemes && themes.length > 0 && (
        <div className="mb-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {themes
            .filter((t) => !t.version || t.version === version)
            .map((t, i) => (
              <button
                key={`${t.theme}-${i}`}
                onClick={() => handleThemeSelect(t)}
                className="text-left p-2 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                title={t.words.join(", ")}
              >
                <div className="font-medium">{t.theme}</div>
                <div className="text-xs text-gray-500 truncate">{t.words.join(", ")}</div>
              </button>
            ))}
        </div>
      )}

      {/* 🔹 Grafiek onder de zoekbalk */}
      <div className="py-3 px-1">
        {queryWords.length > 0 && (
          <WordFrequencyChart
            key={chartKey}
            queryWords={queryWords}
            onClickDrill={onChartDrill}
            onFavChart={addFavChart ? (chart) => addFavChart(chart) : null}
          />
        )}
      </div>

      {/* 🔹 Resultaten + Filter */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-6">
        <div>
          {loading && <p className="text-sm text-gray-500 mb-2">Zoeken…</p>}
          <SearchResults
            results={sortedResults}
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

      {/* Hoofdstuk modal */}
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
          aria-label="Scroll naar boven"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </section>
  );
}
