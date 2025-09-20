// client/src/pages/SearchPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import FilterPanel from "../components/FilterPanel";
import WordFrequencyChart from "../components/WordFrequencyChart";
import SearchResults from "../components/SearchResults";
import { useApp } from "../context/AppContext";

export default function SearchPage() {
  const { version, searchMode } = useApp();
  const [queryWords, setQueryWords] = useState(["geloof", "genade"]); // startwoorden
  const [selectedBook, setSelectedBook] = useState("");               // door filter/grafiek
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const wordsCSV = useMemo(() => queryWords.join(","), [queryWords]);

  const runSearch = useCallback(async ({ words = queryWords, book = selectedBook } = {}) => {
    if (!words?.length) { setResults([]); return; }
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        version,
        mode: searchMode || "or",
        words: words.join(","),
        ...(book ? { book } : {}),
        page: "1",
        resultLimit: "50"
      }).toString();

      const res = await fetch(`/api/search?${qs}`);
      const json = await res.json();
      setResults(Array.isArray(json.results) ? json.results : []);
    } finally { setLoading(false); }
  }, [version, searchMode, queryWords, selectedBook]);

  // init + elke wijziging van versie/mode/woorden opnieuw zoeken
  useEffect(() => {
    runSearch({ words: queryWords, book: selectedBook });
  }, [version, searchMode, wordsCSV, selectedBook, runSearch]);

  // Klik vanuit de grafiek: { book, word }
  const handleChartDrill = useCallback(({ book, word }) => {
    const nextWords = word ? [word] : queryWords;
    setQueryWords(nextWords);
    setSelectedBook(book || "");
    runSearch({ words: nextWords, book });
  }, [queryWords, runSearch]);

  // Klik op een boek in de zijbalk
  const handleSelectBook = useCallback((book) => {
    setSelectedBook(book);
    runSearch({ words: queryWords, book });
  }, [queryWords, runSearch]);

  return (
    <div className="grid lg:grid-cols-[18rem_1fr] gap-4">
      <FilterPanel
        queryWords={queryWords}
        onSelectBook={handleSelectBook}
      />

      <div className="space-y-4">
        <WordFrequencyChart
          queryWords={queryWords}
          onClickDrill={handleChartDrill}
        />

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">
              Resultaten {selectedBook ? `— ${selectedBook}` : ""} ({results.length})
            </h3>
            {loading && <span className="text-sm text-gray-500">Zoeken…</span>}
          </div>
          <SearchResults
            results={results}
            queryWords={queryWords}
            onReadChapter={(book, chapter) => {
              // hier open je jouw ChapterModal (niet getoond)
              console.log("Open chapter:", book, chapter);
            }}
          />
        </div>
      </div>
    </div>
  );
}
