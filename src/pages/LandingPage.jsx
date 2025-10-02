// src/pages/LandingPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search as SearchIcon,
  BookOpenCheck,
  LineChart,
  Brain,
  Download,
} from "lucide-react";
import { getHSVThemes } from "../utils/parseThemes";

// vaste zoekwoord-groepen (roller)
const KEYWORD_GROUPS = [
  "genade, vergeving, liefde, verlossing",
  "geloof, hoop, liefde",
  "Israël, verbond, priester",
  "zonde, schuld, berouw",
  "Zoekwoord A, B, C",
];

// random helper
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
  const [idx, setIdx] = useState(0);
  const [query, setQuery] = useState("");

  const [themes] = useState(getHSVThemes());
  const [randomThemes, setRandomThemes] = useState([]);
  const [showAllThemes, setShowAllThemes] = useState(false);

  // roller: zoekwoord-groepen
  useEffect(() => {
    const t = setInterval(
      () => setIdx((i) => (i + 1) % KEYWORD_GROUPS.length),
      2500
    );
    return () => clearInterval(t);
  }, []);

  // kies random thema’s bij laden
  useEffect(() => {
    if (themes.length > 0) {
      setRandomThemes(pickRandom(themes, 5));
    }
  }, [themes]);

  const placeholder = useMemo(() => KEYWORD_GROUPS[idx], [idx]);

  // 👉 navigatie met HSV + fuzzy
  function navigateToSearch(value, themeObj) {
    let q = value || query || placeholder || "";
    if (!q) return;

    if (themeObj) {
      q = themeObj.words.join(", ");
    }
    const params = new URLSearchParams({ words: q });
    navigate(`/zoeken?${params.toString()}`);
  }

  function onSubmit(e) {
    e.preventDefault();
    navigateToSearch();
  }

  return (
    <div className="min-h-[82vh] bg-gradient-to-b from-white to-indigo-50/40 text-gray-900">
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
          Zoek en vind relevante teksten — zie patronen in grafieken — verrijk
          met AI — exporteer voor verdere studie.
        </p>

        {/* Zoekbalk */}
        <form onSubmit={onSubmit} className="mt-6">
          <div className="flex items-stretch rounded-2xl shadow-lg ring-1 ring-gray-200 bg-white overflow-hidden">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Zoek op: ${placeholder}`}
              className="flex-1 px-4 md:px-5 py-4 md:py-5 text-base md:text-lg outline-none text-gray-900"
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

        {/* Thema’s */}
        <div className="mt-4">
          <div className="font-semibold mb-2">Of kies een thema:</div>
          <div className="flex flex-wrap gap-2">
            {(showAllThemes ? themes : randomThemes).map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => navigateToSearch(t.label, t)}
                className="px-3 py-1.5 rounded-full text-sm bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-gray-200"
                aria-label={`Zoek thema ${t.label}`}
              >
                {t.label}
              </button>
            ))}
            {!showAllThemes && themes.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllThemes(true)}
                className="px-3 py-1.5 rounded-full text-sm bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Toon alle thema’s
              </button>
            )}
          </div>
        </div>

        {/* Features */}
           <div classname="mb-1 mt-4"> <div className="font-semibold mb-1 mt-4">Hoe werkt het?</div></div>

        <div className="mt-8 grid sm:grid-cols-2 gap-3">
          <FeatureCard
            icon={BookOpenCheck}
            title="Stap 1. Landingpage: Kies zoekwoorden of selecteer een thema"
            text="Start hier je zoektocht om op basis van Bijbelteksten je preek-, bijbelstudie of sing-in voor te bereiden."
          />
          <FeatureCard
            icon={LineChart}
            title="Stap 2. Zoeken: Zie patronen, bewaar favorieten"
            text="Vind en bewaar relevante Bijbelteksten en grafieken."
          />
          <FeatureCard
            icon={Brain}
            title="Stap 3: Studie => Verrijk (met AI)"
            text="Voeg je eigen notities/vragen toe bij je bewaarde selectie, en gebruik de AI module voor meer informatie / tips."
          />
          <FeatureCard
            icon={Download}
            title="Stap 4: Export => Exporteer & deel"
            text="Download teksten, grafieken en notities (PDF/DOCX) en gebruik dit voor verdere studie."
          />
        </div>

        {/* Footer */}
        <footer className="bg-gray-100 text-center py-4 mt-12 text-sm text-gray-600">
          <p>
            © {new Date().getFullYear()} Bijbelzoek.nl —{" "}
            <a href="/feedback" className="text-indigo-600 hover:underline">
              Feedback & Info
            </a>
          </p>
        </footer>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, text }) {
  return (
    <div className="p-4 rounded-2xl border bg-white shadow-sm">
      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2 bg-indigo-100 text-indigo-700">
        <Icon size={20} />
      </div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      <p className="text-gray-700 text-sm">{text}</p>
    </div>
  );
}
