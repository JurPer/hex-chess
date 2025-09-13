// src/ui/sprites.js
const modules = import.meta.glob('../assets/*.svg', { eager: true });
const SPRITES = {};
for (const path in modules) {
  const url = modules[path]?.default ?? modules[path];
  const file = path.split('/').pop(); // e.g. "WQ.svg"
  const filteredName = /^([wb])([prnbqkc])\.svg$/.exec(file);
  if (!filteredName) continue;
  const code = filteredName[1].toUpperCase() + filteredName[2].toUpperCase();
  SPRITES[code] = url;
}

/**
 * Description placeholder
 *
 * @param {string|null|undefined} code 
 * @returns {} 
 */
export const spriteOf = (code) => SPRITES[code] || null;
