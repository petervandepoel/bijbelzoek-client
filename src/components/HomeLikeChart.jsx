// client/src/components/HomeLikeChart.jsx
import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from "recharts";

/* ---------- Kleuren voor woorden ---------- */
const PALETTE = [
  "#6366F1", // indigo-500
  "#10B981", // emerald-500
  "#F59E0B", // amber-500
  "#EF4444", // red-500
  "#3B82F6", // blue-500
  "#A855F7", // purple-500
  "#06B6D4", // cyan-500
  "#F97316", // orange-500
  "#22C55E", // green-500
  "#EC4899", // pink-500
];

/* ---------- Canonieke volgorde (HSV – NL) ---------- */
const BOOK_ORDER = [
  // OT
  "Genesis","Exodus","Leviticus","Numeri","Deuteronomium",
  "Jozua","Richteren","Ruth",
  "1 Samuel","1 Samuël","2 Samuel","2 Samuël",
  "1 Koningen","2 Koningen","1 Kronieken","2 Kronieken",
  "Ezra","Nehemia","Esther","Job","Psalmen","Psalm","Spreuken","Prediker","Hooglied",
  "Jesaja","Jeremia","Klaagliederen","Ezechiël","Daniël",
  "Hosea","Joël","Amos","Obadja","Jona","Micha","Nahum","Habakuk","Zefanja","Haggai","Zacharia","Maleachi",
  // NT
  "Mattheüs","Matteus","Matthéüs","Matthaeus",
  "Markus","Marcus","Mark",
  "Lukas","Lucas","Luc",
  "Johannes",
  "Handelingen",
  "Romeinen",
  "1 Korinthe","2 Korinthe","1 Korinthiërs","2 Korinthiërs",
  "Galaten",
  "Efeze","Efeziërs",
  "Filippenzen","Filipenzen",
  "Kolossenzen",
  "1 Thessalonicenzen","2 Thessalonicenzen",
  "1 Timotheüs","2 Timotheüs","1 Timoteüs","2 Timoteüs",
  "Titus","Filemon","Hebreeën","Jakobus",
  "1 Petrus","2 Petrus",
  "1 Johannes","2 Johannes","3 Johannes",
  "Judas","Openbaring","Openbaringen"
];

/* Snelle index lookup */
const BOOK_INDEX = BOOK_ORDER.reduce((acc, b, i) => { acc[b.toLowerCase()] = i; return acc; }, {});

/* Vaak voorkomende synoniemen -> canonical key in BOOK_ORDER */
const SYNONYMS = {
  "1 samuel": "1 Samuël",
  "2 samuel": "2 Samuël",
  "psalms": "Psalmen",
  "psalm": "Psalmen",
  "song of songs": "Hooglied",
  "song": "Hooglied",
  "mark": "Markus",
  "marcus": "Markus",
  "matteus": "Mattheüs",
  "matthéüs": "Mattheüs",
  "matthaeus": "Mattheüs",
  "lucas": "Lukas",
  "luc": "Lukas",
  "ephesians": "Efeze",
  "efeziers": "Efeziërs",
  "ezechiël": "Ezechiël", // normalize accents fallback
  "daniel": "Daniël",
  "1 korinthiers": "1 Korinthiërs",
  "2 korinthiers": "2 Korinthiërs",
  "1 korinthe": "1 Korinthe",
  "2 korinthe": "2 Korinthe",
  "openbaringen": "Openbaring"
};

function normalizeBookName(name) {
  if (!name) return "Onbekend";
  const key = String(name).trim();
  const lower = key.toLowerCase();
  if (SYNONYMS[lower]) return SYNONYMS[lower];
  return key;
}

function orderIndex(name) {
  const norm = normalizeBookName(name);
  const idx = BOOK_INDEX[norm.toLowerCase()];
  return (idx === undefined) ? 10_000 : idx; // onbekenden naar onderen
}

/* ---------- helpers voor fetch & extract ---------- */
async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

function extractRows(js) {
  if (!js) return [];
  if (Array.isArray(js.results)) return js.results;
  if (js.results && Array.isArray(js.results.docs)) return js.results.docs;
  if (Array.isArray(js.items)) return js.items;
  return [];
}

function getBookFromRow(row) {
  if (row.book) return row.book;
  if (typeof row.ref === "string" && row.ref.includes(" ")) return row.ref.split(" ")[0];
  return "Onbekend";
}

/* ---------- Component ---------- */
export default function HomeLikeChart({
  version = "HSV",
  words = ["geloof", "genade", "hoop"],
  searchMode = "exact",
  debug = false,
}) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [lastTried, setLastTried] = useState("");

  useEffect(() => {
    let abort = false;

    const variantsFor = (w) => [
      { version, words: w },
      { version, q: w },
      { version, words: w, page: "1", resultLimit: "2000", mode: searchMode },
      { version, words: w, page: "1", limit: "2000", mode: searchMode },
    ];

    const fetchWordCounts = async (w) => {
      for (const v of variantsFor(w)) {
        try {
          const qs = new URLSearchParams(v).toString();
          const url = `/api/search?${qs}`;
          setLastTried(url);
          const js = await getJSON(url);
          const rows = extractRows(js);
          if (rows.length) {
            const byBook = {};
            rows.forEach((row) => {
              const book = getBookFromRow(row);
              byBook[book] = (byBook[book] || 0) + 1;
            });
            return Object.entries(byBook).map(([book, count]) => ({ book, count }));
          }
        } catch {
          // volgende variant proberen
        }
      }
      return [];
    };

    (async () => {
      setErr(""); setData(null);
      const perWord = [];
      for (const w of words) perWord.push({ word: w, rows: await fetchWordCounts(w) });

      // merge & sorteer op canonieke volgorde
      const map = new Map();
      perWord.forEach(({ word, rows }) => {
        rows.forEach(({ book, count }) => {
          const b = normalizeBookName(book);
          if (!map.has(b)) map.set(b, { book: b });
          map.get(b)[word] = count;
        });
      });

      const merged = Array.from(map.values())
        .sort((a, b) => {
          const ai = orderIndex(a.book);
          const bi = orderIndex(b.book);
          if (ai !== bi) return ai - bi;
          return a.book.localeCompare(b.book);
        });

      if (!abort) setData(merged);
    })().catch((e) => !abort && setErr(e.message || "Onbekende fout"));

    return () => { abort = true; };
  }, [version, words, searchMode]);

  if (err) return <div className="text-sm text-rose-700">Grafiek laden mislukt: {String(err)}</div>;
  if (!data) return <div className="text-sm text-gray-500">Grafiek laden…</div>;
  if (!data.length) {
    return (
      <div className="text-sm text-gray-500">
        Geen data gevonden voor deze woorden.
        {debug && lastTried && (
          <div className="mt-1 opacity-75">Laatst geprobeerd: <code>{lastTried}</code></div>
        )}
      </div>
    );
  }

  return (
    <>
      {debug && lastTried && (
        <div className="text-[11px] text-gray-500 mb-1">Bron: <code>{lastTried}</code></div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="book" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          {words.map((w, i) => (
            <Bar key={w} dataKey={w} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
