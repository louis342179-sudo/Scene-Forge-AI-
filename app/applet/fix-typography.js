const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace typography and spacing across the board
content = content.replace(/text-\[11px\]/g, 'text-xs md:text-sm leading-relaxed');
content = content.replace(/text-\[10px\]/g, 'text-xs leading-relaxed');
content = content.replace(/text-\[9px\]/g, 'text-xs');
content = content.replace(/text-xs/g, 'text-sm leading-relaxed md:leading-loose text-gray-700 dark:text-gray-300');
content = content.replace(/text-sm/g, 'text-base leading-relaxed md:leading-loose text-gray-800 dark:text-gray-200');
content = content.replace(/text-slate-500/g, 'text-slate-600 dark:text-slate-300');
content = content.replace(/text-slate-400/g, 'text-slate-500 dark:text-slate-200');

// Brighten up the dark mode colors explicitly
content = content.replace(/dark:text-slate-500/g, 'dark:text-slate-300');
content = content.replace(/dark:text-slate-400/g, 'dark:text-slate-200');
content = content.replace(/dark:text-slate-600/g, 'dark:text-slate-400');
// Remove duplicates or overrides
content = content.replace(/text-slate-600 dark:text-slate-300 dark:text-slate-300/g, 'text-slate-600 dark:text-slate-300');

// Soften dark mode backgrounds
content = content.replace(/dark:bg-\[#0F0F12\]/g, 'dark:bg-[#1A1A1E]');
content = content.replace(/dark:bg-\[#0A0A0A\]/g, 'dark:bg-[#151518]');
content = content.replace(/dark:bg-\[#121214\]/g, 'dark:bg-[#1E1E24]');

// Add more padding to dense elements
content = content.replace(/p-4/g, 'p-5 md:p-6');
content = content.replace(/p-3/g, 'p-4 md:p-5');
content = content.replace(/py-2.5/g, 'py-3 md:py-4');

// Expand layout spacing (ghusa ghusa -> wide and tall)
content = content.replace(/gap-2/g, 'gap-3 md:gap-4');
content = content.replace(/gap-3/g, 'gap-4 md:gap-5');
content = content.replace(/gap-4/g, 'gap-5 md:gap-6');

// Additional readability pass
content = content.replace(/leading-tight/g, 'leading-relaxed');
content = content.replace(/tracking-tighter/g, 'tracking-normal');

// Special fix for text-xs text-sm replacement duplicates
content = content.replace(/text-base leading-relaxed md:leading-loose text-gray-800 dark:text-gray-200 leading-relaxed/g, 'text-base leading-relaxed md:leading-loose text-gray-800 dark:text-gray-200');

fs.writeFileSync('src/App.tsx', content);
