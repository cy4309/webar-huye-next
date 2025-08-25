const fs = require("fs");
const path = require("path");
const https = require("https");
const { parse } = require("url");
const next = require("next");
const os = require("os");
const process = require("process");
const openurl = require("openurl");

// 讀取 port（優先順序：CLI 傳入 > 環境變數 > 預設 3000）
const port = parseInt(process.env.PORT || process.argv[2] || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync(path.resolve("cert/server.key")),
  cert: fs.readFileSync(path.resolve("cert/server.crt")),
};

app.prepare().then(() => {
  https
    .createServer(httpsOptions, (req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    })
    .listen(port, "0.0.0.0", () => {
      const interfaces = os.networkInterfaces();
      const addresses = [];

      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          if (iface.family === "IPv4" && !iface.internal) {
            addresses.push(iface.address);
          }
        }
      }

      const localUrl = `https://localhost:${port}`;
      const firstIP = addresses[0]; // ✅ 第一個區網 IP
      console.log(`✅ HTTPS server running at:`);
      console.log(`→ https://localhost:${port}`);
      addresses.forEach((ip) => {
        console.log(`→ https://${ip}:${port}`);
      });

      if (firstIP) {
        openurl.open(`https://${firstIP}:${port}`);
      } else {
        openurl.open(localUrl);
      }
    });
});
