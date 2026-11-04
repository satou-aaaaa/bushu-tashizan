// アプリのアイコン（icon-192.png・icon-512.png）を作る。和紙の地に「木＋木」と朱の「林」。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="font-family:'Noto Serif CJK JP',serif">
      <rect width="100" height="100" fill="#f3ede0"/>
      <text x="27" y="38" font-size="24" text-anchor="middle" fill="#1f1b16" font-weight="800">木</text><text x="50" y="36" font-size="18" text-anchor="middle" fill="#6b6257" font-weight="700">＋</text><text x="73" y="38" font-size="24" text-anchor="middle" fill="#1f1b16" font-weight="800">木</text>
      <rect x="26" y="48" width="48" height="44" rx="8" fill="#c43d2b" stroke="#8f2a1d" stroke-width="2"/>
      <text x="50" y="83" font-size="36" text-anchor="middle" fill="#fff" font-weight="800">林</text></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
