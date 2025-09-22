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

// ————— UI kleuren (stabiel en herkenbaar) —————
const palette = [
  "#6366f1", // indigo
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#14b8a6", // teal
  "#a855f7", // purple
  "#3b82f6", // blue
  "#ec4899", // pink
  "#84cc16", // lime
  "#fb923c", // orange
];

// Canonieke boekenlijst per vertaling
function canonicalBooks(version) {
  return version === "HSV" ? BOOKS_NL : BOOKS_EN;
}

// Normaliseer array naar sleutel (voor fav-vergelijking)
const normalize = (arr) =>
  (arr || [])
    .filter(Boolean)
    .map((w) => String(w).trim().toLowerCase())
    .sort();

const chartKey = (version, words) => JSON.stringify([version, normalize(words)]);

// ————— Diacritics helpers —————
const stripDia = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function expandForStats(word) {
  // Doel: zorgen dat "Israel" ook "Israël" dekt in de stats API (die per woord telt).
  // We nemen bij 'Israel' (diacritics-onafhankelijk) beide vormen mee.
  const base = String(word || "");
  const nd = stripDia(base).toLowerCase();
  // Zet de "mooiere" labels voor de aggregatie
  if (nd === "israel") {
    // De stats-call krijgt beide varianten; we aggregeren ze in de UI tot één balk "Israel".
    return ["Israel", "Israël"];
  }
  return [base];
}

export default function WordFrequencyChart({ queryWords, onClickDrill, onFavChart }) {
  const app = useApp();
  const version = app?.version;
  const searchMode = app?.searchMode;

  // Favorieten vanuit context (wanneer beschikbaar)
  const favCharts = app?.favCharts || [];
  const addFavChart = app?.addFavChart;
  const removeFavChart = app?.removeFavChart;

  const [data, setData] = useState([]);

  const books = useMemo(() => canonicalBooks(version), [version]);

  // Actieve woorden (UI-labels): dit blijft precies wat de gebruiker heeft ingevoerd
  const wordList = useMemo(() => {
    const w = (queryWords || []).map((s) => s.trim()).filter(Boolean);
    return w.length
      ? w.slice(0, 10)
      : version === "HSV"
      ? ["geloof", "genade"]
      : ["faith", "grace"];
  }, [queryWords, version]);

  // Woorden voor de stats-call (kan extra varianten bevatten, bv. "Israel" + "Israël")
  const statsWords = useMemo(() => {
    const set = new Set();
    wordList.forEach((w) => expandForStats(w).forEach((x) => set.add(x)));
    return Array.from(set);
  }, [wordList]);

  // Favoriet-detectie
  const currentKey = chartKey(version, wordList);
  const isFavorited = useMemo(() => {
    return favCharts.some((c) => chartKey(c.version, c.words) === currentKey);
  }, [favCharts, currentKey]);

  // Data laden en client-side aggregeren (zodat Israel + Israël samen in 1 balk “Israel” zitten)
  useEffect(() => {
    const load = async () => {
      if (!statsWords.length) return;
      const wordsParam = encodeURIComponent(statsWords.join(","));
      const res = await fetch(
        `/api/stats/wordcounts?version=${version}&mode=${searchMode}&words=${wordsParam}`
      );
      const json = await res.json();

      // json.data is per { book, <woord1>: count, <woord2>: count, ... }
      const incoming = Array.isArray(json.data) ? json.data : [];
      const byBook = new Map(incoming.map((row) => [row.book, row]));

      // Aggregatie: bundel eventuele varianten terug tot de "UI-woorden" (wordList)
      // Voorbeeld: UI-woord "Israel" => som van kolommen "Israel" + "Israël" (als aanwezig)
      const rows = books.map((book) => {
        const baseRow = { book };
        const src = byBook.get(book) || {};
        wordList.forEach((uiWord) => {
          const variants = expandForStats(uiWord); // bv. ["Israel","Israël"] of alleen ["genade"]
          const sum = variants.reduce((acc, v) => acc + (Number(src[v]) || 0), 0);
          baseRow[uiWord] = sum;
        });
        return baseRow;
      });

      setData(rows);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, searchMode, books, JSON.stringify(statsWords)]);

  // Klik op grafiek → stuur ALLE zoekwoorden door + het gekozen boek
  const handleChartClick = (e) => {
    if (!e || !e.activePayload) return;
    const row = e.activePayload[0]?.payload;
    const clickedWord = e.activePayload.find((p) => p.dataKey)?.dataKey;
    if (row) {
      onClickDrill?.({
        book: row.book,
        words: [...wordList],       // **alle** actieve woorden meenemen
        focusWord: clickedWord || null, // optioneel: welke balk werd exact geklikt
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
      // Fallback naar prop
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
          <Star
            className="w-4 h-4"
            stroke="currentColor"
            fill={isFavorited ? "currentColor" : "none"}
          />
          <span>{isFavorited ? "Favoriet" : "Bewaar grafiek"}</span>
        </button>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} onClick={handleChartClick} margin={{ bottom: 70 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis
              dataKey="book"
              stroke="currentColor"
              interval={0}
              tick={{ fontSize: 10 }}
              angle={-60}
              textAnchor="end"
            />
            <YAxis stroke="currentColor" />
            <Tooltip />
            <Legend verticalAlign="top" height={36} />
            {wordList.map((w, idx) => (
              <Bar
                key={w}
                dataKey={w}
                name={w}
                // NB: Geen stackId = gegroepeerde balken naast elkaar;
                // wil je stapelen, zet stackId="a"
                fill={palette[idx % palette.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
