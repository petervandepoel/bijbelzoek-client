import React from "react";
import PageViewTracker from "../components/PageViewTracker";
import FeedbackWall from "../components/FeedbackWall";
import HomeLikeChart from "../components/HomeLikeChart";
import { useApp } from "../context/AppContext.jsx";
import {
  BookOpenCheck,
  Search,
  Bookmark,
  Brain,
  Share2,
  AlertCircle,
  Sparkles,
  Telescope,
  Cpu,
  Database,
  LineChart,
  GitBranch,
  ExternalLink,
  MessageSquarePlus,
} from "lucide-react";

function StepCard({ icon: Icon, title, children, accent = "indigo" }) {
  return (
    <div className="p-5 rounded-2xl border bg-white/70 backdrop-blur shadow-sm">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-${accent}-100 text-${accent}-700`}>
        <Icon size={20} />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="text-gray-700">{children}</div>
    </div>
  );
}

function Fact({ icon: Icon, title, children }) {
  return (
    <div className="p-4 rounded-2xl border bg-white/70">
      <div className="flex items-center gap-2 text-indigo-700 mb-1">
        <Icon size={18} /> <span className="font-semibold">{title}</span>
      </div>
      <p className="text-gray-700 text-sm">{children}</p>
    </div>
  );
}

export default function UitlegEnOver() {
  const { version = "HSV", searchMode = "exact" } = useApp() || {};

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <PageViewTracker page="uitleg-en-over" />

      {/* Hero */}
      <section className="mb-6">
        <div className="flex items-center gap-3 mb-2 text-indigo-700">
          <Telescope /> <BookOpenCheck />
          <span className="uppercase tracking-wide text-sm font-semibold">Uitleg & Over</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Bijbelzoek.nl — uitleg & achtergrond</h1>
        <p className="text-gray-700">
          Bijbelzoek.nl helpt je sneller van <strong>zoeken</strong> naar <strong>inzichten</strong> en vervolgens naar
          <strong> deelbare output</strong> (preek / bijbelstudie / sing-in). Deze pagina legt de workflow uit en geeft
          achtergrond bij het project.
        </p>
        <div className="mt-4 p-4 rounded-2xl border bg-amber-50 text-amber-900 flex gap-3">
          <AlertCircle className="shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">
            <strong>Belangrijk:</strong> Bijbelzoek.nl is nadrukkelijk een <em>studiemiddel</em>. De gevonden resultaten
            moet je <strong>zelf verwerken</strong> en <strong>checken</strong> in context (bijbelgedeelte, vertaling,
            theologisch kader). Het krachtige zit in de <em>lus</em>: <span className="font-medium">jij stelt eerst de
            input samen</span> → <span className="font-medium">AI helpt ordenen/uitwerken</span> → <span className="font-medium">jij werkt het door en scherpt aan</span>.
          </p>
        </div>
      </section>

      {/* Visual Steps */}
      <section className="grid md:grid-cols-2 gap-5 mb-10">
        <StepCard icon={Search} title="Stap 1 — Verzamelen (Zoeken)" accent="indigo">
          Kies 2–5 zoekwoorden (bijv. <em>geloof, genade, hoop</em>). Bekijk de verdeling per bijbelboek in de grafiek.
          Markeer <strong>favorieten (★)</strong> en schrijf korte <strong>notities</strong>.
        </StepCard>
        <StepCard icon={Bookmark} title="Stap 2 — Verrijken (jouw studie)" accent="emerald">
          Verbind teksten, let op context en herhaalwoorden. Noteer waarom een vers jouw thema raakt.
        </StepCard>
        <StepCard icon={Brain} title="Stap 3 — AI (optioneel)" accent="rose">
          Laat AI jouw materiaal ordenen tot een schets (kernzin, hoofdpunten, verzen, toepassingen). Hoe beter jouw
          selectie en notities, hoe beter de output.
        </StepCard>
        <StepCard icon={Share2} title="Stap 4 — Export & Delen" accent="amber">
          Exporteer verzen + notities + grafiek en deel met je doelgroep (preek, studieavond, sing-in).
        </StepCard>
      </section>

      {/* Quick tips */}
      <section className="grid md:grid-cols-3 gap-4 mb-10">
        <div className="p-4 rounded-2xl border bg-white/70">
          <div className="flex items-center gap-2 text-indigo-700 mb-2">
            <Sparkles size={18} /> Focus
          </div>
          <p className="text-gray-700 text-sm">Werk met 2–5 woorden. Te veel woorden maakt patronen onduidelijk.</p>
        </div>
        <div className="p-4 rounded-2xl border bg-white/70">
          <div className="flex items-center gap-2 text-indigo-700 mb-2">
            <Sparkles size={18} /> Notities
          </div>
          <p className="text-gray-700 text-sm">Schrijf per favoriet 1–2 zinnen: reden, context, toepassing.</p>
        </div>
        <div className="p-4 rounded-2xl border bg-white/70">
          <div className="flex items-center gap-2 text-indigo-700 mb-2">
            <Sparkles size={18} /> Controle
          </div>
          <p className="text-gray-700 text-sm">Lees altijd het hele bijbelgedeelte en check vertalingen.</p>
        </div>
      </section>

      {/* Voorbeeldgrafiek (live data) */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-3 text-indigo-700">
          <Sparkles /> <h2 className="text-xl font-semibold">Voorbeeldgrafiek (live data)</h2>
        </div>
        <p className="text-gray-700 mb-3">
          Hieronder zie je een grafiek zoals op de homepage, met de woorden <em>geloof</em>, <em>genade</em> en <em>hoop</em>
          ({version}). De aantallen tonen hoe vaak je woorden voorkomen per bijbelboek.
        </p>
        <div className="h-72 w-full rounded-2xl border bg-white p-3">
          <HomeLikeChart
            version={version}
            searchMode={searchMode}
            words={["geloof", "genade", "hoop"]}
            source="search" // 👈 forceer de fallback en voorkom 404’s
          />
        </div>
        <ul className="mt-3 text-sm text-gray-600 list-disc list-inside">
          <li>
            <strong>Kleur ↔ woord:</strong> kleuren corresponderen met je gekozen woorden.
          </li>
          <li>
            <strong>Tip:</strong> houd het bij 2–5 woorden voor heldere patronen.
          </li>
        </ul>
      </section>

      {/* Waarom deze site bestaat */}
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-2 text-indigo-700">
          <Telescope /> <span className="uppercase tracking-wide text-sm font-semibold">Waarom deze site bestaat</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mb-2">Van zoeken naar inzichten</h2>
        <p className="text-gray-700">
          Bijbelzoek.nl helpt je sneller van <strong>zoeken</strong> naar <strong>inzichten</strong> en vervolgens naar
          <strong> deelbare output</strong> (preek / bijbelstudie / sing-in).
        </p>
      </section>

      {/* Leuke weetjes / techniek */}
      <section className="grid md:grid-cols-3 gap-4 mb-10">
        <Fact icon={Cpu} title="Veel ChatGPT">
          Tijdens de bouw is intensief gebruikgemaakt van ChatGPT voor sparren, code en UX-ideeën.
        </Fact>
        <Fact icon={Database} title="MERN-stack">
          React (Vite) + Node/Express + MongoDB. Data per boek/hoofdstuk/vers.
        </Fact>
        <Fact icon={LineChart} title="Grafieken">
          Hits per bijbelboek visualiseren patroonvorming en relevantie van thema’s.
        </Fact>
      </section>

      {/* Over de maker */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-2">Over de maker</h2>
        <p className="text-gray-700">
          Ik ben <strong>Peter</strong>. Ik houd van Bijbelstudie én technologie. Dit project is ontstaan om het leerproces te
          versnellen en te verdiepen—met aandacht voor context en toepassing.
        </p>
        <p className="text-gray-700 mt-2">
          <a
            href="https://www.linkedin.com/in/petervandepoel/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-indigo-700 hover:underline"
            aria-label="LinkedIn-profiel van Peter"
          >
            Mijn LinkedIn <ExternalLink size={16} />
          </a>
        </p>
      </section>

      {/* Publieke feedback-muur */}
      <section className="mb-12">
        <div className="flex items-center gap-2 text-indigo-700 mb-2">
          <MessageSquarePlus /> <h2 className="text-xl font-semibold">Deel je feedback (publiek)</h2>
        </div>
        <p className="text-gray-700 mb-4">Deel suggesties, bugs en ideeën. Alles staat openbaar—zo leren we van elkaar.</p>
        <FeedbackWall />
      </section>

      {/* Roadmap */}
      <section className="mb-4">
        <div className="flex items-center gap-2 text-indigo-700 mb-2">
          <GitBranch /> <h2 className="text-xl font-semibold">Roadmap</h2>
        </div>
        <ul className="list-disc list-inside text-gray-700">
          <li>Verbeteren van studie-workflow en exportkwaliteit.</li>
          <li>Meer slimme filters en klikbare woorden (relevantie-lijst).</li>
          <li>Snellere zoekindexen en caching per vertaling.</li>
        </ul>
      </section>
    </div>
  );
}
