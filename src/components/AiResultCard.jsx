// client/src/components/AiResultCard.jsx
import React, { useEffect, useState } from "react";

export default function AiResultCard({ result }){
  const [extra,setExtra] = useState(null);

  useEffect(()=>{
    async function fetchExtras(){
      if(result.kind==="actueelmedia"){
        const q = encodeURIComponent(result.query || "bijbel");
        const news = await fetch("/api/ai/actueel",{ method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ query: q })}).then(r=>r.json());
        const media = await fetch("/api/ai/media",{ method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ query: q })}).then(r=>r.json());
        setExtra({ news: news.items, media: media.items });
      }
    }
    fetchExtras();
  },[result]);

  const highlightRefs = (text) => {
    if(!text) return null;
    return text.split(/(\b[A-Z][a-z]+\.? ?\d+:\d+\b)/g).map((part,i)=>
      part.match(/\d+:\d+/) ? <strong key={i}>{part}</strong> : part
    );
  };

  return (
    <div className="ai-card">
      <h3>{result.title}</h3>
      {result.centrale && (
        <section><h4>📖 Centrale gedeelten</h4>
          <ul>{result.centrale.map((c,i)=><li key={i}>{highlightRefs(c)}</li>)}</ul>
        </section>
      )}
      {result.achtergrond && (
        <section><h4>📚 Achtergrond & Inzichten</h4><p>{highlightRefs(result.achtergrond)}</p></section>
      )}
      {result.outline && (
        <section><h4>🗂 Outline</h4><ul>{result.outline.map((o,i)=><li key={i}>{o}</li>)}</ul></section>
      )}
      {result.toepassing && (
        <section><h4>💡 Toepassing</h4><p>{highlightRefs(result.toepassing)}</p></section>
      )}
      {result.gebed && (
        <section><h4>🙏 Gebed</h4><p>{result.gebed}</p></section>
      )}
      {result.liederen && (
        <section><h4>🎶 Liederen</h4>
          <ul>{result.liederen.map((l,i)=>{
            const url = l.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(l.title)}`;
            return <li key={i}><a href={url} target="_blank" rel="noreferrer">{l.title}</a></li>;
          })}</ul>
        </section>
      )}
      {extra && (
        <section><h4>📰 Actueel & Media</h4>
          <div>
            {extra.news && <><h5>Nieuws</h5><ul>{extra.news.map((n,i)=><li key={i}><a href={n.url} target="_blank" rel="noreferrer">{n.title}</a> ({n.source})</li>)}</ul></>}
            {extra.media && <><h5>Media</h5><ul>{extra.media.map((m,i)=><li key={i}><a href={m.url} target="_blank" rel="noreferrer">{m.url}</a></li>)}</ul></>}
          </div>
        </section>
      )}
    </div>
  );
}
