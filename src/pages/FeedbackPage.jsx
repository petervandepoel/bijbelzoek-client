import React, { useState, useEffect } from "react";

const API_BASE = "https://plausible.io/api/v1/stats";
const SITE_ID = "bijbelzoek.nl";
const API_KEY = import.meta.env.VITE_PLAUSIBLE_API_KEY;

export default function FeedbackPage() {
  const [formData, setFormData] = useState({
    category: "Contact",
    name: "",
    email: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [stats, setStats] = useState({
    live: null,
    totals: null,
    topPages: [],
  });

  // --- Haal Plausible statistieken op ---
  useEffect(() => {
    const headers = {
      Authorization: `Bearer ${API_KEY}`,
    };

    async function fetchStats() {
      try {
        // 1) Live bezoekers
        const liveRes = await fetch(
          `${API_BASE}/realtime/visitors?site_id=${SITE_ID}`,
          { headers }
        );
        const live = await liveRes.json();

        // 2) Aggregate totals
        const totalRes = await fetch(
          `${API_BASE}/aggregate?site_id=${SITE_ID}&period=30d&metrics=pageviews,visitors`,
          { headers }
        );
        const totals = await totalRes.json();

        // 3) Top pages
        const topRes = await fetch(
          `${API_BASE}/breakdown?site_id=${SITE_ID}&period=30d&property=event:page&limit=5`,
          { headers }
        );
        const topPages = await topRes.json();

        setStats({
          live: live?.results ?? 0,
          totals: totals?.results ?? {},
          topPages: topPages?.results ?? [],
        });
      } catch (err) {
        console.error("Fout bij ophalen stats:", err);
      }
    }

    fetchStats();
  }, []);

  // --- Formulier submit (placeholder: console.log, kan naar API of mailservice) ---
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      console.log("Feedback verzonden:", formData);

      setSubmitted(true);
      setFormData({ category: "Contact", name: "", email: "", message: "" });
    } catch (err) {
      console.error("Versturen mislukt:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10">
      {/* Intro */}
      <section className="text-center">
        <h1 className="text-3xl font-bold text-indigo-700">Feedback & Info</h1>
        <p className="mt-2 text-gray-600">
          Laat je feedback achter, meld bugs of suggesties, en bekijk actuele
          statistieken van Bijbelzoek.nl.
        </p>
      </section>

      {/* Formulier */}
      <section className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Feedbackformulier</h2>
        {submitted ? (
          <p className="text-green-600 font-medium">
            Bedankt voor je feedback!
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Categorie</label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="mt-1 block w-full border rounded p-2"
              >
                <option>Contact</option>
                <option>Bug</option>
                <option>Suggestie</option>
                <option>Overig</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Naam</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="mt-1 block w-full border rounded p-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">E-mail</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="mt-1 block w-full border rounded p-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Bericht</label>
              <textarea
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                className="mt-1 block w-full border rounded p-2"
                rows="4"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Versturen..." : "Verstuur"}
            </button>
          </form>
        )}
      </section>

      {/* Statistieken */}
      <section className="bg-gray-50 rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Statistieken</h2>
        <div className="grid grid-cols-2 gap-6 text-center">
          <div>
            <p className="text-2xl font-bold text-indigo-700">
              {stats.live ?? "-"}
            </p>
            <p className="text-sm text-gray-500">Nu online</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-indigo-700">
              {stats.totals?.visitors?.value ?? "-"}
            </p>
            <p className="text-sm text-gray-500">Bezoekers (30 dagen)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-indigo-700">
              {stats.totals?.pageviews?.value ?? "-"}
            </p>
            <p className="text-sm text-gray-500">Paginaweergaven (30 dagen)</p>
          </div>
        </div>

        {stats.topPages?.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Top pagina’s</h3>
            <ul className="list-disc list-inside text-sm text-gray-600">
              {stats.topPages.map((p, i) => (
                <li key={i}>
                  {p.page} – {p.visitors?.value ?? "-"} bezoekers
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Over mij */}
      <section className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Over mij</h2>
        <p className="text-gray-700">
          Ik ben Peter van de Poel, initiatiefnemer van Bijbelzoek.nl. Je kunt
          meer over mij vinden op{" "}
          <a
            href="https://www.linkedin.com/in/petervandepoel/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 underline"
          >
            LinkedIn
          </a>
          .
        </p>
      </section>
    </div>
  );
}
