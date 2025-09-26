import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search as SearchIcon, BookOpenCheck, LineChart, Brain, Download, ChevronRight } from "lucide-react";

/**
 * LandingPage.jsx — updated per verzoek
 * Wijzigingen:
 * - Zoekbalk is volledig (geen extra blokken/tekst aan linker- of rechterzijde binnen de balk)
 * - Feature-blokken ("Leg de basis" t/m "Exporteer & deel") staan onder de zoekbalk
 * - Copy-update "Leg de basis": Verzamel bijbelteksten en inzichten voor je bijbelstudie, preek of sing-in.
 * - Thema-zoeken gebruikt de thema-woorden (niet het label) als query
 * - Process-stappen 1–4 en de tip zijn verwijderd
 * - Navigatie naar /zoeken met parameters die SearchPage verwacht
 */

const KEYWORD_SUGGESTIONS = [
  "geloof",
  "genade",
  "vergeving",
  "gerechtigheid",
  "heiliging",
  "liefde",
  "hoop",
  "gebed",
  "Isra\u00ebl",
  "Heilige Geest",
];

const THEME_SUGGESTIONS = [
  { label: "Hoop & Troost", words: ["hoop", "troost"] },
  { label: "Vergeving & Genade", words: ["vergeving", "genade"] },
  { label: "Dankbaarheid", words: ["dank", "dankbaarheid"] },
  { label: "Lijden & Volharding", words: ["lijden", "volharding"] },
  { label: "Kerk & Gemeenschap", words: ["gemeente", "broeders"] },
];

function pickRandom(arr, n) {
  const copy = [...arr];
  const out = [];
  while (copy.length && out.length < n) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

export default function LandingPage() {
  const navigate = useNavigate();

  // Roller: wisselt placeholder tussen keywords en themes (zonder extra UI in de balk)
  const [mode, setMode] = useState("keywords"); // "keywords" | "themes"
  const [idx, setIdx] = useState(0);
  const [query, setQuery] = useState("");
  const [chips, setChips] = useState([]);

  const activeList =
    mode === "keywords"
      ? KEYWORD_SUGGESTIONS
      : THEME_SUGGESTIONS.map((t) => t.label);

  // placeholder-roller
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % activeList.length), 2500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // auto-switch tussen modes (speels effect, geen extra UI)
  useEffect(() => {
    const t = setInterval(
      () => setMode((m) => (m === "keywords" ? "themes" : "keywords")),
      6000
    );
    return () => clearInterval(t);
  }, []);

  // dynamische chips (mix van woorden en themalabels)
  useEffect(() => {
    const next =
      mode === "keywords"
        ? pickRandom(KEYWORD_SUGGESTIONS, 8)
        : pickRandom(THEME_SUGGESTIONS, 8).map((t) => t.label);
    setChips(next);

    const t = setInterval(() => {
      const n =
        mode === "keywords"
          ? pickRandom(KEYWORD_SUGGESTIONS, 8)
          : pickRandom(THEME_SUGGESTIONS, 8).map((t) => t.label);
      setChips(n);
    }, 10000);
    return () => clearInterval(t);
  }, [mode]);

  const rollerText = useMemo(
    () => (mode === "keywords" ? "Start met zoekwoorden" : "Of kies een thema"),
    [mode]
  );
  const placeholder = activeList[idx] || "Zoek in de Bijbel";

  function navigateToSearch(value) {
    let q = value || query || placeholder || "";
    const theme = THEME_SUGGESTIONS.find((t) => t.label === q);
    if (theme) q = theme.words.join(", "); // zoek op thema-woorden, niet op het label
    q = q.trim();
    if (!q) return;

    // parameters die je SearchPage verwacht; SearchPage roept vervolgens de juiste API aan
    const version = "HSV";
    const searchMode = "exact";
    const params = new URLSearchParams({
      version,
      mode: searchMode,
      words: q,
      page: "1",
      resultLimit: "50",
    });
    navigate(`/search?${params.toString()}`);
  }

  function onSubmit(e) {
    e.preventDefault();
    navigateToSearch();
  }

  return (
    <div className="min-h-[82vh] bg-gradient-to-b from-white to-indigo-50/40">
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-6">
        {/* Intro */}
        <div className="text-indigo-700 mb-3 text-xs uppercase tracking-wide font-semibold">
          Welkom op Bijbelzoek.nl
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
          Bijbelstudie, preek of sing-in?{" "}
          <span className="text-indigo-700">Start hier je zoektocht</span>
        </h1>
        <p className="mt-3 text-gray-700 md:text-lg max-w-prose">
          Zoek en vind relevante teksten - verrijk je kennis middels resultaten & grafieken – verrijk je inzichten met AI - exporteer je resultaten voor verdere studie.
        </p>

        {/* Volledige zoekbalk (geen extra tekst/blokken erin) */}
        <form onSubmit={onSubmit} className="mt-6">
          <div className="flex items-stretch rounded-2xl shadow-lg ring-1 ring-gray-200 bg-white overflow-hidden">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`${rollerText}: ${placeholder}`}
              className="flex-1 px-4 md:px-5 py-4 md:py-5 text-base md:text-lg outline-none"
              aria-label="Zoek in de Bijbel"
            />
            <button
              type="submit"
              className="flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 text-base md:text-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <SearchIcon className="w-5 h-5" /> Zoeken
            </button>
          </div>
        </form>

        {/* Suggestie chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => navigateToSearch(c)}
              className="px-3 py-1.5 rounded-full text-sm bg-white/80 hover:bg-indigo-50 hover:text-indigo-700 border border-gray-200"
              aria-label={`Zoek op ${c}`}
            >
              {c}
            </button>
          ))}
        </div>

               {/* Feature-blokken ONDER de zoekbalk */}
        <div className="mt-8 grid sm:grid-cols-2 gap-3">
          <FeatureCard
            icon={BookOpenCheck}
            title="1. Leg de basis"
            text="Verzamel bijbelteksten en inzichten voor je bijbelstudie, preek of sing-in."
          />
          <FeatureCard
            icon={LineChart}
            title="2. Zie patronen"
            text="Ontdek verdeling per bijbelboek met grafieken."
          />
          <FeatureCard
            icon={Brain}
            title="3. Verrijk met AI"
            text="Ontvang input voor bijbelstudie, preek of sing-in."
          />
          <FeatureCard
            icon={Download}
            title="4. Exporteer & deel"
            text="Download teksten, grafieken en notities (PDF/DOCX) en gebruik dit voor verdere studie."
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, text }) {
  return (
    <div className="p-4 rounded-2xl border bg-white/80 backdrop-blur shadow-sm">
      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2 bg-indigo-100 text-indigo-700">
        <Icon size={20} />
      </div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      <p className="text-gray-700 text-sm">{text}</p>
    </div>
  );
}
