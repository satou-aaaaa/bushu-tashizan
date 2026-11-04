// 部首たし算の検査。問題（答えが1つを組み立ての表で確かめ直す・まちがいの札）・5問の組み方（何年分）・通しで遊ぶ・ヒント・続きから・上級・漢字帳・記録・スマホ幅・PWA を確かめる。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = pathToFileURL(path.join(root, "index.html")).href; // # などを含むフォルダ名でも開ける
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });

// 1. 問題（ブラウザを使わない）
const sb = { window: {} }; vm.runInNewContext(readFileSync(path.join(root, "data.js"), "utf8"), sb);
const RN = sb.window.BT_DATA.RN;
const P = sb.window.BT_DATA.P.map((a, i) => ({ id: i, x: a[0], t: a[1], ps: a[2], d: a[3], dl: a[4], on: a[5], kun: a[6], w: a[7], wr: a[8] }));
const T = readFileSync(path.join(root, "tools/parts.txt"), "utf8").split("\n").filter((l) => l && !l.startsWith("#")).map((l) => { const [k, s] = l.split("\t"); return [k, s.split(" ")]; });
const key = (ps) => ps.slice().sort().join(" ");
const tiers = [0, 1, 2, 3].map((t) => P.filter((p) => p.t === t).length);
check("問題は800問以上・難しさごとに140問以上", P.length >= 800 && tiers.every((n) => n >= 140), `${P.length}問（${tiers.join("・")}）`);
check("同じ難しさの中で答えの字は重ならない", [0, 1, 2, 3].every((t) => { const xs = P.filter((p) => p.t === t).map((p) => p.x); return new Set(xs).size === xs.length; }));
check("部品は2つ（部品3つの問題は3つ）で、組み立ての表（KanjiVG）にある", P.every((p) => p.ps.length === (p.t === 3 ? 3 : 2) && T.some(([k, s]) => k === p.x && key(s) === key(p.ps))));
{ const bad = P.filter((p) => T.some(([k, s]) => k !== p.x && key(s) === key(p.ps)));
  check("答えは1つだけ（同じ部品の組み合わせになる常用漢字はほかに無い）", bad.length === 0, bad.slice(0, 5).map((p) => p.x).join(",")); }
{ const okPart = (c) => c in RN || /^[一-鿿]$/.test(c);
  check("部品は漢字か、名前のある部首の形（氵・亻など）", P.every((p) => p.ps.every(okPart))); }
{ const all = new Map(); for (const [k, s] of T) { if (!all.has(k)) all.set(k, new Set()); s.forEach((c) => all.get(k).add(c)); }
  check("まちがいの札は5枚・答えや部品と重ならない", P.every((p) => p.d.length === 5 && new Set(p.d).size === 5 && !p.d.includes(p.x) && !p.d.some((y) => p.ps.includes(y))));
  check("まちがいの札は部品を全部持つ字ではない（「これも合っている」と言える札を入れない）", P.every((p) => p.d.every((y) => !(all.get(y) && p.ps.every((c) => all.get(y).has(c)) && T.some(([k, s]) => k === y && key(s) === key(p.ps))))));
  check("まちがいの札の組み立ての説明は、組み立ての表と合う", P.every((p) => p.d.every((y, j) => !p.dl[j] || T.some(([k, s]) => k === y && s.join(" + ") === p.dl[j]) || p.dl[j].split(" + ").length >= 2))); }
check("読み（音・訓のどちらか）と、答えの字を使う熟語と読みがある", P.every((p) => (p.on || p.kun) && p.w.length === 2 && p.w.includes(p.x) && /^[ぁ-ゖー]+$/.test(p.wr) && (!p.on || /^[ァ-ヺー]+$/.test(p.on))));
check("つらい言葉（死・殺など）を使わない", !P.some((p) => /[死殺葬屍姦淫娼尿糞呪遺棺骸刑獄墓弔喪病癌毒虐暴拷凶犯罪賊奴隷]/.test(p.x + p.ps.join("") + p.w + p.d.join(""))));

