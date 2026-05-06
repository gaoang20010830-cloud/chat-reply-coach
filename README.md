# 聊天回复教练

一个移动端优先的 PWA 小工具：用户手动粘贴聊天消息，应用分析对方状态并生成自然、有温度、不油腻的回复建议。

## 产品边界

- 不自动读取微信聊天内容。
- 不自动发送消息。
- 不需要登录。
- 默认不保存聊天记录，前端不使用 `localStorage`，服务端不落库。
- 核心目标是帮助用户理解怎么回，而不是代替用户聊天。

## 本地运行

先安装依赖：

```bash
npm install
```

复制环境变量示例：

```bash
cp .env.example .env
```

在 `.env` 中配置：

```bash
OPENAI_API_KEY=sk-your-api-key
OPENAI_MODEL=gpt-4.1-mini
PORT=5173
```

启动开发服务：

```bash
npm run dev
```

终端会输出：

```text
本机访问地址：http://localhost:5173
手机访问地址：http://你的电脑局域网IP:5173
```

`npm run dev` 会通过 `HOST=0.0.0.0 node server/index.js` 启动 Express + Vite middleware，这样手机可以访问页面，同时 `/api/generate` 仍然走服务端，不会把 API Key 放到前端。

## 构建与预览

```bash
npm run build
npm run preview
```

Vite 构建产物输出到 `dist`，Vercel 部署时也使用这个目录。

## PWA

项目包含：

- `public/manifest.webmanifest`
- `public/sw.js`
- `public/icon.svg`
- `public/icon-192.png`
- `public/icon-512.png`
- `public/apple-touch-icon.png`
- iOS 相关 meta 标签

在支持 PWA 的手机浏览器中打开站点后，可以通过浏览器菜单添加到手机桌面。

## 一加安卓手机测试

1. 确认手机和电脑连接同一个 WiFi。
2. 在电脑运行 `npm run dev`。
3. 在一加手机浏览器打开终端输出的手机访问地址，例如 `http://192.168.x.x:5173`。
4. 粘贴一段聊天消息，选择关系类型、聊天目标和回复风格。
5. 点击「生成回复建议」。
6. 如果提示未配置服务端 API Key，请先在 `.env` 中填写 `OPENAI_API_KEY`，然后重启 `npm run dev`。
7. 生成成功后，测试每条回复旁边的「复制」按钮。
8. 如果页面体验正常，点击浏览器菜单，选择「添加到主屏幕」或「安装应用」。

## API

前端调用同源接口：

```text
POST /api/generate
```

Vercel 部署时，`api/generate.js` 会作为 serverless function 运行。服务端只从环境变量读取 `OPENAI_API_KEY`，请求模型返回严格 JSON：

```json
{
  "emotion_analysis": "",
  "avoid_reply": "",
  "replies": {
    "natural": "",
    "humorous": "",
    "warm": "",
    "progressive": ""
  },
  "best_reply": "",
  "reason": ""
}
```

如果没有配置 `OPENAI_API_KEY`，接口会返回：

```json
{
  "error": "missing_openai_api_key",
  "message": "服务端缺少 OPENAI_API_KEY，请在 Vercel 环境变量中配置后重新部署。"
}
```

## 部署到 Vercel

1. 确认本地构建成功：

```bash
npm run build
```

2. 初始化 Git 并提交：

```bash
git init
git add .
git commit -m "Initial chat reply coach PWA"
```

3. 在 GitHub 创建一个新仓库，然后推送：

```bash
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

4. 打开 Vercel，选择「Add New Project」，导入这个 GitHub 仓库。
5. Framework Preset 选择 Vite。Build Command 使用 `npm run build`，Output Directory 使用 `dist`。
6. 在 Vercel 项目的 Environment Variables 中添加：

```text
OPENAI_API_KEY=你的服务端 OpenAI API Key
OPENAI_MODEL=gpt-4.1-mini
```

7. 点击 Deploy。部署完成后，用 Vercel 给出的 HTTPS 地址打开应用。
8. 一加安卓手机打开部署后的 HTTPS 地址，测试「生成回复建议」和「复制」按钮。
9. 测试正常后，在 Chrome 菜单中选择「添加到主屏幕」或「安装应用」。
