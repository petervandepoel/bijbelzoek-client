import React from "react";
import PageViewTracker from "../components/PageViewTracker";
import FeedbackWall from "../components/FeedbackWall";
import KPIStats from "../components/KPIStats";
import { MessageSquarePlus, Telescope, Cpu, Database, LineChart, GitBranch, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

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

export default function TipsEnOver() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <PageViewTracker page="tips-en-over" />

      {/* Hero */}
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-2 text-indigo-700">
          <Telescope /> <span className="uppercase tracking-wide text-sm font-semibold">Tips & Over</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">Waarom deze site bestaat</h1>
        <p className="text-gray-700">
          Bijbelzoek.nl helpt je sneller van <strong>zoeken</strong> naar <strong>inzichten</strong> en
          vervolgens naar <strong>deelbare output</strong> (preek / bijbelstudie / sing-in).
        </p>
      </section>

      {/* KPI mini-dashboard (live uit /api/analytics/stats) */}
      <section className="mb-10">
        <KPIStats />
        <div className="mt-3 text-sm">
          <Link to="/statistieken" className="inline-flex items-center gap-1 text-indigo-700 hover:underline">
            Uitgebreide statistieken bekijken
          </Link>
        </div>
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
          Ik ben <strong>Peter</strong>. Ik houd van Bijbelstudie én technologie. Dit project is
          ontstaan om het leerproces te versnellen en te verdiepen—met aandacht voor context en toepassing.
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
        <p className="text-gray-700 mb-4">
          Deel suggesties, bugs en ideeën. Alles staat openbaar—zo leren we van elkaar.
        </p>
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
