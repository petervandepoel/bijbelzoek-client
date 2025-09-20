// client/src/components/ReadChapterButton.jsx
import React from "react";
import { BookOpen } from "lucide-react";

export default function ReadChapterButton({ book, chapter, onClick }) {
  return (
    <button
      onClick={() => onClick?.(book, chapter)}
      className="p-1 rounded text-indigo-500 hover:text-indigo-700 text-xs"
      title={`Lees ${book} ${chapter}`}
    >
      <BookOpen className="w-4 h-4 inline-block mr-1" />
      Hoofdstuk
    </button>
  );
}
