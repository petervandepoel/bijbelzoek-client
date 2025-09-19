import React from "react";
import { BookOpenCheck, Search, Bookmark, Brain, Share2, AlertCircle, Sparkles } from "lucide-react";
import PageViewTracker from "../components/PageViewTracker";
import HomeLikeChart from "../components/HomeLikeChart";
import { useApp } from "../context/AppContext.jsx";



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

export default function Uitleg() {
  const { version = "HSV", searchMode = "exact" } = useApp() || {};

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <PageViewTracker page="uitleg" />

      {/* Hero */}
      <section className="mb-6">
        <div className="flex items-center gap-3 mb-2 text-indigo-700">
          <BookOpenCheck /> <span className="uppercase tracking-wide text-sm font-semibold">Uitleg</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Bijbelzoek.nl als <span className="text-indigo-700">studiemiddel</span>
        </h1>
        <p className="text-gray-700">
          Deze site helpt je <strong>relevante bijbelteksten</strong> te vinden, patronen te zien in <strong>grafieken</strong>
          en dit om te zetten naar een <strong>preek</strong> of <strong>bijbelstudie</strong>.
        </p>
        <div className="mt-4 p-4 rounded-2xl border bg-amber-50 text-amber-900 flex gap-3">
          <AlertCircle className="shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">
            <strong>Belangrijk:</strong> Bijbelzoek.nl is nadrukkelijk een <em>studiemiddel</em>.
            De gevonden resultaten moeten door jou <strong>verder verwerkt</strong> en <strong>gecheckt</strong> worden in context (bijbelgedeelte,
            vertaling, theologisch kader). Het krachtige zit in de <em>lus</em>:
            <br />
            <span className="font-medium">jij stelt eerst de input samen</span> → <span className="font-medium">AI helpt je ordenen/uitwerken</span> → <span className="font-medium">jij werkt het door en scherpt aan</span>.
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
          Laat AI jouw materiaal ordenen tot een schets (kernzin, hoofdpunten, verzen, toepassingen).
          Hoe beter jouw selectie en notities, hoe beter de output.
        </StepCard>
        <StepCard icon={Share2} title="Stap 4 — Export & Delen" accent="amber">
          Exporteer verzen + notities + grafiek en deel met je doelgroep (preek, studieavond, sing-in).
        </StepCard>
      </section>

        {/* Quick tips */}
      <section className="grid md:grid-cols-3 gap-4 mb-10">
        <div className="p-4 rounded-2xl border bg-white/70">
          <div className="flex items-center gap-2 text-indigo-700 mb-2"><Sparkles size={18}/> Focus</div>
          <p className="text-gray-700 text-sm">Werk met 2–5 woorden. Te veel woorden maakt patronen onduidelijk.</p>
        </div>
        <div className="p-4 rounded-2xl border bg-white/70">
          <div className="flex items-center gap-2 text-indigo-700 mb-2"><Sparkles size={18}/> Notities</div>
          <p className="text-gray-700 text-sm">Schrijf per favoriet 1–2 zinnen: reden, context, toepassing.</p>
        </div>
        <div className="p-4 rounded-2xl border bg-white/70">
          <div className="flex items-center gap-2 text-indigo-700 mb-2"><Sparkles size={18}/> Controle</div>
          <p className="text-gray-700 text-sm">Lees altijd het hele bijbelgedeelte en check vertalingen.</p>
        </div>
      </section>
      
      {/* Echte grafiek (zoals op home) */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-3 text-indigo-700">
          <Sparkles /> <h2 className="text-xl font-semibold">Voorbeeldgrafiek (live data)</h2>
        </div>
        <p className="text-gray-700 mb-3">
          Hieronder zie je een grafiek zoals op de homepage, met de woorden <em>geloof</em>, <em>genade</em> en <em>hoop</em> (HSV).
          De aantallen tonen hoe vaak je woorden voorkomen per bijbelboek.
        </p>
        <div className="h-72 w-full rounded-2xl border bg-white p-3">
          <HomeLikeChart
           version={version}
            searchMode={searchMode}
            words={["geloof", "genade", "hoop"]}
            source="search"   // 👈 forceer de fallback en voorkom 404’s
/>
        </div>
        <ul className="mt-3 text-sm text-gray-600 list-disc list-inside">
          <li><strong>Kleur ↔ woord:</strong> kleuren corresponderen met je gekozen woorden.</li>
          <li><strong>Tip:</strong> houd het bij 2–5 woorden voor heldere patronen.</li>
        </ul>
      </section>

    
    </div>
  );
}
