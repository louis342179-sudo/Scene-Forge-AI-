const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace light text colors in light mode with dark text colors
content = content.replace(/text-slate-300 dark:text-slate-200/g, 'text-slate-800 dark:text-slate-200');

// One more check in App.tsx
content = content.replace(/text-slate-300 dark:text-slate-50/g, 'text-slate-900 dark:text-slate-50');
content = content.replace(/text-slate-300 dark:text-white/g, 'text-slate-900 dark:text-white');

fs.writeFileSync('src/App.tsx', content);
