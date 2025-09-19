import React, { useEffect, useMemo, useState } from "react";

export default function FeedbackWall() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  const charsLeft = useMemo(() => 500 - message.length, [message]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/feedback");
      if (!res.ok) throw new Error("Kan feedback niet laden");
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setError(e.message || "Onbekende fout");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setOk(false);
    if (!message.trim()) {
      setError("Voer een bericht in.");
      return;
    }
    if (message.length > 500) {
      setError("Maximaal 500 tekens.");
      return;
    }

    setPosting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Anoniem",
          message: message.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Plaatsen mislukt");
      }
      // Succes! Form leegmaken en opnieuw laden zodat we de DB-versie (met _id & createdAt) tonen
      setName("");
      setMessage("");
      setOk(true);
      await load();
    } catch (e) {
      setError(e.message || "Plaatsen mislukt");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-2xl p-4 bg-white/70">
      <form onSubmit={submit} className="space-y-3 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="border rounded-xl px-3 py-2 outline-none focus:ring w-full"
            placeholder="Naam (optioneel)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
          />
          <div className="md:col-span-2">
            <input
              className="border rounded-xl px-3 py-2 outline-none focus:ring w-full"
              placeholder="Jouw feedback / idee (max 500 tekens)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              required
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Publiek zichtbaar</span>
              <span>{charsLeft} resterend</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={posting}
            className={`px-4 py-2 rounded-xl text-white ${posting ? "bg-gray-400" : "bg-black hover:opacity-90"}`}
          >
            {posting ? "Plaatsen…" : "Plaatsen"}
          </button>
          <button
            type="button"
            onClick={load}
            className="px-3 py-2 rounded-xl border hover:bg-gray-50"
          >
            Vernieuwen
          </button>
          {ok && <span className="text-emerald-700 text-sm">Geplaatst!</span>}
          {error && <span className="text-rose-700 text-sm">{error}</span>}
        </div>
      </form>

      {loading ? (
        <p className="text-gray-500">Laden…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">Nog geen feedback. Wees de eerste 😉</p>
      ) : (
        <ul className="space-y-3">
          {items.map((f) => (
            <li key={f._id} className="p-3 border rounded-xl bg-white">
              <div className="text-sm text-gray-500 mb-1">
                <span className="font-medium">{f.name || "Anoniem"}</span> ·{" "}
                {f.createdAt ? new Date(f.createdAt).toLocaleString() : "zojuist"}
              </div>
              <p className="text-gray-800 whitespace-pre-wrap">{f.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
