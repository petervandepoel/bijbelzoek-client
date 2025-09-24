import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import Home from "./pages/Home.jsx";           // = Zoeken
import Favorites from "./pages/Favorites.jsx"; // = Studie en AI
import Uitleg from "./pages/Uitleg.jsx";       // NIEUW
import TipsEnOver from "./pages/TipsEnOver.jsx"; // NIEUW
import { AppProvider } from "./context/AppContext.jsx";
import "./index.css";
import Statistieken from "./pages/Statistieken.jsx";


const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },              // /
      { path: "favorites", element: <Favorites /> },   // /favorites
      { path: "uitleg", element: <Uitleg /> },         // /uitleg
      { path: "tips-en-over", element: <TipsEnOver /> }, // /tips-en-over
      { path: "statistieken", element: <Statistieken /> } // statistieken
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
