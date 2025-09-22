// client/src/pages/Favorites.jsx
import React, { useMemo, useState } from "react";
import AiResultCard from "../components/AiResultCard";

/**
 * Best-effort context collector.
 * Probeert data op te halen uit (in volgorde):
 * - props-ish globals (window.__favorites, window.__notes, window.__charts, window.__words, window.__topBooks)
 * - localStorage keys: favorites, notes, charts, words, topBooks
 * Valideert en reduceert naar een compact samenvattingsobject.
 */
function safeParse(json) {
  try { return JSON.parse(json); } catch { return null; }
}
function toArray(x){ return Array.isArray(x) ? x : (x ? [x] : []); }
function uniq(arr){ return Array.from(new Set(arr)); }

function collectClientContext(){
  const g = (typeof window !== "undefined") ? window : {};
  const fromGlobal = {
    favorites: g.__favorites,
    notes: g.__notes,
    charts: g.__charts,
    words: g.__words,
    topBooks: g.__topBooks
  };
  const fromStorage = {
    favorites: safeParse(typeof localStorage !== "undefined" ? localStorage.getItem("favorites") : null),
    notes: safeParse(typeof localStorage !== "undefined" ? localStorage.getItem("notes") : null),
    charts: safeParse(typeof localStorage !== "undefined" ? localStorage.getItem("charts") : null),
    words: safeParse(typeof localStorage !== "undefined" ? localStorage.getItem("words") : null),
    topBooks: safeParse(typeof localStorage !== "undefined" ? localStorage.getItem("topBooks") : null)
  };

  const pick = (key) => fromGlobal[key] || fromStorage[key] || [];
  const favorites = toArray(pick("favorites")).filter(Boolean);
  const notes = toArray(pick("notes")).filter(Boolean);
  const charts = toArray(pick("charts")).filter(Boolean);
  const words = toArray(pick("words")).filter(Boolean);
  const topBooks = toArray(pick("topBooks")).filter(Boolean);

  // Normalize favorites: expect items like { ref:"Rom 8:1-4", text:"...", note:"..." }
  const normalizedFavorites = favorites.map((f) => ({
    ref: f?.ref || f?.reference || f?.id || "",
    text: f?.text || f?.vers || f?.content || "",
    note: f?.note || f?.notitie || ""
  })).filter(x => x.ref || x.text || x.note);

  // Notes: plain strings or {title, text}
  const normalizedNotes = notes.map((n) => (typeof n === "string" ? { title: "", text: n } : ({
    title: n?.title || n?.onderwerp || "",
    text: n?.text || n?.body || n?.inhoud || ""
  }))).filter(x => x.text);

  // Charts: accept either frequency objects or labels
  const normalizedWords = words.flatMap((w) => {
    if (!w) return [];
    if (typeof w === "string") return [{ word: w, count: 1 }];
    if (Array.isArray(w)) return w.map(x => (typeof x === "string" ? { word: x, count: 1 } : x));
    if (typeof w === "object") {
      return Object.entries(w).map(([word, count]) => ({ word, count }));
    }
    return [];
  }).filter(Boolean);

  const normalizedTopBooks = topBooks.flatMap((b) => {
    if (!b) return [];
    if (typeof b === "string") return [{ book: b, count: 1 }];
    if (Array.isArray(b)) return b.map(x => (typeof x === "string" ? { book: x, count: 1 } : x));
    if (typeof b === "object" && !Array.isArray(b)) {
      return Object.entries(b).map(([book, count]) => ({ book, count }));
    }
    return [];
  }).filter(Boolean);

  const wordSummary = normalizedWords
    .sort((a,b)=> (b.count||0) - (a.count||0))
    .slice(0,20);

  const topBooksSummary = normalizedTopBooks
    .sort((a,b)=> (b.count||0) - (a.count||0))
    .slice(0,10);

  return {
    favorites: normalizedFavorites,
    notes: normalizedNotes,
    words: wordSummary,
    topBooks: topBooksSummary,
    charts, // raw pass-through in case de server er iets mee kan
    counts: {
      favorites: normalizedFavorites.length,
      notes: normalizedNotes.length,
      words: wordSummary.length,
      topBooks: topBooksSummary.length
    }
  };
}

