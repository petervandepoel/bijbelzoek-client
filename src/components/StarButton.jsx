// client/src/components/StarButton.jsx
import React from "react";
import { Star } from "lucide-react";

export default function StarButton({ active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`p-1 rounded-full ${
        active
          ? "text-yellow-500 hover:text-yellow-600"
          : "text-gray-400 hover:text-yellow-400"
      }`}
      title={active ? "Verwijder uit favorieten" : "Voeg toe aan favorieten"}
    >
      <Star className="w-5 h-5" fill={active ? "currentColor" : "none"} />
    </button>
  );
}