const html = readFileSync(path.join(root, "index.html"), "utf8");
const ext = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https:\/\/fonts\.googleapis\.com(\/|$)|^https:\/\/ko-fi\.com\/satouaaaaa$/.test(u));
check("外から読むのは文字（Google Fonts）だけ。スクリプト・広告・解析を入れない", ext.length === 0, ext.join(","));
check("CSP で通信先を自分だけにしている", /connect-src 'self'/.test(html) && !/connect-src[^;"]*https/.test(html));
check("Math.random は練習の問題選びだけ（今日の5問・上級・札の並びは日付と問題の乱数）", (html.match(/Math\.random/g) || []).length === 1);
check("組み立て・読み・熟語の出どころ（KanjiVG・KANJIDIC2・JMdict）を画面とデータに書いている", /KanjiVG/.test(html) && /JMdict/.test(html) && /KanjiVG/.test(readFileSync(path.join(root, "data.js"), "utf8")) && /CC BY-SA 4\.0/.test(readFileSync(path.join(root, "data.js"), "utf8")));
check("画面にお笑いの言葉を入れない（本物っぽく）", !/お笑い|ギャグ|ボケ|ツッコミ|なんでやねん|（うそ）/.test(html));
{ const og = (k) => (html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`)) || [])[1] || "";
  const png = readFileSync(path.join(root, "og.png"));
  check("SNS で貼ると絵と題が出る（OGP・1200×630・絶対URL）", og("og:title") && og("og:description") && og("og:image") === "https://satou-aaaaa.github.io/bushu-tashizan/og.png" && og("twitter:card") === "summary_large_image" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630); }
{ const fy = readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8");
  check("感想フォームは名前・メールを聞かない（楽しさ・よかった所・直してほしい所だけ）", /id: fun/.test(fy) && /id: good/.test(fy) && /id: fix/.test(fy) && !/id: (name|email|mail)/.test(fy) && /labels: \["感想"\]/.test(fy)); }
{ const sw = readFileSync(path.join(root, "sw.js"), "utf8"), mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  const shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1].replace(/'/g, '"'));
  const need = ["./index.html", "./data.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
  check("PWA：ネットの返事の保存は、イベントの中で waitUntil に預ける（遅れて届いた新しい版も保存できる）", /e\.waitUntil\(Promise\.race\(\[net\.then[^\n]*Promise\.race\(\[caches\.open[^\n]*wait\(15000\)\]\); \}, \(\) => \{\}\)\.catch\(\(\) => \{\}\), wait\(60000\)\]\)\);/.test(sw) && !/\.then\([^\n]*e\.waitUntil/.test(sw));
  check("PWA：sw.js は画面のファイルを全部保存し、外へ何も送らない", need.every((f) => shell.includes(f)) && !/https?:\/\//.test(sw.replace(/^\/\/.*$/gm, "")));
  check("PWA：manifest にアイコン2つと名前がある", mf.name === "部首たし算" && mf.icons.length >= 2 && mf.start_url === "./"); }
{ // 同じ日はどのブラウザでも同じ問題：sort の比較の中で乱数を引かない（引く回数がブラウザで変わる）
  const src = ["index.html", ...["gen.js", "data.js"].filter((f) => existsSync(path.join(root, f)))].map((f) => readFileSync(path.join(root, f), "utf8")).join("\n");
  const bad = src.match(/\.sort\(\s*\([^)]*\)\s*=>[^\n;]*\b(R|rng|rand|Math\.random)\s*\(/g) || [];
  check("並べ替えの比較の中で乱数を引いていない（同じ日に人によって問題が変わらない）", bad.length === 0, bad.join(" | ")); }

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const isNoise = (t) => /fonts\.(googleapis|gstatic)\.com|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|net::ERR_/.test(t);
const errors = [];
async function newPage(w = 390, h = 844) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("pageerror", (e) => errors.push(e.stack));
  page.on("console", (m) => { if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text()); });
  await page.goto(url);
  await page.evaluate(() => localStorage.clear()); await page.reload();
  return page;
}
const curP = (page) => page.evaluate(() => { const g = window.__bt, r = g.load().runs[g.mode()]; return g.P[r.list[r.res.length]]; });
const KEY = "bushu-v1";
try {
  const page = await newPage();
  // 2. 5問の組み方（日付の乱数）。3年分
  const sel = await page.evaluate(() => {
    const g = window.__bt, out = { bad: [], dup: 0, hardHit: 0 };
    const seen = [[], [], [], []];
    for (let n = 0; n < 1100; n++) {
      const k = new Date(Date.parse("2026-11-04") + n * 864e5).toISOString().slice(0, 10);
      const d = g.dailyList(k), h = g.hardList(k);
      if (d.map((id) => g.P[id].t).join() !== "0,0,1,1,2" || new Set(d.map((id) => g.P[id].x)).size !== 5) out.bad.push(k);
      if (h.some((id) => g.P[id].t !== 3) || new Set(h).size !== 5) out.bad.push(k + "h");
      const xs = new Set(d.map((id) => g.P[id].x)); if (h.some((id) => xs.has(g.P[id].x))) out.hardHit++;
      d.forEach((id) => seen[g.P[id].t].push(id));
    }
    // 1周（その難しさの問題数）のうちは同じ問題が出ない
    [0, 1, 2].forEach((t) => { const L = g.POOL[t].length; for (let i = 0; i + L <= seen[t].length; i += L) if (new Set(seen[t].slice(i, i + L)).size !== L) out.dup++; });
    out.d1201 = JSON.stringify(g.dailyList("2026-12-01"));
    out.tiles = g.P.every((p) => { const a = g.tilesOf(p, 4), b = g.tilesOf(p, 6); return a.includes(p.x) && b.includes(p.x) && new Set(a).size === 4 && new Set(b).size === 6 && JSON.stringify(a) === JSON.stringify(g.tilesOf(p, 4)); });
    out.pos = [0, 1, 2, 3].map((j) => g.P.filter((p) => g.tilesOf(p, 4)[j] === p.x).length);
    return out;
  });
  check("今日の5問は毎日「やさしい2・ふつう2・むずかしい1」、上級は部品3つの5問（3年分）", sel.bad.length === 0, sel.bad.slice(0, 3).join(","));
  check("1周するまで同じ問題は出ない（難しさごと）", sel.dup === 0);
  check("上級は今日の5問と同じ答えの字を出さない（3年分）", sel.hardHit === 0, `${sel.hardHit}日`);
  { const ctx = await browser.newContext(); const p2 = await ctx.newPage(); await p2.goto(url);
    const d2 = await p2.evaluate(() => JSON.stringify(window.__bt.dailyList("2026-12-01")));
    await ctx.close();
    check("同じ日は別のブラウザで開いても同じ5問", sel.d1201 === d2); }
  check("札は答えを含み、4枚・6枚とも重ならず、問題ごとに並びが決まる", sel.tiles);
  check("答えの札の場所が偏らない（どの場所も 15〜35%）", sel.pos.every((n) => n >= P.length * 0.15 && n <= P.length * 0.35), sel.pos.join(","));

  // 3. 通しで遊ぶ
  check("初めて開くと遊び方が出る", await page.locator("#howto[open]").count() === 1);
  await page.click("#howto-ok");
  check("ホームの例は遊び方と同じ（日＋月＝？）", (await page.textContent(".hero .eq")).replace(/\s/g, "") === "日＋月＝？");
  await page.click("#go-d");
  let p = await curP(page);
  check("1問目は「やさしい」・部品2つ・札は4枚・答えの所は「？」", p.t === 0 && (await page.locator("#bd .pt").count()) === 3 && (await page.locator(".tile").count()) === 4 && (await page.textContent("#ctr")) === "？");
  const tiles4 = await page.evaluate(() => [...document.querySelectorAll(".tile")].map((b) => b.dataset.ch));
  const wrong = tiles4.find((y) => y !== p.x);
  await page.click(`.tile[data-ch="${wrong}"]`);
  const lb = p.dl[p.d.indexOf(wrong)];
  check("まちがえると、選んだ字が答えの所に出て、その字の組み立て（分かるとき）が出る", (await page.textContent("#ctr")) === wrong && (await page.textContent("#near")).includes(wrong) && (!lb || (await page.textContent("#near")).includes(lb.split(" + ")[0])));
  check("まちがえた札は消え、もう押せない", await page.isDisabled(`.tile[data-ch="${wrong}"]`));
  await page.click("#hint");
  check("ヒント1回目で読みが出る（熟語はまだ出ない）", (await page.textContent("#hints")).includes(p.on || p.kun) && !(await page.textContent("#hints")).includes("熟語"));
  await page.click("#hint");
  check("ヒント2回目で、答えの字を□にした熟語と読みが出る（答えの字は出さない）", (await page.textContent("#hints")).includes(p.w.replace(p.x, "□")) && !(await page.textContent("#hints")).includes(p.w) && (await page.isDisabled("#hint")));
  await page.reload(); await page.click("#go-d");
  check("途中で閉じても、まちがえた札とヒントはそのまま（続きから）", await page.isDisabled(`.tile[data-ch="${wrong}"]`) && (await page.textContent("#miss")).includes("ヒント 2") && (await page.textContent("#hints")).includes("□"));
  await page.click("#back"); await page.click("#go-p"); await page.locator(".lv button").first().click(); await page.click("#back"); await page.click("#go-d");
  check("練習を始めても、今日の途中経過は消えない", await page.isDisabled(`.tile[data-ch="${wrong}"]`) && (await page.evaluate(() => window.__bt.mode())) === "d");
  await page.click(`.tile[data-ch="${p.x}"]`);
  check("正解すると、組み立て・読み・熟語が出て★1（まちがい1・ヒント2）", (await page.textContent(".verdict")).includes(p.w) && (await page.textContent(".verdict")).includes(p.wr) && (await page.locator(".verdict .stars .off").textContent()).length === 2);
  check("正解のあとは札とヒントが消える", !(await page.locator("#tiles").isVisible()) && (await page.textContent("#hints")) === "");
  await page.click("#next");
  p = await curP(page);
  await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); s.runs.d.res.push({ m: 0, h: 0 }); localStorage.setItem(k, JSON.stringify(s)); }, KEY);
  await page.click(`.tile[data-ch="${p.x}"]`);
  check("別のタブで先に進んでいたら、古い画面の正解は足さず今の問題を出し直す", (await page.evaluate(() => window.__bt.load().runs.d.res.length)) === 2 && (await page.textContent("header")).includes("3/5"));
  await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); s.runs.d.res.pop(); localStorage.setItem(k, JSON.stringify(s)); }, KEY);
  await page.reload(); await page.click("#go-d");
  for (let j = 0; j < 4; j++) { p = await curP(page); await page.click(`.tile[data-ch="${p.x}"]`); await page.click("#next"); }
  const share = await page.textContent(".share");
  const daily = await page.evaluate(() => { const g = window.__bt; return g.dailyList(g.todayKey()).map((id) => g.P[id]); });
  check("5問で結果・シェアの文は番号と色だけ（答えの字・部品・熟語は出さない）", /部首たし算 #\d+/.test(share) && /🟨💡💡 🟩 🟩 🟩 🟩/.test(share) && !daily.some((q) => share.includes(q.x) || q.ps.some((c) => share.includes(c)) || share.includes(q.w)));
  check("X・LINE は押したときに開くリンクだけ", /^https:\/\/twitter\.com\/intent\/tweet\?text=/.test(await page.getAttribute("#toX", "href")) && /^https:\/\/line\.me\/R\/share\?text=/.test(await page.getAttribute("#toLine", "href")));
  check("結果に5問の答えと組み立てが出る", (await page.locator(".rlist > div").count()) === 5);
  check("まちがいのあった日は Ko-fi のひとことを出さない", (await page.locator(".kofi").count()) === 0);
  await page.click("#back");
  check("ホームで連続1日・今日の結果を見るに変わる・漢字帳に5字", (await page.textContent(".stats")).includes("1連続の日") && (await page.textContent("#go-d")).includes("今日の結果") && (await page.textContent("#go-dex")).includes("5/"));
  await page.click("#go-h");
  check("上級は部品3つ・札6枚・ヒントのボタンが無い", (await page.locator(".tile").count()) === 6 && (await page.locator("#hint").count()) === 0 && (await curP(page)).t === 3 && (await page.locator("#bd .pt").count()) === 4);
  for (let j = 0; j < 5; j++) { p = await curP(page); await page.click(`.tile[data-ch="${p.x}"]`); await page.click("#next"); }
  check("上級を全問一発で初めて終えると、結果に Ko-fi のひとことが1行", (await page.locator(".kofi").count()) === 1 && (await page.textContent(".big")).includes("全問一発"));
  await page.click("#back"); await page.click("#go-h");
  check("2回目に結果を開いても Ko-fi のひとことは出ない", (await page.locator(".kofi").count()) === 0);
  await page.click("#back");
  await page.click("#go-p"); await page.locator(".lv button").nth(1).click();
  const played = [];
  for (let j = 0; j < 5; j++) { p = await curP(page); played.push(p.x); await page.click(`.tile[data-ch="${p.x}"]`); await page.click("#next"); }
  const after = await page.evaluate(() => { const s = window.__bt.load(); return { days: Object.keys(s.days).length, dex: s.dex }; });
  check("練習は今日の記録を増やさず、漢字帳には載る", after.days === 1 && played.every((x) => after.dex[x] >= 1) && (await page.locator(".share").count()) === 0, played.join(""));
  await page.click("#go-dex");
  check("漢字帳に集めた字が出る", (await page.locator(".dex button").count()) === Object.keys(after.dex).length);
  await page.locator(".dex button").first().click();
  check("漢字帳の字を押すと、組み立ての式と読み・熟語", (await page.locator(".sheet .eq").count()) === 1 && (await page.locator(".sheet .info dd").count()) === 3);
  await page.close();

  // 4. スマホ幅：はみ出さない・押せる所は44px以上
  for (const w of [320, 390]) {
    const p3 = await newPage(w, 700); await p3.click("#howto-ok");
    const homeOk = await p3.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    await p3.click("#go-d");
    const r = await p3.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, small: [...document.querySelectorAll("button, a")].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim() || e.id) }));
    check(`幅${w}px：横にはみ出さず、押せる所は高さ44px以上`, homeOk && !r.over && r.small.length === 0, r.small.join(","));
    await p3.click("#back"); await p3.click("#go-p"); await p3.locator(".lv button").nth(3).click();
    const r3 = await p3.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, eq: document.querySelector("#bd .eq").scrollWidth <= document.querySelector("#bd .eq").clientWidth + 1 }));
    check(`幅${w}px：部品3つの式も1行に収まる`, !r3.over && r3.eq);
    await p3.close();
  }
  { // 保存できないブラウザでも遊べる（開いているあいだは途中経過を覚えている）
    const pb = await browser.newPage({ viewport: { width: 390, height: 844 } });
    pb.on("pageerror", (e) => errors.push(e.message));
    await pb.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error("blocked"); }; });
    await pb.goto(url); await pb.click("#howto-ok"); await pb.click("#go-d");
    check("保存できないブラウザでも、今日の1問目が始まる", (await pb.textContent("header")).includes("1/5"));
    await pb.click("#back");
    check("保存できないブラウザでも、遊び方が何度も開かない", !(await pb.locator("#howto[open]").count()));
    await pb.close(); }
  { // 前の記録が残っていて、書き込みだけ失敗する（容量いっぱいなど）ときも、メモリの新しい進み具合を使う
    const pq = await browser.newPage({ viewport: { width: 390, height: 844 } });
    pq.on("pageerror", (e) => errors.push(e.message));
    await pq.addInitScript(() => { const orig = Storage.prototype.setItem; orig.call(localStorage, "bushu-v1", JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, dex: {}, kofi: {}, runs: {} })); Storage.prototype.setItem = () => { throw new Error("full"); }; });
    await pq.goto(url); await pq.click("#go-d");
    check("前の記録があり書き込みだけ失敗しても、今日の1問目が始まる", (await pq.textContent("header")).includes("1/5"));
    await pq.close(); }
  { // 最後の1問を終えて「結果を見る」を押す前に閉じた日は、開き直すと結果へ進み記録がつく
    const pc = await newPage();
    await pc.evaluate((k) => { const g = window.__bt, d = g.todayKey(); localStorage.setItem(k, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, dex: {}, kofi: {}, runs: { d: { mode: "d", date: d, list: g.dailyList(d), res: [0, 1, 2, 3, 4].map(() => ({ m: 0, h: 0 })) } } })); }, KEY);
    await pc.reload();
    check("最後の1問のあと閉じても、開き直すと結果へ進み今日の記録がつく", await pc.evaluate(() => { const g = window.__bt; return !!g.load().days[g.todayKey()] && !g.load().runs.d; }));
    await pc.close(); }
  { // 0時の前に最後の1問を終えて閉じ、翌日に開いても、終えた日の記録として残る
    { // 今日の結果を開いたまま0時を過ぎてから「上級」を押しても、翌日の上級は始めない
    const pm = await newPage();
    await pm.evaluate((k) => { const g = window.__bt, d = new Date(Date.parse(g.todayKey())).toISOString().slice(0, 10); localStorage.setItem(k, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, dex: {}, kofi: {}, runs: { d: { mode: "d", date: d, list: g.dailyList(d), res: [0, 1, 2, 3, 4].map(() => ({ m: 0, h: 0 })) } } })); }, KEY);
    await pm.reload();
    const had = await pm.locator("#go-h").count();
    await pm.evaluate(() => { const RD = Date, off = 864e5; window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }; }); // 時計を1日進める
    if (had) await pm.click("#go-h");
    check("結果を開いたまま日付が変わったら、上級のボタンを押しても翌日の上級は始まらない", had > 0 && (await pm.evaluate(() => window.__bt.mode())) !== "h");
    await pm.close(); }
    const pn = await newPage();
    await pn.evaluate((k) => { const g = window.__bt, d = new Date(Date.parse(g.todayKey()) - 864e5).toISOString().slice(0, 10); localStorage.setItem(k, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, dex: {}, kofi: {}, runs: { d: { mode: "d", date: d, list: g.dailyList(d), res: [0, 1, 2, 3, 4].map(() => ({ m: 0, h: 0 })) } } })); }, KEY);
    await pn.reload();
    check("前の日に終えて閉じても、翌日に開くとその日の記録がつく", await pn.evaluate(() => { const g = window.__bt; return !!g.load().days[new Date(Date.parse(g.todayKey()) - 864e5).toISOString().slice(0, 10)] && !g.load().runs.d; }));
    check("前の日の結果の画面からは、今日の上級を始められない（今日の分を先に）", !(await pn.locator("#go-h").count()));
    check("保存に失敗したあと別のタブが新しく保存していたら、古いメモリで上書きせずそちらを読む", await pn.evaluate((K) => { const g = window.__bt, s0 = g.load(); mem = JSON.stringify(Object.assign({}, s0, { t: 1, tagA: 1 })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 2, tagB: 1 }))); const r = g.load(); mem = null; return !!r.tagB && !r.tagA; }, "bushu-v1"));
    check("保存に失敗したあと別のタブが保存しても、両方の記録（日ごとの結果）を残す", await pn.evaluate((K) => { const g = window.__bt, s0 = g.load(); mem = JSON.stringify(Object.assign({}, s0, { t: 5, days: { "2000-01-01": s0.days[Object.keys(s0.days)[0]] || 1 } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, days: { "2000-01-02": 1 } }))); const r = g.load(); mem = null; return !!r.days["2000-01-01"] && !!r.days["2000-01-02"]; }, "bushu-v1"));
    check("保存に失敗したタブの時刻が進んでいても、別のタブで先に進んだ途中経過を古いメモリで戻さない", await pn.evaluate((K) => { const g = window.__bt, s0 = g.load(), base = { mode: "d", date: "2000-01-01", list: [1, 2, 3], tags: [1, 2, 3], id: "x", res: [], i: 0 }; mem = JSON.stringify(Object.assign({}, s0, { t: 99, runs: Object.assign({}, s0.runs, { d: Object.assign({}, base) }) })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 1, runs: Object.assign({}, s0.runs, { d: Object.assign({}, base, { res: [{}, {}], i: 2 }) }) }))); const r = g.load(); mem = null; return r.runs.d.res.length === 2 && r.runs.d.i === 2; }, "bushu-v1"));
    check("保存に失敗したあと別のタブが保存しても、帳の★は高いほうを残す", await pn.evaluate((K) => { const g = window.__bt, s0 = g.load(); mem = JSON.stringify(Object.assign({}, s0, { t: 5, dex: { zz: 3 } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, dex: { zz: 1 } }))); const r = g.load(); mem = null; return r.dex.zz === 3; }, "bushu-v1"));
    check("時計が戻っても、保存の時刻 t は前より大きくなる", await pn.evaluate((K) => { const s0 = JSON.parse(localStorage.getItem(K)); const far = Date.now() + 1e9; localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: far }))); save(() => {}); return JSON.parse(localStorage.getItem(K)).t > far; }, "bushu-v1"));
    await pn.close(); }
} catch (e) { // 途中で止まっても、ここまでの結果とレポートは書き出す
  check("QA の操作が最後まで完了する", false, e.message.split("\n")[0]);
} finally {
  await browser.close();
}
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));

const ng = results.filter((r) => !r.ok);
const md = `# 部首たし算 QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
