import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MOBS} from '../lib/game-data.ts';
const manifest=JSON.parse(fs.readFileSync('public/assets/manifest.json','utf8'));
test('every implemented mob and centipede segment has an official Wiki image',()=>{for(const [name,m] of Object.entries(MOBS)){const item=manifest[m.asset!];assert.ok(item,name);assert.ok(fs.existsSync('public'+item.src),name);assert.match(item.source,/official-florrio\.fandom\.com/);assert.ok(item.width>0&&item.height>0,name);}assert.ok(manifest['centipede-body']);});
test('player uses official Wiki picture and no drawn-mob fallback remains',()=>{assert.match(manifest.Flower.source,/official-florrio\.fandom\.com/);assert.ok(fs.existsSync('public'+manifest.Flower.src));assert.equal(fs.existsSync('lib/mob-drawing.ts'),false);assert.equal(fs.readFileSync('lib/game-renderer.ts','utf8').includes('drawMob'),false);});
test('free-petal practice and custom gallery removed; main-tree tick removed',()=>{const s=fs.readFileSync('app/page.tsx','utf8');for(const token of ['PRACTICE_KEY','isPractice',"togglePanel('gallery')",'setTick(','setHp('])assert.equal(s.includes(token),false,token);assert.ok(s.includes('PlayerHUD'));assert.ok(s.includes('Cooldown'));});
test('centipede body reuses nonblank source, with explicit source-coordinate masks',()=>{assert.equal(manifest['centipede-body'].src,manifest.centipede.src);assert.ok(manifest['centipede-body'].mask.circle[2]>0);});