function buildPrompt({ mode, userInput, context }){
  const lines = [];
  lines.push("DOEL: Maak een rijk resultaat voor " + (mode || "onbekend") + ".");
  lines.push("");
  lines.push("USER_INPUT:");
  lines.push(userInput || "(leeg)");
  lines.push("");

  lines.push("CONTEXT:");
  lines.push(" – Favorieten (" + context.counts.favorites + "):");
  context.favorites.slice(0,50).forEach((f, i) => {
    const ref = f.ref ? "[" + f.ref + "] " : "";
    const txt = (f.text || "").replace(/\s+/g, " ").trim();
    const note = f.note ? " {note: " + f.note.replace(/\s+/g," ").trim() + "}" : "";
    lines.push("   " + (i+1) + ". " + ref + (txt ? txt.slice(0,240) : "") + note);
  });
  if(context.counts.notes){
    lines.push(" – Notities (" + context.counts.notes + "):");
    context.notes.slice(0,30).forEach((n,i)=>{
      const t = n.title ? ("(" + n.title + ") ") : "";
      lines.push("   " + (i+1) + ". " + t + (n.text || "").replace(/\s+/g," ").trim().slice(0,300));
    });
  }
  if(context.counts.words){
    lines.push(" – Woorden top (" + context.counts.words + "):");
    lines.push("   " + context.words.map(w => w.word + ":" + (w.count ?? 1)).join(", "));
  }
  if(context.counts.topBooks){
    lines.push(" – Topboeken (" + context.counts.topBooks + "):");
    lines.push("   " + context.topBooks.map(b => b.book + ":" + (b.count ?? 1)).join(", "));
  }
  lines.push("");
  lines.push("Richtlijnen output:");
  lines.push(" - Geef GEEN JSON in deze stream; schrijf leesbare proza voor de ‘Extra instructies’-weergave.");
  lines.push(" - Bewaar concrete opsommingen, titels en bullets.");
  lines.push(" - Kondig expliciet aan waar je Bijbelverwijzingen gebruikt.");

  return lines.join("\n");
}

export default function Favorites(){
  const [live,setLive] = useState({ running:false, text:"", error:"", preview:null });
  const [results,setResults] = useState([]);
  const [userInput,setUserInput] = useState("");

  const context = useMemo(()=>collectClientContext(),[]);

  const modes = [
    { key:"preek", label:"Preek" },
    { key:"studie", label:"Bijbelstudie" },
    { key:"liederen", label:"Liederen" },
    { key:"actueelmedia", label:"Actueel & Media" }
  ];

  function contextPreview(){
    const c = context.counts;
    const parts = [];
    parts.push(c.favorites + " teksten");
    if(c.notes) parts.push(c.notes + " notities");
    if(c.words) parts.push(c.words + " woord-highlights");
    if(c.topBooks) parts.push(c.topBooks + " topboeken");
    return parts.join(" • ");
  }

  async function generate(mode){
    const prompt = buildPrompt({ mode, userInput, context });

    // Stream proza
    setLive({ running:true, text:"", error:"", preview: { mode, counts: context.counts } });

    // We gebruiken fetch + ReadableStream i.p.v. native EventSource
    // omdat we in dezelfde POST body de prompt mee willen geven.
    try {
      const resp = await fetch("/api/ai/compose/stream", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ prompt })
      });
      if(!resp.body) throw new Error("Geen stream body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while(true){
        const {value, done} = await reader.read();
        if(done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Server stuurt `data: "..."\n\n` regels; haal de payloads eruit
        chunk.split("\n\n").forEach(line => {
          if(line.startsWith("data: ")){
            const data = line.slice(6);
            if(data === "[DONE]") return;
            try {
              const piece = JSON.parse(data);
              acc += piece;
            } catch {
              acc += data;
            }
          }
        });
        setLive(l => ({ ...l, text: acc }));
      }
    } catch (e){
      setLive({ running:false, text:"", error: e.message, preview:null });
      return;
    }

    // Na stream → gestructureerde JSON ophalen
    try {
      const json = await fetch("/api/ai/compose", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt })
      }).then(r=>r.json());

      setResults(r => [
        ...r,
        {
          ...json,
          kind: mode,
          query: userInput,
          contextCounts: context.counts,
          createdAt: new Date().toISOString(),
          title: (json?.title) || (modes.find(m=>m.key===mode)?.label + " - resultaat")
        }
      ]);
    } catch(e){
      setLive({ running:false, text:"", error: e.message, preview:null });
      return;
    }

    setLive({ running:false, text:"", error:"", preview:null });
  }

  return (
    <div className="favorites-page">
      <h2>Favorieten</h2>

      {/* Context-preview */}
      <div className="context-preview" style={{margin:"8px 0", opacity:0.9}}>
        <small>Context: {contextPreview() || "geen data gevonden"}</small>
      </div>

      {/* User input */}
      <div style={{display:"flex", gap:8, margin:"8px 0"}}>
        <input
          value={userInput}
          onChange={e=>setUserInput(e.target.value)}
          placeholder="Extra focus of vraag (optioneel)…"
          style={{flex:1, padding:"8px"}}
        />
      </div>

      {/* Modes */}
      <div className="ai-modes" style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8}}>
        {modes.map(m => (
          <button key={m.key} onClick={()=>generate(m.key)}>{m.label}</button>
        ))}
      </div>

      {/* Live stream */}
      {live.running && (
        <div className="live-stream" style={{marginTop:16, border:"1px solid #eee", borderRadius:6, padding:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h4 style={{margin:0}}>Extra instructies (streaming)</h4>
            <small>{live.preview?.mode} • {contextPreview()}</small>
          </div>
          <pre style={{whiteSpace:"pre-wrap"}}>{live.text}</pre>
        </div>
      )}

      {/* Results */}
      <div className="ai-results" style={{marginTop:16, display:"grid", gap:12}}>
        {results.map((r,i)=>(<AiResultCard key={i} result={r}/>))}
      </div>

      {/* Error */}
      {live.error && (
        <div style={{marginTop:12, color:"#b00020"}}>Fout: {live.error}</div>
      )}
    </div>
  );
}
