import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import Home from "./pages/Home.jsx";
import Favorites from "./pages/Favorites.jsx";
import { AppProvider } from "./context/AppContext.jsx";
import "./index.css";

const router = createBrowserRouter([
  { path: "/", element: <App />, children: [
      { index: true, element: <Home /> },
      { path: "favorites", element: <Favorites /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  </React.StrictMode>
);
