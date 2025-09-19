import React, { useEffect, useState } from "react";
import { BarChart2 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function KPIStats() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    const run = async () => {
      setErr("");
      try {
        const res = await fetch("/api/analytics/stats?limit=8");
        if (!res.ok) throw new Error("Kon statistieken niet laden");
        const data = await res.json();
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        setErr(e.message || "Onbekende fout");
      }
    };
    run();
  }, []);

  return (
    <div className="p-4 rounded-2xl border bg-white/70">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-indigo-700">
          <BarChart2 /> <h2 className="font-semibold">Bezoekersactiviteit</h2>
        </div>
        <span className="text-xs text-gray-500">Top pagina’s (views)</span>
      </div>
      {err ? (
        <p className="text-rose-700 text-sm">{err}</p>
      ) : items.length === 0 ? (
        <p className="text-gray-600 text-sm">Nog geen data.</p>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={items.map(i => ({ page: i.page, count: i.count }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="page" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
