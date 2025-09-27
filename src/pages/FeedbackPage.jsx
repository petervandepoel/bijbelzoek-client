import React, { useState, useEffect } from "react";

const API_BASE = "https://plausible.io/api/v1/stats";
const SITE_ID = "bijbelzoek.nl";
const API_KEY = import.meta.env.VITE_PLAUSIBLE_API_KEY;

export default function FeedbackPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "feedback",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [stats, setStats] = useState({
    live: null,
    totals: null,
    topPages: [],
  });

  const [feedbacks, setFeedbacks] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // --- Haal Plausible statistieken op ---
  useEffect(() => {
    const headers = {
      Authorization: `Bearer ${API_KEY}`,
    };

    async function fetchStats() {
      try {
        const liveRes = await fetch(
          `${API_BASE}/realtime/visitors?site_id=${SITE_ID}`,
          { headers }
        );
        const live = await liveRes.json();

        const totalRes = await fetch(
          `${API_BASE}/aggregate?site_id=${SITE_ID}&period=30d&metrics=pageviews,visitors`,
          { headers }
        );
        const totals = await totalRes.json();

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

  // --- Haal feedbacks op uit backend ---
  useEffect(() => {
    async function loadFeedbacks() {
      try {
        const res = await fetch(`/api/feedback?page=${page}`);
        const data = await res.json();
        setFeedbacks(data.data || []);
        setPages(data.pages || 1);
      } catch (err) {
        console.error("Feedback ophalen mislukt:", err);
      }
    }
    loadFeedbacks();
  }, [page, submitted]);

  // --- Formulier submit ---
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSubmitted(true);
        setFormData({
          name: "",
          email: "",
          subject: "feedback",
          message: "",
        });
        setPage(1);
      } else {
        const data = await res.json();
        console.error("Fout:", data.error);
        alert("Feedback kon niet worden verzonden.");
      }
    } catch (err) {
      console.error("Versturen mislukt:", err);
      alert("Er is een fout opgetreden.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10">
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

      {/* Feedbackformulier */}
      <section className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Feedback achterlaten</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Naam</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="mt-1 block w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              E-mail (alleen zichtbaar voor beheerder)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="mt-1 block w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Onderwerp</label>
            <select
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              className="mt-1 block w-full border rounded p-2"
            >
              <option value="feedback">Feedback</option>
              <option value="gewoon een berichtje">Gewoon een berichtje</option>
              <option value="bug">Bug</option>
              <option value="new feature">New feature</option>
              <option value="overig">Overig</option>
            </select>
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
      </section>

      {/* Feedbacklijst */}
      <section className="bg-gray-50 rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Laatste feedback</h2>
        {feedbacks.length === 0 ? (
          <p className="text-gray-500">Nog geen feedback.</p>
        ) : (
          <ul className="space-y-4">
            {feedbacks.map((f) => (
              <li key={f.id} className="border-b pb-2">
                <p className="text-sm text-gray-500">
                  {new Date(f.createdAt).toLocaleString()} — {f.subject}
                </p>
                <p className="font-medium">{f.name}</p>
                <p>{f.message}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-between mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Vorige
          </button>
          <span>
            Pagina {page} van {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Volgende
          </button>
        </div>
      </section>
    </div>
  );
}
