import React, { useEffect, useState } from "react";

/**
 * Subtiele knop om lokaal opgeslagen favorieten + AI-resultaten te wissen.
 * - Maakt eerst een backup in sessionStorage (bz_fav_backup)
 * - Wist bekende én vermoedelijke keys (favorites + ai results)
 * - Herstelt ook de uitlegbalk door search_help_dismissed te wissen
 * - Herlaadt de pagina om in-memory state te resetten
 * - Toont een klein "Herstel" linkje zolang de session open is
 */
export default function BeginOpnieuwButton({
  className = "",
  label = "Begin opnieuw",
  showRestore = true,
}) {
  const [hasBackup, setHasBackup] = useState(false);

  useEffect(() => {
    try {
      setHasBackup(!!sessionStorage.getItem("bz_fav_backup"));
    } catch {
      /* noop */
    }
  }, []);

  const makeKeysList = () => {
    // Bekende keys (pas aan als je exacte keys weet)
    const knownKeys = [
      // favorieten + notities
      "favorites",
      "favNotes",
      "bz_favorites",
      "bz_notes",
      "app:favorites",
      "app:favNotes",
      // AI resultaten / concepten
      "aiResults",
      "ai:results",
      "app:aiResults",
      "bz_ai_results",
      "aiDraft",
      "aiOutput",
      "aiNotes",
      // uitleg/dismissed
      "search_help_dismissed",
    ];

    // Dynamisch detecteren (ruimer)
    const dynamic = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || "";
        if (
          /fav|favorite|favorites|bz_?fav/i.test(k) || // favorieten
          /(^|:)ai|ai(result|output|draft|notes)?/i.test(k) || // AI-gerelateerd
          /search_help_dismissed/i.test(k) // uitleg
        ) {
          dynamic.push(k);
        }
      }
    } catch {
      /* noop */
    }

    // Uniek maken
    return Array.from(new Set([...knownKeys, ...dynamic]));
  };

  const clearLocal = () => {
    const keys = makeKeysList();

    // 1) backup
    try {
      const backup = {};
      keys.forEach((k) => (backup[k] = localStorage.getItem(k)));
      sessionStorage.setItem("bz_fav_backup", JSON.stringify(backup));
    } catch {
      /* noop */
    }

    // 2) wissen
    try {
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* noop */
    }
  };

  const handleClear = () => {
    if (!window.confirm("Weet je zeker dat je ALLE favorieten en AI-resultaten wilt wissen?")) return;
    clearLocal();

    try {
      window.dispatchEvent(new CustomEvent("bz:begin-opnieuw"));
    } catch {
      /* noop */
    }

    window.location.reload();
  };

  const handleRestore = () => {
    try {
      const raw = sessionStorage.getItem("bz_fav_backup");
      if (!raw) return;
      const backup = JSON.parse(raw);
      Object.entries(backup).forEach(([k, v]) => {
        if (v !== null && v !== undefined) {
          localStorage.setItem(k, v);
        }
      });
      sessionStorage.removeItem("bz_fav_backup");
      window.location.reload();
    } catch {
      alert("Herstellen mislukt.");
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleClear}
        className="text-xs px-2 py-1 rounded-md border border-white/25 text-white/90 hover:bg-white/10 hover:text-white transition"
        title="Wist lokaal bewaarde favorieten, AI-resultaten en herstelt uitleg"
      >
        {label}
      </button>

      {showRestore && hasBackup && (
        <button
          type="button"
          onClick={handleRestore}
          className="text-xs px-2 py-1 rounded-md border border-white/10 text-white/70 hover:text-white hover:border-white/25 transition"
          title="Herstel de laatst gewiste items (zolang je sessie open is)"
        >
          Herstel
        </button>
      )}
    </div>
  );
}
