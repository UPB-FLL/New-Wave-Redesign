const d = require(process.argv[2] || './data.json');
const med = a => { const s=[...a].sort((x,y)=>x-y); const m=Math.floor(s.length/2); return s.length%2? s[m] : (s[m-1]+s[m])/2; };
const mean = a => a.reduce((x,y)=>x+y,0)/a.length;
function uniq(items){ const seen=new Set(); return items.filter(i=>{const k=i.date+'|'+i.hook; if(seen.has(k)) return false; seen.add(k); return true;}); }
function summarize(name, acc, hiddenLikesCutoff){
  const items = uniq(acc.items);
  const likesVisible = items.filter(i => i.likes > hiddenLikesCutoff);
  const reels = acc.items.filter(i=>i.kind==='reel');
  const comments = items.map(i=>i.comments);
  const erVis = likesVisible.map(i => 100*(i.likes+i.comments)/acc.followers);
  const cta = items.filter(i=>i.cta);
  const nonCta = items.filter(i=>!i.cta);
  console.log(name, {
    unique_items: items.length, likes_visible_n: likesVisible.length, likes_hidden_n: items.length-likesVisible.length,
    likes_median_visible: med(likesVisible.map(i=>i.likes)), likes_mean_visible: Math.round(mean(likesVisible.map(i=>i.likes))),
    comments_median: med(comments), comments_mean: +mean(comments).toFixed(1),
    er_median_visible_pct: +med(erVis).toFixed(3), er_mean_visible_pct: +mean(erVis).toFixed(3),
    reel_plays_median: med(reels.map(r=>r.plays)), reel_plays_mean: Math.round(mean(reels.map(r=>r.plays))), reel_plays_max: Math.max(...reels.map(r=>r.plays)),
    reel_date_min: reels.map(r=>r.date).sort()[0], reel_date_max: reels.map(r=>r.date).sort().slice(-1)[0],
    cta_n: cta.length, cta_comments_mean: cta.length? +mean(cta.map(i=>i.comments)).toFixed(1):null, noncta_comments_mean: +mean(nonCta.map(i=>i.comments)).toFixed(1),
    carousel_slides_mean: (()=>{const s=items.filter(i=>i.slides); return s.length? +mean(s.map(i=>i.slides)).toFixed(1): null})(),
  });
}
summarize('BUSINESS', d.business, 0);
summarize('COMPETITOR', d.competitor, 5);
// cadence windows
const iw = d.business.items.filter(i=>i.date>='2026-10-07' && i.date<='2026-10-20'); console.log('business unique items Oct 7-20:', uniq(iw).length, '=> per week', (uniq(iw).length/14*7).toFixed(1));
const ww = d.competitor.items.filter(i=>i.date>='2026-09-29' && i.date<='2026-10-19' && i.kind==='post'); console.log('competitor feed posts Sep 29-Oct 19:', ww.length, '=> per week', (ww.length/21*7).toFixed(1));
