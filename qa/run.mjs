// 部首たし算の検査。問題（答えが1つを組み立ての表で確かめ直す・まちがいの札）・入力の組み立て表・5問の組み方（何年分）・通しで遊ぶ・入力して答える・ヒントと候補・続きから・上級・漢字帳・実績・カレンダー・あとから・記録・スマホ幅・PWA を確かめる。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { checkTransfer } from "./transfer-check.mjs";

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

{ // 入力の手がかり用の組み立て表 parts.js は tools/parts.txt から作ったものと同じ（手で直していない）
  const sp = { window: {} }; vm.runInNewContext(readFileSync(path.join(root, "parts.js"), "utf8"), sp);
  const BP = sp.window.BT_PARTS, M = {}; for (const [k, s] of T) (M[k] = M[k] || []).push(s.join(" "));
  check("入力の手がかり用の組み立て表 parts.js は tools/parts.txt（KanjiVG）と合う（node tools/make-parts.cjs で作る）", Object.keys(BP).length === Object.keys(M).length && Object.keys(M).every((k) => BP[k] === M[k].join("|")));
  check("組み立て表で、どの問題にも別解（同じ部品の組み合わせのほかの字）が無い", P.every((p) => !Object.keys(BP).some((y) => y !== p.x && BP[y].split("|").some((t) => key(t.split(" ")) === key(p.ps))))); }
