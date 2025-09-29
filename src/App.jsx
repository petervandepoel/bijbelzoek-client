// client/src/App.jsx
import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import BeginOpnieuwButton from "./components/BeginOpnieuwButton";

function Header() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  const baseLink =
    "px-3 py-1.5 rounded-lg font-semibold transition-colors";
  const active = "bg-yellow-300 text-indigo-900";
  const inactive = "bg-yellow-400 text-indigo-900 hover:bg-yellow-300";

  return (
    <header className="sticky top-0 z-50 bg-indigo-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-14 gap-2 sm:gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-base sm:text-lg font-bold tracking-wide">
              Bijbelzoek<span className="text-yellow-300">.nl</span>
            </span>
          </Link>

          {/* Navigatie */}
          <nav className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base">
            <Link
              to="/zoeken"
              className={`${baseLink} ${
                isActive("/zoeken") ? active : inactive
              }`}
            >
              Zoek
            </Link>
            <Link
              to="/favorites"
              className={`${baseLink} ${
                isActive("/favorites") ? active : inactive
              }`}
            >
              Studeer
            </Link>
            <BeginOpnieuwButton
              label="Opnieuw"
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
