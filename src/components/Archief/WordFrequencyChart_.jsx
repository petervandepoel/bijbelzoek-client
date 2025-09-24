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

export default function WordFrequencyChart({ queryWords, onClickDrill, onFavChart }) {
  const { version, searchMode } = useApp();
  const [data, setData] = useState([]);

  const books = useMemo(() => canonicalBooks(version), [version]);

  const wordList = useMemo(() => {
    const w = (queryWords || []).map((s) => s.trim()).filter(Boolean);
    return w.length ? w.slice(0, 10) : version === "HSV" ? ["geloof", "genade"] : ["faith", "grace"];
  }, [queryWords, version]);

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
  }, [version, searchMode, wordList.join(",")]);

  const handleChartClick = (e) => {
    if (!e || !e.activePayload) return;
    const row = e.activePayload[0]?.payload;
    const clickedWord = e.activePayload.find((p) => p.dataKey)?.dataKey;
    if (row && clickedWord) {
      onClickDrill?.({ book: row.book, word: clickedWord });
    }
  };

  const favCurrentChart = () => {
    const title = `Woordfrequentie: ${wordList.join(", ")} — ${version}`;
    onFavChart?.({ title, version, words: [...wordList] });
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Woordfrequentie per boek</h3>
        <button
          onClick={favCurrentChart}
          className="flex items-center gap-2 text-sm bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-600/30"
        >
          <Star className="w-4 h-4" /> Bewaar grafiek
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
            <Legend verticalAlign="top" height={36}/>
            {wordList.map((w, idx) => (
              <Bar key={w} dataKey={w} stackId="a" name={w} fill={palette[idx % palette.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
