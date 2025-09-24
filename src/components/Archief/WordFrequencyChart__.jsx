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

function canonicalBooks(version) {
  return version === "HSV" ? BOOKS_NL : BOOKS_EN;
}

// Helpers om favoriet te detecteren
const normalize = (arr) =>
  (arr || [])
    .filter(Boolean)
    .map((w) => String(w).trim().toLowerCase())
    .sort();

const chartKey = (version, words) => JSON.stringify([version, normalize(words)]);

export default function WordFrequencyChart({ queryWords, onClickDrill, onFavChart }) {
  const app = useApp();
  const version = app?.version;
  const searchMode = app?.searchMode;
  const favCharts = app?.favCharts || [];
  const addFavChart = app?.addFavChart;       // optioneel in jouw context
  const removeFavChart = app?.removeFavChart; // optioneel in jouw context

  const [data, setData] = useState([]);

  const books = useMemo(() => canonicalBooks(version), [version]);

  const wordList = useMemo(() => {
    const w = (queryWords || []).map((s) => s.trim()).filter(Boolean);
    return w.length ? w.slice(0, 10) : version === "HSV" ? ["geloof", "genade"] : ["faith", "grace"];
  }, [queryWords, version]);

  // Favoriet detectie
  const currentKey = chartKey(version, wordList);
  const isFavorited = useMemo(() => {
    return favCharts.some((c) => chartKey(c.version, c.words) === currentKey);
  }, [favCharts, currentKey]);

  useEffect(() => {
    const load = async () => {
      if (!wordList.length) return;
      const wordsParam = encodeURIComponent(wordList.join(","));
      const res = await fetch(
        `/api/stats/wordcounts?version=${version}&mode=${searchMode}&words=${wordsParam}`
      );
      const json = await res.json();

      const incoming = json.data || [];
      const byBook = new Map(incoming.map((row) => [row.book, row]));

      const rows = books.map((b) => {
        const base = { book: b };
        const record = byBook.get(b) || {};
        wordList.forEach((w) => (base[w] = record[w] || 0));
        return base;
      });

      setData(rows);
    };
    load();
  }, [version, searchMode, wordList.join(","), books]);

  const handleChartClick = (e) => {
    if (!e || !e.activePayload) return;
    const row = e.activePayload[0]?.payload;
    const clickedWord = e.activePayload.find((p) => p.dataKey)?.dataKey;
    if (row && clickedWord) {
      onClickDrill?.({ book: row.book, word: clickedWord });
    }
  };

  async function handleFavoriteClick() {
    // Als je context toggle ondersteunt (aanbevolen):
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
      // Fallback: gebruik de bestaande prop (zoals je search-pagina al deed)
      onFavChart?.({
        title: `Woordfrequentie: ${wordList.join(", ")} — ${version}`,
        version,
        words: [...wordList],
      });
    }
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
            fill={isFavorited ? "currentColor" : "none"} // ⭐️ DICHTE STER BIJ FAVORIET
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
              <Bar key={w} dataKey={w} stackId="a" name={w} fill={palette[idx % palette.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
