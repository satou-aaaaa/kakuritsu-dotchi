// どっちが起きやすい？の検査。できごとの確率（別の式で数え直す・何万回くり返す）・問題の作り方（難しさの決まり・「同じ」の割合）・
// 今日の5問と上級の組み方（3年分）・通しで遊ぶ・まちがい・ヒント・続きから・上級・練習・とことん・確率の手帳・実績・カレンダー・あとから・
// 古いタブ・スマホ幅・PWA・引き継ぎコード・見やすさを確かめる。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { checkTransfer } from "./transfer-check.mjs";
import { checkSwStall } from "./sw-check.mjs";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail: String(detail).slice(0, 400) });
const req = createRequire(import.meta.url);
const G = req(path.join(root, "game.js"));
const idOf = (t) => t.split("|")[0].split(":")[1];

// ---- 1. できごとの確率を、game.js とは別の式で数え直す（ブラウザを使わない）----
// 分数は [分子, 分母]（BigInt）。誕生日だけは小数
const B = (x) => BigInt(x);
const C = (n, k) => { if (k < 0 || k > n) return 0n; let r = 1n; for (let i = 0; i < k; i++) r = (r * B(n - i)) / B(i + 1); return r; };
const fr = (n, d) => [B(n), B(d)];
const one = (n, d) => [B(d) - B(n), B(d)]; // 1 − n/d
const pw = (a, k) => B(a) ** B(k);
// 3つのさいころの和が s になる出方（包除原理）
const dice3 = (s) => { let t = 0n; for (let k = 0; k <= 3; k++) { const m = s - 6 * k - 1; if (m >= 2) t += (k % 2 ? -1n : 1n) * C(3, k) * C(m, 2); } return t; };
function formula(id) {
  let m;
  const S1 = { s1: 1, s6: 1, sev: 3, sod: 3, sm3: 2, sg5: 2, sg3: 4, sn6: 5, s16: 2, sl4: 4 };
  if (id in S1) return fr(S1[id], 6);
  const W = { wzr: 6, wg10: 6, wl4: 6, wd1: 10, wd3: 6, w6a: 11, wev: 9, wpe: 27, wg5: 4, w711: 8 };
  if (id in W) return fr(W[id], 36);
  if ((m = id.match(/^w(\d+)$/))) return fr(6 - Math.abs(+m[1] - 7), 36);
  if ((m = id.match(/^t(\d+)$/))) return [dice3(+m[1]), 216n];
  const T = { tzr: 6, tdf: 6 * 5 * 4, t6a: 216 - 125, tpr: 3 * 6 * 5 };
  if (id in T) return fr(T[id], 216);
  if (id === "tg10") { let n = 0n; for (let s = 3; s <= 10; s++) n += dice3(s); return [n, 216n]; }
  if ((m = id.match(/^c(\d)h(\d)$/))) return [C(+m[1], +m[2]), pw(2, +m[1])];
  if ((m = id.match(/^c(\d)a$/))) return one(1, pw(2, +m[1]));
  if ((m = id.match(/^c(\d)s$/))) return [2n, pw(2, +m[1])];
  if ((m = id.match(/^c(\d)m$/))) { const k = +m[1]; let n = 0n; for (let j = Math.floor(k / 2) + 1; j <= k; j++) n += C(k, j); return [n, pw(2, k)]; }
  if ((m = id.match(/^b(\d)(\d)$/))) return fr(+m[1], +m[1] + +m[2]);
  if ((m = id.match(/^p(\d)(\d)([rx])$/))) { const r = +m[1], w = +m[2], n = r + w; return m[3] === "r" ? [C(r, 2), C(n, 2)] : [B(r * w), C(n, 2)]; }
  if ((m = id.match(/^k(\d)$/))) return fr(+m[1], 10);
  if ((m = id.match(/^k(\d)a$/))) return one(Number(C(10 - +m[1], 2)), Number(C(10, 2)));
  if ((m = id.match(/^k(\d)b$/))) return [C(+m[1], 2), C(10, 2)];
  if ((m = id.match(/^k(\d)ra$/))) return one((10 - +m[1]) ** 2, 100);
  const D = { dh: 13, dr: 26, df: 12, da: 4, dhf: 3, d7: 4, dha: 16, dbf: 6, dnum: 36, dsa: 1, dg10: 16 };
  if (id in D) return fr(D[id], 52);
  if ((m = id.match(/^j(\d)([dwoa])$/))) {
    const k = +m[1], all = pw(3, k), dec = 3n * (pw(2, k) - 2n); // 勝ち負けが決まる＝出た手がちょうど2種類
    return { d: [all - dec, all], w: [dec, all], o: [B(3 * k), all], a: [pw(2, k - 1) - 1n, pw(3, k - 1)] }[m[2]];
  }
  if ((m = id.match(/^r(\d+)$/)) && +m[1] < 10) return [pw(6, +m[1]) - pw(5, +m[1]), pw(6, +m[1])];
  if (id === "r24") return [pw(36, 24) - pw(35, 24), pw(36, 24)];
  if ((m = id.match(/^y(\d+)$/))) { let lg = 0; for (let i = 1; i < +m[1]; i++) lg += Math.log1p(-i / 365); return 1 - Math.exp(lg); }
  return null;
}
{
  const bad = [], none = [];
  for (const e of G.EV) {
    const f = formula(e.id);
    if (f == null) { none.push(e.id); continue; }
    if (typeof f === "number") { if (e.n != null || Math.abs(e.p - f) > 1e-9) bad.push(`${e.id} ${e.p}/${f}`); continue; }
    if (e.n == null || e.n * f[1] !== f[0] * e.d) bad.push(`${e.id} ${e.n}/${e.d} と ${f[0]}/${f[1]}`);
  }
  check(`できごと（${G.EV.length}）の確率を、組み合わせの数・余事象などの別の式で数え直すと全部同じ`, bad.length === 0 && none.length === 0, [...bad, ...none.map((x) => "式なし " + x)].slice(0, 5).join(" / "));
  check("できごとの id・場面と文の組は重ならない・どれも 0 と 1 の間", new Set(G.EV.map((e) => e.id)).size === G.EV.length && new Set(G.EV.map((e) => e.ctx + "|" + e.text)).size === G.EV.length && G.EV.every((e) => e.p > 0 && e.p < 1 && /^[a-z0-9]+$/.test(e.id)));
  // 何万回くり返して、確率に近いか（「100回ためす」の作り方が正しいか）
  const R = G.rng(12345), N = 20000, far = [];
  for (const e of G.EV) { let n = 0; for (let i = 0; i < N; i++) if (e.sample(R)) n++; const sd = Math.sqrt((e.p * (1 - e.p)) / N); if (Math.abs(n / N - e.p) > 5 * sd + 1e-3) far.push(`${e.id} ${(n / N).toFixed(3)}/${e.p.toFixed(3)}`); }
  check(`「100回ためす」の作り方：どのできごとも2万回くり返すと確率に近い（5σ以内）`, far.length === 0, far.slice(0, 5).join(" / "));
  check("有名な問題が入っている：さいころ3つの和9と10（25/216・27/216）・6のゾロ目24回（50%に少し足りない）・23人の誕生日（50%をこえる）", G.BY.t9.n === 25n && G.BY.t10.n === 27n && G.BY.r24.p < 0.5 && G.BY.r24.p > 0.49 && G.BY.y23.p > 0.5 && G.BY.y23.p < 0.51);
}
{
  // 問題：難しさの決まり・答え・「同じ」の割合
  const bad = [], eq = [0, 0, 0], sides = [0, 0, 0];
  for (const q of G.QS) {
    const A = G.BY[q.a], Bv = G.BY[q.b], c = G.cmp(A, Bv), why = [];
    if ((c === 1 ? 0 : c === 0 ? 1 : 2) !== q.ans) why.push("答え");
    if (G.levelOf(A, Bv) !== q.lv && G.levelOf(Bv, A) !== q.lv) why.push("難しさ");
    const r = G.ratio(A, Bv);
    if (c !== 0 && q.lv === 0 && r < 1.5) why.push("やさしいの差");
    if (c !== 0 && q.lv === 1 && (r < 1.15 || r > 2)) why.push("ふつうの差");
    if (c !== 0 && q.lv === 2 && (r < 1.02 || r > 1.3)) why.push("むずかしいの差");
    if (c !== 0 && Math.abs(A.p - Bv.p) < 1e-6) why.push("差が小さすぎる");
    if (q.a === q.b || A.ctx + A.text === Bv.ctx + Bv.text) why.push("同じできごと");
    if (q.id !== q.a + "x" + q.b || !/^[a-z0-9]+$/.test(q.id)) why.push("id");
    if (why.length) bad.push(q.id + " " + why.join("・"));
    if (q.ans === 1) eq[q.lv]++; sides[q.ans]++;
  }
  check(`問題（${G.QS.length}）：答えは分数で比べた向き・難しさごとの差の決まり（やさしい1.5倍以上・ふつう1.15〜2倍・むずかしい1.02〜1.3倍、または同じ）`, bad.length === 0, bad.slice(0, 5).join(" / "));
  const n = G.POOL.map((p) => p.length);
  check("問題の数：やさしい50以上・ふつう100以上・むずかしい100以上。「同じ」が答えの問題は各難しさで1〜3割", n[0] >= 50 && n[1] >= 100 && n[2] >= 100 && eq.every((x, lv) => x / n[lv] >= 0.1 && x / n[lv] <= 0.3), `${n} 同じ${eq}`);
  check("答えが A の問題と B の問題はどちらも3割以上（いつも同じ側にしない）", sides[0] / G.QS.length > 0.3 && sides[2] / G.QS.length > 0.3, String(sides));
  const used = new Set(G.QS.flatMap((q) => [q.a, q.b]));
  check(`できごとの9割以上が問題に出る・6つの場面すべてが3つの難しさのどこかに出る（手帳に載るのは ${G.IDS.length}）`, used.size >= G.EV.length * 0.9 && G.AREAS.every((_, f) => G.IDS.some((id) => G.BY[id].fam === f)), `${used.size}/${G.EV.length}`);
  const long = [];
  for (const q of G.QS) for (const f of G.facts(G.make(`${q.lv}:${q.id}|q2027-01-01`))) if ([...f].length > 120) long.push(q.id + ":" + f);
  for (const e of G.EV) if ([...e.text].length > 22 || [...e.ctx].length > 40) long.push(e.id);
  check("できごとの文は22字以内・場面は40字以内・説明は1行120字以内（一画面一問）", long.length === 0, long.slice(0, 3).join(" / "));
}
{
  // 今日の5問・上級の組み方（3年分）
  const bad = [], used = new Set();
  const dayOf = (i) => new Date(Date.parse(G.EPOCH) + i * 864e5).toISOString().slice(0, 10);
  for (let i = 0; i < 365 * 3; i++) {
    const d = dayOf(i), dl = G.dailyTags(d), hl = G.hardTags(d), di = dl.map(idOf), hi = hl.map(idOf);
    const ev = (ids) => ids.flatMap((q) => [G.QBY[q].a, G.QBY[q].b]);
    if (dl.length !== 5 || new Set(di).size !== 5 || dl.map((t) => t[0]).join() !== "0,0,1,1,2" || new Set(ev(di)).size !== 10) bad.push(d + " 今日");
    if (hl.length !== 3 || hl.some((t) => t[0] !== "2") || new Set([...ev(di), ...ev(hi)]).size !== 16) bad.push(d + " 上級");
    if (JSON.stringify(dl) !== JSON.stringify(G.dailyTags(d)) || !dl.every((t) => t.endsWith("|d" + d))) bad.push(d + " 同じにならない");
    di.forEach((x) => used.add(x));
  }
  check("今日の5問（やさしい2・ふつう2・むずかしい1、同じできごとは1日に1回）と上級（むずかしい3・今日の5問とできごとを重ねない）を3年分作れる", bad.length === 0, bad.slice(0, 5).join(","));
  const worst = [];
  for (const [nm, f] of [["今日", G.dailyTags], ["上級", G.hardTags]]) for (const lv of [0, 1, 2]) {
    const seq = []; for (let i = 0; i < 365 * 3; i++) for (const t of f(dayOf(i))) if (+t[0] === lv) seq.push(idOf(t));
    if (!seq.length) continue; const n = G.DPOOL[lv].length, last = {}; let gap = Infinity;
    seq.forEach((x, j) => { if (last[x] != null) gap = Math.min(gap, j - last[x]); last[x] = j; });
    if (gap < Math.floor(n / 2) - 5) worst.push(`${nm}${lv}:${gap}/${n}`);
  }
  check("今日の5問・上級は、難しさごとに並びを1周するまで同じ問題を出さない（同じ問題の間は半周以上・3年分）", worst.length === 0, worst.join(","));
  check("3年のうちに、今日の5問で全部の問題が出る", G.POOL.every((p) => p.every((q) => used.has(q))), `${used.size}/${G.QS.length}`);
}

