// client/src/components/AiPretty.jsx
import React from "react";

export default function AiPretty({ text = "" }) {
  const verseRefRe =
    /\b((Gen|Ex|Lev|Num|Deut|Joz|Richt|Rut|1 Sam|2 Sam|1 Kon|2 Kon|1 Kron|2 Kron|Ezra|Neh|Est|Job|Ps(?:alm|almen)?|Spr|Pred|Hoogl|Jes|Jer|Kla|Ezech|Dan|Hos|Joël|Amos|Obad|Jona|Micha|Nah|Hab|Zef|Hag|Zach|Mal|Mat|Matt|Marcus|Mar|Luk|Lucas|Joh|Johannes|Hand|Rom|Romeinen|1 Kor|2 Kor|Gal|Ef|Efeze|Fil|Filippenzen|Kol|1 Thess|2 Thess|1 Tim|2 Tim|Tit|Filem|Hebr?|Jak|1 Petr|2 Petr|1 Joh|2 Joh|3 Joh|Judas|Openb?|Openbaring)\.?\s*\d+:\d+(?:-\d+)?)\b/gi;

  const lines = String(text).replaceAll("\r\n", "\n").split("\n");
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith("### ")) blocks.push({ t: "h3", v: l.slice(4) });
    else if (l.startsWith("## ")) blocks.push({ t: "h2", v: l.slice(3) });
    else if (/^\s*-\s+/.test(l)) {
      const items = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*-\s+/, ""));
        i++;
      }
      i--;
      blocks.push({ t: "ul", v: items });
    } else if (!l.trim()) blocks.push({ t: "space" });
    else blocks.push({ t: "p", v: l });
  }
  const hi = (s) =>
    s.replace(verseRefRe, (m) => `<span class="font-semibold text-indigo-700">${m}</span>`);

  return (
    <div className="text-[0.95rem] leading-6 space-y-3">
      {blocks.map((b, idx) => {
        if (b.t === "h2")
          return (
            <h3 key={idx} className="text-lg font-semibold text-indigo-700 border-b border-gray-200 pb-1">
              {b.v}
            </h3>
          );
        if (b.t === "h3")
          return (
            <h4 key={idx} className="text-base font-semibold text-indigo-600">
              {b.v}
            </h4>
          );
        if (b.t === "ul")
          return (
            <ul key={idx} className="list-disc pl-6 space-y-1">
              {b.v.map((it, i2) => (
                <li key={i2} dangerouslySetInnerHTML={{ __html: hi(it) }} />
              ))}
            </ul>
          );
        if (b.t === "space") return <div key={idx} className="h-2" />;
        return (
          <p
            key={idx}
            className="whitespace-pre-wrap text-gray-800 dark:text-gray-200"
            dangerouslySetInnerHTML={{ __html: hi(b.v) }}
          />
        );
      })}
    </div>
  );
}
