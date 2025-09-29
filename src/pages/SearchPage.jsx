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

/* ──────────────────────────────────────────────────────────────────────────────
   Canonieke boekenlijst en volgorde (Genesis → Openbaring) + robuuste matching
   ─────────────────────────────────────────────────────────────────────────── */
const BOOKS = BooksMod?.BOOKS || BooksMod?.default || [];

function normalizeBookName(str) {
  if (!str) return "";
  let x = String(str).toLowerCase();
  try {
    x = x.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  } catch {}
  x = x.replace(/\u00a0/g, " ");
  x = x.replace(/[.\-_,]/g, " ");
  x = x.replace(/\s+/g, " ").trim();
  x = x
    .replace(/\bkorint(iers|iers|iersen|he|he?rs)\b/g, "korinthe")
    .replace(/\befe(z|z)ers\b/g, "efeze")
    .replace(/\bfilip+enzen\b/g, "filippenzen")
    .replace(/\bkoningen\b/g, "koningen")
    .replace(/\bkronieken\b/g, "kronieken");
  x = x.replace(/^(i{1,3})\s+/, (m, r) =>
    r === "i" ? "1 " : r === "ii" ? "2 " : "3 "
  );
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
        const m = base.match(/^([123])\s+(.*)$/);
        if (m) {
          addIndex(map, `${m[1]}${m[2]}`, idx);
          addIndex(map, `${m[1]}-${m[2]}`, idx);
        }
        const r = base.replace(/^([123])\s+/, (__, n) =>
          n === "1" ? "i " : n === "2" ? "ii " : "iii "
        );
        addIndex(map, r, idx);
        addIndex(map, r.replace(/\s+/g, ""), idx);
      }
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

