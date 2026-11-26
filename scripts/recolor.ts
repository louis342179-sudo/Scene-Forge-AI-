import * as fs from "fs";

let content = fs.readFileSync("src/App.tsx", "utf8");

const colorMap: Record<string, string> = {
  "#0F1018": "#050905",
  "#13141E": "#0A110A",
  "#141520": "#0D140D",
  "#151622": "#0E150E",
  "#191A27": "#111A11",
  "#181926": "#101810",
  "#1A1B28": "#121A12",
  "#202130": "#162016",
  "#2A2B3A": "#1E2C1E",
  "slate-800": "green-900", // Will replace some dark borders if applicable
};

for (const [oldC, newC] of Object.entries(colorMap)) {
  content = content.replace(new RegExp(oldC, "g"), newC);
}

fs.writeFileSync("src/App.tsx", content);
console.log("Dark mode greens applied");
