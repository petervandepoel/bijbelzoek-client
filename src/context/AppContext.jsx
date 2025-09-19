// client/src/context/AppContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";

const AppCtx = createContext(null);

// -- simpele localStorage helpers --
const LS = {
  get(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};

const newId = () => Math.random().toString(36).slice(2, 10);

// normalizers
const normRef = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();
const normWords = (arr) =>
  (arr || []).filter(Boolean).map((w) => String(w).trim().toLowerCase()).sort();

export function AppProvider({ children }) {
  // ----- Basis instellingen -----
  const [version, setVersion] = useState(LS.get("bz.version", "HSV"));
  const [searchMode, setSearchMode] = useState(LS.get("bz.searchMode", "exact"));

  // ----- Algemene notities -----
  const [generalNotes, setGeneralNotes] = useState(LS.get("bz.generalNotes", ""));

  // ----- Favoriete teksten -----
  // item: { id/_id?, ref, text, note? }
  const [favTexts, setFavTexts] = useState(LS.get("bz.favTexts", []));

  const isFavText = (ref) => {
    const key = normRef(ref);
    return favTexts.some((t) => normRef(t.ref) === key);
  };

  const addFavText = (item) => {
    // item kan {ref, text, note?} zijn
    if (!item?.ref) return;
    if (isFavText(item.ref)) return; // geen dubbel
    const id = item.id || item._id || newId();
    setFavTexts((arr) => [{ id, ref: item.ref, text: item.text || "", note: item.note || "" }, ...arr]);
  };

  const removeFavText = (idOrRef) =>
    setFavTexts((arr) =>
      arr.filter((t) => {
        const tid = t._id || t.id || t.ref;
        return tid !== idOrRef && normRef(t.ref) !== normRef(idOrRef);
      })
    );

  const updateFavTextNote = (idOrRef, note) =>
    setFavTexts((arr) =>
      arr.map((t) => {
        const tid = t._id || t.id || t.ref;
        if (tid === idOrRef || normRef(t.ref) === normRef(idOrRef)) return { ...t, note };
        return t;
      })
    );

  // ----- Favoriete grafieken -----
  // item: { id, title, version, words:[], note? }
  const [favCharts, setFavCharts] = useState(LS.get("bz.favCharts", []));

  const isFavChart = (words, ver = version) => {
    const key = JSON.stringify([ver, normWords(words)]);
    return favCharts.some((c) => JSON.stringify([c.version, normWords(c.words)]) === key);
  };

  const addFavChart = (chart) =>
    setFavCharts((arr) => {
      const ver = chart?.version || version;
      const words = normWords(chart?.words);
      if (!words.length) return arr;
      if (isFavChart(words, ver)) return arr; // geen dubbel
      const id = chart.id || newId();
      return [{ id, title: chart.title || `Woordfrequentie: ${words.join(", ")} — ${ver}`, version: ver, words: chart.words || [], note: chart.note || "" }, ...arr];
    });

  const removeFavChart = (id) =>
    setFavCharts((arr) => arr.filter((c) => c.id !== id));

  const updateFavChartNote = (id, note) =>
    setFavCharts((arr) => arr.map((c) => (c.id === id ? { ...c, note } : c)));

  // ----- Zoek-pagina staat (bv. { query, results, chartWords }) -----
  const [savedState, setSavedState] = useState(LS.get("bz.savedState", {}));

  // ----- AI-resultaten -----
  // item: { id, kind, title, text, createdAt }
  const [aiResults, setAiResults] = useState(LS.get("bz.aiResults", []));
  const addAiResult = (r) => setAiResults((prev) => [r, ...prev]);
  const removeAiResult = (id) => setAiResults((prev) => prev.filter((x) => x.id !== id));

  // ----- Persist -----
  useEffect(() => LS.set("bz.version", version), [version]);
  useEffect(() => LS.set("bz.searchMode", searchMode), [searchMode]);
  useEffect(() => LS.set("bz.generalNotes", generalNotes), [generalNotes]);
  useEffect(() => LS.set("bz.favTexts", favTexts), [favTexts]);
  useEffect(() => LS.set("bz.favCharts", favCharts), [favCharts]);
  useEffect(() => LS.set("bz.savedState", savedState), [savedState]);
  useEffect(() => LS.set("bz.aiResults", aiResults), [aiResults]);

  const value = {
    // basis
    version, setVersion,
    searchMode, setSearchMode,

    // notities
    generalNotes, setGeneralNotes,

    // teksten
    favTexts, setFavTexts,
    isFavText, addFavText, removeFavText, updateFavTextNote,

    // grafieken
    favCharts, setFavCharts,
    isFavChart, addFavChart, removeFavChart, updateFavChartNote,

    // zoek-pagina
    savedState, setSavedState,

    // ai
    aiResults, setAiResults, addAiResult, removeAiResult,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export const useApp = () => useContext(AppCtx);
