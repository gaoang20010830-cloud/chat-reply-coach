import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import { networkInterfaces } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { handleGeneratePayload } from "../api/generate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const app = express();
const isProduction = process.env.NODE_ENV === "production";
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 5173);

app.use(express.json({ limit: "20kb" }));

app.post("/api/generate", async (req, res) => {
  const result = await handleGeneratePayload(req.body);
  res.status(result.status).json(result.body);
});

if (isProduction) {
  const distDir = resolve(rootDir, "dist");
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) {
      next();
      return;
    }
    res.sendFile(resolve(distDir, "index.html"));
  });
} else {
  const vite = await createViteServer({
    root: rootDir,
    server: {
      middlewareMode: true,
      host,
    },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

app.listen(port, host, () => {
  const lanIp = getPrimaryLanIp();

  console.log("聊天回复教练已启动");
  console.log(`本机访问地址：http://localhost:${port}`);
  console.log(`手机访问地址：http://${lanIp || "我的电脑局域网IP"}:${port}`);

  if (!process.env.OPENAI_API_KEY) {
    console.log("未检测到 OPENAI_API_KEY，请在 .env 中填写后再测试生成回复。");
  }
});

function getPrimaryLanIp() {
  const interfaces = networkInterfaces();

  for (const details of Object.values(interfaces)) {
    for (const detail of details || []) {
      if (detail.family === "IPv4" && !detail.internal) {
        return detail.address;
      }
    }
  }

  return "";
}
