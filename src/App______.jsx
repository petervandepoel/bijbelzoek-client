import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

import { useApp } from "./context/AppContext.jsx";
import BeginOpnieuwButton from "./components/BeginOpnieuwButton.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "";

function Header() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  const {
    generalNotes = "",
    favTexts = [],
    favCharts = [],
    aiResults = [],
    version = "HSV",
    searchMode = "exact",
  } = useApp() || {};

  const [busy, setBusy] = useState(false);

  async function exportAll(fmt) {
    try {
      setBusy(true);
      const url = `${API_BASE}/api/export/${fmt}`;
      const payload = {
        generalNotes,
        favoritesTexts: favTexts,
        favoritesCharts: favCharts,
        aiResults,
        version,
        searchMode,
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
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
        {/* 4-sectie header */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-center h-16">
          {/* 1) Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-wide">
                Bijbelzoek<span className="text-yellow-300">.nl</span>
              </span>
            </Link>
          </div>

          {/* 2) Primair: Zoeken + Studie en AI */}
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
          </nav>

          {/* 3) Export + Begin opnieuw (compact, subtiel) */}
          <div className="hidden lg:flex items-center justify-center gap-2">
            <button
              disabled={busy}
              onClick={() => exportAll("pdf")}
              className={
                "text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 border border-white/20 text-white disabled:opacity-60"
              }
              title="Exporteer alle favorieten (PDF)"
            >
              Export PDF
            </button>
            <button
              disabled={busy}
              onClick={() => exportAll("docx")}
              className={
                "text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 border border-white/20 text-white disabled:opacity-60"
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

            {/* scheiding subtiel */}
            <span className="inline-block w-px h-5 bg-white/25 mx-2" aria-hidden="true" />

            {/* Subtiele Begin opnieuw + Herstel */}
            <BeginOpnieuwButton className="" label="Begin opnieuw" />
          </div>

          {/* 4) Secundair: Uitleg + Tips & Over */}
          <nav className="hidden lg:flex items-center justify-end gap-4 text-sm opacity-90">
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

          {/* Voor kleinere schermen tonen we export + begin-opnieuw onder de primaire navigatie */}
          <div className="col-span-2 lg:hidden -mt-2 flex items-center gap-2 flex-wrap pb-3">
            <button
              disabled={busy}
              onClick={() => exportAll("pdf")}
              className={
                "text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 border border-white/20 text-white disabled:opacity-60"
              }
              title="Export PDF"
            >
              Export PDF
            </button>
            <button
              disabled={busy}
              onClick={() => exportAll("docx")}
              className={
                "text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 border border-white/20 text-white disabled:opacity-60"
              }
              title="Export DOCX"
            >
              Export DOCX
            </button>
            <BeginOpnieuwButton className="" label="Begin opnieuw" />
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