const html = readFileSync(path.join(root, "index.html"), "utf8");
check("終えた回を消すのは同じ回のときだけ・0時を過ぎたホームの「今日」のボタンは描き直す（2026-11-04 CodeRabbit）", /c\.date === run\.date && c\.id === run\.id\) s2\.runs\[MODE\] = null/.test(html) && /\$\("go-d"\)\.onclick = \(\) => \(k !== todayKey\(\) \? home\(\)/.test(html));
check("別のタブで今日の分を終えたあと、古い画面から今日・上級をもう一度始めない（2026-11-04 CodeRabbit）", /\(mode === "d" && s\.days\[k\]\) \|\| \(mode === "h" && s\.hdays\[k\]\)\) return;/.test(html));
check("README の URL のすぐ後ろに全角の字を続けない（Link check が URL の一部と読む。2026-11-04）", !/https?:\/\/[\x21-\x7e]*[^\x00-\x7f]/.test(readFileSync(new URL("../README.md", import.meta.url), "utf8").replace(/\]\(https?:\/\/[^)\s]+\)/g, "").replace(/<https?:\/\/[^>\s]+>/g, "")));
check("同じ回の途中経過は、全体の時刻でなく進み具合（解き途中の手の数）で選ぶ（2026-11-04 CodeRabbit）", /prog = \(r\) => [^\n]*r\.cur\.tried\.length : 0\) \* 10/.test(html));
check("正解を入れられなかったら正解の画面を出さない・別のタブのまちがいも数える（2026-11-04 CodeRabbit）", /if \(!saved\) \{ toast\("別の画面で先に進んでいます"\); return play\(\); \}/.test(html) && /for \(const c of r0\.cur\.tried \|\| \[\]\) if \(!cur\.tried\.includes\(c\)\) cur\.tried\.push\(c\)/.test(html));
const ext = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https:\/\/fonts\.googleapis\.com(\/|$)|^https:\/\/ko-fi\.com\/satouaaaaa$/.test(u));
check("外から読むのは文字（Google Fonts）だけ。スクリプト・広告・解析を入れない", ext.length === 0, ext.join(","));
check("CSP で通信先を自分だけにしている", /connect-src 'self'/.test(html) && !/connect-src[^;"]*https/.test(html));
check("Math.random は練習・とことんの問題選びととことんの回の見分けだけ（今日の5問・上級・札の並びは日付と問題の乱数）", (html.match(/Math\.random/g) || []).length === 3);
check("組み立て・読み・熟語の出どころ（KanjiVG・KANJIDIC2・JMdict）を画面とデータに書いている", /KanjiVG/.test(html) && /JMdict/.test(html) && /KanjiVG/.test(readFileSync(path.join(root, "data.js"), "utf8")) && /CC BY-SA 4\.0/.test(readFileSync(path.join(root, "data.js"), "utf8")));
check("画面にお笑いの言葉を入れない（本物っぽく）", !/お笑い|ギャグ|ボケ|ツッコミ|なんでやねん|（うそ）/.test(html));
{ const og = (k) => (html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`)) || [])[1] || "";
  const png = readFileSync(path.join(root, "og.png"));
  check("SNS で貼ると絵と題が出る（OGP・1200×630・絶対URL）", og("og:title") && og("og:description") && og("og:image") === "https://satou-aaaaa.github.io/bushu-tashizan/og.png" && og("twitter:card") === "summary_large_image" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630); }
{ const fy = readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8");
  check("感想フォームは名前・メールを聞かない（楽しさ・よかった所・直してほしい所だけ）", /id: fun/.test(fy) && /id: good/.test(fy) && /id: fix/.test(fy) && !/id: (name|email|mail)/.test(fy) && /labels: \["感想"\]/.test(fy)); }
{ const sw = readFileSync(path.join(root, "sw.js"), "utf8"), mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  const shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1].replace(/'/g, '"'));
  const need = ["./index.html", "./transfer.js", "./data.js", "./parts.js", "./gender-ng.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
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
// 入力して答える：入力欄に打って「決める」。打った字が下に残っているか
const type = async (pg, ch) => { await pg.fill("#ans", ch); await pg.click("#go"); };
const triedHas = async (pg, ch) => ((await pg.textContent("#tried")) || "").includes(ch);
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
    // 1周（その難しさの問題数）のうちは同じ問題が出ない。区切りの日（2026-11-07）からは性別に寄った言葉の問題を外した数で1周：
    // 最初の周は区切りの前に出た問題と合わせて外した残りを全部出し切るまで、その先は外した数ごとに、同じ問題が無い
    [0, 1, 2].forEach((t) => {
      const ok = new Set(g.POOL_OK[t]), L = ok.size, per = [2, 2, 1][t], B = Math.round((Date.parse(g.CUTOFF) - Date.parse("2026-11-04")) / 864e5) * per, seq = seen[t];
      let i = B; const first = new Set(seq.slice(0, B)); let firstDup = first.size !== B;
      while (i < seq.length && ![...ok].every((id) => first.has(id))) { if (first.has(seq[i])) firstDup = true; first.add(seq[i]); i++; }
      if (firstDup || i >= seq.length) out.dup++;
      for (; i + L <= seq.length; i += L) if (new Set(seq.slice(i, i + L)).size !== L) out.dup++;
    });
    out.d1201 = JSON.stringify(g.dailyList("2026-12-01"));
    out.tiles = g.P.every((p) => { const a = g.tilesOf(p, 4), b = g.tilesOf(p, 6); return a.includes(p.x) && b.includes(p.x) && new Set(a).size === 4 && new Set(b).size === 6 && JSON.stringify(a) === JSON.stringify(g.tilesOf(p, 4)); });
    out.pos = [0, 1, 2, 3].map((j) => g.P.filter((p) => g.tilesOf(p, 4)[j] === p.x).length);
    return out;
  });
  check("今日の5問は毎日「やさしい2・ふつう2・むずかしい1」、上級は部品3つの5問（3年分）", sel.bad.length === 0, sel.bad.slice(0, 3).join(","));
  check("1周するまで同じ問題は出ない（難しさごと）", sel.dup === 0);
  check("上級の5問はどの日も答えの字が重ならず、今日の5問とも重ならない（周の切れ目をまたぐ日も。55年分）", await page.evaluate(() => { const g = window.__bt; for (let n = 0; n < 20000; n++) { const k = new Date(Date.parse("2026-11-04") + n * 864e5).toISOString().slice(0, 10), h = g.hardList(k), xs = new Set(g.dailyList(k).map((id) => g.P[id].x)); if (h.length !== 5 || new Set(h.map((id) => g.P[id].x)).size !== 5 || h.some((id) => xs.has(g.P[id].x))) return false; } return true; }));
  check("上級は今日の5問と同じ答えの字を出さない（3年分）", sel.hardHit === 0, `${sel.hardHit}日`);
  { const ctx = await browser.newContext(); const p2 = await ctx.newPage(); await p2.goto(url);
    const d2 = await p2.evaluate(() => JSON.stringify(window.__bt.dailyList("2026-12-01")));
    await ctx.close();
    check("同じ日は別のブラウザで開いても同じ5問", sel.d1201 === d2); }
  check("札は答えを含み、4枚・6枚とも重ならず、問題ごとに並びが決まる", sel.tiles);
  check("答えの札の場所が偏らない（どの場所も 15〜35%）", sel.pos.every((n) => n >= P.length * 0.15 && n <= P.length * 0.35), sel.pos.join(","));

  // 2b. 性別に寄った言葉（gender-ng.js）：2026-11-07 からの今日の5問・上級と、とことん・練習で選ばない。それより前の日は main の版と同じ
  {
    const src = readFileSync(path.join(root, "qa/a11y.mjs"), "utf8"), m = src.match(/const WORDS = \[([\s\S]*?)\n\];/);
    const words = m ? [...m[1].matchAll(/\["([^"]+)",/g)].map((x) => x[1]) : [];
    const NGW = (() => { const sb = {}; vm.runInNewContext(readFileSync(path.join(root, "gender-ng.js"), "utf8"), sb); return sb.BT_GENDER_NG; })();
    check("gender-ng.js は qa/a11y.mjs（shared-workflows template/qa/a11y.mjs の写し）の WORDS と同じ一覧", words.length > 30 && JSON.stringify(words) === JSON.stringify(NGW), `${words.length}/${(NGW || []).length}`);
    const info = await page.evaluate(() => { const g = window.__bt; return { cut: g.CUTOFF, ng: [...g.NG].map((id) => g.P[id].x) }; });
    check("区切りの日は 2026-11-07・外す問題がある（答え・札・熟語のどこかに言葉を持つ問題）", info.cut === "2026-11-07" && info.ng.length > 0, info.ng.join(","));
    // main の版を一時フォルダに出して開き、区切りの日より前の400日分（〜2026-11-06。第1日より前の日は第1日と同じ）の今日の5問・上級を比べる
    const { execSync } = await import("node:child_process"), { mkdtempSync, rmSync } = await import("node:fs"), os = await import("node:os");
    const git = (c) => execSync(c, { cwd: root, stdio: ["ignore", "pipe", "ignore"] });
    let ref = "origin/main";
    try { git(`git rev-parse --verify ${ref}`); } catch { try { git("git fetch --depth=1 origin main"); ref = "FETCH_HEAD"; } catch { ref = null; } }
    let same = null, detail = "main の版を取れなかった";
    if (ref) {
      const dir = mkdtempSync(path.join(os.tmpdir(), "bt-main-"));
      execSync(`git archive ${ref} | tar -x -C ${JSON.stringify(dir)}`, { cwd: root, shell: "/bin/bash" });
      const days = Array.from({ length: 400 }, (_, i) => new Date(Date.parse("2026-11-06") - i * 864e5).toISOString().slice(0, 10));
      const grab = async (u) => { const pg = await browser.newPage(); await pg.goto(u); const r = await pg.evaluate((ds) => { const g = window.__bt; return ds.map((k) => JSON.stringify([g.dailyList(k).map((id) => g.P[id]), g.hardList(k).map((id) => g.P[id]), g.dailyList(k).concat(g.hardList(k)).map((id) => [g.tilesOf(g.P[id], 4), g.tilesOf(g.P[id], 6)])])); }, days); await pg.close(); return r; };
      const a = await grab(pathToFileURL(path.join(dir, "index.html")).href), b = await grab(url);
      const diff = days.filter((_, i) => a[i] !== b[i]);
      same = diff.length === 0; detail = `${ref} と比べた。ちがう日：${diff.slice(0, 3).join(",")}`;
      rmSync(dir, { recursive: true, force: true });
    }
    check("区切りの日より前（〜2026-11-06）の400日分の今日の5問・上級（問題・札の並び）は main の版と1字も同じ", same === true, detail);
    // 画面に出る所（答え・部品・札・札の組み立て・読み・熟語・□の熟語・候補の札）を文字列でつないで探す
    const fut = await page.evaluate((ws) => {
      const g = window.__bt, bad = []; const shown = (id) => { const p = g.P[id]; return JSON.stringify([p, p.w.replace(p.x, "□"), g.tilesOf(p, 4), g.tilesOf(p, 6), g.eqHtml(p, p.x, { win: true })]); }, has = (txt) => ws.some((w) => (w === "OL" ? /(?<![A-Za-z])OL(?![A-Za-z])/.test(txt) : txt.includes(w)));
      for (let n = 0; n < 365 * 3; n++) {
        const k = new Date(Date.parse("2026-11-07") + n * 864e5).toISOString().slice(0, 10);
        const txt = g.dailyList(k).concat(g.hardList(k)).map((id) => shown(id)).join("\n");
        if (has(txt)) bad.push(k);
      }
      return bad;
    }, NGW);
    check("2026-11-07 から3年分の今日の5問・上級に、性別に寄った言葉が画面に出る所のどこにも無い", fut.length === 0, fut.slice(0, 3).join(","));
    const pp = await newPage();
    const ep = await pp.evaluate((ws) => {
      const g = window.__bt, R = Math.random; let bad = 0, n = 0; const shown = (id) => { const p = g.P[id]; return JSON.stringify([p, p.w.replace(p.x, "□"), g.tilesOf(p, 4), g.tilesOf(p, 6), g.eqHtml(p, p.x, { win: true })]); }, has = (txt) => ws.some((w) => (w === "OL" ? /(?<![A-Za-z])OL(?![A-Za-z])/.test(txt) : txt.includes(w)));
      try {
        for (let i = 0; i < 300; i++) { if (i < 2) Math.random = i === 0 ? () => 0 : () => 0.999999; const l = g.endlessList(); Math.random = R; n += l.length; if (has(l.map((id) => shown(id)).join("\n"))) bad++; }
        for (let t = 0; t < 4; t++) for (let i = 0; i < 300; i++) {
          if (i < 2) Math.random = i === 0 ? () => 0 : () => 0.999999;
          g.startRun("p", t); Math.random = R;
          const l = g.load().runs.p.list; n += l.length; if (has(l.map((id) => shown(id)).join("\n"))) bad++;
        }
      } finally { Math.random = R; }
      return { bad, n };
    }, NGW);
    await pp.close();
    check("とことん300回・練習（4つの難しさ×300回）を作っても、性別に寄った言葉が出ない", ep.bad === 0 && ep.n > 5000, `${ep.bad}回・${ep.n}問`);
  }

  // 3. 通しで遊ぶ
  check("初めて開くと遊び方が出る", await page.locator("#howto[open]").count() === 1);
  await page.click("#howto-ok");
  check("ホームの例は遊び方と同じ（日＋月＝？）", (await page.textContent(".hero .eq")).replace(/\s/g, "") === "日＋月＝？");
  await page.click("#go-d");
  let p = await curP(page);
  check("1問目は「やさしい」・部品2つ・札は無く入力欄（16px以上・lang=ja・自動修正なし）・答えの所は「？」", p.t === 0 && (await page.locator("#bd .pt").count()) === 3 && (await page.locator(".tile").count()) === 0 && (await page.textContent("#ctr")) === "？" && (await page.evaluate(() => { const a = document.querySelector("#ans"); return parseFloat(getComputedStyle(a).fontSize) >= 16 && a.lang === "ja" && a.getAttribute("autocomplete") === "off" && a.getAttribute("autocapitalize") === "off" && a.getAttribute("spellcheck") === "false" && a.getAttribute("enterkeyhint") === "done"; })));
  const wrong = p.d[0];
  await type(page, wrong);
  const lb = p.dl[p.d.indexOf(wrong)];
  check("まちがえると、打った字が答えの所に出て、その字の組み立て（分かるとき）が出る", (await page.textContent("#ctr")) === wrong && (await page.textContent("#near")).includes(wrong) && (!lb || (await page.textContent("#near")).includes(lb.split(" + ")[0])));
  check("まちがえた字が持つ部品に○が付き（×は付けない）、下に打った字が残る・入力欄は空にもどる", await page.evaluate((x) => { const g = window.__bt, p = g.P.find((q) => q.id === x.id), hs = g.hitsOf(p, x.w), mk = [...document.querySelectorAll("#bd .pt:not(.ans)")].map((e) => !!e.querySelector(".mk.ok")); return JSON.stringify(mk) === JSON.stringify(hs) && !document.querySelector("#bd .mk.ng"); }, { id: p.id, w: wrong }) && (await triedHas(page, wrong)) && (await page.inputValue("#ans")) === "");
  await page.click("#hint");
  check("ヒント1回目で読みが出る（熟語はまだ出ない）", (await page.textContent("#hints")).includes(p.on || p.kun) && !(await page.textContent("#hints")).includes("熟語"));
  await page.click("#hint");
  check("ヒント2回目で、答えの字を□にした熟語と読みが出る（答えの字は出さない）・次のヒントは「候補から選ぶ」", (await page.textContent("#hints")).includes(p.w.replace(p.x, "□")) && !(await page.textContent("#hints")).includes(p.w) && (await page.textContent("#hint")).includes("候補") && (await page.locator("#cands .tile").count()) === 0);
  await page.reload(); await page.click("#go-d");
  check("途中で閉じても、まちがえた字とヒントはそのまま（続きから）", (await triedHas(page, wrong)) && (await page.textContent("#miss")).includes("ヒント 2") && (await page.textContent("#hints")).includes("□"));
  await page.click("#back"); await page.click("#go-p"); await page.locator(".lv button").first().click(); await page.click("#back"); await page.click("#go-d");
  check("練習を始めても、今日の途中経過は消えない", (await triedHas(page, wrong)) && (await page.evaluate(() => window.__bt.mode())) === "d");
  await type(page, p.x);
  check("正解すると、組み立て・読み・熟語が出て★1（まちがい1・ヒント2）", (await page.textContent(".verdict")).includes(p.w) && (await page.textContent(".verdict")).includes(p.wr) && (await page.locator(".verdict .stars .off").textContent()).length === 2);
  check("正解のあとは入力欄とヒントが消える", !(await page.locator("#inp").isVisible()) && (await page.textContent("#hints")) === "");
  check("正解すると部品が答えへ寄る（手ごたえ）・初めての実績が結果に小さく出る", (await page.locator("#bd .eq.merge").count()) === 1 && (await page.textContent(".verdict .achnew")).includes("🏅 実績：はじめの一字"));
  await page.click("#next");
  p = await curP(page);
  await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); s.runs.d.res.push({ m: 0, h: 0 }); localStorage.setItem(k, JSON.stringify(s)); }, KEY);
  await type(page, p.x);
  check("別のタブで先に進んでいたら、古い画面の正解は足さず今の問題を出し直す", (await page.evaluate(() => window.__bt.load().runs.d.res.length)) === 2 && (await page.textContent("header")).includes("3/5"));
  await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); s.runs.d.res.pop(); localStorage.setItem(k, JSON.stringify(s)); }, KEY);
  await page.reload(); await page.click("#go-d");
  for (let j = 0; j < 4; j++) { p = await curP(page); await type(page, p.x); await page.click("#next"); }
  const share = await page.textContent(".share");
  const daily = await page.evaluate(() => { const g = window.__bt; return g.dailyList(g.todayKey()).map((id) => g.P[id]); });
  check("5問で結果・シェアの文は番号と色だけ（答えの字・部品・熟語は出さない）", /部首たし算 #\d+/.test(share) && /🟨💡💡 🟩 🟩 🟩 🟩/.test(share) && !daily.some((q) => share.includes(q.x) || q.ps.some((c) => share.includes(c)) || share.includes(q.w)));
  check("X・LINE は押したときに開くリンクだけ", /^https:\/\/twitter\.com\/intent\/tweet\?text=/.test(await page.getAttribute("#toX", "href")) && /^https:\/\/line\.me\/R\/share\?text=/.test(await page.getAttribute("#toLine", "href")));
  check("結果に5問の答えと組み立てが出る", (await page.locator(".rlist > div").count()) === 5);
  check("まちがいのあった日は Ko-fi のひとことを出さない", (await page.locator(".kofi").count()) === 0);
  check("今日の5問の結果に「続けて遊ぶ：とことん」の大きなボタン", (await page.locator("#go-e.main").count()) === 1 && (await page.textContent("#go-e")).includes("とことん"));
  await page.click("#back");
  check("ホームで連続1日・今日の結果を見るに変わる・漢字帳に5字", (await page.textContent(".rank")).includes("連続1日") && (await page.textContent("#go-d")).includes("今日の結果") && (await page.textContent("#go-dex")).includes("5/"));
  await page.click("#go-h");
  check("上級は部品3つ・入力だけ（札も候補もヒントのボタンも無い）", (await page.locator("#ans").count()) === 1 && (await page.locator(".tile").count()) === 0 && (await page.locator("#hint").count()) === 0 && (await curP(page)).t === 3 && (await page.locator("#bd .pt").count()) === 4);
  for (let j = 0; j < 5; j++) { p = await curP(page); await type(page, p.x); await page.click("#next"); }
  check("上級を全問一発で初めて終えると、結果に Ko-fi のひとことが1行", (await page.locator(".kofi").count()) === 1 && (await page.textContent(".big")).includes("全問一発"));
  await page.click("#back"); await page.click("#go-h");
  check("2回目に結果を開いても Ko-fi のひとことは出ない", (await page.locator(".kofi").count()) === 0);
  await page.click("#back");
  await page.click("#go-p"); await page.locator(".lv button").nth(1).click();
  const played = [];
  for (let j = 0; j < 5; j++) { p = await curP(page); played.push(p.x); await type(page, p.x); await page.click("#next"); }
  const after = await page.evaluate(() => { const s = window.__bt.load(); return { days: Object.keys(s.days).length, dex: s.dex }; });
  check("練習は今日の記録を増やさず、漢字帳には載る", after.days === 1 && played.every((x) => after.dex[x] >= 1) && (await page.locator(".share").count()) === 0, played.join(""));
  await page.click("#go-dex");
  check("漢字帳に集めた字が出る", (await page.locator(".dex button").count()) === Object.keys(after.dex).length);
  await page.locator(".dex button").first().click();
  check("漢字帳の字を押すと、組み立ての式と読み・熟語", (await page.locator(".sheet .eq").count()) === 1 && (await page.locator(".sheet .info dd").count()) === 3);
  await page.close();

  // 4. スマホ幅：はみ出さない・押せる所は44px以上
  for (const w of [320, 390]) {
    const p3 = await newPage(w, 700); const fb2 = await p3.evaluate(() => { const a = document.querySelector("#howto #fb2"); return a ? a.getBoundingClientRect().height : 0; }); check(`幅${w}px：遊び方の「感想を送る」も高さ44px以上`, fb2 >= 44, `${fb2}px`); await p3.click("#howto-ok");
    const homeOk = await p3.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    await p3.click("#go-d");
    const r = await p3.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, small: [...document.querySelectorAll("button, a, input")].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim() || e.id) }));
    check(`幅${w}px：横にはみ出さず、押せる所は高さ44px以上`, homeOk && !r.over && r.small.length === 0, r.small.join(","));
    await p3.click("#back"); await p3.click("#go-p"); await p3.locator(".lv button").nth(3).click();
    const r3 = await p3.evaluate(() => { const g = window.__bt, box = document.querySelector("#bd .eq").parentElement, bad = []; const keep = box.innerHTML; for (const p of g.P) { if (p.ps.length < 3) continue; box.innerHTML = g.eqHtml(p, ""); const e = box.querySelector(".eq"); if (e.scrollWidth > e.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth) bad.push(p.x); } box.innerHTML = keep; return bad; }); // 乱数で選んだ1問でなく、部品3つの問題を全部ならべて確かめる
    check(`幅${w}px：部品3つの式も1行に収まる（全問）`, r3.length === 0, r3.slice(0, 8).join(""));
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
    check("保存に失敗したタブにだけある途中経過は、別のタブが保存しても消さない（その日を終えた記録があれば null を使う・終えた回は日ごとの結果に残す）", await pn.evaluate((K) => { const g = window.__bt, s0 = g.load(); const base = { mode: "d", date: "2000-01-01", list: [1, 2, 3], tags: [1, 2, 3], id: "x", res: [], i: 0, hints: [0, 0, 0] }, done = Object.assign({}, base, { res: [0, 1, 2].map(() => ({ m: 0, g: 1, h: 0, f: 0, p: 90, n: 1 })), i: 3 }); const put = (a, b, dd) => { mem = JSON.stringify(Object.assign({}, s0, { t: 5, runs: a })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, runs: b }, dd ? { days: Object.assign({}, s0.days, dd) } : {}))); const r = g.load(); mem = null; return r; }; const r1 = put({ d: base }, {}), r2 = put({ d: base }, { d: null }, { "2000-01-01": 1 }), r3 = put({ d: base }, { d: null }), r4 = put({ d: done }, { d: null }); return !!r1.runs.d && r1.runs.d.date === "2000-01-01" && r2.runs.d === null && !!r3.runs.d && r3.runs.d.date === "2000-01-01" && r4.runs.d === null && !!r4.days["2000-01-01"]; }, "bushu-v1"));
    check("同じ進み具合なら、新しく保存したほうの途中経過を使う", await pn.evaluate((K) => { const g = window.__bt, s0 = g.load(); const base = { mode: "d", date: "2000-01-01", list: [1, 2, 3], tags: [1, 2, 3], id: "x", res: [], i: 0, hints: [0, 0, 0] }, done = Object.assign({}, base, { res: [0, 1, 2].map(() => ({ m: 0, g: 1, h: 0, f: 0, p: 90, n: 1 })), i: 3 }); const put = (ta, tb) => { mem = JSON.stringify(Object.assign({}, s0, { t: ta, runs: { d: Object.assign({}, base, { zz: "a" }) } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: tb, runs: { d: Object.assign({}, base, { zz: "b" }) } }))); const r = g.load(); mem = null; return r.runs.d.zz; }; return put(9, 5) === "a" && put(5, 9) === "b"; }, "bushu-v1"));
    check("結果を見る前に別のタブが次の日を保存しても、終えた日の記録を残す", await pn.evaluate((K) => { const g = window.__bt, s0 = g.load(); const base = { mode: "d", date: "2000-01-01", list: [1, 2, 3], tags: [1, 2, 3], id: "x", res: [], i: 0, hints: [0, 0, 0] }, done = Object.assign({}, base, { res: [0, 1, 2].map(() => ({ m: 0, g: 1, h: 0, f: 0, p: 90, n: 1 })), i: 3 }); mem = JSON.stringify(Object.assign({}, s0, { t: 5, runs: { d: done } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, runs: { d: Object.assign({}, base, { date: "2000-01-02" }) } }))); const r = g.load(); mem = null; return !!r.days["2000-01-01"] && r.runs.d.date === "2000-01-02"; }, "bushu-v1"));
    check("同じ問題の練習をやり直したら、前の回（終えたもの）と取り違えず新しい回を使う", await pn.evaluate((K) => { const g = window.__bt, s0 = g.load(), base = { mode: "p", date: "2000-01-01", list: [1], tags: [1], res: [], i: 0, hints: [] }; mem = JSON.stringify(Object.assign({}, s0, { t: 9, runs: { p: Object.assign({}, base, { id: "new" }) } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 5, runs: { p: Object.assign({}, base, { id: "old", res: [{}], i: 1 }) } }))); const r = g.load(); mem = null; return r.runs.p.id === "new"; }, "bushu-v1"));
    check("保存に失敗したあと別のタブが保存しても、帳の★は高いほうを残す", await pn.evaluate((K) => { const g = window.__bt, s0 = g.load(); mem = JSON.stringify(Object.assign({}, s0, { t: 5, dex: { zz: 3 } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, dex: { zz: 1 } }))); const r = g.load(); mem = null; return r.dex.zz === 3; }, "bushu-v1"));
    check("時計が戻っても、保存の時刻 t は前より大きくなる", await pn.evaluate((K) => { const s0 = JSON.parse(localStorage.getItem(K)); const far = Date.now() + 1e9; localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: far }))); save(() => {}); return JSON.parse(localStorage.getItem(K)).t > far; }, "bushu-v1"));
    await pn.close(); }
  // 5. 入力して答える（2026-11-04 satou さん「漢字系のゲームは、選択肢ではなく、入力してもらう形のほうが良いかも」）
  { const pi = await newPage(320, 700); await pi.click("#howto-ok"); await pi.click("#go-p"); await pi.locator(".lv button").first().click();
    let q = await curP(pi);
    const box = await pi.evaluate(() => ["#ans", "#go"].map((s) => document.querySelector(s).getBoundingClientRect().height));
    check("幅320px：入力欄と「決める」は高さ44px以上・横にはみ出さない", box.every((h) => h >= 44) && (await pi.evaluate(() => document.documentElement.scrollWidth <= innerWidth)), box.join(","));
    // 変換中の Enter（isComposing・keyCode 229）では送らない
    await pi.fill("#ans", q.x);
    const sent = await pi.evaluate(() => { const a = document.querySelector("#ans"); const e1 = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, isComposing: true }); a.dispatchEvent(e1); const e2 = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }); Object.defineProperty(e2, "keyCode", { get: () => 229 }); a.dispatchEvent(e2); return !!document.querySelector(".verdict"); });
    check("変換中の Enter（isComposing・keyCode 229）では答えを送らない", !sent && (await pi.inputValue("#ans")) === q.x);
    await pi.press("#ans", "Enter");
    check("変換を終えた Enter で送れる", (await pi.locator(".verdict").count()) === 1);
    await pi.click("#next"); q = await curP(pi);
    await type(pi, "ひらがな"); await type(pi, "カタカナ");
    check("かな・カタカナだけは「漢字に変換して」と出し、まちがいに数えない", (await pi.textContent("#near")).includes("漢字に変換") && (await pi.evaluate(() => { const g = window.__bt, r = g.load().runs.p; return !r.cur || r.cur.tried.length === 0; })) && (await pi.textContent("#miss")) === "");
    await type(pi, q.ps.find((c) => /\p{Script=Han}/u.test(c)));
    check("部品の字だけを打っても、まちがいに数えない（合わせた字を打つように出す）", (await pi.textContent("#near")).includes("部品の字") && (await pi.textContent("#miss")) === "");
    const w2 = q.d[0]; await type(pi, w2); await type(pi, " " + w2 + " ");
    check("同じ字をもう一度打っても、まちがいは増えない", (await pi.textContent("#near")).includes("もう試しました") && (await pi.textContent("#miss")).includes("まちがい 1"));
    await type(pi, "　" + q.x + " ");
    check("前後の空白（全角・半角）があっても正解になる", (await pi.locator(".verdict").count()) === 1);
    await pi.click("#next"); q = await curP(pi);
    await type(pi, q.w.startsWith(q.x) ? q.w : q.ps.join("") + q.w); // 熟語ごと打っても（部品の字を除いた）最初の漢字を見る
    check("熟語ごと打っても、部品の字を除いた最初の漢字を見る（後ろのよけいな字は見ない）", (await pi.locator(".verdict").count()) === 1 || !q.w.startsWith(q.x));
    check("NFKC で全角・半角のゆれをそろえる（ｶﾀｶﾅはかな扱い・康熙部首の形もふつうの字に）", await pi.evaluate(() => { const g = window.__bt, p = g.P.find((x) => x.x === "明"); return g.pickKanji(" ｱｲ ", p).kana === true && g.pickKanji("　明　", p).ch === "明" && g.pickKanji("⼈", p).ch === "人" && g.pickKanji("明日", p).ch === "明" && g.pickKanji("日明", p).ch === "明"; }));
    await pi.close(); }
  { // 別解：答えとちがう字でも、同じ部品の組み合わせでできる字（組み立て表にあれば）は正解にして「別解」と出す
    const pj = await newPage(); await pj.click("#howto-ok"); await pj.click("#go-p"); await pj.locator(".lv button").first().click();
    const q = await curP(pj), y = "鬱";
    await pj.evaluate(([q, y]) => { window.__bt.BP[y] = q.ps.slice().reverse().join(" "); }, [q, y]);
    await type(pj, y);
    check("別解（同じ部品の組み合わせのほかの字）は正解にして「別解」と出す・漢字帳はその問題の字", (await pj.locator(".verdict").count()) === 1 && (await pj.textContent(".verdict")).includes("別解") && (await pj.evaluate((x) => !!window.__bt.load().dex[x], q.x)));
    await pj.close(); }
  { // ヒント：読み → 熟語 → 最後に候補4つ（★が下がる）
    const ph = await newPage(); await ph.click("#howto-ok"); await ph.click("#go-p"); await ph.locator(".lv button").nth(1).click();
    const q = await curP(ph);
    for (let j = 0; j < 3; j++) await ph.click("#hint");
    const c = await ph.$$eval("#cands .tile", (a) => a.map((b) => b.dataset.ch));
    check("3つ目のヒントで候補が4つ出る（答えを含む・問題ごとに決まった並び）・ヒントはそれ以上出ない", c.length === 4 && c.includes(q.x) && await ph.isDisabled("#hint") && JSON.stringify(c) === JSON.stringify(await ph.evaluate((id) => window.__bt.tilesOf(window.__bt.P[id], 4), q.id)));
    const wr = c.find((x) => x !== q.x); await ph.click(`#cands .tile[data-ch="${wr}"]`);
    check("候補でまちがえても、その字は押せなくなり下に残る", await ph.isDisabled(`#cands .tile[data-ch="${wr}"]`) && await triedHas(ph, wr));
    await ph.click(`#cands .tile[data-ch="${q.x}"]`);
    check("候補を使って正解すると★1（ヒント3）", (await ph.locator(".verdict .stars .off").textContent()).length === 2 && (await ph.textContent(".verdict")).includes("ヒント3回"));
    check("まちがいの札（候補）は、組み立てが分かれば部品を持つと出し（○）、全部持つ札（淡＝氵＋火＋火 と 炎 など）も別解にはならない", await ph.evaluate(() => { const g = window.__bt; let bad = 0, known = 0; for (const p of g.P) p.d.forEach((y, j) => { const n = g.hitsOf(p, y).filter(Boolean).length; if (g.isAlt(p, y)) bad++; if (p.dl[j] && p.dl[j].split(" + ").some((c) => p.ps.includes(c))) { known++; if (n < 1) bad++; } }); return bad === 0 && known > 1000; }));
    check("○の数は奥の部品も1つの分け方の中で数える：木＋木（林）に 森（木＋林）と打つと○が2つ", await ph.evaluate(() => { const g = window.__bt, p = { ps: ["木", "木"], d: [], dl: [] }; return g.hitsOf(p, "森").filter(Boolean).length === 2 && g.hitsOf(p, "林").filter(Boolean).length === 2 && g.hitsOf(p, "本").filter(Boolean).length <= 1; }));
    check("実績の印が無い古い記録で、結果を見る前に閉じた回を開き直しても、前から取れていた実績を新しく出さない", await (async () => { const pg = await newPage(); await pg.evaluate((k) => { const g = window.__bt, d = g.todayKey(); localStorage.setItem(k, JSON.stringify({ v: 1, tut: true, days: { "2026-11-01": { m: [0, 0, 0, 0, 0] } }, hdays: {}, dex: { 明: 3 }, kofi: {}, runs: { d: { mode: "d", date: d, list: g.dailyList(d), res: [0, 1, 2, 3, 4].map(() => ({ m: 0, h: 0 })) } } })); }, KEY); await pg.reload(); await pg.waitForTimeout(300); const t = await pg.$$eval(".achnew", (a) => a.map((e) => e.textContent).join("|")); await pg.close(); return !t.includes("はじめの一字"); })());
    check("○の数（部品をいくつ持つか）：淡は 炎（火＋火）の部品を2つ・秋は1つ（同じ部品が2つの問題）", await ph.evaluate(() => { const g = window.__bt, p = { ps: ["火", "火"], d: [], dl: [] }; return g.hitsOf(p, "淡").filter(Boolean).length === 2 && g.hitsOf(p, "秋").filter(Boolean).length === 1; }));
    await ph.close(); }
  // 6. やりこみ：実績・記録（カレンダー）・取りこぼした日をあとから
  { // 実績の数え方（いまの記録から毎回数える）
    const pa = await newPage(320, 700);
    const r = await pa.evaluate(() => { const g = window.__bt, s = g.load(); const xs = [...new Set(g.P.map((p) => p.x))].slice(0, 60); s.dex = Object.fromEntries(xs.map((x, i) => [x, i < 10 ? 3 : 1])); const z = { m: [0, 0, 0, 0, 0], h: [0, 0, 0, 0, 0] }; s.days = { "2026-11-04": z, "2026-11-05": { m: [1, 0, 2, 0, 0], h: [] }, "2026-11-07": { m: [0, 1, 0, 0, 0], h: [] } }; s.hdays = { "2026-11-04": { m: [0, 1, 0, 0, 0], h: [] } }; s.late = { "2026-11-06": { m: [0, 0, 1, 0, 0], h: [] } }; const got = g.achGot(s), pr = (id) => g.achProg(s, g.ACH.find((a) => a[0] === id)); return { n: g.ACH.length, kinds: [...new Set(g.ACH.map((a) => a[3]))].join(), got, d300: pr("dex300"), week: pr("week"), s3: pr("s3") }; });
    check("実績は13個で、腕前・集める・続けるを混ぜる", r.n === 13 && r.kinds === "腕前,集める,続ける", r.kinds);
    check("実績はいまの記録から数える（取れたもの・進み具合）", ["first", "perfect", "hard1", "dex50", "late1", "days3"].every((id) => r.got.includes(id)) && !r.got.includes("hardp") && !r.got.includes("dex300") && r.d300.join() === "60,300" && r.week.join() === "4,7" && r.s3.join() === "10,50", JSON.stringify(r));
    await pa.evaluate((K) => { const g = window.__bt, s = g.load(); s.tut = true; s.dex = Object.fromEntries([...new Set(g.P.map((p) => p.x))].slice(0, 60).map((x) => [x, 1])); localStorage.setItem(K, JSON.stringify(s)); }, KEY);
    await pa.reload(); await pa.click("#go-ach");
    const v = await pa.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, n: document.querySelectorAll(".ach").length, pg: document.querySelector('.ach[data-id="dex300"] .pg').textContent, small: [...document.querySelectorAll("button, a")].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim() || e.id) }));
    check("実績の画面：幅320pxで崩れず、まだの実績は条件と「60/300」のような進み具合", !v.over && v.n === 13 && v.pg.includes("60/300") && v.small.length === 0, JSON.stringify(v));
    await pa.close(); }
  { // 実績の前から遊んでいた人には、取れている分をまとめて出さない
    const po = await newPage();
    await po.evaluate((K) => localStorage.setItem(K, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, dex: { 明: 3 }, kofi: {}, runs: {} })), KEY); await po.reload();
    check("前からの記録で取れている実績は、ホームを開いたとき見せた印にして結果でまとめて出さない", await po.evaluate(() => { const s = window.__bt.load(); return !!s.ach && s.ach.first === 1; }));
    await po.close(); }
  { // 統合の前に両方を fresh() で補う（片方にしか無いキーを失わない。2026-11-04 CodeRabbit が前のゲームで指摘）
    const pl = await newPage();
    check("保存に失敗したあとの統合でも、片方にしか無い実績の印・あとから遊んだ日を失わない", await pl.evaluate((K) => { const g = window.__bt, base = { v: 1, days: {}, hdays: {}, dex: {}, runs: {}, kofi: {} }; mem = JSON.stringify(Object.assign({}, base, { t: 9, ach: { first: 1 } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, base, { t: 5, late: { "2026-11-04": { m: [0, 0, 0, 0, 0] } } }))); const r1 = g.load(); mem = JSON.stringify(Object.assign({}, base, { t: 9, late: { "2026-11-04": { m: [0, 0, 0, 0, 0] } } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, base, { t: 5, ach: { first: 1 } }))); const r2 = g.load(); mem = null; return r1.ach.first === 1 && !!r1.late["2026-11-04"] && r2.ach.first === 1 && !!r2.late["2026-11-04"]; }, KEY));
    await pl.close(); }
  { // 取りこぼした日の選び方（何百日分）：今日より前の7日・EPOCH より前は無し・遊んだ日は出さない。問題はその日の今日の5問と同じ
    const pm = await newPage();
    const bad = await pm.evaluate(() => { const g = window.__bt, add = (k, n) => new Date(Date.parse(k) + n * 864e5).toISOString().slice(0, 10), out = []; const s = { days: {}, late: {} }; for (let n = 0; n < 600; n++) { const k = add("2026-11-04", n); if ((n * 7) % 3 === 0) s.days[k] = { m: [0, 0, 0, 0, 0] }; else if (n % 5 === 0) s.late[k] = { m: [0, 0, 0, 0, 0] }; } for (let n = 0; n < 600; n++) { const k = add("2026-11-04", n), m = g.missedDays(s, k), want = []; for (let i = 1; i <= 7; i++) { const d = add(k, -i); if (d >= "2026-11-04" && !s.days[d] && !s.late[d]) want.push(d); } if (JSON.stringify(m) !== JSON.stringify(want)) out.push(k); } return out; });
    check("取りこぼした日は、遊んでいない過去7日だけ（はじめの日より前は無い。600日分）", bad.length === 0, bad.slice(0, 3).join(","));
    await pm.close(); }
  { // あとから遊ぶ：時計を 2026-11-20 にして、A日を途中まで→B日を始める→A日に戻ると続きから・終えても今日の記録・連続・Ko-fi に入れない
    const pz = await browser.newPage({ viewport: { width: 390, height: 844 } });
    pz.on("pageerror", (e) => errors.push(e.stack));
    await pz.addInitScript(() => { const RD = Date, off = Date.parse("2026-11-20T03:00:00Z") - RD.now(); window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }; });
    await pz.goto(url); await pz.evaluate((K) => localStorage.setItem(K, JSON.stringify({ v: 1, tut: true, days: { "2026-11-19": { m: [0, 0, 0, 0, 0], h: [0, 0, 0, 0, 0] } }, hdays: {}, dex: {}, kofi: {}, runs: {} })), KEY); await pz.reload();
    const miss = await pz.evaluate(() => window.__bt.missedDays(window.__bt.load()));
    check("ホームに取りこぼした日のボタン（遊んだ日は除く7日前まで）", (await pz.textContent("#go-late")).includes("6日") && miss.join() === "2026-11-18,2026-11-17,2026-11-16,2026-11-15,2026-11-14,2026-11-13", miss.join());
    const A = "2026-11-15", B = "2026-11-17";
    await pz.click("#go-late"); await pz.click(`.misses button[data-d="${A}"]`);
    const ra = await pz.evaluate((A) => { const g = window.__bt, s = g.load(); return { list: JSON.stringify(s.runs[g.aKey(A)].list), want: JSON.stringify(g.dailyList(A)), mode: g.mode() }; }, A);
    check("あとから遊ぶ問題は、その日の今日の5問と同じ（日付の種）", ra.list === ra.want && ra.mode === "a:" + A && (await pz.textContent("header")).includes("11/15"));
    let q = await curP(pz);
    await type(pz, q.x); await pz.click("#next");
    q = await curP(pz); const wA = q.d[0]; await type(pz, wA);
    await pz.click("#back"); await pz.click("#go-cal"); await pz.click(`.misses button[data-d="${B}"]`);
    const both = await pz.evaluate(([A, B]) => { const s = window.__bt.load(); return { a: s.runs["a:" + A], b: s.runs["a:" + B] }; }, [A, B]);
    check("別の日を始めても、前の日の途中経過は残る（runs を日付ごとに分ける）", both.a && both.a.res.length === 1 && both.a.cur && both.a.cur.tried.length === 1 && both.b && both.b.res.length === 0);
    await pz.click("#back"); await pz.click("#go-cal");
    check("記録で途中の日は「続き」と出る", (await pz.textContent(`.misses button[data-d="${A}"]`)).includes("続き"));
    await pz.click(`.misses button[data-d="${A}"]`);
    check("前の日に戻ると続きから（2問目・まちがえた字もそのまま）", (await pz.textContent("header")).includes("2/5") && await triedHas(pz, wA));
    for (let j = 0; j < 4; j++) { q = await curP(pz); await type(pz, q.x); await pz.click("#next"); }
    const fin = await pz.evaluate((A) => { const g = window.__bt, s = g.load(); return { late: !!s.late[A], day: !!s.days[A], days: Object.keys(s.days).length, st: g.streak(s.days), runB: !!s.runs["a:2026-11-17"], dex: Object.keys(s.dex).length, miss: g.missedDays(s) }; }, A);
    check("あとから終えた日は late に入り、今日の記録（days）・連続の日を増やさない。帳には載る", fin.late && !fin.day && fin.days === 1 && fin.st === 1 && fin.dex === 5 && !fin.miss.includes(A) && fin.runB, JSON.stringify(fin));
    check("あとからの結果：Ko-fi の1行・上級のボタンは出さず、シェアに「あとから」・実績「取りこぼし回収」", (await pz.locator(".kofi").count()) === 0 && (await pz.locator("#go-h").count()) === 0 && (await pz.textContent(".share")).includes("（あとから）") && (await pz.textContent(".achnew")).includes("取りこぼし回収"));
    check("結果に「あと少しの実績」を1つだけ出す：まだの実績のうち目標にいちばん近いもの（取った・0のものは選ばない。研究の要点 12）", await pz.evaluate(() => { const g = window.__bt, s = g.load(), nx = g.nextAch(s), el = document.querySelectorAll("#achnext"); if (!nx) return false; const ok = g.ACH.every((a) => { const [n, t] = g.achProg_(s, a); return !(n > 0 && n < t) || n / t <= nx.r + 1e-12; }); return ok && el.length === 1 && el[0].textContent.includes(nx.name) && el[0].textContent.includes("あと" + nx.left) && !g.achGot(s).includes(nx.id); }));
    await pz.click("#go-cal");
    const cal = await pz.evaluate((A) => ({ late: document.querySelector(`.cal [data-k="${A}"]`)?.className || "", d19: document.querySelector('.cal [data-k="2026-11-19"]')?.className || "", streak: document.querySelector("#cal-streak")?.textContent || "", over: document.documentElement.scrollWidth > innerWidth }), A);
    check("カレンダー：その日にといた日は★の濃さ、あとからの日は別の印（点線）、連続は1以上のときだけ", /\blate\b/.test(cal.late) && /\bd3\b/.test(cal.d19) && cal.streak.includes("連続1日") && !cal.over, JSON.stringify(cal));
    const firstMonth = await pz.isDisabled("#cal-prev");
    await pz.evaluate(() => window.__bt.calView("2026-12")); await pz.click("#cal-prev");
    check("カレンダー：前の月へ戻れる（はじめの月 2026年11月より前へは行かない）", firstMonth && (await pz.textContent("#cal-ym")) === "2026年11月" && (await pz.locator('.cal [data-k="2026-11-15"]').count()) === 1);
    { const before = await pz.evaluate(() => JSON.stringify(window.__bt.load().late)); await pz.evaluate((A) => window.__bt.startRun("a", A), A);
      check("古いタブから終えた日を押しても、記録を読み直して始めずホームへ戻す", (await pz.evaluate((A) => !window.__bt.load().runs["a:" + A], A)) && (await pz.locator("#go-d").count()) === 1 && before === (await pz.evaluate(() => JSON.stringify(window.__bt.load().late)))); }
    await pz.close(); }
  { // 連続が0のときは出さない（休んだ日を責めない）・カレンダーの上級の印と★の濃さ
    const pk = await newPage();
    await pk.evaluate((K) => localStorage.setItem(K, JSON.stringify({ v: 1, tut: true, days: { "2026-11-04": { m: [0, 1, 2, 3, 0], h: [] } }, hdays: { "2026-11-04": { m: [0, 0, 0, 0, 0], h: [] } }, dex: {}, kofi: {}, runs: {} })), KEY); await pk.reload();
    const st = await pk.evaluate(() => window.__bt.streak(window.__bt.load().days));
    check("連続の日は1以上のときだけ出す（0は出さない）", st >= 1 ? (await pk.textContent(".rank")).includes("連続") : !(await pk.textContent(".rank")).includes("連続") && !(await pk.textContent(".stats")).includes("連続"));
    await pk.evaluate(() => window.__bt.calView("2026-11"));
    const c = await pk.getAttribute('.cal [data-k="2026-11-04"]', "class");
    check("カレンダー：★10の日は薄い朱（d1）・上級の日は印（hd）・はじめの月より前には戻れない", /\bd1\b/.test(c) && /\bhd\b/.test(c) && (await pk.isDisabled("#cal-prev")), c);
    await pk.close(); }
  { // とことん：次々に出る・やさしい→ふつう→むずかしい・ヒントは🎫を使う・降りると自己ベスト（2026-11-05 satou さん「一日で遊べる量が少なすぎる」）
    const pe = await newPage(); await pe.click("#howto-ok");
    check("とことんの並び（300回）：やさしい5→ふつう10→むずかしい20→部品3つ25、同じ問題・同じ答えの字は出ない・毎回ちがう並び", await pe.evaluate(() => { const g = window.__bt, firsts = new Set(); for (let n = 0; n < 300; n++) { const L = g.endlessList(); if (L.length !== 60 || new Set(L).size !== 60 || new Set(L.map((id) => g.P[id].x)).size !== 60) return false; const t = L.map((id) => g.P[id].t); if (!t.every((x, i) => x === (i < 5 ? 0 : i < 15 ? 1 : i < 35 ? 2 : 3))) return false; firsts.add(L.slice(0, 5).join()); } return firsts.size > 250; }));
    check("ホームに「とことん」の大きなボタン", (await pe.locator("#go-e.main").count()) === 1 && (await pe.textContent("#go-e")).includes("何問続けて"));
    await pe.click("#go-e");
    check("とことんの1問目はやさしい・🎫が3枚・ヒントのボタンに🎫", (await curP(pe)).t === 0 && (await pe.evaluate(() => window.__bt.load().runs.e.life)) === 3 && (await pe.locator("#life").textContent()).split("🎫").length - 1 === 3 && (await pe.textContent("#hint")).includes("🎫"));
    for (let j = 0; j < 3; j++) { const q = await curP(pe); await type(pe, q.x); await pe.click("#next"); }
    check("とことんは何問目かを出す（4問目）・今日の記録は増えない", (await pe.textContent("header")).includes("4問目") && (await pe.evaluate(() => Object.keys(window.__bt.load().days).length)) === 0);
    const q4 = await curP(pe); await type(pe, q4.d[0]);
    check("とことんのまちがいでは🎫は減らない", (await pe.evaluate(() => window.__bt.load().runs.e.life)) === 3);
    await pe.click("#hint");
    check("とことんのヒントは🎫を1枚使う（画面の🎫も減る）", (await pe.evaluate(() => window.__bt.load().runs.e.life)) === 2 && (await pe.locator("#life .off").textContent()) === "🎫");
    await pe.click("#hint"); await pe.click("#back"); await pe.click("#go-e");
    check("とことんは途中で閉じても続きから（4問目・🎫1・ヒント2回・まちがえた字のまま）", (await pe.textContent("header")).includes("4問目") && (await pe.evaluate(() => window.__bt.load().runs.e.life)) === 1 && (await pe.evaluate(() => window.__bt.cur().hints)) === 2 && await triedHas(pe, q4.d[0]));
    await pe.click("#quit");
    check("降りるとクリアした数と自己ベスト更新が出て、記録に残る（今日の記録・連続には入らない・漢字帳には載る）", (await pe.textContent("#eres")).includes("3問") && (await pe.textContent("#ebest")).includes("自己ベスト更新") && (await pe.evaluate(() => { const s = window.__bt.load(); return s.ebest === 3 && !s.runs.e && Object.keys(s.days).length === 0 && Object.keys(s.dex).length === 3; })) && (await pe.locator(".share").count()) === 0 && (await pe.locator(".kofi").count()) === 0);
    check("とことんの終わりに「もう一度とことん」の大きなボタン", (await pe.locator("#go-e.main").count()) === 1);
    await pe.click("#go-e"); const q1 = await curP(pe); await type(pe, q1.x); await pe.click("#quit");
    check("ベストに届かないと、ベストと「あと何問で更新」を出し、ベストは下げない", (await pe.textContent("#ebest")).includes("あと3問で更新") && (await pe.evaluate(() => window.__bt.load().ebest)) === 3);
    await pe.click("#back");
    check("ホームのとことんのボタンに自己ベスト", (await pe.textContent("#go-e")).includes("自己ベスト 3問"));
    await pe.click("#go-e");
    await pe.evaluate((K) => { const s = JSON.parse(localStorage.getItem(K)); s.runs.e.life = 0; localStorage.setItem(K, JSON.stringify(s)); }, KEY); await pe.click("#back"); await pe.click("#go-e");
    check("🎫が無いとヒントは押せない", await pe.locator("#hint").isDisabled());
    check("自己ベストは2つの保存を合わせるとき大きいほうを残す", await pe.evaluate((K) => { const g = window.__bt, s0 = g.load(); mem = JSON.stringify(Object.assign({}, s0, { t: 99, ebest: 1 })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 5, ebest: 7 }))); const r = g.load(); mem = null; return r.ebest === 7; }, KEY));
    await pe.close(); }
  for (const w of [320, 390]) { // 実績・記録・結果の画面も、はみ出さず押せる所は44px以上
    const pw = await newPage(w, 700);
    await pw.evaluate((K) => { const g = window.__bt, k = g.todayKey(); localStorage.setItem(K, JSON.stringify({ v: 1, tut: true, days: { [k]: { m: [0, 1, 3, 0, 2], h: [0, 1, 1, 0, 0] } }, hdays: {}, dex: {}, kofi: {}, runs: {}, late: { "2026-11-04": { m: [0, 0, 0, 0, 0], h: [0, 0, 0, 0, 0] } } })); }, KEY);
    await pw.reload();
    const bad = [];
    for (const go of ["#go-ach", "#go-cal", "#go-d", "#go-e", "#quit"]) { if (go !== "#quit") await pw.click("#back").catch(() => {}); await pw.click(go); const r = await pw.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, small: [...document.querySelectorAll("button, a")].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim() || e.id) })); if (r.over || r.small.length) bad.push(go + ":" + r.small.join("/")); }
    check(`幅${w}px：実績・記録・結果・とことん（遊ぶ・終わり）の画面もはみ出さず、押せる所は44px以上`, bad.length === 0, bad.join(" "));
    await pw.close(); }
  { // キーボードで選んだボタンに枠が出る（all:unset のカレンダーのます目でも消えない。2026-11-04 CodeRabbit の指摘）
    const pf = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await pf.goto(url); await pf.evaluate(() => localStorage.clear()); await pf.reload();
    await pf.click("#howto-ok").catch(() => {});
    const bad = [];
    for (const open of [null, "#go-cal"]) {
      if (open) await pf.click(open);
      await pf.keyboard.press("Shift");
      bad.push(...await pf.evaluate(() => {
        const cal = document.querySelector(".cal");
        if (cal) { const b = document.createElement("button"); b.className = (cal.querySelector("button") || cal.lastElementChild).className + " miss"; b.textContent = "1"; cal.append(b); }
        return [...document.querySelectorAll("button:not([disabled]),a[href]")].filter((b) => b.checkVisibility()).filter((b) => { b.focus(); const cs = getComputedStyle(b); return !b.matches(":focus-visible") || cs.outlineStyle === "none" || parseFloat(cs.outlineWidth) < 2; }).map((b) => b.className || b.id || b.tagName);
      }));
    }
    check("キーボードで選んだボタン（カレンダーのあとから遊ぶ日も）に枠が出る", bad.length === 0, bad.join(","));
    await pf.close(); }
  { // 色だけで分けない（shared-workflows routines/game-dev.md A1・WCAG 1.4.1）・知らせは文字で（A7）・動きを減らすで振動も止める（A8）
    const pc = await newPage(); await pc.click("#howto-ok");
    await pc.evaluate((K) => { const g = window.__bt, s = g.load(), k = g.todayKey(), xs = [...new Set(g.P.map((p) => p.x))]; s.dex = { [xs[0]]: 3, [xs[1]]: 2, [xs[2]]: 1 }; s.days = { [k]: { m: [0, 0, 0, 0, 0], h: [0, 0, 0, 0, 0] } }; localStorage.setItem(K, JSON.stringify(s)); }, KEY);
    await pc.reload(); await pc.click("#go-dex");
    const dx = await pc.evaluate(() => [...document.querySelectorAll(".dex button")].map((b) => [b.className, getComputedStyle(b, "::after").content, b.getAttribute("aria-label")]));
    check("漢字帳：★3・★2の字は色に加えて「★3」「★2」の字と読み上げの名前（星Nつ）でも分かる", dx.length === 3 && dx.every(([c, a, l]) => l.includes(`星${c.slice(1)}つ`) && (c === "s1" ? a === "none" : a.includes(`★${c.slice(1)}`))), JSON.stringify(dx));
    await pc.click("#back"); await pc.click("#go-ach");
    const ac = await pc.evaluate(() => [...document.querySelectorAll(".ach")].map((e) => [e.classList.contains("got"), e.textContent.includes("✓ 取った"), !!e.querySelector(".pg")]));
    check("実績：取った実績は色に加えて「✓ 取った」、まだのものは進み具合（いま/目標）", ac.some((x) => x[0]) && ac.every(([g, t, pg]) => (g ? t && !pg : !t && pg)), JSON.stringify(ac));
    await pc.click("#back"); await pc.click("#go-cal");
    const out = await pc.evaluate(() => [...document.querySelectorAll(".cal .c.out")].map((e) => +getComputedStyle(e).opacity));
    check("記録：選べない日は薄くせず（字が読める）、点線の枠で分ける", out.length > 0 && out.every((o) => o === 1), JSON.stringify(out.slice(0, 3)));
    await pc.close();
    const pv = await newPage(); await pv.click("#howto-ok");
    await pv.evaluate(() => { window.__vib = 0; navigator.vibrate = () => { window.__vib++; return true; }; });
    await pv.click("#go-p"); await pv.locator(".lv button").first().click();
    const q = await curP(pv);
    const dots = await pv.evaluate(() => [...document.querySelectorAll(".dots i")].map((i) => { const c = getComputedStyle(i); return [i.className, Math.round(i.getBoundingClientRect().height), c.backgroundColor === "rgba(0, 0, 0, 0)"]; }));
    check("進み具合の点は色に加えて形で分かる（いま＝高い・まだ＝中が空・済み＝塗り）", dots[0][0] === "on" && dots.slice(1).every(([c, h, empty]) => c === "" && h < dots[0][1] && empty), JSON.stringify(dots));
    check("知らせの場所（#live、role=status）があり、問題の式に読み上げの印（data-a11y-say）", (await pv.getAttribute("#live", "role")) === "status" && (await pv.locator("#bd .eq[data-a11y-say]").count()) === 1 && (await pv.locator(".hero [data-a11y-say]").count()) === 0);
    await type(pv, q.d[0]); await pv.waitForTimeout(100);
    check("まちがえると「まちがい」と字の組み立てを #live に文字で知らせる・振動する（ふだん）", (await pv.textContent("#live")).startsWith("まちがい") && (await pv.evaluate(() => window.__vib)) === 1, await pv.textContent("#live"));
    await pv.click("#hint"); await pv.waitForTimeout(100);
    check("ヒントも #live に文字で知らせる", (await pv.textContent("#live")).includes("読み"));
    await type(pv, q.x); await pv.waitForTimeout(100);
    check("正解も #live に文字で知らせる（字・星の数）・取れない星は☆", (await pv.textContent("#live")).startsWith("正解") && (await pv.textContent("#live")).includes("星") && /^☆+$/.test(await pv.textContent(".verdict .stars .off")), await pv.textContent("#live"));
    await pv.evaluate(() => { localStorage.setItem("a11y-v1", JSON.stringify({ calm: true })); }); await pv.reload();
    await pv.evaluate(() => { window.__vib = 0; navigator.vibrate = () => { window.__vib++; return true; }; });
    await pv.click("#back").catch(() => {}); await pv.click("#go-p"); await pv.locator(".lv button").first().click();
    const q2 = await curP(pv); await type(pv, q2.d[0]); await type(pv, q2.x);
    check("「動きを減らす」では振動しない", (await pv.evaluate(() => window.__vib)) === 0 && (await pv.locator(".verdict").count()) === 1);
    await pv.close(); }
} catch (e) { // 途中で止まっても、ここまでの結果とレポートは書き出す
  check("QA の操作が最後まで完了する", false, e.message.split("\n")[0]);
} finally {
  try { // 引き継ぎコード（別の端末へ記録を移す。shared-workflows template/qa/transfer-check.mjs）
    await checkTransfer({ browser, url, game: "bushu-tashizan", sample: { "bushu-v1": JSON.stringify({ v: 1, tut: true }) }, check, open: async (p) => { await p.click("#howto-ok", { timeout: 1500 }).catch(() => {}); } });
  } catch (e) { check("引き継ぎコード", false, e.message.split("\n")[0]); }
  await browser.close();
}
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));

{ // 見やすさ・読みやすさ・偏り（shared-workflows template/qa/a11y.mjs の写し。routines/game-dev.md「だれでも遊べるように」）
  const { spawnSync } = await import("node:child_process");
  const a = spawnSync(process.execPath, [path.join(root, "qa", "a11y.mjs")], { encoding: "utf8", env: process.env });
  check("見やすさ・読みやすさの検査（qa/a11y.mjs。中身は qa-report/a11y.md）", a.status === 0, (a.stdout.match(/^- ❌.*$/gm) || []).join(" / ") || (a.status ? a.stderr.slice(-300) : ""));
}

const ng = results.filter((r) => !r.ok);
const md = `# 部首たし算 QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
