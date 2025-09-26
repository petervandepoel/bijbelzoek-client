// client/src/App.jsx
import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import BeginOpnieuwButton from "./components/BeginOpnieuwButton";


function Header() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  // Eén uniforme stijl voor knoppen/links
  const baseLink =
    "px-3 py-1.5 rounded-lg font-semibold transition-colors hover:bg-yellow-300/90";
  const active = "bg-yellow-300 text-indigo-900";
  const inactive = "bg-yellow-400 text-indigo-900";

  return (
    <header className="bg-indigo-600 text-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* 1) Logo → LandingPage */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-wide">
              Bijbelzoek<span className="text-yellow-300">.nl</span>
            </span>
          </Link>

          {/* 2) Navigatie */}
          <nav className="flex items-center gap-3">
            <Link
              to="/zoeken"
              className={`${baseLink} ${isActive("/zoeken") ? active : inactive}`}
              title="Zoeken"
            >
              Zoek
            </Link>
            <Link
              to="/favorites"
              className={`${baseLink} ${isActive("/favorites") ? active : inactive}`}
              title="Studeer"
            >
              Studeer
            </Link>
            <BeginOpnieuwButton
              label="Begin opnieuw"
              className={`${baseLink} ${inactive}`}
            />
          </nav>

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

<script defer data-domain="bijbelzoek.nl" src="https://plausible.io/js/script.js"></script>