// どっちが起きやすい？：2つのできごとのうち、起きやすいほうを選ぶ。答えは全部ここで数えて決める（手で書いた確率は無い）。
// できごと（EV）は「場面」と「できごと」の組。数え方は、出方を全部並べて数える（さいころ・コイン・玉・トランプ・くじ・じゃんけん）か、
// 「1回も○○が出ない」を全体から引く式（何回も振る・誕生日）。分数は BigInt で正確に比べる（誕生日だけは小数）。
(function (root) {
  "use strict";
  const LV = ["やさしい", "ふつう", "むずかしい"];
  const AREAS = ["さいころ", "コイン", "玉とくじ", "トランプ", "じゃんけん", "何回も・何人も"];
  const big = (n) => BigInt(n);
  const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };

  // 出方を全部作る（each：1回ぶんの出方の一覧、times：回数）
  const prod = (each, times) => { let out = [[]]; for (let i = 0; i < times; i++) out = out.flatMap((o) => each.map((x) => [...o, x])); return out; };
  // もどさずに k 個取り出す出方（順番も区別する）
  const draws = (items, k) => { if (k === 0) return [[]]; const out = []; items.forEach((x, i) => { for (const r of draws([...items.slice(0, i), ...items.slice(i + 1)], k - 1)) out.push([x, ...r]); }); return out; };
  const D6 = [1, 2, 3, 4, 5, 6], HT = ["表", "裏"], JK = ["グー", "チョキ", "パー"];
  const SUITS = ["♠", "♥", "♦", "♣"], RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const DECK = SUITS.flatMap((s) => RANKS.map((r) => ({ s, r, red: s === "♥" || s === "♦", face: r === "J" || r === "Q" || r === "K" })));
  const dieStr = (o) => "(" + o.join(",") + ")";

  const EV = [], BY = {};
  // space：出方の一覧、ok：できごとの決まり、show：数え方の説明に出方を並べるときの書き方（少ないときだけ並べる）
  function add(e) { if (BY[e.id]) throw new Error("同じ id " + e.id); EV.push(e); BY[e.id] = e; return e; }
  function count(id, fam, tier, ctx, text, space, ok, total, show, pic) {
    const fav = space.filter(ok), n = big(fav.length), d = big(space.length);
    let how = `${total}。そのうち「${text}」は ${fav.length}通り`;
    if (show && fav.length <= 6) how += `（${fav.map(show).join("・")}）`;
    add({ id, fam, tier, ctx, text, n, d, how: how + "。", tot: total + "。", pic, space, ok });
  }

  // ---- さいころ1つ ----
  {
    const c = "さいころを1つ振る", T = "出る目は 1〜6 の6通り", sp = D6.map((x) => [x]);
    const E = [["s1", "1の目が出る", (o) => o[0] === 1], ["s6", "6の目が出る", (o) => o[0] === 6], ["sev", "偶数の目が出る", (o) => o[0] % 2 === 0], ["sod", "奇数の目が出る", (o) => o[0] % 2 === 1],
      ["sm3", "3の倍数の目が出る", (o) => o[0] % 3 === 0], ["sg5", "5以上の目が出る", (o) => o[0] >= 5], ["sg3", "3以上の目が出る", (o) => o[0] >= 3], ["sn6", "6以外の目が出る", (o) => o[0] !== 6], ["s16", "1か6の目が出る", (o) => o[0] === 1 || o[0] === 6], ["sl4", "4以下の目が出る", (o) => o[0] <= 4]];
    for (const [id, t, ok] of E) count(id, 0, 0, c, t, sp, ok, T, (o) => String(o[0]), "🎲");
  }
  // ---- さいころ2つ ----
  {
    const c = "さいころを2つ振る", T = "2つの目の出方は 6×6＝36通り", sp = prod(D6, 2), sum = (o) => o[0] + o[1];
    for (const s of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) count("w" + s, 0, 1, c, `出た目の和が${s}`, sp, (o) => sum(o) === s, T, dieStr, "🎲🎲");
    const E = [["wzr", "ゾロ目（2つが同じ目）", (o) => o[0] === o[1]], ["wg10", "出た目の和が10以上", (o) => sum(o) >= 10], ["wl4", "出た目の和が4以下", (o) => sum(o) <= 4], ["wd1", "2つの目の差が1", (o) => Math.abs(o[0] - o[1]) === 1],
      ["wd3", "2つの目の差が3", (o) => Math.abs(o[0] - o[1]) === 3], ["w6a", "少なくとも1つは6の目", (o) => o.includes(6)], ["wev", "2つとも偶数の目", (o) => o.every((x) => x % 2 === 0)], ["wpe", "2つの目をかけると偶数", (o) => (o[0] * o[1]) % 2 === 0],
      ["wg5", "2つとも5以上の目", (o) => o.every((x) => x >= 5)], ["w711", "出た目の和が7か11", (o) => sum(o) === 7 || sum(o) === 11]];
    for (const [id, t, ok] of E) count(id, 0, 1, c, t, sp, ok, T, dieStr, "🎲🎲");
  }
  // ---- さいころ3つ ----
  {
    const c = "さいころを3つ振る", T = "3つの目の出方は 6×6×6＝216通り", sp = prod(D6, 3), sum = (o) => o[0] + o[1] + o[2];
    for (const s of [3, 4, 6, 9, 10, 11, 12, 15]) count("t" + s, 0, 2, c, `出た目の和が${s}`, sp, (o) => sum(o) === s, T, dieStr, "🎲🎲🎲");
    const E = [["tzr", "3つとも同じ目", (o) => o[0] === o[1] && o[1] === o[2]], ["tdf", "3つともちがう目", (o) => new Set(o).size === 3], ["t6a", "少なくとも1つは6の目", (o) => o.includes(6)], ["tg10", "出た目の和が10以下", (o) => sum(o) <= 10], ["tpr", "ちょうど2つが同じ目", (o) => new Set(o).size === 2]];
    for (const [id, t, ok] of E) count(id, 0, 2, c, t, sp, ok, T, dieStr, "🎲🎲🎲");
  }
  // ---- コイン ----
  for (const k of [2, 3, 4]) {
    const c = `コインを${k}枚投げる`, T = `表と裏の出方は ${Array(k).fill(2).join("×")}＝${2 ** k}通り`, sp = prod(HT, k), h = (o) => o.filter((x) => x === "表").length, tier = k === 2 ? 0 : 1;
    const show = (o) => o.join("");
    for (let j = 0; j <= k; j++) count(`c${k}h${j}`, 1, tier, c, j === 0 ? "全部が裏" : j === k ? "全部が表" : `表がちょうど${j}枚`, sp, (o) => h(o) === j, T, show, "🪙".repeat(Math.min(k, 3)));
    count(`c${k}a`, 1, tier, c, "少なくとも1枚は表", sp, (o) => h(o) >= 1, T, show, "🪙".repeat(Math.min(k, 3)));
    count(`c${k}s`, 1, tier, c, "全部が同じ面", sp, (o) => h(o) === 0 || h(o) === k, T, show, "🪙".repeat(Math.min(k, 3)));
    if (k > 2) count(`c${k}m`, 1, tier, c, "表が裏より多い", sp, (o) => h(o) * 2 > k, T, show, "🪙".repeat(Math.min(k, 3)));
  }
  // ---- 玉（1個取り出す・2個取り出す）----
  for (const [r, w] of [[1, 1], [1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [1, 4], [4, 1], [2, 5], [3, 4], [3, 7], [2, 8], [5, 3]]) {
    const balls = [...Array(r).fill("赤"), ...Array(w).fill("白")];
    count(`b${r}${w}`, 2, 0, `袋に 赤い玉${r}個・白い玉${w}個。1個取り出す`, "赤い玉が出る", balls.map((x) => [x]), (o) => o[0] === "赤", `玉は全部で${r + w}個。どれが出るのも同じくらい`, null, "🔴⚪");
  }
  for (const [r, w] of [[2, 2], [3, 2], [2, 3], [3, 3], [4, 2], [2, 4]]) {
    const balls = [...Array(r).fill(0).map((_, i) => "赤" + (i + 1)), ...Array(w).fill(0).map((_, i) => "白" + (i + 1))], sp = draws(balls, 2), n = r + w;
    const c = `袋に 赤い玉${r}個・白い玉${w}個。2個取り出す（もどさない）`, T = `1個目は${n}通り、2個目は残りの${n - 1}通りで ${n}×${n - 1}＝${n * (n - 1)}通り`;
    count(`p${r}${w}r`, 2, 1, c, "2個とも赤い玉", sp, (o) => o.every((x) => x[0] === "赤"), T, null, "🔴🔴");
    count(`p${r}${w}x`, 2, 1, c, "赤と白が1個ずつ", sp, (o) => o[0][0] !== o[1][0], T, null, "🔴⚪");
  }
  // ---- くじ（10本）----
  for (const k of [1, 2, 3, 4, 5]) {
    const lots = [...Array(k).fill(0).map((_, i) => "当" + i), ...Array(10 - k).fill(0).map((_, i) => "外" + i)];
    count(`k${k}`, 2, 0, `10本のうち 当たりが${k}本のくじを1回引く`, "当たる", lots.map((x) => [x]), (o) => o[0][0] === "当", "くじは全部で10本。どれを引くのも同じくらい", null, "🎫");
    if (k >= 2 && k <= 4) {
      const sp = draws(lots, 2), c = `10本のうち 当たりが${k}本のくじを2回引く（引いたくじはもどさない）`, T = "1回目は10通り、2回目は残りの9通りで 10×9＝90通り";
      count(`k${k}a`, 2, 1, c, "少なくとも1回は当たる", sp, (o) => o.some((x) => x[0] === "当"), T, null, "🎫🎫");
      count(`k${k}b`, 2, 1, c, "2回とも当たる", sp, (o) => o.every((x) => x[0] === "当"), T, null, "🎫🎫");
      const sp2 = prod(lots, 2), c2 = `10本のうち 当たりが${k}本のくじを2回引く（引いたくじはもどす）`, T2 = "1回目も2回目も10通りで 10×10＝100通り";
      count(`k${k}ra`, 2, 1, c2, "少なくとも1回は当たる", sp2, (o) => o.some((x) => x[0] === "当"), T2, null, "🎫🎫");
    }
  }
  // ---- トランプ ----
  {
    const c = "トランプ52枚（ジョーカーなし）から1枚引く", T = "カードは ♠♥♦♣ の4種類×13枚＝52枚", sp = DECK.map((x) => [x]);
    const E = [["dh", "ハート（♥）が出る", (o) => o[0].s === "♥"], ["dr", "赤いカード（♥か♦）が出る", (o) => o[0].red], ["df", "絵札（J・Q・K）が出る", (o) => o[0].face], ["da", "エース（A）が出る", (o) => o[0].r === "A"], ["dhf", "ハートの絵札が出る", (o) => o[0].s === "♥" && o[0].face],
      ["d7", "7のカードが出る", (o) => o[0].r === "7"], ["dha", "ハートかエースが出る", (o) => o[0].s === "♥" || o[0].r === "A"], ["dbf", "黒い絵札（♠か♣）が出る", (o) => !o[0].red && o[0].face], ["dnum", "2〜10の数字のカードが出る", (o) => !o[0].face && o[0].r !== "A"], ["dsa", "スペードのエースが出る", (o) => o[0].s === "♠" && o[0].r === "A"],
      ["dg10", "10・J・Q・K のどれかが出る", (o) => o[0].face || o[0].r === "10"]];
    for (const [id, t, ok] of E) count(id, 3, 0, c, t, sp, ok, T, (o) => o[0].s + o[0].r, "🃏");
  }
  // ---- じゃんけん（手はグー・チョキ・パーを同じくらいの割合で出す）----
  for (const m of [2, 3, 4]) {
    const sp = prod(JK, m), c = `${m}人で1回じゃんけんする`, T = `手の出し方は ${Array(m).fill(3).join("×")}＝${3 ** m}通り`, kinds = (o) => new Set(o).size, tier = m === 4 ? 2 : 1;
    const draw = (o) => kinds(o) !== 2; // 全員同じ手か、3つの手がそろうと、あいこ
    const win = (o) => { if (draw(o)) return []; const [a, b] = [...new Set(o)]; const beats = (x, y) => (x === "グー" && y === "チョキ") || (x === "チョキ" && y === "パー") || (x === "パー" && y === "グー"); const w = beats(a, b) ? a : b; return o.map((x, i) => (x === w ? i : -1)).filter((i) => i >= 0); };
    count(`j${m}d`, 4, tier, c, "あいこになる", sp, draw, T, m === 2 ? (o) => o.join("と") : null, "✊✌️✋");
    count(`j${m}w`, 4, tier, c, "勝ち負けが決まる", sp, (o) => !draw(o), T, null, "✊✌️✋");
    if (m >= 3) count(`j${m}o`, 4, tier, c, "1人だけが勝つ", sp, (o) => win(o).length === 1, T, null, "✊✌️✋");
    count(`j${m}a`, 4, m === 2 ? 0 : tier, c, "自分が勝つ（1人だけでなくてもよい）", sp, (o) => win(o).includes(0), T, m === 2 ? (o) => o.join("と") : null, "✊✌️✋");
  }
  // ---- 何回も振る：少なくとも1回は6 ＝ 全体 −「1回も6が出ない」----
  for (const k of [2, 3, 4, 6]) {
    const d = 6n ** big(k), n = d - 5n ** big(k);
    add({ id: `r${k}`, fam: 5, tier: 2, ctx: `さいころを${k}回振る`, text: "少なくとも1回は6の目が出る", n, d, pic: "🎲🔁",
      tot: `出方は全部で 6を${k}回かけた ${d}通り。「1回も6が出ない」のほうが数えやすい。`,
      how: `出方は全部で 6を${k}回かけた ${d}通り。1回も6が出ないのは 5を${k}回かけた ${5n ** big(k)}通り。だから ${d}−${5n ** big(k)}＝${n}通り。`,
      sample: (R) => { for (let i = 0; i < k; i++) if (Math.floor(R() * 6) === 5) return true; return false; } });
  }
  {
    const d = 36n ** 24n, n = d - 35n ** 24n;
    add({ id: "r24", fam: 5, tier: 2, ctx: "さいころ2つを24回振る", text: "少なくとも1回は6のゾロ目が出る", n, d, pic: "🎲🎲🔁",
      tot: "1回で6のゾロ目になるのは36通りのうち1通り。「24回とも6のゾロ目にならない」を考える。",
      how: "1回で6のゾロ目にならないのは36通りのうち35通り。24回とも6のゾロ目にならない確率は（35/36）を24回かけた数で、それを1から引く。",
      sample: (R) => { for (let i = 0; i < 24; i++) if (Math.floor(R() * 6) === 5 && Math.floor(R() * 6) === 5) return true; return false; } });
  }
  // ---- 誕生日：少なくとも1組 ＝ 1 −「全員ちがう誕生日」（1年は365日とする・どの日も同じくらい）----
  for (const k of [5, 10, 15, 20, 23, 30, 40, 50]) {
    let q = 1; for (let i = 0; i < k; i++) q *= (365 - i) / 365;
    add({ id: `y${k}`, fam: 5, tier: 2, ctx: `${k}人が集まる（1年は365日とする）`, text: "誕生日が同じ人が少なくとも1組いる", p: 1 - q, pic: "🎂",
      tot: "「全員の誕生日がちがう」確率を考えて、1から引く。人が多いほど、同じ誕生日の組は一気にふえる。",
      how: `全員の誕生日がちがう確率は 365/365 × 364/365 × … と${k}人ぶんかけて 約${(q * 100).toFixed(1)}%。それを1から引く。`,
      sample: (R) => { const seen = new Set(); for (let i = 0; i < k; i++) { const b = Math.floor(R() * 365); if (seen.has(b)) return true; seen.add(b); } return false; } });
  }

  // ---- 確率の値と比べ方 ----
  for (const e of EV) {
    if (e.n != null) { const g = gcd(e.n, e.d); e.rn = e.n / g; e.rd = e.d / g; e.p = Number(e.n * 1000000n / e.d) / 1000000; }
    if (!e.sample) { const sp = e.space, ok = e.ok; e.sample = (R) => ok(sp[Math.floor(R() * sp.length)]); }
  }
  // a と b を比べる：1＝a が起きやすい、0＝同じ、−1＝b が起きやすい
  const cmp = (a, b) => { if (a.n != null && b.n != null) { const x = a.n * b.d, y = b.n * a.d; return x > y ? 1 : x < y ? -1 : 0; } return a.p > b.p ? 1 : a.p < b.p ? -1 : 0; };
  const pct = (e) => { const v = e.p * 100; return v >= 99.95 ? "ほぼ100%" : v < 0.05 ? "0.1%未満" : `約${v < 10 ? v.toFixed(1) : Math.round(v)}%`; };
  const frac = (e) => (e.rn != null && e.rd <= 10000n ? `${e.rn}/${e.rd}` : null);

  // ---- 種から決まる乱数（だれでも同じ問題）----
  function seedOf(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffled(arr, R) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // ---- 問題（2つのできごとの組）。難しさごとに、比べやすさで分ける ----
  // やさしい：同じ場面か同じ種類の、ちがいがはっきりした組（1.5倍以上）か、ちょうど同じ組
  // ふつう：少しむずかしい場面をふくみ、1.15〜2倍のちがいか、ちょうど同じ組
  // むずかしい：むずかしい場面をふくむか、ちがう種類どうし。ちがいは1.02〜1.3倍か、ちょうど同じ
  const ratio = (a, b) => { const [x, y] = a.p >= b.p ? [a, b] : [b, a]; return y.p === 0 ? Infinity : x.p / y.p; };
  function levelOf(a, b) {
    if (a.ctx === b.ctx && a.text === b.text) return -1;
    if (a.p <= 0 || b.p <= 0 || a.p >= 1 || b.p >= 1) return -1;
    const c = cmp(a, b), r = ratio(a, b), t = Math.max(a.tier, b.tier), sameFam = a.fam === b.fam;
    if (c === 0 && a.ctx === b.ctx && (a.fam === 1 || a.id.length < 3)) { /* 同じ場面のちょうど同じ組（表がちょうど1枚と3枚など）も、やさしい・ふつうで出す */ }
    if (t === 0 && sameFam && (c === 0 || r >= 1.5)) return 0;
    if (t === 1 && (sameFam || Math.min(a.tier, b.tier) >= 1) && (c === 0 || (r >= 1.15 && r <= 2))) return 1;
    if (t === 2 || !sameFam) { if (c === 0 && !sameFam) return 2; if (c !== 0 && r >= 1.02 && r <= 1.3 && (t === 2 || Math.min(a.tier, b.tier) >= 1)) return 2; if (c === 0 && t === 2) return 2; }
    return -1;
  }
  const CAP = [70, 140, 160], EQ = [0.2, 0.2, 0.25]; // 難しさごとの問題の数と、「同じ」が答えの問題の割合
  const QS = [], QBY = {}, POOL = [[], [], []];
  {
    const cand = [[], [], []];
    for (let i = 0; i < EV.length; i++) for (let j = i + 1; j < EV.length; j++) { const lv = levelOf(EV[i], EV[j]); if (lv >= 0) cand[lv].push([EV[i], EV[j]]); }
    for (let lv = 0; lv < 3; lv++) {
      const R = rng(seedOf("bank" + lv)), all = shuffled(cand[lv], R), eq = all.filter(([a, b]) => cmp(a, b) === 0), ne = all.filter(([a, b]) => cmp(a, b) !== 0);
      const nEq = Math.min(eq.length, Math.round(CAP[lv] * EQ[lv])), pick = [...eq.slice(0, nEq), ...ne.slice(0, CAP[lv] - nEq)];
      // できごとが偏らないよう、まだ使っていないできごとの組を先に選ぶ
      const used = new Map(), out = [];
      const score = ([a, b]) => (used.get(a.id) || 0) + (used.get(b.id) || 0);
      const rest = [...eq.slice(0, Math.max(nEq * 3, nEq)), ...ne];
      while (out.length < pick.length && rest.length) {
        const wantEq = out.filter(([a, b]) => cmp(a, b) === 0).length < nEq;
        let bi = -1, bs = Infinity;
        for (let x = 0; x < rest.length; x++) { const isEq = cmp(rest[x][0], rest[x][1]) === 0; if (isEq !== wantEq && rest.some(([a, b]) => (cmp(a, b) === 0) === wantEq)) continue; const sc = score(rest[x]); if (sc < bs) { bs = sc; bi = x; if (sc === 0) break; } }
        if (bi < 0) break;
        const [pr] = rest.splice(bi, 1); out.push(pr); for (const e of pr) used.set(e.id, (used.get(e.id) || 0) + 1);
      }
      for (const [a, b] of out) {
        const swap = R() < 0.5, [A, B] = swap ? [b, a] : [a, b], id = A.id + "x" + B.id;
        const q = { id, lv, a: A.id, b: B.id, ans: cmp(A, B) === 1 ? 0 : cmp(A, B) === 0 ? 1 : 2 };
        QS.push(q); QBY[id] = q; POOL[lv].push(id);
      }
    }
  }
  const IDS = EV.filter((e) => QS.some((q) => q.a === e.id || q.b === e.id)).map((e) => e.id); // 手帳に載るできごと（どこかの問題に出るもの）

  // 1問：tag は「難しさ:問題の id|モードと日付…」
  function make(tag) {
    const m = String(tag).match(/^([012]):([a-z0-9]+)\|/); if (!m || !QBY[m[2]]) throw new Error("知らない問題 " + tag);
    const q = QBY[m[2]];
    return { tag, lv: q.lv, id: q.id, A: BY[q.a], B: BY[q.b], ans: q.ans };
  }
  // 答えのあとに出す説明（数え方）
  function facts(P) {
    const fr = (e) => (!frac(e) ? "" : e.n !== e.rn && e.d <= 10000n ? `${e.n}/${e.d}＝${frac(e)}` : frac(e));
    const line = (k, e) => `${k}：${e.how} → ${fr(e) ? fr(e) + "（" + pct(e) + "）" : pct(e)}`;
    const out = [line("A", P.A), line("B", P.B)];
    const c = cmp(P.A, P.B);
    if (c === 0) out.push(P.A.ctx === P.B.ctx ? "数えると、ちょうど同じ数になる。" : "場面はちがっても、確率はちょうど同じ。");
    else { const r = ratio(P.A, P.B); out.push(`${c > 0 ? "A" : "B"}のほうが ${r >= 1.95 ? Math.round(r * 10) / 10 + "倍" : "約" + Math.round((r - 1) * 100) + "%"}起きやすい${r < 1.95 ? "（わずかな差）" : ""}。`); }
    return out;
  }

  // ---- 今日の5問・上級（日本時間の日付から。だれでも同じ）----
  const DAY = 864e5, EPOCH = "2026-11-07";
  const dayMs = (k) => Date.parse(k + "T00:00:00Z");
  const keyOf = (ms) => new Date(ms).toISOString().slice(0, 10);
  const dayIdx = (k) => Math.max(0, Math.round((dayMs(k) - dayMs(EPOCH)) / DAY));
  const DPOOL = POOL;
  const CYC = {};
  function cycle(name, lv, c) {
    const key = name + lv + ":" + c; if (CYC[key]) return CYC[key];
    let a = shuffled(DPOOL[lv], rng(seedOf(name + ":" + lv + ":" + c)));
    // 前の周の後ろ半分は、次の周の後ろ半分へ回す（周のつなぎ目で同じ問題がすぐ戻らない）
    if (c > 0) { const prev = cycle(name, lv, c - 1), tail = new Set(prev.slice(-Math.floor(prev.length / 2))); a = [...a.filter((id) => !tail.has(id)), ...a.filter((id) => tail.has(id))]; }
    return (CYC[key] = a);
  }
  const nth = (name, lv, idx) => cycle(name, lv, Math.floor(idx / DPOOL[lv].length))[idx % DPOOL[lv].length];
  const LVS = [0, 0, 1, 1, 2];
  // その日のほかの問題と、できごとが重ならない問題を選ぶ（重なる問題は次の日へ回す）。並びの問題は一度ずつ使う
  const evOf = (id) => [QBY[id].a, QBY[id].b];
  const SIM = {};
  function simDay(name, lvs, i, avoidOf) {
    const S = SIM[name] || (SIM[name] = { days: [], ptr: [0, 0, 0], wait: [[], [], []] });
    while (S.days.length <= i) {
      const d = S.days.length, used = new Set(avoidOf ? avoidOf(d).flatMap(evOf) : []), out = [];
      const free = (id) => evOf(id).every((e) => !used.has(e));
      for (const lv of lvs) {
        const w = S.wait[lv], wi = w.findIndex(free);
        let id = wi >= 0 ? w.splice(wi, 1)[0] : null;
        for (let g = 0; id == null; g++) { if (g > 4 * DPOOL[lv].length) throw new Error("問題を選べない"); const x = nth(name, lv, S.ptr[lv]++); if (free(x)) id = x; else w.push(x); }
        for (const e of evOf(id)) used.add(e); out.push([lv, id]);
      }
      S.days.push(out);
    }
    return S.days[i];
  }
  const dayPick = (i) => simDay("day", LVS, i);
  const hardPick = (i) => simDay("hard", [2, 2, 2], i, (d) => dayPick(d).map((o) => o[1]));
  const dailyTags = (k) => dayPick(dayIdx(k)).map(([lv, id]) => `${lv}:${id}|d${k}`);
  const hardTags = (k) => hardPick(dayIdx(k)).map(([lv, id]) => `${lv}:${id}|h${k}`);

  const API = { LV, AREAS, EV, BY, IDS, QS, QBY, POOL, DPOOL, cmp, pct, frac, ratio, levelOf, seedOf, rng, shuffled, make, facts, dailyTags, hardTags, dayIdx, EPOCH, dayMs, keyOf, prod, draws };
  if (typeof module === "object" && module.exports) module.exports = API;
  root.KAKURITSU = API;
})(typeof window !== "undefined" ? window : globalThis);
