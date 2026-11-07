// SNS で貼られたときの絵（og.png 1200×630）を作る。今日の問題（答え）は入れず、題と A・B のカードの見本だけ。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const card = (k, c, ctx, what) => `<div style="display:flex;align-items:center;gap:26px;background:#fffdf8;border:4px solid ${c};border-radius:24px;padding:22px 30px;width:440px">
    <div style="flex:none;width:76px;height:76px;border-radius:18px;background:${c};color:#fff;font-size:52px;font-weight:900;display:grid;place-items:center">${k}</div>
    <div><div style="font-size:26px;color:#46506a">${ctx}</div><div style="font-size:38px;font-weight:900">${what}</div></div></div>`;
  await p.setContent(`<body style="margin:0;font-family:'Noto Sans CJK JP','IPAPGothic',sans-serif">
  <div style="position:relative;width:1200px;height:630px;background-color:#f3efe6;background-image:repeating-linear-gradient(90deg,transparent 0 39px,#7b8aa322 39px 40px),repeating-linear-gradient(0deg,transparent 0 39px,#7b8aa322 39px 40px);color:#17233a;overflow:hidden">
    <div style="position:absolute;left:70px;top:60px">
      <div style="font-size:32px;color:#46506a;letter-spacing:.06em">確率の直感をためす1日5問</div>
      <div style="font-size:100px;font-weight:900;letter-spacing:.06em;line-height:1.2">どっちが<br><span style="color:#b2461b">起きやすい？</span></div>
    </div>
    <div style="position:absolute;left:70px;bottom:60px;font-size:30px;color:#46506a">🎲 さいころ　🪙 コイン　🎫 くじ　🃏 トランプ　✊ じゃんけん　🎂 誕生日</div>
    <div style="position:absolute;right:60px;top:70px;display:flex;flex-direction:column;gap:22px;align-items:center">
      ${card("A", "#1d5c8f", "さいころを1つ振る", "6の目が出る")}
      <div style="font-size:30px;font-weight:700;color:#46506a">か</div>
      ${card("B", "#b2461b", "さいころを2つ振る", "和が7になる")}
    </div>
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
