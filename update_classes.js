const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  { regex: /bg-\[#0B0B14\]/g, replacement: 'bg-page' },
  { regex: /bg-\[#0F1018\]/g, replacement: 'bg-panel-header' }, // sidebar bg
  { regex: /bg-\[#13141E\]/g, replacement: 'bg-panel' }, // main panels
  { regex: /bg-\[#191A27\]/g, replacement: 'bg-panel-header' }, // headers in panels
  { regex: /bg-\[#1A1B28\]/g, replacement: 'bg-bg-hover' },
  { regex: /bg-\[#151622\]/g, replacement: 'bg-panel-header' },
  { regex: /bg-\[#181926\]/g, replacement: 'bg-panel' },
  { regex: /border-\[#2A2B3A\]/g, replacement: 'border-border' },
  { regex: /border-\[#3A3C55\]/g, replacement: 'hover:border-border' },
  
  { regex: /text-slate-200/g, replacement: 'text-text-main' },
  { regex: /text-slate-300/g, replacement: 'text-text-main' },
  { regex: /text-slate-400/g, replacement: 'text-text-muted' },
  { regex: /text-slate-500/g, replacement: 'text-text-muted' },
  { regex: /text-white/g, replacement: 'text-text-strong' },
];

for (const rep of replacements) {
  content = content.replace(rep.regex, rep.replacement);
}

// Ensure theme state is included in Settings
content = content.replace(
  'autoSceneDetection: true,',
  'autoSceneDetection: true,\n    dynamicCharacter: true,'
);
// Also want to add theme to root.
// Wait, I will just do the theme state directly in App.tsx manually or here.
content = content.replace(
  'const [settings, setSettings] = useState({',
  'const [theme, setTheme] = useState(\'dark\');\n  const [settings, setSettings] = useState({'
);

content = content.replace(
  '<div className="h-[100dvh] w-full bg-page',
  '<div className={`${theme} h-[100dvh] w-full bg-page`}' // ensure `theme` wraps it properly. Wait, it was `bg-page`.
);
content = content.replace(
  '<div className="h-[100dvh] w-full bg-[#0B0B14]',
  '<div className={`${theme} h-[100dvh] w-full bg-page`}' // standard match if it wasn't replaced yet
);

// add to handleGenerate
content = content.replace(
  'body: JSON.stringify({ script }),',
  'body: JSON.stringify({ script, settings }),'
);

fs.writeFileSync('src/App.tsx', content);
console.log('Done replacement');
