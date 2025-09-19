import { useApp } from "../context/AppContext";
import WordFrequencyChart from "../components/WordFrequencyChart";
import { useState } from "react";

export default function Favorites() {
  const {
    generalNotes, setGeneralNotes,
    favTexts, removeFavText, updateFavTextNote,
    favCharts, removeFavChart, updateFavChartNote
  } = useApp();

  const exportFile = async (fmt) => {
    const res = await fetch(`/api/export/${fmt}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generalNotes, favoritesTexts: favTexts, favoritesCharts: favCharts }),
    });
    if (!res.ok) return alert("Export mislukt");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fmt === "pdf" ? "favorieten.pdf" : "favorieten.docx";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="max-w-6xl mx-auto space-y-8">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">📝 Algemene notities</h2>
          <div className="flex gap-2">
            <button onClick={() => exportFile('pdf')} className="bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600">Exporteer PDF</button>
            <button onClick={() => exportFile('docx')} className="bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600">Exporteer DOCX</button>
          </div>
        </div>
        <textarea
          className="w-full min-h-[100px] p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900"
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="Schrijf hier je algemene notities..."
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">⭐ Teksten</h3>
        {favTexts.length === 0 ? <p className="text-gray-500">Nog geen teksten toegevoegd.</p> : (
          <div className="grid gap-4">
            {favTexts.map((t) => (
              <div key={t._id || t.ref} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{t.ref}</span>
                  <button className="text-red-500 hover:text-red-600" onClick={() => removeFavText(t._id || t.ref)}>Verwijderen</button>
                </div>
                <p className="text-sm mb-3">{t.text}</p>
                <input
                  className="w-full text-sm p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900"
                  value={t.note || ""}
                  onChange={(e) => updateFavTextNote(t._id || t.ref, e.target.value)}
                  placeholder="Notitie bij deze tekst..."
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">📊 Grafieken</h3>
        {favCharts.length === 0 ? <p className="text-gray-500">Nog geen grafieken toegevoegd.</p> : (
          <div className="grid gap-4">
            {favCharts.map((c) => (
              <div key={c.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium">{c.title}</div>
                    <div className="text-xs text-gray-500">Versie: {c.version} • Woorden: {c.words.join(", ")}</div>
                  </div>
                  <button className="text-red-500 hover:text-red-600" onClick={() => removeFavChart(c.id)}>Verwijderen</button>
                </div>
                {/* Render volledige grafiek */}
                <WordFrequencyChart queryWords={c.words} onClickDrill={null} onFavChart={null} />
                <input
                  className="mt-3 w-full text-sm p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900"
                  value={c.note || ""}
                  onChange={(e) => updateFavChartNote(c.id, e.target.value)}
                  placeholder="Notitie bij deze grafiek..."
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
