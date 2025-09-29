// src/utils/parseThemes.js
import raw from "./themes.txt?raw"; // Vite/webpack raw import

export function getHSVThemes() {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("HSV:"))
    .map((line) => {
      // bv: HSV: Genade: genade, vergeving, ...
      const [, rest] = line.split("HSV:");
      if (!rest) return null;
      const [label, wordsRaw] = rest.split(":").map((s) => s.trim());
      const words = wordsRaw
        ? wordsRaw.split(",").map((w) => w.trim())
        : [];
      return { label, words };
    })
    .filter(Boolean);
}
