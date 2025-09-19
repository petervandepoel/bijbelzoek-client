import React, { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";

function useSummary(days) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let abort = false;
    (async () => {
      setErr(""); setData(null);
      const r = await fetch(`/api/analytics/summary?days=${days}`);
      if (!r.ok) throw new Error("Kon statistieken niet laden");
      const js = await r.json();
      if (!abort) setData(js);
    })().catch((e) => !abort && setErr(e.message || "Onbekende fout"));
    return () => { abort = true; };
  }, [days]);

  return { data, err };
}

export default function AnalyticsCharts({ days = 30 }) {
  const { data, err } = useSummary(days);

  const mergedDaily = useMemo(() => {
    if (!data) return [];
    const map = new Map();
    (data.pageviewsDaily || []).forEach(({ date, views }) => {
      map.set(date, { date, views, unique: 0 });
    });
    (data.uniqueDaily || []).forEach(({ date, unique }) => {
      if (!map.has(date)) map.set(date, { date, views: 0, unique });
      else map.get(date).unique = unique;
    });
    return Array.from(map.values()).sort((a,b) => a.date.localeCompare(b.date));
  }, [data]);

  if (err) return <div className="text-sm text-rose-700">{err}</div>;
  if (!data) return <div className="text-sm text-gray-500">Laden…</div>;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Pageviews per dag */}
      <div className="p-4 rounded-2xl border bg-white/70">
        <h3 className="font-semibold mb-2">Pageviews per dag</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChartLike data={mergedDaily} dataKey="views" />
          </ResponsiveContainer>
        </div>
      </div>

      {/* Unieke bezoekers per dag */}
      <div className="p-4 rounded-2xl border bg-white/70">
        <h3 className="font-semibold mb-2">Unieke bezoekers per dag</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedDaily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="unique" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top pagina's */}
      <div className="md:col-span-2 p-4 rounded-2xl border bg-white/70">
        <h3 className="font-semibold mb-2">Top pagina’s (periode)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(data.topPages || []).map(i => ({ page: i.page, views: i.views }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="page" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="views" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function AreaChartLike({ data, dataKey }) {
  // eenvoudige area-achtige stijl met LineChart (zonder custom kleuren)
  return (
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis allowDecimals={false} />
      <Tooltip />
      <Line type="monotone" dataKey={dataKey} />
    </LineChart>
  );
}
