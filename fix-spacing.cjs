const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Margins and paddings
content = content.replace(/p-4/g, 'p-6');
content = content.replace(/p-5/g, 'p-6 md:p-8');
content = content.replace(/px-4/g, 'px-6 md:px-8');
content = content.replace(/py-4/g, 'py-5 md:py-6');
content = content.replace(/px-5/g, 'px-6 md:px-8');

// Spacing (gap) fixes
content = content.replace(/gap-2/g, 'gap-3 md:gap-4');
content = content.replace(/gap-3/g, 'gap-4 md:gap-5');
content = content.replace(/space-y-6/g, 'space-y-8 md:space-y-10');
content = content.replace(/space-y-4/g, 'space-y-6');

// Borders softer in dark mode
content = content.replace(/dark:border-\[#27272A\]/g, 'dark:border-[#3F3F46]');
content = content.replace(/border-slate-200/g, 'border-slate-200/80');

// Typography extra pass
content = content.replace(/text-\[13px\]/g, 'text-sm md:text-[15px] leading-relaxed');
content = content.replace(/text-\[12px\]/g, 'text-sm md:text-[15px] leading-relaxed');

// Undo accidental overlaps (like gap-3 md:gap-4 md:gap-4 md:gap-5 from previous runs if any - but we only ran this once)
content = content.replace(/gap-4 md:gap-5 md:gap-4 md:gap-5/g, 'gap-4 md:gap-6');

fs.writeFileSync('src/App.tsx', content);
