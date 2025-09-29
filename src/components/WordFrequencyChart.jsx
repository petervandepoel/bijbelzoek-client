// src/components/WordFrequencyChart.jsx
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useApp } from "../context/AppContext";
import { BOOKS_NL, BOOKS_EN } from "../utils/books";
import { Star } from "lucide-react";

const palette = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#14b8a6",
  "#a855f7", "#3b82f6", "#ec4899", "#84cc16", "#fb923c",
];

// Officiële 3-letter afkortingen (NL & EN)
const ABBR_NL = {
  Genesis: "Gen", Exodus: "Exo", Leviticus: "Lev", Numeri: "Num",
  Deuteronomium: "Deu", Jozua: "Joz", Richteren: "Rch", Ruth: "Rut",
  "1 Samuel": "1Sa", "2 Samuel": "2Sa",
  "1 Koningen": "1Ko", "2 Koningen": "2Ko",
  "1 Kronieken": "1Kr", "2 Kronieken": "2Kr",
  Ezra: "Ezr", Nehemia: "Neh", Ester: "Est", Job: "Job", Psalmen: "Psa",
  Spreuken: "Spr", Prediker: "Pre", Hooglied: "Hgl", Jesaja: "Jes",
  Jeremia: "Jer", Klaagliederen: "Kla", Ezechiël: "Eze", Daniël: "Dan",
  Hosea: "Hos", Joël: "Joë", Amos: "Amo", Obadja: "Oba", Jona: "Jon",
  Micha: "Mic", Nahum: "Nah", Habakuk: "Hab", Sefanja: "Sef",
  Haggai: "Hag", Zacharia: "Zac", Maleachi: "Mal",
  Mattheüs: "Mat", Markus: "Mar", Lukas: "Luk", Johannes: "Joh",
  Handelingen: "Han", Romeinen: "Rom",
  "1 Korinthe": "1Ko", "2 Korinthe": "2Ko",
  Galaten: "Gal", Efeze: "Efe", Filippenzen: "Fil", Kolossenzen: "Kol",
  "1 Thessalonicenzen": "1Th", "2 Thessalonicenzen": "2Th",
  "1 Timotheüs": "1Ti", "2 Timotheüs": "2Ti",
  Titus: "Tit", Filemon: "Fil", Hebreeën: "Heb", Jakobus: "Jak",
  "1 Petrus": "1Pe", "2 Petrus": "2Pe",
  "1 Johannes": "1Jo", "2 Johannes": "2Jo", "3 Johannes": "3Jo",
  Judas: "Jud", Openbaring: "Openb",
};

const ABBR_EN = {
  Genesis: "Gen", Exodus: "Exo", Leviticus: "Lev", Numbers: "Num",
  Deuteronomy: "Deu", Joshua: "Jos", Judges: "Jdg", Ruth: "Rut",
  "1 Samuel": "1Sa", "2 Samuel": "2Sa",
  "1 Kings": "1Ki", "2 Kings": "2Ki",
  "1 Chronicles": "1Ch", "2 Chronicles": "2Ch",
  Ezra: "Ezr", Nehemiah: "Neh", Esther: "Est", Job: "Job", Psalms: "Psa",
  Proverbs: "Pro", Ecclesiastes: "Ecc", "Song of Solomon": "Son", Isaiah: "Isa",
  Jeremiah: "Jer", Lamentations: "Lam", Ezekiel: "Eze", Daniel: "Dan",
  Hosea: "Hos", Joel: "Joe", Amos: "Amo", Obadiah: "Oba", Jonah: "Jon",
  Micah: "Mic", Nahum: "Nah", Habakkuk: "Hab", Zephaniah: "Zep",
  Haggai: "Hag", Zechariah: "Zec", Malachi: "Mal",
  Matthew: "Mat", Mark: "Mar", Luke: "Luk", John: "Joh",
  Acts: "Act", Romans: "Rom",
  "1 Corinthians": "1Co", "2 Corinthians": "2Co",
  Galatians: "Gal", Ephesians: "Eph", Philippians: "Phi", Colossians: "Col",
  "1 Thessalonians": "1Th", "2 Thessalonians": "2Th",
  "1 Timothy": "1Ti", "2 Timothy": "2Ti",
  Titus: "Tit", Philemon: "Phm", Hebrews: "Heb", James: "Jam",
  "1 Peter": "1Pe", "2 Peter": "2Pe",
  "1 John": "1Jo", "2 John": "2Jo", "3 John": "3Jo",
  Jude: "Jud", Revelation: "Rev",
};

function canonicalBooks(version) {
  return version === "HSV" ? BOOKS_NL : BOOKS_EN;
}

const normalize = (arr) =>
  (arr || [])
    .filter(Boolean)
    .map((w) => String(w).trim().toLowerCase())
    .sort();

const chartKey = (version, words) => JSON.stringify([version, normalize(words)]);

const stripDia = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function expandForStats(word) {
  const base = String(word || "");
  const nd = stripDia(base).toLowerCase();
  if (nd === "israel") {
    return ["Israel", "Israël"];
  }
  return [base];
}