// ---- 2. ファイルの中身 ----
const html = readFileSync(path.join(root, "index.html"), "utf8"), game = readFileSync(path.join(root, "game.js"), "utf8");
const ext = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https:\/\/fonts\.googleapis\.com(\/|$)|^https:\/\/ko-fi\.com\/satouaaaaa$|^https:\/\/www\.mext\.go\.jp\//.test(u));
check("外から読むのは文字（Google Fonts）だけ。スクリプト・広告・解析を入れない（出典のリンクは押したときに開くだけ）", ext.length === 0 && ![...html.matchAll(/<script[^>]+src="([^"]+)"/g)].some((m) => /^https?:/.test(m[1])), ext.join(","));
check("CSP で通信先を自分だけにしている", /connect-src 'self'/.test(html) && !/connect-src[^;"]*https/.test(html));
check("Math.random は練習・とことんの並び・回の名札・100回ためすだけ（今日の5問・上級は日付の乱数。game.js には無い）", (html.match(/Math\.random/g) || []).length === 3 && !/Math\.random/.test(game.replace(/^\s*\/\/.*$/gm, "")));
check("乱数は sort の比較の中で引かない（ブラウザで引く回数が変わる）", !/\.sort\(\s*\([^)]*\)\s*=>[^\n;]*\b(R|rng|rand|Math\.random)\s*\(/.test(html + game));
check("一行の式の途中にコメント // を足さない（行の残りが消える。rosen-hitofude 2026-11-04）", !/;\s*\/\/[^\n]*;\s*\w/.test(game.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n")));
check("画面にお笑いの言葉を入れない（本物っぽく）", !/お笑い|ギャグ|ツッコミ|なんでやねん|（うそ）/.test(html));
check("賭けごとをすすめる言葉を入れない（パチンコ・競馬・宝くじを買う など）", !/パチンコ|競馬|競輪|カジノ|宝くじを買|賭けよう|もうかる/.test(html + game));
check("チケット・回数制限・🔒で開くモードを入れない", !/🎫|🔒|チケット|あと\d+回|すると開く/.test(html));
check("このゲームについて：学習指導要領（文部科学省）の出典と、答えは数えて決めていること・賭けごとの予想ではないこと", ["文部科学省", "学習指導要領", "数えるか式で計算", "賭けごと"].every((w) => html.includes(w)));
check("引き継ぎ：transfer.js をゲームの script より前に、このゲームの記録のキーだけで読む", /<script src="transfer\.js" data-game="kakuritsu-dotchi" data-keys="kakuritsu-v1"><\/script>\s*<\/head>/.test(html) && html.indexOf('src="transfer.js"') < html.indexOf('src="game.js"') && /data-hk/.test(html) && existsSync(path.join(root, "transfer.js")));
{ const og = (k) => (html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`)) || [])[1] || "";
  const png = readFileSync(path.join(root, "og.png"));
  check("SNS で貼ると絵と題が出る（OGP・1200×630・絶対URL）", og("og:title") && og("og:description") && og("og:image") === "https://satou-aaaaa.github.io/kakuritsu-dotchi/og.png" && og("twitter:card") === "summary_large_image" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630); }
{ const fy = readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8");
  check("感想フォームの name が3字以上（2字だとフォームが出ない。shared-workflows incidents/2026-11-05-feedback-form-not-shown.md）", [...((fy.match(/^name:\s*(.+)$/m) || [])[1] || "").trim()].length >= 3);
  check("感想フォームは名前・メールを聞かない", /id: fun/.test(fy) && !/id: (name|email|mail)/.test(fy) && /labels: \["感想"\]/.test(fy)); }
check("README の URL のすぐ後ろに全角の字を続けない（Link check が URL の一部と読む）", !/https?:\/\/[\x21-\x7e]*[^\x00-\x7f]/.test(readFileSync(path.join(root, "README.md"), "utf8").replace(/\]\(https?:\/\/[^)\s]+\)/g, "").replace(/<https?:\/\/[^>\s]+>/g, "")));
{ const sw = readFileSync(path.join(root, "sw.js"), "utf8"), mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  const shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1]);
  check("PWA：sw.js は画面のファイルを全部保存し（引き継ぎの transfer.js も）、外へ何も送らない", ["./index.html", "./game.js", "./transfer.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"].every((f) => shell.includes(f) && existsSync(path.join(root, f))) && shell.every((f) => f === "./" || existsSync(path.join(root, f))) && !/https?:\/\//.test(sw.replace(/^\/\/.*$/gm, "")));
  check("PWA：入れるときはブラウザの保存を通さず取り直す（cache: \"reload\"。古い版が残らない）", /new Request\(u, \{ cache: "reload" \}\)/.test(sw));
  check("PWA：manifest にアイコン2つと名前がある", mf.name === "どっちが起きやすい？" && mf.icons.length >= 2 && mf.start_url === "./");
  check("PWA：maskable は字が切れないよう専用の絵（icon-maskable-512.png、中を縮めた絵）を使う", mf.icons.filter((i) => /maskable/.test(i.purpose || "")).every((i) => i.src === "icon-maskable-512.png") && existsSync(path.join(root, "icon-maskable-512.png")));
  const st = await checkSwStall(sw);
  check("PWA：通信が途中で止まっても、4秒ほどで保存した画面に切りかえる（ふつうの通信はネットの返事のまま。shared-workflows template/qa/sw-check.mjs）", st.ok, `${st.stalled}/${st.normal}`);
  {
    // このゲームの sw.js の戻り方（時間は100分の1）：? 付きは同じ URL の保存を先に使う・通信も保存の読み出しも止まったら60秒で Response.error()
    const swRun = (match) => { const L = {}; const ctx = { self: { addEventListener: (t, f) => (L[t] = f), location: { origin: "https://x.test" } }, caches: { match, open: async () => ({ put: async () => {} }) },
      fetch: async () => new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode("half")); } }), { status: 200 }),
      setTimeout: (f, ms) => setTimeout(f, ms / 100), clearTimeout, URL, Request, Response, Promise };
      vm.createContext(ctx); vm.runInContext(sw, ctx);
      return (url, lim) => Promise.race([new Promise((ok) => L.fetch({ request: { method: "GET", url, mode: "navigate" }, waitUntil() {}, respondWith: (pr) => pr.then(ok) })), new Promise((ok) => setTimeout(() => ok("timeout"), lim))]); };
    const exact = await swRun(async (rq, o) => new Response(o && o.ignoreSearch ? "loose" : String(rq.url).includes("?v=2") ? "exact" : "", { status: 200 }))("https://x.test/index.html?v=2", 200);
    const t0 = Date.now(), none = await swRun(() => new Promise(() => {}))("https://x.test/index.html", 1500), dt = Date.now() - t0;
    check("PWA：? 付きの URL は同じ URL の保存を先に使い、通信も保存の読み出しも止まったら60秒で Response.error() を返す", exact !== "timeout" && (await exact.text()) === "exact" && none !== "timeout" && none.type === "error" && dt >= 550 && dt < 1000, `${exact === "timeout" ? exact : "ok"}・${none === "timeout" ? none : none.type}・${dt}ms`);
  } }

// ---- 3. ブラウザで遊ぶ ----
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = createServer((rq, res) => {
  const p = decodeURIComponent(new URL(rq.url, "http://x").pathname), f = path.join(root, p === "/" ? "index.html" : p);
  if ((f !== root && !f.startsWith(root + path.sep)) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(readFileSync(f));
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
// 「今日」をずらして遊ぶ（第1回の日から日がたっていなくても、あとから・カレンダーを確かめる）。QA_SHIFT_DAYS で変えられる
const SHIFT = +(process.env.QA_SHIFT_DAYS || 10);
const TODAY = new Date(Date.now() + SHIFT * 864e5 + 9 * 3600e3).toISOString().slice(0, 10);
// 検査の間に日本時間の0時をまたがないよう、ブラウザの時刻は TODAY の正午（日本時間）から進める
const NOON = Date.parse(TODAY + "T03:00:00Z");
const dayBefore = (n) => new Date(Date.parse(TODAY) - n * 864e5).toISOString().slice(0, 10);
async function newPage(w = 390, ctx) {
  const c = ctx || await browser.newContext({ viewport: { width: w, height: 800 } });
  if (!ctx) await shift(c);
  await c.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/ERR_FAILED|net::/.test(m.text())) errors.push(m.text()); });
  await p.goto(url); await p.waitForTimeout(200);
  return p;
}
const T0 = Date.now();
const shift = (c) => c.addInitScript((ms) => { const n = Date.now; Date.now = () => n() + ms; }, NOON - T0);
const closeHow = async (p) => { if (await p.locator("#howto[open]").count()) await p.click("#howto-ok"); };
const mem = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("kakuritsu-v1") || "{}"));
const ansOf = (p) => p.evaluate(() => __kd.cur().P.ans);
async function solve(p, { wrong = 0 } = {}) {
  const a = await ansOf(p);
  for (let i = 0; i < wrong; i++) await p.click(`#pick button[data-v="${(a + 1 + i) % 3}"]`);
  await p.click(`#pick button[data-v="${a}"]`);
  await p.waitForSelector(".verdict");
}

try {
  const p = await newPage();
  check("はじめて開くと遊び方が出る", await p.locator("#howto[open]").count() === 1);
  await p.keyboard.press("Escape"); await p.waitForTimeout(100);
  await p.reload(); await p.waitForTimeout(200);
  check("遊び方を Esc で閉じたあと、開き直しても遊び方が出ない（shared-workflows #186）", await p.locator("#howto[open]").count() === 0 && (await mem(p)).tut === true);
  {
    let miss = 0, okNow = 0;
    for (let t = 0; t < 10; t++) {
      const q = await newPage();
      if (t % 2 === 0) { await q.keyboard.press("Escape"); } else { await q.click("#howto-ok"); }
      const tut = await q.evaluate(() => (JSON.parse(localStorage.getItem("kakuritsu-v1") || "{}")).tut === true);
      if (tut) okNow++; else miss++;
      await q.context().close();
    }
    check("遊び方は Esc・「わかった」のその場で「見た」が残る（10回すぐ読み直す）", miss === 0, `${okNow}/10`);
  }
  check("ホームに今日の5問・とことん・上級・練習・確率の手帳・カレンダー・実績のボタン", (await Promise.all(["#go-d", "#go-e", "#go-h", "#go-p", "#go-dex", "#go-cal", "#go-ach"].map(async (q) => (await p.locator(q).count()) === 1 && (await p.locator(q).isVisible()) && (await p.locator(q).isEnabled())))).every(Boolean) && (await p.textContent("#go-d")).includes("今日の5問"));
  {
    await p.setViewportSize({ width: 390, height: 2400 });
    const b = await p.evaluate(() => [...document.querySelectorAll("#app > *")].map((e) => [e.className, Math.round(e.getBoundingClientRect().height)]));
    check("ホームの題は自分の高さだけ（縦に伸びて大きなすき間を作らない）", b[0][0] === "title" && b[0][1] < 130, JSON.stringify(b[0]));
    await p.setViewportSize({ width: 390, height: 800 });
  }

  // 今日の5問：1問目はまちがえる、2問目はヒント2回、ほかはそのまま
  await p.click("#go-d");
  const tags = await p.evaluate(() => __kd.load().runs.d.list);
  check("今日の5問は日付から決まる（game.js の dailyTags と同じ）", JSON.stringify(tags) === JSON.stringify(G.dailyTags(TODAY)));
  {
    const P0 = G.make(tags[0]);
    const say = await p.$$eval("[data-a11y-say]", (e) => e.map((x) => x.getAttribute("aria-label") || x.textContent).join(" "));
    check("問題の画面：A と B のできごと（場面と文）・A／同じ／B の3つのボタン（大きい）・答える前は確率を出さない", (await p.textContent("#evA")).includes(P0.A.text) && (await p.textContent("#evB")).includes(P0.B.text) && (await p.textContent("#evA")).includes(P0.A.ctx) && await p.locator("#pick button").count() === 3 && (await p.locator("#pick button").first().boundingBox()).height >= 56 && (await p.textContent("#pvA")) === "" && (await p.textContent("#pvB")) === "");
    check("「読む」で問題（A・B の場面と文）を読む", say.includes(P0.A.text) && say.includes(P0.B.text) && say.includes("どっちが起きやすい"));
  }
  {
    const a = await ansOf(p), w = (a + 1) % 3;
    await p.click(`#pick button[data-v="${w}"]`);
    check("まちがえると ✕ の知らせ（role=status）・その答えは ✕ と取り消し線で押せない", (await p.textContent("#msg")).includes("✕") && (await p.getAttribute("#msg", "role")) === "status" && await p.locator(`#pick button[data-v="${w}"]:disabled.no .x`).count() === 1);
    await p.click(`#pick button[data-v="${w}"]`, { force: true });
    check("同じ答えをもう一度押しても、まちがいを二度数えない", await p.evaluate(() => __kd.cur().wrong.length) === 1);
  }
  await p.reload(); await p.waitForTimeout(150); await p.click("#go-d");
  check("途中で閉じても続きから（同じ問題・まちがえた答えのまま）", await p.evaluate(() => __kd.cur().i === 0 && __kd.cur().wrong.length === 1) && await p.locator("#pick button.no").count() === 1);
  await solve(p);
  {
    const P0 = G.make(tags[0]);
    check("正解は ✓・どちらが起きやすいか・数え方の説明・★2（まちがい1回）・A と B の確率が出る", (await p.textContent(".verdict .hd")).includes("✓ 正解") && (await p.textContent(".verdict ul")).includes("通り") && (await p.getAttribute(".verdict .stars", "aria-label")) === "星2つ" && (await p.textContent("#pvA")).includes(G.pct(P0.A)) && (await p.textContent("#pvB")).includes(G.pct(P0.B)));
    await p.click("#sim");
    const t = await p.textContent("#simres");
    check("「100回ためす」で A・B を100回ずつ試した数が出る・押すたびに数え直す", /A\s*\d+回/.test(t.replace(/\s+/g, " ")) || (await p.locator("#simres .sbar").count()) === 2);
    await p.click("#sim");
    check("「100回ためす」は何度でも（2回目）", (await p.textContent("#simres")).includes("2回目"));
  }
  check("正解したらヒント・答えのボタンは押せない", await p.locator("#hint").isHidden() && await p.locator("#pick button:disabled").count() === 3 && await p.locator("#pick button.yes").count() === 1);
  check("正解の知らせは前からある #msg（role=status）で読ませる・次の操作も言う", /✓ 正解！.*(次の問題へ|結果を見る)/.test(await p.textContent("#msg")));
  await p.click("#next");
  await p.click("#hint");
  {
    const P1 = G.make(tags[1]);
    check("ヒント1は A・B それぞれの出方の数え方（確率は言わない）", (await p.textContent("#hintbox")).includes(P1.A.tot.slice(0, 8)) && !(await p.textContent("#hintbox")).includes(G.pct(P1.A)) && (await p.textContent("#pvA")) === "");
    await p.click("#hint");
    check("ヒント2は A の確率（B は自分で数える）・ヒントは2回まで", (await p.textContent("#hintbox")).includes(G.pct(P1.A)) && (await p.textContent("#pvB")) === "" && await p.locator("#hint:disabled").count() === 1);
  }
  await solve(p);
  check("ヒント2回は★1", (await p.getAttribute(".verdict .stars", "aria-label")) === "星1つ");
  await p.click("#next");
  for (let i = 2; i < 5; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  const s1 = await mem(p);
  check("5問で結果：今日の記録に1問ごとのまちがい＋ヒント（1・2・0・0・0）", JSON.stringify(s1.days[TODAY]?.m) === "[1,2,0,0,0]");
  const share = await p.textContent(".share");
  const words = G.dailyTags(TODAY).flatMap((t) => { const P = G.make(t); return [P.A.text, P.B.text]; });
  check("シェアの文にできごと・答えを出さない（印だけ）", /第\d+回/.test(share) && /🟢/.test(share) && words.every((n) => !share.includes(n)) && !/%/.test(share), share);
  check("まちがいのある日は Ko-fi の一言を出さない", await p.locator(".kofi").count() === 0);
  check("結果に「あと少しの実績」と、続けて遊ぶ・上級のボタン・問題ごとの答えと確率", await p.locator("#achnext").count() === 1 && await p.locator("#go-e").count() === 1 && await p.locator("#go-h").count() === 1 && await p.locator(".rlist > div").count() === 5 && (await p.textContent(".rlist")).includes("%"));
  check("確率の手帳に当てた問題のできごとが載る（5問×2つ）", Object.keys(s1.dex).length === 10);
  await p.click("#back");
  check("今日を終えたら、ホームは「今日の結果を見る」", (await p.textContent("#go-d")).includes("結果"));
  // 上級：ヒントなし・3問
  await p.click("#go-h");
  check("上級はヒントのボタンが無い・3問", await p.locator("#hint").count() === 0 && (await p.evaluate(() => __kd.load().runs.h.list.length)) === 3);
  for (let i = 0; i < 3; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  check("上級の記録は hdays に入る", (await mem(p)).hdays[TODAY]?.m.length === 3);
  // 練習：記録を増やさない
  await p.click("#back"); await p.click("#go-p"); await p.click('[data-t="1"]');
  const before = await mem(p);
  for (let i = 0; i < 5; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  const after = await mem(p);
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  check("練習は今日の記録を増やさない（手帳の数はふえる）", JSON.stringify(after.days) === JSON.stringify(before.days) && sum(after.dex) === sum(before.dex) + 10);
  {
    const fresh = await p.evaluate(() => { let bad = 0; const s = __kd.load(); for (let n = 0; n < 200; n++) { const l = __kd.practiceList(s, 0, null); const ids = l.map((t) => t.split("|")[0].split(":")[1]); if (new Set(ids).size !== 5) bad++; const q = __kd.G.QBY[ids[0]]; if (s.dex[q.a] && s.dex[q.b] && __kd.G.POOL[0].some((x) => !s.dex[__kd.G.QBY[x].a] || !s.dex[__kd.G.QBY[x].b])) bad++; } return bad; });
    check("練習は5問とも別の問題・まだ手帳に無いできごとの問題が先に出る（200回）", fresh === 0, String(fresh));
  }
  // 手帳から場面を選んで練習
  await p.click("#back"); await p.click("#go-dex");
  check("確率の手帳は6つの場面ごと・まだのできごとは点線の枠と「まだ」", await p.locator(".area").count() === 6 && await p.locator(".mlist .no").count() === G.IDS.length - Object.keys(after.dex).filter((k) => G.IDS.includes(k)).length && (await p.textContent(".mlist .no span")) === "まだ");
  await p.click('[data-a="4"]'); await p.click('[data-t="1"]');
  check("場面の練習はその場面のできごとを含む問題だけ", (await p.evaluate(() => __kd.load().runs.p.list)).every((t) => { const q = G.QBY[idOf(t)]; return G.BY[q.a].fam === 4 || G.BY[q.b].fam === 4; }));
  // とことん：まちがえても終わらない・「ここで降りる」で終わる
  await p.click("#back"); await p.click("#go-e");
  const el = await p.evaluate(() => __kd.load().runs.e.list);
  check("とことんは、やさしい5→ふつう10→むずかしい全部（1つの並びで同じ問題は出ない）", el.length === 15 + G.POOL[2].length && el.slice(0, 5).every((t) => t[0] === "0") && el.slice(5, 15).every((t) => t[0] === "1") && new Set(el.map(idOf)).size === el.length);
  {
    const rep = await p.evaluate(() => { let bad = 0; for (let n = 0; n < 300; n++) { const l = __kd.endlessList(__kd.load(), n % 2 ? "c2h0xc2h2" : null, n % 3 === 0); const id = (t) => t.split("|")[0].split(":")[1]; for (let i = 1; i < l.length; i++) { const a = __kd.G.QBY[id(l[i - 1])], b = __kd.G.QBY[id(l[i])]; if ([a.a, a.b].some((e) => e === b.a || e === b.b)) bad++; } } return bad; });
    check("とことんは続けて同じできごとを出さない（300回）", rep === 0, String(rep));
  }
  await solve(p); await p.click("#next");
  await solve(p, { wrong: 2 }); await p.click("#next");
  check("とことんはまちがえても終わらない（いのちの数は無い）", await p.locator("#pick").isVisible() && await p.evaluate(() => __kd.load().runs.e.res.length) === 2);
  await solve(p); await p.click("#next");
  await p.reload(); await p.waitForTimeout(150);
  check("とことんは開き直すと続きから", (await p.textContent("#go-e")).includes("続きから"));
  await p.click("#go-e");
  {
    const real = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem("kakuritsu-v1")); const id = s.runs.e.id; s.runs.e.id = "other"; localStorage.setItem("kakuritsu-v1", JSON.stringify(s)); return id; });
    await p.click("#quit"); await p.waitForTimeout(150);
    check("古い画面の「ここで降りる」は、別のタブで始めた回を終わらせない", (await mem(p)).runs.e?.id === "other" && !(await mem(p)).ebest);
    await p.evaluate((id) => { const s = JSON.parse(localStorage.getItem("kakuritsu-v1")); s.runs.e.id = id; localStorage.setItem("kakuritsu-v1", JSON.stringify(s)); }, real);
    await p.reload(); await p.waitForTimeout(150); await p.click("#go-e");
  }
  await p.click("#quit"); await p.waitForTimeout(150);
  check("「ここで降りる」で終わり、自己ベスト（3問）とまちがい・ヒントの数が出る", (await mem(p)).ebest === 3 && (await p.textContent("#eres")).includes("3問") && (await p.textContent("#ebest")).includes("2回"));
  {
    // 引き継ぎコードなどで数の所に文字が入っても、画面に HTML として出さない
    const q = await newPage(); await closeHow(q);
    const q0 = G.POOL[0][0], tg = `0:${q0}|e2026-11-08.a.0`;
    await q.evaluate(([q0, tg]) => { const s = JSON.parse(localStorage.getItem("kakuritsu-v1")) || { v: 1 }; s.ebest = '<img id="xss" src=x>'; s.eq = "<b>"; s.elast = "<b>"; s.dex = { s1: '"><b id="xss2">', bad: 3 };
      s.runs = { e: { mode: "e", id: "x", date: "2026-11-08", list: [tg], res: [], miss: '"><i id="xss3">' }, h: { list: "bad", res: [] }, p: { mode: "p", id: "y", date: "2026-11-08", list: ["0:nowhere|p2026-11-08"], res: [] },
        d: { mode: "d", id: "z", date: "x", list: [tg], res: [] }, w: { mode: "p", id: "w", date: "2026-11-08", list: [`2:${q0}|p2026-11-08`], res: [] }, "a:2026-11-09": { mode: "a", id: "a", date: "2026-11-09", list: [tg], res: [] } };
      s.days = { "2026-11-08": { m: [0, 0] }, "2026-11-09": { m: [0, 0, 0, 0, 0] } }; localStorage.setItem("kakuritsu-v1", JSON.stringify(s)); }, [q0, tg]);
    await q.reload(); await q.waitForTimeout(250);
    const st = await q.evaluate(() => __kd.load());
    check("記録の形を直す：数の所の文字は0に・知らない問題・難しさの合わない問題・形のちがう途中経過・問題の数と合わない記録・途中経過は捨てる", st.ebest === 0 && st.eq === 0 && st.dex.s1 === 0 && !("bad" in st.dex) && !st.elast && Object.keys(st.runs).join() === "e" && !st.days["2026-11-08"] && !!st.days["2026-11-09"], JSON.stringify(Object.keys(st.runs)));
    await q.click("#go-e").catch(() => {}); await q.waitForTimeout(150); await q.click("#quit").catch(() => {}); await q.waitForTimeout(150);
    check("記録の文字を HTML として出さない", await q.locator("#xss, #xss2, #xss3").count() === 0);
    await q.evaluate(() => { const s = JSON.parse(localStorage.getItem("kakuritsu-v1")); s.ebest = { toString: 0 }; s.dex = { s1: { valueOf: 1 } }; s.runs = {}; localStorage.setItem("kakuritsu-v1", JSON.stringify(s)); });
    const errs = []; q.on("pageerror", (e) => errs.push(e.message)); await q.reload(); await q.waitForTimeout(250);
    check("数の所に {\"toString\":0} のような物が入っても止まらず、ホームが出る", errs.length === 0 && await q.locator("#go-d").isVisible() && (await q.evaluate(() => __kd.load().ebest)) === 0, errs.join(","));
    await q.context().close();
  }
  {
    // 練習で30のできごと目を当て、結果で「30のできごと」を知らせる（知らせたら二度は出さない）
    const q = await newPage(); await closeHow(q);
    await q.evaluate((ids) => { const s = JSON.parse(localStorage.getItem("kakuritsu-v1")) || { v: 1 }; s.dex = {}; for (const id of ids) s.dex[id] = 1; s.ach = {}; localStorage.setItem("kakuritsu-v1", JSON.stringify(s)); }, G.IDS.slice(0, 29));
    await q.reload(); await q.waitForTimeout(150); await closeHow(q);
    await q.click("#go-p"); await q.click('[data-t="0"]');
    for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
    await q.waitForTimeout(150);
    check("前の回で取って知らせていない実績も、次の結果で知らせる（知らせたら二度は出さない）", (await q.textContent("#achnew").catch(() => "")).includes("30のできごと") && (await mem(q)).ach.f30 === 1);
    await q.click("#back").catch(() => {}); await q.click("#go-p"); await q.click('[data-t="0"]');
    for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
    await q.waitForTimeout(150);
    check("知らせ終えた実績は次の結果に出さない", !(await q.textContent("#achnew").catch(() => "")).includes("30のできごと"));
    await q.context().close();
  }
  // 実績・このゲームについて
  await p.click("#back"); await p.click("#go-ach");
  check("実績は15個で、腕前・集める・続けるの3つの組", await p.locator(".ach").count() === 15 && await p.locator(".agrp").count() === 3 && await p.locator(".ach.got").count() >= 2);
  check("達成した実績は ✓ の文字も付く（色だけで分けない）", (await p.textContent(".ach.got b")).startsWith("✓"));
  await p.click("#back"); await p.click("#f-about");
  check("このゲームについて：学習指導要領の出典のリンク", (await p.textContent("#about")).includes("学習指導要領") && await p.locator("#about a").count() >= 2);
  await p.context().close();

  // まちがいなしの日は Ko-fi を1回だけ
  {
    const q = await newPage(); await closeHow(q); await q.click("#go-d");
    for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
    await q.waitForTimeout(150);
    check("全部まちがいなしで初めて終えたときだけ Ko-fi の一言", await q.locator(".kofi").count() === 1 && (await q.textContent(".big")).includes("まちがいなし"));
    await q.click("#back"); await q.click("#go-d");
    check("結果をもう一度見ても Ko-fi は出さない", await q.locator(".kofi").count() === 0);
    await q.context().close();
  }

  // カレンダー・あとから
  {
    const q = await newPage();
    await q.evaluate(([d2, d3]) => { localStorage.setItem("kakuritsu-v1", JSON.stringify({ v: 1, tut: true, days: { [d2]: { m: [0, 0, 0, 0, 0] }, [d3]: { m: [1, 0, 0, 2, 0] } }, hdays: {}, adays: {}, dex: {}, runs: {}, kofi: {}, ach: {}, ebest: 0 })); }, [dayBefore(2), dayBefore(3)]);
    await q.reload(); await q.waitForTimeout(150);
    check("ホームの「続けて」は、きのうを休んだら — （休んだ日を責めない）", (await q.textContent(".stats")).includes("—"));
    await q.click("#go-cal");
    const lateList = await q.evaluate(() => __kd.lateDays(__kd.load()));
    const exp = [1, 4, 5, 6, 7].map(dayBefore).filter((d) => d >= G.EPOCH);
    check("カレンダー：取りこぼした過去7日（第1回から）を押せる", JSON.stringify(lateList) === JSON.stringify(exp), lateList.join(","));
    if (lateList.length) {
      const d = lateList[0];
      if (!(await q.locator(`.cal .miss[data-k="${d}"]`).count())) await q.click("#prev");
      await q.click(`.cal .miss[data-k="${d}"]`);
      check("あとから：その日の今日の5問と同じ問題", JSON.stringify(await q.evaluate((d) => __kd.load().runs["a:" + d].list, d)) === JSON.stringify(G.dailyTags(d)));
      for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
      await q.waitForTimeout(150);
      const s = await mem(q);
      check("あとからは adays に入り、今日の記録・続けた日・シェア・Ko-fi には数えない", s.adays[d] && !s.days[d] && (await q.locator(".share").count()) === 0 && (await q.locator(".kofi").count()) === 0);
      await q.click("#go-cal");
      check("カレンダーに ↺ で残る", await q.locator(`.cal .c.late[data-k="${d}"]`).count() === 1);
    } else check("あとからの検査（QA_SHIFT_DAYS が小さく、まだ過去の日が無い）", true);
    await q.context().close();
  }

  // 古いタブ：同じ問題を2つのタブで開き、片方で答えたら、もう片方は二重に入れない
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } }); await shift(ctx);
    const a = await newPage(390, ctx); await closeHow(a); await a.click("#go-d");
    const b = await ctx.newPage(); b.on("pageerror", (e) => errors.push(e.message)); await b.goto(url); await b.waitForTimeout(150); await b.click("#go-d");
    await solve(a);
    await b.click(`#pick button[data-v="${await ansOf(b)}"]`);
    await b.waitForTimeout(200);
    const s = await mem(a);
    check("古いタブで同じ問題に答えても二重に数えない", s.runs.d.res.length === 1 && Object.values(s.dex).reduce((x, y) => x + y) === 2);
    await a.click("#next"); await b.goto(url); await b.waitForTimeout(150); await b.click("#go-d");
    await a.click("#hint"); await a.click("#hint");
    await b.click("#hint");
    check("別のタブで使ったヒントの数を減らさない", (await mem(a)).runs.d.cur.hints === 2);
    await b.click(`#pick button[data-v="${await ansOf(b)}"]`); await b.waitForTimeout(150);
    check("別のタブで使ったヒントは、こちらで正解しても★に数える", (await mem(a)).runs.d.res[1]?.m === 2 && (await b.getAttribute(".verdict .stars", "aria-label")) === "星1つ");
    await ctx.close();
  }

  // スマホ幅でもはみ出さない・押す所は44px以上
  {
    const bad = [], small = [];
    for (const w of [320, 390]) {
      const q = await newPage(w); await closeHow(q);
      for (const go of [null, "#go-d", "wrong", "solve", "#go-cal", "#go-dex", "#go-ach", "#go-e", "#go-p", "#go-h"]) {
        if (go === "solve") { await solve(q); await q.click("#sim"); }
        else if (go === "wrong") { await q.click(`#pick button[data-v="${((await ansOf(q)) + 1) % 3}"]`); await q.click("#hint"); }
        else if (go) { await q.goto(url); await q.waitForTimeout(100); await q.click(go); }
        await q.waitForTimeout(100);
        const ov = await q.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (ov > 0) bad.push(`${w}px ${go || "ホーム"} ${ov}px`);
        small.push(...(await q.$$eval("button:not([disabled]), a[href]", (bs) => bs.filter((b) => b.checkVisibility() && !b.closest(".cal")).filter((b) => b.getBoundingClientRect().height < 44).map((b) => (b.id || b.className || b.textContent).slice(0, 20)))).map((x) => `${w}:${x}`));
      }
      await q.context().close();
    }
    check("幅320pxでも横にはみ出さない", bad.length === 0, bad.join(" / "));
    check("押せる所は高さ44px以上", small.length === 0, [...new Set(small)].slice(0, 8).join(","));
  }
  {
    // いちばん長い文の問題も幅320pxで、場面の文が右上の絵と重ならない
    const q = await newPage(320); await closeHow(q);
    const longest = [...G.QS].sort((x, y) => (G.BY[y.a].ctx.length + G.BY[y.b].ctx.length) - (G.BY[x.a].ctx.length + G.BY[x.b].ctx.length))[0];
    await q.evaluate((tag) => { const s = JSON.parse(localStorage.getItem("kakuritsu-v1")); s.runs.p = { mode: "p", date: __kd.todayKey(), list: [tag, tag, tag, tag, tag], res: [], cur: null, id: "L" }; localStorage.setItem("kakuritsu-v1", JSON.stringify(s)); __kd.play("p"); }, `${longest.lv}:${longest.id}|p${TODAY}`);
    const hit = await q.evaluate(() => [...document.querySelectorAll(".ev")].some((ev) => { const a = ev.querySelector(".pic").getBoundingClientRect(), c = ev.querySelector(".ctx").getBoundingClientRect(); return a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom; }));
    check("幅320pxでいちばん長い場面の文も、右上の絵と重ならない", !hit);
    await q.context().close();
  }
  // 見やすさの設定を全部入れても、ページの一番下まで動ける
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 700 } }); await shift(ctx);
    await ctx.addInitScript(() => localStorage.setItem("a11y-v1", JSON.stringify({ read: true, cvd: true, calm: true, say: true, ruby: true })));
    const q = await newPage(390, ctx); await closeHow(q);
    const r = await q.evaluate(() => { window.scrollTo(0, 1e5); const f = document.querySelector("footer").getBoundingClientRect(); return [scrollY, Math.round(f.bottom), innerHeight, getComputedStyle(document.documentElement).position]; });
    check("見やすさの設定を全部入れても、いちばん下まで動ける（html が固定されない）", r[0] > 0 && r[1] <= r[2] && r[3] === "static", r.join(","));
    await q.click("#go-d");
    check("色の見分けを助ける設定では、B のカードとボタンを破線の枠にする（A・B の字でも分ける）", await q.evaluate(() => getComputedStyle(document.querySelector("#evB")).borderTopStyle === "dashed" && getComputedStyle(document.querySelector('#pick button[data-v="2"]')).borderTopStyle === "dashed"));
    await ctx.close();
  }
  // キーボードだけで遊べる（Tab と Enter）
  {
    const q = await newPage(); await closeHow(q);
    await q.focus("#go-d"); await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    const a = await ansOf(q);
    let t = 0; for (; t < 30 && (await q.evaluate(() => document.activeElement && document.activeElement.dataset.v)) !== String(a); t++) await q.keyboard.press("Tab");
    await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    check("キーボードだけ（Tab と Enter）で答えられる", await q.locator(".verdict").count() === 1);
    await q.context().close();
  }
} catch (e) { check("ブラウザでの検査が最後まで動く", false, e.stack.split("\n").slice(0, 3).join(" ")); }

