const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace specific small dense classes gently
content = content.replace(/\btext-\[11px\]\b/g, 'text-xs md:text-sm leading-relaxed');
content = content.replace(/\btext-\[10px\]\b/g, 'text-xs leading-relaxed');
content = content.replace(/\btext-\[9px\]\b/g, 'text-xs tracking-wide');
content = content.replace(/\btext-slate-500\b/g, 'text-slate-600 dark:text-slate-300');
content = content.replace(/\bdark:text-slate-400\b/g, 'dark:text-slate-300');
content = content.replace(/\bdark:text-slate-500\b/g, 'dark:text-slate-300'); // make sure dark mode isn't invisible
content = content.replace(/\bdark:text-slate-600\b/g, 'dark:text-slate-400');
content = content.replace(/\bdark:bg-\[#0F0F12\]\b/g, 'dark:bg-[#1A1A1E]');
content = content.replace(/\bdark:bg-\[#0A0A0A\]\b/g, 'dark:bg-[#151518]');
content = content.replace(/\bdark:bg-\[#121214\]\b/g, 'dark:bg-[#1C1C22]');

fs.writeFileSync('src/App.tsx', content);
