import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useApp } from "./context/AppContext.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || ""; 


function Header() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  // Pak alle data uit context; val veilig terug als iets ontbreekt
  const {
    generalNotes = "",
    favTexts = [],
    favCharts = [],
    aiResults = [],
  } = useApp() || {};

  const [busy, setBusy] = useState(false);

  async function exportAll(fmt) {
  try {
    setBusy(true);
    const url = `${API_BASE}/api/export/${fmt}`; // <-- expliciet base
    const payload = {
      generalNotes,
      favoritesTexts: favTexts,
      favoritesCharts: favCharts,
      aiResults,
      // (optioneel) geef ook versie/mode door voor consistency
      version,
      searchMode,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Debug: check of we de juiste exporter raken
    console.log("X-Exporter:", res.headers.get("x-exporter"));

    if (!res.ok) throw new Error(`Export mislukt (${res.status})`);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fmt === "pdf" ? "favorieten.pdf" : "favorieten.docx";
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (e) {
    alert(e.message || "Export mislukt");
  } finally {
    setBusy(false);
  }
}

  return (
    <header className="bg-indigo-600 text-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-wide">
              Bijbelzoek<span className="text-yellow-300">.nl</span>
            </span>
          </Link>

          {/* Navigatie (primair + secundair) */}
          <div className="flex items-center gap-8">
            {/* Primair */}
            <nav className="flex items-center gap-3">
              <Link
                to="/"
                className={
                  `transition-colors font-medium hover:text-yellow-300 ` +
                  (isActive("/") ? "underline underline-offset-4 decoration-yellow-300" : "")
                }
              >
                Zoeken
              </Link>

              <Link
                to="/favorites"
                className={
                  `px-3 py-1 rounded-lg font-semibold shadow transition-colors ` +
                  (isActive("/favorites")
                    ? "bg-yellow-300 text-indigo-900"
                    : "bg-yellow-400 text-indigo-900 hover:bg-yellow-300")
                }
                title="Studie en AI"
              >
                Studie en AI
              </Link>

              {/* NIEUW: Export knoppen naast 'Studie en AI' */}
              <button
                disabled={busy}
                onClick={() => exportAll("pdf")}
                className={
                  "px-3 py-1 rounded-lg transition " +
                  "bg-white/10 hover:bg-white/20 border border-white/20 text-white disabled:opacity-60"
                }
                title="Exporteer alle favorieten (PDF)"
              >
                Export PDF
              </button>
              <button
                disabled={busy}
                onClick={() => exportAll("docx")}
                className={
                  "px-3 py-1 rounded-lg transition " +
                  "bg-white/10 hover:bg-white/20 border border-white/20 text-white disabled:opacity-60"
                }
                title="Exporteer alle favorieten (DOCX)"
              >
                Export DOCX
              </button>

              {busy && (
                <span className="text-xs opacity-80" aria-live="polite">
                  Bezig…
                </span>
              )}
            </nav>

            {/* Secundair */}
            <nav className="hidden sm:flex items-center gap-4 text-sm opacity-90">
              <Link
                to="/uitleg"
                className={
                  `hover:text-yellow-200 ` +
                  (isActive("/uitleg") ? "underline underline-offset-4" : "")
                }
              >
                Uitleg
              </Link>
              <Link
                to="/tips-en-over"
                className={
                  `hover:text-yellow-200 ` +
                  (isActive("/tips-en-over") ? "underline underline-offset-4" : "")
                }
              >
                Tips &amp; Over
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header />
      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}