export default function WordFrequencyChart({
  queryWords,
  version: forcedVersion,
  onClickDrill,
  onFavChart,
}) {
  const app = useApp();
  const version = forcedVersion || app?.version;
  const searchMode = app?.searchMode;
  const favCharts = app?.favCharts || [];
  const addFavChart = app?.addFavChart;
  const removeFavChart = app?.removeFavChart;
  const [data, setData] = useState([]);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const books = useMemo(() => canonicalBooks(version), [version]);

  const wordList = useMemo(() => {
    const w = (queryWords || []).map((s) => s.trim()).filter(Boolean);
    return w.length
      ? w.slice(0, 10)
      : version === "HSV"
      ? ["geloof", "genade"]
      : ["faith", "grace"];
  }, [queryWords, version]);

  const statsWords = useMemo(() => {
    const set = new Set();
    wordList.forEach((w) => expandForStats(w).forEach((x) => set.add(x)));
    return Array.from(set);
  }, [wordList]);

  const currentKey = chartKey(version, wordList);
  const isFavorited = useMemo(() => {
    return favCharts.some((c) => chartKey(c.version, c.words) === currentKey);
  }, [favCharts, currentKey]);

  useEffect(() => {
    const load = async () => {
      if (!statsWords.length) return;
      const wordsParam = encodeURIComponent(statsWords.join(","));
      const res = await fetch(
        `/api/stats/wordcounts?version=${version}&mode=${searchMode}&words=${wordsParam}`
      );
      const json = await res.json();

      const incoming = Array.isArray(json.data) ? json.data : [];
      const byBook = new Map(incoming.map((row) => [row.book, row]));

      const rows = books.map((book) => {
        const baseRow = { book };
        const src = byBook.get(book) || {};
        wordList.forEach((uiWord) => {
          const variants = expandForStats(uiWord);
          const sum = variants.reduce((acc, v) => acc + (Number(src[v]) || 0), 0);
          baseRow[uiWord] = sum;
        });
        return baseRow;
      });

      setData(rows);
    };
    load();
  }, [version, searchMode, books, JSON.stringify(statsWords)]);

  const handleChartClick = (e) => {
    if (!e || !e.activePayload) return;
    const row = e.activePayload[0]?.payload;
    const clickedWord = e.activePayload.find((p) => p.dataKey)?.dataKey;
    if (row) {
      onClickDrill?.({
        book: row.book,
        words: [...wordList],
        focusWord: clickedWord || null,
      });
    }
  };

  async function handleFavoriteClick() {
    if (isFavorited && typeof removeFavChart === "function") {
      const found = favCharts.find((c) => chartKey(c.version, c.words) === currentKey);
      if (found && (found.id || found._id)) {
        removeFavChart(found.id || found._id);
        return;
      }
    }
    if (!isFavorited) {
      if (typeof addFavChart === "function") {
        addFavChart({
          id: Math.random().toString(36).slice(2, 10),
          title: `Woordfrequentie: ${wordList.join(", ")} — ${version}`,
          version,
          words: [...wordList],
          note: "",
        });
        return;
      }
      onFavChart?.({
        title: `Woordfrequentie: ${wordList.join(", ")} — ${version}`,
        version,
        words: [...wordList],
      });
    }
  }

  if (!wordList.length) {
    return <p className="text-gray-500">Geen woorden opgegeven.</p>;
  }

  // Custom formatter voor boeklabels
  function formatBookLabel(book) {
    if (!isMobile) return book;
    const lower = book.toLowerCase();
    if (lower.startsWith("gen")) return version === "HSV" ? "Genesis" : "Genesis";
    if (lower.startsWith("openbar") || lower.startsWith("revel")) {
      return version === "HSV" ? "Openbaring" : "Revelation";
    }
    return version === "HSV" ? (ABBR_NL[book] || book.slice(0, 3)) : (ABBR_EN[book] || book.slice(0, 3));
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Woordfrequentie per boek</h3>
        <button
          onClick={handleFavoriteClick}
          className={
            "flex items-center gap-2 text-sm px-3 py-1 rounded border transition " +
            (isFavorited
              ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-900/20 dark:text-amber-300"
              : "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-indigo-700 dark:text-indigo-300")
          }
          aria-pressed={isFavorited}
          title={isFavorited ? "Verwijderen uit favorieten" : "Toevoegen aan favorieten"}
        >
          <Star className="w-4 h-4" stroke="currentColor" fill={isFavorited ? "currentColor" : "none"} />
          <span>{isFavorited ? "Favoriet" : "Bewaar grafiek"}</span>
        </button>
      </div>

      <div className="h-60 md:h-80 overflow-x-auto">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} onClick={handleChartClick} margin={{ bottom: isMobile ? 40 : 70 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis
              dataKey="book"
              stroke="currentColor"
              interval={0}
              tick={{ fontSize: isMobile ? 9 : 10 }}
              angle={isMobile ? -30 : -60}
              textAnchor="end"
              tickFormatter={formatBookLabel}
            />
            <YAxis stroke="currentColor" />
            <Tooltip />
            <Legend verticalAlign="top" height={36} />
            {wordList.map((w, idx) => (
              <Bar key={w} dataKey={w} name={w} stackId="a" fill={palette[idx % palette.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
