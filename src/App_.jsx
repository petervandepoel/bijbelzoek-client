import { Link, Outlet, useLocation } from "react-router-dom";

function Header() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

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

          {/* Navigatie */}
          <nav className="flex gap-6">
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
            >
              Studie en AI
            </Link>
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
