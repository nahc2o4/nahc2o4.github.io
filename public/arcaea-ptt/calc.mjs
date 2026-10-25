export function rating(cc, score, bonus = 0) {
  if (!Number.isFinite(cc) || cc <= 0 || cc > 15 || !Number.isInteger(score) || score < 0 || score > 10010000) throw new Error('请输入有效定数（0–15，不含 0）和整数分数（0–10,010,000）。');
  return Math.max(0, cc + (score >= 10000000 ? 2 : score >= 9800000 ? 1 + (score - 9800000) / 200000 : (score - 9500000) / 300000)) + bonus;
}
export function truncate(value, digits) { const p = 10 ** digits; return (Math.floor((value + 1e-10) * p) / p).toFixed(digits); }
export function rank(score) { return score >= 10000000 ? 'PM' : score >= 9900000 ? 'EX+' : score >= 9800000 ? 'EX' : score >= 9500000 ? 'AA' : score >= 9200000 ? 'A' : score >= 8900000 ? 'B' : score >= 8600000 ? 'C' : 'D'; }
export function summarize(records, mode, recent = 0) {
  const unique = new Map();
  for (const r of records) {
    const value = rating(r.cc, r.score, mode === 'modern' && r.clear ? .2 : 0);
    const key = r.name.trim().toLowerCase() + '|' + r.difficulty;
    if (!unique.has(key) || unique.get(key).value < value) unique.set(key, {...r, value});
  }
  const sorted = [...unique.values()].sort((a,b) => b.value - a.value);
  const best = sorted.slice(0, mode === 'modern' ? 50 : 30);
  const sum = best.reduce((s,r) => s+r.value,0);
  const top = best.slice(0,10).reduce((s,r) => s+r.value,0);
  return {sorted, best, sum, top, average: best.length ? sum / best.length : 0, potential: mode === 'modern' ? (sum+top)/60 : (sum+recent*10)/40};
}
