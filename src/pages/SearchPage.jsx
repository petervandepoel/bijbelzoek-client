// client/src/pages/SearchPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search as SearchIcon, BookOpen, ArrowUp, Bot } from "lucide-react";
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
    x = x.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // strip diacritics
  } catch {}
  x = x.replace(/\u00a0/g, " "); // nbsp → space
  x = x.replace(/[.\-_,]/g, " "); // punctuation → space
  x = x.replace(/\s+/g, " ").trim();
  // vaak voorkomende NL varianten normaliseren
  x = x
    .replace(/\bkorint(iers|iers|iersen|he|he?rs)\b/g, "korinthe")
    .replace(/\befe(z|z)ers\b/g, "efeze")
    .replace(/\bfilip+enzen\b/g, "filippenzen")
    .replace(/\bkoningen\b/g, "koningen")
    .replace(/\bkronieken\b/g, "kronieken");
  // roman cijfers → arabisch (i, ii, iii)
  x = x.replace(/^(i{1,3})\s+/, (m, r) => (r === "i" ? "1 " : r === "ii" ? "2 " : "3 "));
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
        // Variaties met cijfers/hyphen/no-space
        const m = base.match(/^([123])\s+(.*)$/);
        if (m) {
          addIndex(map, `${m[1]}${m[2]}`, idx);
          addIndex(map, `${m[1]}-${m[2]}`, idx);
        }
        // Roman variant keys als extra zekerheid
        const r = base.replace(/^([123])\s+/, (__, n) => (n === "1" ? "i " : n === "2" ? "ii " : "iii "));
        addIndex(map, r, idx);
        addIndex(map, r.replace(/\s+/g, ""), idx);
      }
    });
  } else {
    // Fallback NL-volgorde (beknopt)
    const fallback = [
      "Genesis","Exodus","Leviticus","Numeri","Deuteronomium",
      "Jozua","Richteren","Ruth","1 Samuel","2 Samuel",
      "1 Koningen","2 Koningen","1 Kronieken","2 Kronieken","Ezra",
      "Nehemia","Ester","Job","Psalmen","Spreuken",
      "Prediker","Hooglied","Jesaja","Jeremia","Klaagliederen",
      "Ezechiel","Ezechiël","Daniel","Daniël","Daniël","Hosea","Joël","Amos",
      "Obadja","Jona","Micha","Nahum","Habakuk",
      "Sefanja","Haggai","Zacharia","Maleachi",
      "Mattheus","Mattheüs","Markus","Lukas","Johannes","Handelingen",
      "Romeinen","1 Korinthe","2 Korinthe","1 Korintiers","2 Korintiers","1 Korintiërs","2 Korintiërs",
      "Galaten","Efeze","Efeziers","Efeziërs",
      "Filippenzen","Kolossenzen","1 Thessalonicenzen","2 Thessalonicenzen",
      "1 Timotheus","2 Timotheus","1 Timotheüs","2 Timotheüs",
      "Titus","Filemon","Hebreeen","Hebreeën","Jakobus",
      "1 Petrus","2 Petrus","1 Johannes","2 Johannes","3 Johannes",
      "Judas","Openbaring"
    ];
    fallback.forEach((n, idx) => {
      const base = normalizeBookName(n);
      addIndex(map, base, idx);
      const m = base.match(/^([123])\s+(.*)$/);
      if (m) {
        addIndex(map, `${m[1]}${m[2]}`, idx);
        addIndex(map, `${m[1]}-${m[2]}`, idx);
      }
      const r = base.replace(/^([123])\s+/, (__, n) => (n === "1" ? "i " : n === "2" ? "ii " : "iii "));
      addIndex(map, r, idx);
      addIndex(map, r.replace(/\s+/g, ""), idx);
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
  const { version, searchMode, savedState, setSavedState, addFavChart, addFavText, isFavText, removeFavText } = useApp();
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

  // Init query
  const initialQuery = useMemo(() => {
    const wordsParam = params.get("words");
    if (wordsParam) {
      return wordsParam.split(",").map(s => s.trim()).filter(Boolean).join(", ");
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

  // AI toggle only (geen samenvatting)
  const [aiPassages, setAiPassages] = useState([]); // {ref, text, ...}
  const [showAi, setShowAi] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const aiQueryKeyRef = useRef("");

  const queryWords = useMemo(
    () => query.split(",").map((w) => w.trim()).filter(Boolean),
    [query]
  );

  // Zoeken
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
        if (!res.ok) throw new Error(`HTTP ${res.status} at ${url}\n${text.slice(0, 160)}`);
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

  // Reset AI-set als zoekwoorden wijzigen (geen fetch, geen vertraging)
  useEffect(() => {
    const key = `${version}|${queryWords.join("|")}`;
    aiQueryKeyRef.current = key;
    setAiPassages([]);
    setShowAi(false);
    setAiBusy(false);
  }, [version, queryWords.join("|")]);

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

  const onReadChapter = (book, ch) => setChapter({ open: true, book, chapter: ch });
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // sorteren (Genesis → Openbaring) voor reguliere resultaten
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

  // hulpfunctie: parse "Boek X:Y" → { book, chapter }
  function parseRef(ref) {
    if (!ref) return null;
    const m = String(ref).replace(/\u00a0/g, " ").match(/^(.+?)\s+(\d+):/);
    if (!m) return null;
    return { book: m[1].trim(), chapter: Number(m[2]) || 1 };
  }

  // AI passages: on-demand fetch
  async function fetchAiPassages() {
    try {
      setAiBusy(true);
      const currentKey = aiQueryKeyRef.current;
      const res = await fetch("/api/ai/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "bijbelstudie",
          context: { queryWords, results: results.slice(0, 10) },
        }),
      });
      const data = await res.json();
      // Als query intussen veranderde, negeren we deze respons
      if (currentKey !== aiQueryKeyRef.current) return;

      const cps = Array.isArray(data?.central_passages) ? data.central_passages : [];
      // Sorteer volgens Bijbelvolgorde
      const sorted = [...cps].sort((a, b) => {
        const ra = String(a?.ref || "");
        const rb = String(b?.ref || "");
        const ma = ra.match(/^(.+?)\s+(\d+):/);
        const mb = rb.match(/^(.+?)\s+(\d+):/);
        const ia = ma ? bookIndex(ma[1]) : 999;
        const ib = mb ? bookIndex(mb[1]) : 999;
        if (ia !== ib) return ia - ib;
        const ca = ma ? Number(ma[2] || 0) : 0;
        const cb = mb ? Number(mb[2] || 0) : 0;
        return ca - cb;
      });
      setAiPassages(sorted.slice(0, 10));
    } catch (e) {
      console.error("AI passages error:", e);
      setAiPassages([]);
    } finally {
      setAiBusy(false);
    }
  }

  function handleToggleAi() {
    const willShow = !showAi;
    setShowAi(willShow);
    if (willShow && aiPassages.length === 0 && !aiBusy) {
      fetchAiPassages();
    }
  }

  // AI kaarten render
  function renderAICards() {
    if (!showAi || !aiPassages?.length) return null;
    return aiPassages.map((cp, i) => {
      const ref = cp?.ref || "";
      const text = cp?.text || "";
      const refInfo = parseRef(ref);
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
        <div key={`ai-pass-${i}`} className="mb-3 bg-gray-50 dark:bg-gray-900 rounded p-3">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-600" />
              <span className="text-sm text-indigo-700 dark:text-indigo-300">{ref}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Favoriet / Bewaar knop */}
              <button
                onClick={toggleFav}
                className={
                  "text-xs px-2 py-1 rounded border inline-flex items-center gap-1 " +
                  (fav
                    ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-900/20 dark:text-amber-300"
                    : "border-amber-400 text-amber-600 bg-white dark:bg-gray-800")
                }
                title={fav ? "Verwijderen uit favorieten" : "Toevoegen aan favorieten"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill={fav ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.782 1.402 8.174L12 18.896l-7.336 3.851 1.402-8.174L.132 9.211l8.2-1.193z" />
                </svg>
                {fav ? "Favoriet" : "Bewaar"}
              </button>

              {/* Hoofdstuk knop */}
              {refInfo && (
                <button
                  onClick={() => onReadChapter(refInfo.book, refInfo.chapter)}
                  className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  title="Open hoofdstuk"
                >
                  Hoofdstuk
                </button>
              )}
            </div>
          </div>
          <p className="text-sm whitespace-pre-wrap">{text}</p>
        </div>
      );
    });
  }

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
              <h2 className="text-base sm:text-lg font-semibold text-sky-900 dark:text-sky-100 mb-1">Uitleg</h2>
              <p className="text-sm text-sky-900/90 dark:text-sky-100/90">
                Zoek op basis van <strong>zoekwoorden</strong> of <strong>thema’s</strong> naar relevante teksten in de Bijbel.
                Bewaar daarna <strong>teksten</strong> en de <strong>grafiek</strong> als favoriet: zo bouw je je eigen selectie op.
                Klaar met samenstellen? Ga door naar <Link to="/favorites" className="text-indigo-700 underline hover:no-underline">Studeer</Link> om je resultaten te verrijken.
              </p>
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
                <div className="text-xs text-gray-500 truncate">{t.words.join(", ")}</div>
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

      {/* Resultaten + Filter */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-6">
        <div>
          {loading && <p className="text-sm text-gray-500 mb-2">Zoeken…</p>}

          {/* AI toggle knop */}
          <div className="mb-4">
            <button
              onClick={handleToggleAi}
              disabled={aiBusy}
              className={
                "flex items-center gap-2 text-sm px-3 py-2 rounded border " +
                (showAi
                  ? "border-indigo-600 text-indigo-700 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-indigo-400 text-indigo-600 bg-white hover:bg-indigo-50 dark:bg-gray-800 dark:hover:bg-gray-700")
              }
              title="Toon of verberg AI-teksten (op aanvraag)"
            >
              <Bot className="w-4 h-4" />
              {aiBusy ? "Laden…" : showAi ? "Verberg AI Bijbelteksten" : "Toon relevante AI Bijbelteksten"}
            </button>
          </div>

          {/* AI-teksten (als losse kaarten, vergelijkbaar met reguliere kaarten) */}
          {renderAICards()}

          {/* reguliere zoekresultaten */}
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

      {/* Hoofdstuk modal met navigatie */}
      <ChapterModal
        open={chapter.open}
        onClose={() => setChapter({ open: false, book: "", chapter: 1 })}
        version={version}
        book={chapter.book}
        chapter={chapter.chapter}
        onChangeChapter={(newCh) => setChapter({ open: true, book: chapter.book, chapter: newCh })}
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
