import React, { useState } from "react";
import PageViewTracker from "../components/PageViewTracker";
import AnalyticsCharts from "../components/AnalyticsCharts";
import { BarChart2 } from "lucide-react";

export default function Statistieken() {
  const [days, setDays] = useState(30);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <PageViewTracker page="statistieken" />
      <div className="flex items-center gap-2 text-indigo-700 mb-2">
        <BarChart2 /> <h1 className="text-2xl font-semibold">Statistieken</h1>
      </div>
      <p className="text-gray-700 mb-4">Bezoekers per dag, unieke bezoekers en pageviews.</p>

      <div className="mb-4 flex gap-2">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            className={`px-3 py-1 rounded-lg border ${days === d ? "bg-indigo-600 text-white" : "bg-white hover:bg-gray-50"}`}
            onClick={() => setDays(d)}
          >
            Laatste {d} dagen
          </button>
        ))}
      </div>

      <AnalyticsCharts days={days} />
      <p className="mt-6 text-sm text-gray-500">
        Tip: wil je liever open-source analytics (bijv. Umami, Matomo, Plausible)? Dat kan naast of in plaats van deze built-in statistieken.
      </p>
    </div>
  );
}
