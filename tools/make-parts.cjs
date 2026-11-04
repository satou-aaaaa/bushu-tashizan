// 入力して答えるときの手がかり用の組み立て表 parts.js を tools/parts.txt から作る（手で直さない）。
// 打った字が「問題の部品をいくつ持つか」「何と何でできているか」と、別解（同じ部品の組み合わせのほかの字）を確かめるため。
// 字の組み立て：KanjiVG（© Ulrich Apel、CC BY-SA 3.0）。このファイルが作る parts.js は CC BY-SA 4.0。
// 使い方: node tools/make-parts.cjs
const fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
const T = fs.readFileSync(path.join(root, "tools/parts.txt"), "utf8").split("\n").filter((l) => l && !l.startsWith("#"));
const M = {};
for (const l of T) { const [k, s] = l.split("\t"); (M[k] = M[k] || []).push(s); }
const out = `// 部首たし算の手がかり用の組み立て表。tools/make-parts.cjs が tools/parts.txt から作る（手で直さない）。\n// 字の組み立て：KanjiVG（© Ulrich Apel、CC BY-SA 3.0）。このファイルは CC BY-SA 4.0。\n// 字 = "部品 部品|部品 部品 部品"（分け方が2つあれば | で区切る）\nwindow.BT_PARTS = ${JSON.stringify(Object.fromEntries(Object.keys(M).sort().map((k) => [k, M[k].join("|")])))};\n`;
fs.writeFileSync(path.join(root, "parts.js"), out);
console.log(`parts.js: ${Object.keys(M).length}字, ${Buffer.byteLength(out)} bytes`);
