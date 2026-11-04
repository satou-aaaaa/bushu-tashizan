# 部首たし算

「日」＋「月」＝？ 漢字の部品を合わせてできる字を当てる、1日5問のクイズ。

- 遊ぶ: https://satou-aaaaa.github.io/bushu-tashizan/
- 部品の並びは字の中の並び（左から右・上から下）のとおり。答えは入力欄に漢字を1字打ちます（スマホのかな漢字変換で）。まちがえると、打った字が持つ部品（○）と、何と何でできているかが分かります。何度でも打ち直せます。
- ヒントは3つまで（読み・その字を使う熟語・最後に候補を4つから選ぶ）。まちがいとヒントが少ないほど★が多くなります。時間制限はありません。
- 今日の5問（やさしい2・ふつう2・むずかしい1）はだれでも同じで1日1回。上級（部品3つ・ヒントも候補もなし）、練習、といた字が集まる漢字帳、実績、といた日のカレンダー（取りこぼした過去7日はあとからとけます）があります。
- 記録は遊ぶ人のブラウザにだけ残り、ゲームから自動で外へ送ることはありません。例外は2つ：文字（Google Fonts）を読み込むとき、まだ端末に保存が無ければ Google に IP アドレスが届きます。「Xで投稿」「LINEで送る」「結果をシェア」を押したときだけ、結果の文が選んだ先に渡ります（答えの字は入りません）。

## データの出どころ

- 字の組み立て（どの部品でできているか）：[KanjiVG](https://kanjivg.tagaini.net)（© Ulrich Apel、CC BY-SA 3.0）
- 読みと熟語：KANJIDIC2・JMdict（© [Electronic Dictionary Research and Development Group](https://www.edrdg.org/edrdg/licence.html)、CC BY-SA 4.0）
- `data.js`・`tools/parts.txt` はこれらから `tools/make-data.py` で作ったもの、`parts.js`（入力した字の手がかり用）は `tools/parts.txt` から `tools/make-parts.cjs` で作ったもので、CC BY-SA 4.0 です。

## 開発

```bash
bash scripts/setup.sh   # 最初に一度
node qa/run.mjs         # 検査（CI と同じ）
python3 tools/make-data.py <jamdict.db> <kanjivg の kanji フォルダ>   # data.js を作り直すとき
```

感想は [Issue のフォーム](https://github.com/satou-aaaaa/bushu-tashizan/issues/new?template=feedback.yml) からどうぞ。
