// client/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import App from "./App.jsx";
import SearchPage from "./pages/SearchPage.jsx";
import Favorites from "./pages/Favorites.jsx";
import Statistieken from "./pages/Statistieken.jsx";
import { AppProvider } from "./context/AppContext.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import FeedbackPage from "./pages/FeedbackPage";

import "./index.css";

function AppErrorBoundary() {
  return <div>Pagina niet gevonden of er ging iets mis.</div>;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <AppErrorBoundary />,
    children: [
      // LandingPage is nu de standaardpagina
      { index: true, element: <LandingPage /> },

      // expliciete routes
      { path: "zoeken", element: <SearchPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "favorites", element: <Favorites /> },
      { path: "statistieken", element: <Statistieken /> },
      { path: "feedback", element: <FeedbackPage />},

      // fallback: onbekende paden → LandingPage
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  </React.StrictMode>
);
