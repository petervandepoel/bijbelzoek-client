// src/components/WordFrequencyChart.jsx
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function WordFrequencyChart({ data, wordList, onClickDrill }) {
  if (!data || data.length === 0) {
    return <p className="text-gray-500">Geen data gevonden voor deze woorden.</p>;
  }

  const handleChartClick = (e) => {
    if (!e || !e.activePayload) return;
    const row = e.activePayload[0]?.payload;
    if (row) {
      onClickDrill?.({
        book: row.book,
        words: [...wordList], // altijd alle woorden meenemen
      });
    }
  };

  return (
    <div className="w-full h-96">
      <ResponsiveContainer>
        <BarChart data={data} onClick={handleChartClick}>
          <XAxis dataKey="book" />
          <YAxis />
          <Tooltip />
          <Legend />
          {wordList.map((w, i) => (
            <Bar key={w} dataKey={w} fill={`hsl(${(i * 60) % 360},70%,50%)`} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
