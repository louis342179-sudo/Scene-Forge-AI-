import * as fs from "fs";

let content = fs.readFileSync("src/App.tsx", "utf8");

// Reverting from Greens back to deep minimal slate
const colorMap: Record<string, string> = {
  // Replace the green-heavy colors with cool, minimal slate colors
  "#050905": "#0A0A0A", // Almost black
  "#0A110A": "#0F0F12", // Very dark card
  "#0D140D": "#18181B", // Lighter card
  "#0E150E": "#121214", 
  "#111A11": "#18181B", 
  "#101810": "#18181B",
  "#121A12": "#1A1A1E",
  "#162016": "#27272A",
  "#1E2C1E": "#27272A", 
  "green-900": "slate-300", // Fix for where text went green instead of neutral or light
};

for (const [oldC, newC] of Object.entries(colorMap)) {
  content = content.replace(new RegExp(oldC, "g"), newC);
}

fs.writeFileSync("src/App.tsx", content);
console.log("Dark mode minimal slate applied");