// 引き継ぎコード（shared-workflows template/qa/transfer-check.mjs）
try {
  const sample = { "kakuritsu-v1": JSON.stringify({ v: 1, tut: true, days: { "2026-11-08": { m: [0, 1, 0, 0, 2] } }, hdays: {}, adays: {}, dex: { s1: 1, w7: 1 }, runs: {}, kofi: {}, ach: {}, ebest: 7, eq: 2, t: 1 }) };
  await checkTransfer({ browser, url, game: "kakuritsu-dotchi", sample, check, open: async (pg) => { if (await pg.locator("#howto[open]").count()) await pg.click("#howto-ok"); } });
} catch (e) { check("引き継ぎの検査が最後まで動く", false, e.message.split("\n")[0]); }
await browser.close();
server.close();
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));

{ // 見やすさ・読みやすさ・偏り（shared-workflows template/qa/a11y.mjs の写し）
  const { spawnSync } = await import("node:child_process");
  const a = spawnSync(process.execPath, [path.join(root, "qa", "a11y.mjs")], { encoding: "utf8", env: process.env });
  check("見やすさ・読みやすさの検査（qa/a11y.mjs。中身は qa-report/a11y.md）", a.status === 0, (a.stdout.match(/^- ❌.*$/gm) || []).join(" / ") || (a.status ? a.stderr.slice(-300) : ""));
}

const ng = results.filter((r) => !r.ok);
const md = `# どっちが起きやすい？ QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
