#!/usr/bin/env python3
"""部首たし算の問題を KanjiVG と KANJIDIC2・JMdict から作る（標準ライブラリだけ）。

使い方: python3 tools/make-data.py <jamdict.db> <kanjivg の kanji フォルダ>
  jamdict.db は PyPI の jamdict-data の中の jamdict.db.xz を解いたもの（KANJIDIC2・JMdict。© EDRDG、CC BY-SA 4.0）。
  kanji フォルダは KanjiVG（https://kanjivg.tagaini.net 、© Ulrich Apel、CC BY-SA 3.0）の main の zip を解いたもの。
  作った data.js・tools/parts.txt は CC BY-SA 4.0（CC BY-SA 3.0 の後の版として）。

問題の決まり（QA も tools/parts.txt で同じことを見る）:
- 答えは常用漢字。KanjiVG の字の組み立て（いちばん外側の分かれ方）が、2つ（または3つ）の部品にちょうど分かれる。
- 部品は常用漢字（2画以上）か、よく知られた部首の形（氵・亻・扌など。名前を添える）。
- 答えは1つ：同じ部品の組み合わせ（順番は問わない）になる常用漢字はほかに無い。
- 3つの部品の問題は、2つに分かれた片方をもう一度2つに分ける（小学校で習う字は分けない）か、はじめから3つに分かれる字。
- まちがいの札は、部品を1つだけ持つ常用漢字（部品を全部持つ字は入れない）。
- つらい言葉（死・殺など）の字は使わない。
"""
import sqlite3, collections, json, random, sys, os, re
import xml.etree.ElementTree as ET

if len(sys.argv) < 3:
    sys.exit("使い方: python3 tools/make-data.py <jamdict.db> <kanjivg の kanji フォルダ>")
DB, KDIR = sys.argv[1], sys.argv[2]
c = sqlite3.connect(DB)
info = {l: (s, g) for l, s, g in c.execute("select literal, stroke_count, grade from character")}
JOYO = {k for k, (s, g) in info.items() if g in ("1", "2", "3", "4", "5", "6", "8")}
LOW = {k for k in JOYO if info[k][1] != "8"}
NG = set("死殺葬屍姦淫娼尿糞呪遺棺骸刑獄墓弔喪病癌毒虐暴拷凶犯罪賊奴隷")
RN = {"氵": "さんずい", "亻": "にんべん", "扌": "てへん", "艹": "くさかんむり", "辶": "しんにょう", "刂": "りっとう", "灬": "れんが", "忄": "りっしんべん",
      "宀": "うかんむり", "冖": "わかんむり", "疒": "やまいだれ", "广": "まだれ", "尸": "しかばね", "彳": "ぎょうにんべん", "礻": "しめすへん", "衤": "ころもへん",
      "犭": "けものへん", "阝": "こざとへん・おおざと", "亠": "なべぶた", "冫": "にすい", "囗": "くにがまえ", "儿": "ひとあし", "厂": "がんだれ", "勹": "つつみがまえ",
      "攵": "のぶん", "禾": "のぎへん", "隹": "ふるとり", "頁": "おおがい", "彡": "さんづくり", "夂": "ふゆがしら", "廴": "えんにょう"}
K = "{http://kanjivg.tagaini.net}"
SVG = "{http://www.w3.org/2000/svg}"

def root(k):
    p = os.path.join(KDIR, f"{ord(k):05x}.svg")
    if not os.path.exists(p):
        return None
    for g in ET.parse(p).getroot().iter(SVG + "g"):
        if g.get("id") == f"kvg:{ord(k):05x}":
            return g
    return None
def kids(g):  # 名前の無いまとまりは開いて、中の部品を並べる。部品でない線は None
    out = []
    for ch in g:
        if ch.tag == SVG + "g":
            out += kids(ch) if ch.get(K + "element") is None else [ch]
        elif ch.tag == SVG + "path":
            out.append(None)
    return out
def part(ch):
    if ch is None or ch.get(K + "part"):
        return None
    e = ch.get(K + "element")
    if e in JOYO and e not in NG and info[e][0] >= 2:
        return e
    return e if e in RN else None
def split(g):
    ks = kids(g)
    es = [part(x) for x in ks]
    return (es, ks) if len(es) >= 2 and all(es) else (None, ks)
def elems(g):  # 字の中にある部品（どの深さでも）
    return {x.get(K + "element") for x in g.iter(SVG + "g") if x.get(K + "element")} - {None}

two, three, allel, label = {}, collections.defaultdict(list), {}, {}
for k in sorted(JOYO):
    g = root(k)
    if g is None:
        continue
    allel[k] = elems(g) - {k}
    s, ks = split(g)
    names = [x.get(K + "element") if x is not None else None for x in ks]
    if all(names) and len(names) >= 2:
        label[k] = names  # まちがえた字の組み立てを見せる用（画面で読める部品のときだけ出す）
    if not s:
        # 片方が部品の制限に合わなくても、その片方を2つに分けると合う字（語 = 言 + 吾 → 言・五・口）
        if len(ks) == 2:
            for i, ch in enumerate(ks):
                o = part(ks[1 - i])
                s2, _ = split(ch) if ch is not None else (None, None)
                if o and s2 and len(s2) == 2:
                    t = [o]; t[i:i] = s2 if i == 0 else []; t = s2 + [o] if i == 0 else [o] + s2
                    three[k].append(tuple(t))
        continue
    if len(s) == 2:
        two[k] = tuple(s)
        for i, ch in enumerate(ks):
            if s[i] in LOW:
                continue  # 小学校で習う字は分けない
            s2, _ = split(ch)
            if s2 and len(s2) == 2:
                t = list(s); t[i:i + 1] = s2
                three[k].append(tuple(t))
    elif len(s) == 3:
        three[k].append(tuple(s))

