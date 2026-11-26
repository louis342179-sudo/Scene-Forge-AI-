const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Global typography fixes
content = content.replace(/text-\[11px\]/g, 'text-xs md:text-sm');
content = content.replace(/text-\[10px\]/g, 'text-xs md:text-sm');
content = content.replace(/text-\[9px\]/g, 'text-xs md:text-[13px]');
content = content.replace(/text-xs/g, 'text-sm md:text-[15px] leading-relaxed');

// Re-adjust sizes to not explode some buttons and badges visually, but make them bigger
content = content.replace(/w-3 h-3/g, 'w-4 h-4');
content = content.replace(/w-3\.5 h-3\.5/g, 'w-4 h-4');

// Improve colors
content = content.replace(/dark:text-slate-500/g, 'dark:text-slate-300');
content = content.replace(/dark:text-slate-400/g, 'dark:text-slate-200');
content = content.replace(/dark:text-slate-600/g, 'dark:text-slate-400');
content = content.replace(/text-slate-500/g, 'text-slate-600 dark:text-slate-300');
content = content.replace(/text-slate-400/g, 'text-slate-600 dark:text-slate-300');

// Base background softens
content = content.replace(/dark:bg-\[#0F0F12\]/g, 'dark:bg-[#18181B]');
content = content.replace(/dark:bg-\[#0A0A0A\]/g, 'dark:bg-[#111113]');
content = content.replace(/dark:bg-\[#0B0B14\]/g, 'dark:bg-[#111113]');
content = content.replace(/dark:bg-\[#121214\]/g, 'dark:bg-[#1C1C22]');

// Fix duplicate texts
content = content.replace(/text-slate-600 dark:text-slate-300 dark:text-slate-300/g, 'text-slate-600 dark:text-slate-300');
content = content.replace(/text-slate-600 dark:text-slate-300 dark:text-slate-200/g, 'text-slate-600 dark:text-slate-200');

// Additional fixes for the App container layout
content = content.replace(/text-slate-300 dark:text-slate-300/g, 'text-slate-900 dark:text-slate-50');

// Clean up any double leading-relaxed from recursive replaces
content = content.replace(/leading-relaxed leading-relaxed/g, 'leading-relaxed');

fs.writeFileSync('src/App.tsx', content);

// Improve index.css
let css = fs.readFileSync('src/index.css', 'utf8');
css = css.replace(/--font-sans: "Inter",/, '--font-sans: "Plus Jakarta Sans",');
fs.writeFileSync('src/index.css', css);
