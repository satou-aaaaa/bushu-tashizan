// SNS で貼られたときの絵（og.png 1200×630）を作る。今日の問題（答え）は入れず、遊び方の例（日＋月＝？）だけ。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const cell = (ch, c) => `<div style="width:130px;height:130px;border:4px solid ${c ? "#c43d2b" : "#1f1b16"};${c ? "border-style:dashed;color:#c43d2b;" : ""}border-radius:16px;background:#fffdf8;display:grid;place-items:center;font-size:88px;font-weight:900;box-shadow:0 6px 0 #1f1b1633">${ch}</div>`;
  const op = (s) => `<div style="font-size:56px;color:#6b6257;font-weight:700">${s}</div>`;
  await p.setContent(`<body style="margin:0;font-family:'Noto Serif CJK JP','IPAPMincho','Noto Sans CJK JP',serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:70px 80px;background:#f3ede0;color:#1f1b16;position:relative;overflow:hidden">
    <div style="font-size:34px;color:#8f2a1d;letter-spacing:.1em">だれでも同じ 1日5問・3分</div>
    <div style="font-size:104px;font-weight:900;margin-top:16px;letter-spacing:.1em">部首たし算</div>
    <div style="font-size:40px;margin-top:14px;line-height:1.5">漢字の部品を合わせると、どの字になる？</div>
    <div style="position:absolute;left:80px;top:400px;display:flex;align-items:center;gap:24px">${cell("日")}${op("＋")}${cell("月")}${op("＝")}${cell("？", 1)}</div>
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