key = lambda t: tuple(sorted(t))
cnt2 = collections.Counter(key(t) for t in two.values())
cnt3 = collections.Counter(key(t) for k, v in three.items() for t in {key(x) for x in v})
Q2 = {k: t for k, t in two.items() if cnt2[key(t)] == 1 and k not in NG}
Q3 = {}
for k, v in three.items():
    v = [t for t in v if cnt3[key(t)] == 1 and len(set(t)) >= 2 or (cnt3[key(t)] == 1 and len(t) == 3)]
    if v and k not in NG:
        Q3[k] = v[0]

# 読み（KANJIDIC2）と、その字を使うよく使う熟語（JMdict）
rd = collections.defaultdict(lambda: {"on": [], "kun": []})
for lit, t, v in c.execute("select ch.literal, r.r_type, r.value from reading r join rm_group g on r.gid = g.ID join character ch on g.cid = ch.ID where r.r_type in ('ja_on','ja_kun')"):
    if lit in JOYO:
        rd[lit]["on" if t == "ja_on" else "kun"].append(v)
kunf = lambda v: v.replace(".", "").replace("-", "")
rows = c.execute("select id, text, idseq from Kanji").fetchall()
pri = collections.defaultdict(set)
for kid, p in c.execute("select kid, text from KJP"):
    pri[kid].add(p)
kana = collections.defaultdict(list)
for seq, t in c.execute("select idseq, text from Kana order by ID"):
    kana[seq].append(t)
best = {}
for kid, t, seq in rows:
    if len(t) != 2 or not (pri[kid] & {"ichi1", "news1"}) or not all(ch in JOYO for ch in t) or set(t) & NG or t[0] == t[1] or not kana[seq] or not re.fullmatch("[ぁ-ゖー]+", kana[seq][0]):
        continue
    nf = [int(p[2:]) for p in pri[kid] if p.startswith("nf")]
    sc = (0 if "ichi1" in pri[kid] else 1, min(nf) if nf else 30, t)
    for ch in set(t):
        if ch not in best or sc < best[ch][0]:
            best[ch] = (sc, t, kana[seq][0])

R = random.Random(20261104)
def decoys(k, parts):
    ps = set(parts)
    cand = [d for d in sorted(JOYO - NG - {k}) if d in allel and len((allel[d] | {d}) & ps) == 1 and d not in ps]
    gk = int(info[k][1])
    R.shuffle(cand)
    cand.sort(key=lambda d: abs(int(info[d][1]) - gk))
    pick = cand[:12]
    R.shuffle(pick)
    return pick[:5]
def item(k, parts, tier):
    r = rd[k]
    on = r["on"][0] if r["on"] else ""
    kun = kunf(r["kun"][0]) if r["kun"] else ""
    ex = best.get(k)
    ds = decoys(k, parts)
    if len(ds) < 5 or not ex:
        return None
    return [k, tier, list(parts), ds, [" + ".join(label[d]) if d in label and all(x in JOYO or x in RN for x in label[d]) else "" for d in ds], on, kun, ex[1], ex[2]]

out = []
for k in sorted(Q2):
    g = info[k][1]
    it = item(k, Q2[k], 0 if g in "123" else 1 if g in "456" else 2)
    if it:
        out.append(it)
for k in sorted(Q3):
    it = item(k, Q3[k], 3)
    if it:
        out.append(it)
out.sort(key=lambda p: (p[1], p[0]))
n = collections.Counter(p[1] for p in out)
print(f"問題 {len(out)}（やさしい {n[0]}・ふつう {n[1]}・むずかしい {n[2]}・3つの部品 {n[3]}）", file=sys.stderr)
lines = ",\n".join(json.dumps(p, ensure_ascii=False, separators=(",", ":")) for p in out)
js = f"""// 部首たし算の問題。tools/make-data.py が KanjiVG・KANJIDIC2・JMdict から作る（手で直さない）。
// 字の組み立て：KanjiVG（© Ulrich Apel、CC BY-SA 3.0）。読み・熟語：KANJIDIC2・JMdict（© EDRDG、CC BY-SA 4.0）。このファイルは CC BY-SA 4.0。
// 1問 = [答え, 難しさ(0やさしい 1ふつう 2むずかしい 3部品3つ), [部品], [まちがいの札×5], [まちがいの札の組み立て], 音読み, 訓読み, 熟語, 熟語の読み]
window.BT_DATA = {{ RN: {json.dumps(RN, ensure_ascii=False)}, P: [
{lines}
] }};
"""
open("data.js", "w").write(js)
# QA が「答えが1つ」を確かめ直すための、常用漢字の組み立て（2つ・3つの部品）すべて（画面では使わない）
with open("tools/parts.txt", "w") as f:
    f.write("# 常用漢字の組み立て。KanjiVG（© Ulrich Apel、CC BY-SA 3.0）から tools/make-data.py が作る（手で直さない）。字<TAB>部品（空白区切り）\n")
    for k in sorted(two):
        f.write(f"{k}\t{' '.join(two[k])}\n")
    for k in sorted(three):
        for t in sorted(set(three[k])):
            f.write(f"{k}\t{' '.join(t)}\n")
