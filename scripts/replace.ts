import * as fs from "fs";

let content = fs.readFileSync("src/App.tsx", "utf8");
content = content.replace(/violet/g, 'sky');
fs.writeFileSync("src/App.tsx", content);
console.log("Color replaced in src/App.tsx");