export default function SearchPage() {
  const { version, searchMode, savedState, setSavedState, addFavChart } = useApp();
  const [params] = useSearchParams();

  // Wegklikbare uitleg
  const [showHelp, setShowHelp] = useState(true);
  useEffect(() => {
    const dismissed = localStorage.getItem("search_help_dismissed") === "1";
    if (dismissed) setShowHelp(false);
  }, []);
  function dismissHelp() {
    setShowHelp(false);
    localStorage.setItem("search_help_dismissed", "1");
  }

  // Detectie: mobiel < 768px
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Init query
  const initialQuery = useMemo(() => {
    const wordsParam = params.get("words");
    if (wordsParam) {
      return wordsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(", ");
    }
    if (savedState?.query?.trim()) {
      return savedState.query.trim();
    }
    return "genade, vrede, verlossing";
  }, []);

  // State
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

  // Zoeken
  const performSearch = useCallback(
    async (q, book = null, opt = {}) => {
      const words = (q || "")
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean);
      if (!words.length) {
        setResults([]);
        setSavedState?.((prev) => ({
          ...(prev || {}),
          query: q || "",
          results: [],
          chartWords: [],
        }));
        return;
      }

      const useVersion = opt.version || version;
      const useMode = opt.mode || searchMode;
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          version: useVersion,
          mode: useMode || "or",
          words: words.join(","),
          ...(book ? { book } : {}),
          page: "1",
          resultLimit: "50",
        }).toString();

        const RAW_BASE = (API_BASE || "/api").replace(/\/+$/, "");
        const API = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;
        const url = `${API}/search?${qs}`;
        const res = await fetch(url);
        const text = await res.text();
        if (!res.ok)
          throw new Error(`HTTP ${res.status} at ${url}\n${text.slice(0, 160)}`);
        const data = JSON.parse(text);
        const incoming = Array.isArray(data.results) ? data.results : [];
        setResults(incoming);
        setSavedState?.({ query: q, results: incoming, chartWords: words });
      } catch (err) {
        console.error("❌ Search fetch error:", err);
      } finally {
        setLoading(false);
      }
    },
    [version, searchMode, setSavedState]
  );

  // INIT
  useEffect(() => {
    if (didInitSearch.current) return;
    didInitSearch.current = true;
    const modeParam = params.get("mode");
    const versionParam = params.get("version");
    performSearch(initialQuery, null, {
      mode: modeParam || searchMode,
      version: versionParam || version,
    });
  }, []);

  // Re-search bij wissel van versie/mode
  useEffect(() => {
    if (!didInitSearch.current) return;
    if (!query.trim()) return;
    performSearch(query, selectedBook || null);
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

  // Scroll detect
  useEffect(() => {
    const handleScroll = () => setShowTop(window.scrollY > 200);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handlers
  const handleSearchSubmit = async (e) => {
    e?.preventDefault();
    setSelectedBook(null);
    await performSearch(query, null);
  };

  const handleThemeSelect = (t) => {
    const q = t.words.join(", ");
    setQuery(q);
    setSavedState?.((prev) => ({ ...(prev || {}), query: q }));
    setShowThemes(false);
    setSelectedBook(null);
    performSearch(q, null);
  };

  const onChartDrill = ({ book }) => {
    setSelectedBook(book);
    performSearch(query, book);
  };

  const onInputChange = (val) => {
    setQuery(val);
    setSavedState?.((prev) => ({ ...(prev || {}), query: val }));
  };

  const onClickWord = (w) => {
    const current = query.split(",").map((s) => s.trim()).filter(Boolean);
    if (!current.includes(w)) {
      const newQ = [...current, w].join(", ");
      setQuery(newQ);
      setSavedState?.((prev) => ({ ...(prev || {}), query: newQ }));
      setSelectedBook(null);
      performSearch(newQ, null);
    }
  };

  const onReadChapter = (book, ch) =>
    setChapter({ open: true, book, chapter: ch });
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const sortedResults = useMemo(() => {
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

  const chartKey = useMemo(
    () => `chart-${version}-${queryWords.join("|")}`,
    [version, queryWords]
  );

  return (
    <section ref={topRef} className="max-w-7xl mx-auto flex flex-col">
      {/* Uitleg */}
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
              <h2 className="text-base sm:text-lg font-semibold text-sky-900 dark:text-sky-100 mb-1">
                Uitleg
              </h2>
              <p className="text-sm text-sky-900/90 dark:text-sky-100/90">
                Zoek op basis van <strong>zoekwoorden</strong> of{" "}
                <strong>thema’s</strong> naar relevante teksten in de Bijbel. Gebruik de{" "}
                <strong>grafiek (klikbaar!)</strong> of de filters om te zoeken per Bijbelboek.
                Bewaar daarna <strong>teksten</strong> en de <strong>grafiek</strong> als favoriet: zo bouw je je eigen selectie op.
                Klaar met samenstellen? Ga door naar{" "}
                <Link
                  to="/favorites"
                  className="text-indigo-700 underline hover:no-underline"
                >
                  Studeer
                </Link>{" "}
                om je resultaten te verrijken.
              </p>
              {isMobile && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                  ⚠️ Je bezoekt deze site met een klein(er) scherm waardoor de site minder prettig werkt.
                  We bevelen een tablet/PC aan voor optimaal resultaat.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* zoekbalk */}
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 px-1 pb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Zoek in de Bijbel… (meerdere woorden met ,)"
          className="flex-1 p-3 rounded-lg border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-800"
        />
        <button
          type="submit"
          className="bg-indigo-500 text-white px-4 py-3 rounded-lg hover:bg-indigo-600"
          aria-label="Zoek"
        >
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

      {/* Thema’s */}
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
                <div className="text-xs text-gray-500 truncate">
                  {t.words.join(", ")}
                </div>
              </button>
            ))}
        </div>
      )}

      {/* grafiek */}
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

      {/* Mobiele filter */}
      <div className="md:hidden px-1 mb-3">
        <details className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <summary className="px-4 py-2 font-medium cursor-pointer select-none">
            📖 Filters & versie
          </summary>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <FilterPanel
              queryWords={queryWords}
              onSelectBook={(b) => {
                setSelectedBook(b);
                performSearch(query, b);
              }}
            />
          </div>
        </details>
      </div>

      {/* Resultaten + desktop Filter */}
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

        <div className="hidden md:block">
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
        onChangeChapter={(newCh) =>
          setChapter({ open: true, book: chapter.book, chapter: newCh })
        }
      />

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
