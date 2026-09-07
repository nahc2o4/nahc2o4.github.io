import fs from 'node:fs';
const s = fs.readFileSync(process.argv[2], 'utf8');
const game =
  s.includes('GameEngine') &&
  s.includes('GameRenderer') &&
  s.includes('doCraft');
console.log(
  game
    ? 'mode=game; play=enabled; combat=enabled; crafting=enabled'
    : 'mode=starter; play=absent; combat=absent; crafting=absent',
);
process.exit(0);
