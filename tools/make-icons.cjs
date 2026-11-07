// アプリのアイコン（icon-192.png・icon-512.png と、切り抜かれても欠けない icon-maskable-512.png）を作る。生成りの地に、青い A と朱の B のさいころ。
// maskable は中央の円（直径の80%）の中に全部が入るよう、絵を0.78倍に縮める（https://web.dev/articles/maskable-icon）
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const [s, name, k] of [[192, "icon-192.png", 1], [512, "icon-512.png", 1], [512, "icon-maskable-512.png", 0.78]]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#f3efe6"/><g transform="translate(50 50) scale(${k}) translate(-50 -50)">
      <rect x="10" y="20" width="40" height="40" rx="8" fill="#1d5c8f" transform="rotate(-8 30 40)"/>
      <g fill="#fff" transform="rotate(-8 30 40)"><circle cx="20" cy="30" r="4"/><circle cx="30" cy="40" r="4"/><circle cx="40" cy="50" r="4"/></g>
      <rect x="50" y="40" width="40" height="40" rx="8" fill="#b2461b" transform="rotate(8 70 60)"/>
      <g fill="#fff" transform="rotate(8 70 60)"><circle cx="60" cy="50" r="4"/><circle cx="80" cy="50" r="4"/><circle cx="60" cy="70" r="4"/><circle cx="80" cy="70" r="4"/></g>
      </g></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", name), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
