// client/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import SearchPage from "./pages/SearchPage.jsx";     // 🔹 vervangt Home.jsx
import Favorites from "./pages/Favorites.jsx";
import Uitleg from "./pages/Uitleg.jsx";
import TipsEnOver from "./pages/TipsEnOver.jsx";
import Statistieken from "./pages/Statistieken.jsx";
import { AppProvider } from "./context/AppContext.jsx";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <SearchPage /> },      // 🔹 startpagina = SearchPage
      { path: "favorites", element: <Favorites /> },
      { path: "uitleg", element: <Uitleg /> },
      { path: "tips-en-over", element: <TipsEnOver /> },
      { path: "statistieken", element: <Statistieken /> },
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
