// Recompute the EngagementProfile figures from the anonymised fixtures (rules from docs/groundswell-competitor-benchmark.md §3.1).
const med = a => { const s=[...a].sort((x,y)=>x-y); const m=Math.floor(s.length/2); return s.length? (s.length%2? s[m] : (s[m-1]+s[m])/2) : null; };
const mean = a => a.length? a.reduce((x,y)=>x+y,0)/a.length : null;
const CTA = /\b[Cc]omment\s+["“]?([A-Z]{3,}(?:\s[A-Z]{3,})?)/;
function profile(dir, handle, hiddenCutoff) {
  const prof = require(`${dir}/${handle}.profile.json`).data.user;
  const posts = require(`${dir}/${handle}.posts.json`).items.map(i=>({...i,kind:'post'}));
  const reels = require(`${dir}/${handle}.reels.json`).items.map(i=>({...i,kind:'reel'}));
  const m = new Map();
  for (const i of [...posts, ...reels]) { const k = i.created_at.slice(0,10)+'|'+i.caption.text.slice(0,60); const prev=m.get(k); if(!prev || (i.play_count && !prev.play_count)) m.set(k, i); }
  const items = [...m.values()];
  // Spec §3.1 hidden-likes rule, two passes: placeholder-looking items with many comments are hidden; then, when the account's visible median is above 100, every like_count of 3 is hidden too.
  const pass1 = items.filter(i => !(i.like_count <= 5 && i.comment_count >= 8));
  const med1 = med(pass1.filter(i=>i.like_count>5).map(i=>i.like_count));
  const hidden = i => (i.like_count <= 5 && i.comment_count >= 8) || (i.like_count === 3 && med1 > 100);
  const vis = items.filter(i=>!hidden(i));
  const F = prof.follower_count;
  const er = vis.map(i=>(i.like_count+i.comment_count)/F);
  const cta = items.filter(i=>CTA.test(i.caption.text)), non = items.filter(i=>!CTA.test(i.caption.text));
  const plays = reels.map(r=>r.play_count).filter(Boolean);
  const slides = items.map(i=>i.carousel_media_count).filter(Boolean);
  return { handle, followers:F, items_n: items.length, likes_hidden_n: items.length-vis.length, likes_median: med(vis.map(i=>i.like_count)), comments_median: med(items.map(i=>i.comment_count)),
    comments_mean: +mean(items.map(i=>i.comment_count)).toFixed(1), engagement_rate_median_pct: +(med(er)*100).toFixed(3), cta_items_n: cta.length,
    cta_comments_mean: cta.length? +mean(cta.map(i=>i.comment_count)).toFixed(1): null, non_cta_comments_mean: +mean(non.map(i=>i.comment_count)).toFixed(1),
    reel_plays_median: med(plays), reel_plays_max: Math.max(...plays), carousel_slides_mean: slides.length? +mean(slides).toFixed(1): null };
}
const dir = process.argv[2];
const out = { harborlightnutrition: profile(dir,'harborlightnutrition'), fernandfield: profile(dir,'fernandfield') };
console.log(JSON.stringify(out, null, 1));
const expect = { harborlightnutrition: { likes_median: 28.5, comments_median: 2, comments_mean: 5.5, engagement_rate_median_pct: 0.04, cta_items_n: 0, reel_plays_median: 2772, likes_hidden_n: 0, items_n: 20 },
                 fernandfield: { likes_median: 347, comments_median: 23, comments_mean: 28.2, engagement_rate_median_pct: 0.45, cta_items_n: 5, cta_comments_mean: 61.4, non_cta_comments_mean: 19.5, reel_plays_median: 8335.5, likes_hidden_n: 14, items_n: 24, carousel_slides_mean: 8.8 } };
let bad = 0; for (const h in expect) for (const k in expect[h]) if (out[h][k] !== expect[h][k]) { bad++; console.log('MISMATCH', h, k, out[h][k], 'expected', expect[h][k]); }
console.log(bad ? `FAIL ${bad}` : 'ALL EXPECTED FIGURES REPRODUCED'); process.exit(bad?1:0);
