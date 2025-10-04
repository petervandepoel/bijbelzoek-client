// client/src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import BeginOpnieuwButton from "./components/BeginOpnieuwButton";
import { useApp } from "./context/AppContext";
import { exportAllFromAnywhere } from "./utils/exporter";

/** Klik-buiten / ESC hook */
function useClickAway(ref, onAway) {
  useEffect(() => {
    function onDocClick(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onAway?.();
    }
    function onEsc(e) {
      if (e.key === "Escape") onAway?.();
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [ref, onAway]);
}

function Sidebar({ collapsed, setCollapsed, onResetNotice }) {
  const location = useLocation();
  const navigate = useNavigate();
  const app = useApp?.() || {};

  const [showHelp, setShowHelp] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);
  useClickAway(exportRef, () => setExportOpen(false));

  const currentStep = useMemo(() => {
    if (location.pathname.startsWith("/favorites")) return 3;
    if (location.pathname.startsWith("/zoeken")) return 2;
    return 1;
  }, [location.pathname]);

  const steps = [
    { id: 1, title: "Startpagina", long: "Landingpage", path: "/" },
    { id: 2, title: "Zoeken", long: "Zoeken", path: "/zoeken" },
    { id: 3, title: "Studie", long: "Studie", path: "/favorites" },
    { id: 4, title: "Export", long: "Exporteren", path: "/favorites" },
  ];

  const canExport = currentStep === 3;
  const progressPct = ((currentStep - 1) / (steps.length - 1)) * 100;

  async function doExport(fmt) {
    try {
      setExportOpen(false);
      await exportAllFromAnywhere(fmt, app, document);
    } catch (e) {
      alert(e?.message || "Export mislukt");
    }
  }

  return (
    <aside
      className={`${
        collapsed ? "w-14" : "w-56"
      } bg-gray-100 border-r border-gray-300 flex flex-col transition-all duration-300 fixed top-0 left-0 bottom-0`}
    >
      {/* Top: logo + collapse */}
      <div className="flex items-center justify-between p-3 border-b border-gray-300">
        <Link
          to="/"
          className="font-bold text-indigo-700 whitespace-nowrap overflow-hidden"
          title="Stap 1: Landingpage"
        >
          Bijbelzoek<span className="text-yellow-600">.nl</span>
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-600 hover:text-indigo-700"
        >
          ≡
        </button>
      </div>

      {/* Scrollbaar middenstuk met stappen */}
      <div className="relative flex-1 flex flex-col overflow-y-auto">
        {/* Progress-bar verticaal */}
        <div className="absolute left-4 top-0 bottom-0 w-1 bg-gray-300 rounded">
          <div
            className="bg-yellow-400 rounded transition-all"
            style={{ height: `${progressPct}%` }}
          />
        </div>

        <nav className="flex-1 flex flex-col gap-1 pl-8 pr-2 pt-4">
          {steps.map((s) => {
            const active = currentStep === s.id;
            const disabled = s.id === 4 && !canExport;
            return (
              <div key={s.id} className="flex flex-col gap-1">
                <button
                  disabled={disabled}
                  onClick={() => {
                    if (s.id === 4) {
                      if (!disabled) setExportOpen((v) => !v);
                    } else {
                      navigate(s.path);
                    }
                  }}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium text-left transition-colors
                    ${
                      active
                        ? "bg-yellow-300 text-indigo-900"
                        : "hover:bg-yellow-100 text-gray-800"
                    }
                    ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span className="font-bold">{s.id}</span>
                  {!collapsed && <span>{s.title}</span>}
                </button>

                {/* Export dropdown */}
                {s.id === 4 && exportOpen && (
                  <div
                    ref={exportRef}
                    className="ml-6 mt-1 bg-white border border-gray-300 rounded shadow-lg text-sm overflow-hidden"
                  >
                    <button
                      className="block w-full px-3 py-2 hover:bg-gray-100 text-left"
                      onClick={() => doExport("pdf")}
                    >
                      Exporteren als PDF
                    </button>
                    <button
                      className="block w-full px-3 py-2 hover:bg-gray-100 text-left"
                      onClick={() => doExport("docx")}
                    >
                      Exporteren als DOCX
                    </button>
                  </div>
                )}

                {/* Uitleg direct onder stap 4 */}
                {s.id === 4 && showHelp && !collapsed && (
                  <div className="ml-2 mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded text-xs text-gray-800 relative">
                    <button
                      onClick={() => setShowHelp(false)}
                      className="absolute top-1 right-1 text-gray-500 hover:text-gray-700"
                      title="Sluit uitleg"
                    >
                      ✕
                    </button>
                    <div className="font-semibold mb-1">Uitleg</div>
                    {currentStep === 1 &&
                      "Stap 1: Je bent je op de landingpage. Start hier met zoekwoorden, of stel ze zelf samen via stap 2 → Zoeken."}
                    {currentStep === 2 &&
                      "Stap 2: Zoek en bewaar hier relevante teksten en grafieken. Ga daarna naar stap 3 -> Studie."}
                    {currentStep === 3 &&
                      "Stap 3: Voeg notities en inzichten toe. Gebruik de AI-module voor een opzet voor Bijbelstudie, preek of sing-in. Daarna kun je stap 4 -> exporteren."}
                    {currentStep === 4 &&
                      "Stap 4: Exporteer je teksten, grafieken, AI-resultaten en notities naar PDF of Word, of deel ze."}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Begin opnieuw sticky onderaan */}
      <div className="p-3 border-t border-gray-300 sticky bottom-0 bg-gray-100">
        <BeginOpnieuwButton
          label="Begin opnieuw"
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg px-3 py-2 text-sm"
          onClick={() => {
            setShowHelp(true);
            onResetNotice();
          }}
        />
      </div>
    </aside>
  );
}

export default function App() {
  const [showSmallScreenNotice, setShowSmallScreenNotice] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

useEffect(() => {
  // Check slechts één keer bij laden
  if (window.innerWidth < 864) {
    setCollapsed(true);
    setShowSmallScreenNotice(true);
  } else {
    setCollapsed(false);
    setShowSmallScreenNotice(false);
  }
}, []);


  const resetNotice = () => {
    if (window.innerWidth < 864) {
      setShowSmallScreenNotice(true);
      setCollapsed(true);
    } else {
      setShowSmallScreenNotice(false);
      setCollapsed(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        onResetNotice={resetNotice}
      />
      <main className="flex-1 p-4 overflow-y-auto ml-14 md:ml-56">
        {showSmallScreenNotice && (
          <div
            className={`mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded relative 
              transition-opacity duration-500 ease-in-out opacity-100`}
          >
            <button
              onClick={() => setShowSmallScreenNotice(false)}
              className="absolute top-1 right-2 text-yellow-700 hover:text-yellow-900"
            >
              ✕
            </button>
            <p className="font-semibold">Let op!</p>
            <p>
              U bezoekt deze site via een klein scherm. Hierdoor functioneert
              met name de grafiek functionaliteit minder goed. Voor optimaal
              resultaat raden wij een tablet/pc aan.
            </p>
            <p className="mt-2">
              Het menu is bij kleinere schermen standaard ingeklapt. Druk op{" "}
              <strong>≡</strong> linksboven om het menu te openen.
            </p>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}