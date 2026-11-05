# AGENTS.md

部首たし算：漢字の部品（日＋月など）を合わせてできる字を、入力して答える1日5問のクイズ。`index.html` と `data.js`（問題939問）・`parts.js`（入力した字の手がかり用の組み立て表）を GitHub Pages で公開する。

## 準備（最初に一度）

```bash
bash scripts/setup.sh   # Node.js（版は .nvmrc）を確かめ、検査の依存とブラウザを入れる。何度実行してもよい
```

## push する前の確認

```bash
node qa/run.mjs   # 答えが1つか（組み立ての表で全部の常用漢字と比べる）・まちがいの札・parts.js・入力して答える（変換中の Enter・NFKC・かなだけ・別解・候補）・5問の組み方（3年分）・通しで遊ぶ・ヒント・続きから・上級・漢字帳・実績・カレンダー・あとから（600日分）・Ko-fi・スマホ幅・PWA（CI の QA と同じ）
```

## このリポジトリの決まり

- 問題は `python3 tools/make-data.py <jamdict.db> <kanjivg の kanji フォルダ>` で作る（`data.js`・`tools/parts.txt` を手で直さない）。`parts.js` は `node tools/make-parts.cjs` で `tools/parts.txt` から作る（手で直さない。QA が合うか見る）。字の組み立ては KanjiVG（https://kanjivg.tagaini.net の main の zip）、読みと熟語は jamdict-data の jamdict.db（KANJIDIC2・JMdict）。どちらもリポジトリには入れない。
- KanjiVG は © Ulrich Apel、CC BY-SA 3.0。KANJIDIC2・JMdict は © EDRDG、CC BY-SA 4.0。`data.js`・`tools/parts.txt` は CC BY-SA 4.0 で、遊び方と README に出どころを書く（消さない）。
- 答えは常用漢字。部品は常用漢字（2画以上）か、名前のある部首の形（`RN`：氵さんずい など）。答えは1つ：同じ部品の組み合わせになる常用漢字はほかに無い（QA が `tools/parts.txt` で比べ直す）。
- 部品3つの問題は、2つに分かれた片方をもう一度分ける（小学校で習う字は分けない）か、はじめから3つに分かれる字。
- まちがいの札（いまはヒントの最後の候補）は部品を1つだけ持つ常用漢字（部品を全部持つ字は入れない）。まちがえたら、その字の組み立てを見せる（考える手がかり）。
- つらい言葉（死・殺など）の字は使わない（QA が見る）。熟語の読みはひらがなだけのもの。
- 今日の5問（やさしい2・ふつう2・むずかしい1）・上級（部品3つの5問、1日6問ずつ使い今日の5問と同じ答えの字は飛ばす）・札の並びは日本時間の日付と問題から作る乱数（`seedOf`・`rng`）で決まり、だれでも同じ。1周するまで同じ問題は出ない。`Math.random()` は練習・とことんの問題選びと、とことんの回の見分けだけ（QA が数を見る）。`data.js` を作り直すと過去の日の問題も変わるので、作り直した PR に一言書く。
- 答えは入力欄に漢字を1字打つ（2026-11-04 satou さん「漢字系のゲームは、選択肢ではなく、入力してもらう形のほうが良いかも」。前は札から選んだ）。変換中の Enter（`isComposing`・`keyCode 229`）では送らない。打った文字は空白を消して NFKC でそろえ、部品の字を除いた最初の漢字を見る（熟語ごと打っても通る）。かなだけ・部品の字だけ・同じ字の打ち直しはまちがいに数えない。同じ部品の組み合わせでできるほかの字（`parts.js` にあれば）は「別解」として正解にする。
- まちがえた字は、持つ部品に○を付け（`hitsOf`。組み立て表を奥までたどる。表に無い分け方もあるので×は付けない）、何と何でできているかを出す。正解すると部品が答えへ寄り、一発なら朱の印。
- ★はまちがい＋ヒントの数（0で★3・1で★2・それ以上★1。前と同じ）。ヒントは3つまで（読み・答えの字を□にした熟語・最後に候補4つ `tilesOf(p, 4)`）。上級はヒントも候補もなし（入力だけ）。時間制限は付けない。
- 実績（`ACH`、13個）は記録（`days`・`hdays`・`late`・`dex`）から毎回数える。新しく残すのは「見せた」印の `ach` だけ。腕前・集める・続けるを混ぜ、続けるは連続でなく合計で数える。実績を足したら QA の数（13）も直す。結果の画面には、まだの実績のうち目標にいちばん近いもの1つを「🎯 次の実績」で出す（`nextAch`。shared-workflows `routines/game-dev.md` 研究の要点 12）。
- 記録（カレンダー）から、遊んでいない過去7日（`EPOCH` より前は無し）の今日の5問をあとから遊べる（`dailyList(その日)` と同じ問題）。途中経過は日付ごとに `runs["a:日付"]`、結果は `late` に分けて置き、`days`（今日の記録）・連続の日・Ko-fi の1行には数えない（実績と漢字帳には入る）。連続の日は1以上のときだけ出す。`load()` は統合の前に両方を `fresh()` で補い、片方にしか無い記録（`ach`・`late` など）を失わない。
- 今日の5問・上級は1日1回で、途中で閉じても打った字とヒントのまま続きから。途中経過はモードごとに分けて保存し（`runs.d`・`runs.h`・`runs.p`）、練習で今日・上級の途中を消さない。答えを入れる前に、保存した進み具合が画面と同じ問題か確かめる（古いタブで二重に入れない）。記録は保存の前に読み直す。保存に失敗したあとは、途中経過を時刻でなく進み具合で選び、帳の★は高いほうを残す（shared-workflows `incidents/2026-11-04-daily-game-save-gaps.md`）。
- とことん（`runs.e`）：今日の分のあとも続けて遊べるよう、やさしい5→ふつう10→むずかしい20→部品3つ25問（同じ答えの字は1回だけ）を毎回ちがう並びで次々に出す（`endlessList`）。ヒント1回で🎫1枚（3枚まで。まちがいでは減らない。🎫が無いとヒントは押せない）、「ここで降りる」で終わり、といた問題の数の自己ベスト `ebest` を残す。今日の記録・連続・Ko-fi・シェアには数えない（漢字帳・実績には入る）。他の人との順位は出さない。ホームと今日の結果の画面に大きなボタンを置く（2026-11-05 satou さん「一日で遊べる量が少なすぎる」）。
- 共有は遊ぶ人が押したときに開くリンク（X・LINE・Web Share・コピー）だけ。シェアの文に答えの字・部品・熟語を出さない（🟩一発・🟨まちがい1回・🟧2回以上・💡ヒント）。
- 文字は少なめ・一画面一問。お笑いの言葉は入れない（QA が見る）。ほかの作品の名前・キャラ・見た目は使わない。
- 感想は「感想を送る」から GitHub の Issue フォーム（`.github/ISSUE_TEMPLATE/feedback.yml`、ラベル「感想」）を開くだけ。項目は shared-workflows の `template/.github/ISSUE_TEMPLATE/feedback.yml` と同じにし、名前・メールは聞かない。週1で shared-workflows `routines/game-feedback.md` が読んで直す。
- 応援は Ko-fi（https://ko-fi.com/satouaaaaa）へのただのリンクだけ。今日の5問・上級を初めて終えて全問一発のときだけ、結果の画面の下に1行（共有フォルダ kofi/app-guide.md）。遊ぶのは無料のまま、有料版は置かない。
- 外へ通信しない。外から読むのは Google Fonts の文字だけ（CSP の `connect-src 'self'` を広げない）。記録は遊ぶ人のブラウザ（localStorage）だけ。
- 同じ日はどの端末でも同じ問題にする：乱数は `sort` の比較の中で引かない（QA が見る）。少し遅れて動く処理（setTimeout）は、画面が替わっていたら何もしない。
- キーボードで選んだときの枠（`:focus-visible`）は style のいちばん最後に `:is(.icon,button,a):focus-visible{…!important}` で書く（`all:unset` のボタンでも消えない。2026-11-04 CodeRabbit がほかのゲームで指摘。QA が見る）。あとから遊ぶ日は、始める前に記録を読み直し、もう終えていたら知らせてホームへ戻す。
- 押せる所は高さ44px以上、幅320pxでも部品3つの式は1行に収める（QA が見る）。機能を足す・直すたびに `qa/run.mjs` に検査を足す。乱数で組む部分は何年分も作って確かめる（shared-workflows `incidents/2026-10-31-roppo-empty-village.md`）。
- PWA（`manifest.webmanifest`・`sw.js`・`icon-*.png`）：画面のファイルを足したら `sw.js` の `SHELL` にも足し、中身を大きく変えたら `CACHE` の版を上げる。アイコンは `node tools/make-icons.cjs`、SNS 用の絵 `og.png` は `node tools/make-og.cjs`（今日の答えを入れない）。
- 引き継ぎコード（別の端末へ記録を移す）：`transfer.js`・`qa/transfer-check.mjs` は shared-workflows の `template/` の写し（ここで直さない。直すときはひな形を直して配り、`引き継ぎの版` を上げる）。`index.html` の script の `data-keys` は記録のキーだけを書く。記録の形を変えたら `qa/run.mjs` の `checkTransfer` の `sample` も合わせる。sw.js の `SHELL` から `./transfer.js` を外さない（shared-workflows `routines/game-dev.md`「引き継ぎコード」）。
- 公開リポジトリなので、個人情報・鍵を入れない。

## 公開

- GitHub Pages は `main` のルート（`/`）を公開する。PR の QA と Secret scan が ✅ になると `automerge.yml` が自動でマージする。止めたいときは下書きにするか、ラベル「自動マージしない」を付ける。
- `sw.js`・`manifest.webmanifest` を変える PR は自動ではマージされない（`hold_paths`）。CodeRabbit のレビューを待ち、手でマージする直前に今の head へのレビューを読み直す（shared-workflows `incidents/2026-11-01-roppo-merged-before-review.md`）。CodeRabbit は PR に `@coderabbitai review` とコメントして頼む。

## 共通のきまり

- PR の作り方・マージの仕方は satou-aaaaa/shared-workflows の `routines/pr.md`、全体のきまりは `routines/common.md` に従う。
- CI の部品は shared-workflows の共通部品を呼ぶ。リポジトリ側の .github/workflows には呼び出しと設定値だけを書く。
- Claude 以外の AI・人が作業するときは、shared-workflows の `routines/tool-map.md` と `routines/without-claude.md` を読む。
