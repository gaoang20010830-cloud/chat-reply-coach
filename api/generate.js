import OpenAI from "openai";

const SYSTEM_PROMPT = `你是聊天回复教练，不是代聊工具。
请帮助用户理解对方消息背后的情绪、关系信号和聊天机会。
用户平时说话偏理性，容易进入解决问题模式，回复容易显得生硬。
请把回复改得自然、有温度、不油腻、不尴尬，保留普通男生真实说话感，不要太像情感导师。

重要边界：
1. 你的目标是指导用户怎么回，不是替用户操控对方。
2. 不要生成夸张承诺、PUA、试探、施压或过度暧昧的话。
3. 回复要像真实聊天，避免鸡汤、讲道理、长篇分析和油腻称呼。
4. 如果对方情绪明显低落，优先接住情绪，不急着解决问题。
5. 如果关系是客户或同事，保持分寸、清晰和尊重。
6. 只输出 JSON 对象，不要输出 Markdown、代码块或额外解释。
7. JSON 必须严格使用以下结构和字段名：
{
  "emotion_analysis": "对对方情绪状态、潜台词、关系信号的简短判断。",
  "avoid_reply": "提醒用户这时候不建议怎么回，指出容易生硬、油腻或失分的说法。",
  "replies": {
    "natural": "自然版回复。",
    "humorous": "轻松幽默版回复。",
    "warm": "温柔关心版回复。",
    "progressive": "稍微推进关系版回复。"
  },
  "best_reply": "最推荐用户直接复制发送的一句。",
  "reason": "解释为什么这样回合适，帮助用户学习聊天判断。"
}`;

export async function nodeHandler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({
      error: "method_not_allowed",
      message: "Only POST requests are supported.",
    });
    return;
  }

  const result = await handleGeneratePayload(await readRequestBody(req));
  res.status(result.status).json(result.body);
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return jsonResponse(
        {
          error: "method_not_allowed",
          message: "Only POST requests are supported.",
        },
        405,
        {
          Allow: "POST",
        },
      );
    }

    const result = await handleGeneratePayload(await request.json().catch(() => null));
    return jsonResponse(result.body, result.status);
  },
};

export async function handleGeneratePayload(payload) {
  const input = normalizeRequest(payload);

  if (!input) {
    return {
      status: 400,
      body: {
        error: "invalid_request",
        message: "请提供对方消息、关系类型、聊天目标和回复风格。",
      },
    };
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    return {
      status: 500,
      body: {
        error: "missing_deepseek_api_key",
        message: "服务端缺少 DEEPSEEK_API_KEY，请在 Vercel 环境变量中配置后重新部署。",
      },
    };
  }

  try {
    return {
      status: 200,
      body: await createAdvice(input),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    console.error(`AI generation failed: ${redactSecrets(message)}`);
    return {
      status: 502,
      body: {
        error: "generate_failed",
        message: "生成回复建议失败了，请稍后再试。",
      },
    };
  }
}

function jsonResponse(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

async function readRequestBody(req) {
  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString("utf8"));
    } catch {
      return null;
    }
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }

  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return null;
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

function normalizeRequest(body) {
  if (!body || typeof body !== "object") return null;

  const message = safeText(body.message, 3000);
  const relationType = safeText(body.relationType, 40);
  const chatGoal = safeText(body.chatGoal, 40);
  const replyStyle = safeText(body.replyStyle, 40);

  if (!message || !relationType || !chatGoal || !replyStyle) return null;

  return {
    message,
    relationType,
    chatGoal,
    replyStyle,
  };
}

function safeText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

async function createAdvice(input) {
  const client = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY,
  });

  const model = getDeepSeekModel();
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: buildUserPrompt(input),
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = completion.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("empty_model_output");
  }

  const parsed = JSON.parse(content);
  if (!isAdvice(parsed)) {
    throw new Error("invalid_model_output");
  }

  return parsed;
}

function getDeepSeekModel() {
  const configuredModel = process.env.DEEPSEEK_MODEL?.trim();

  if (!configuredModel || configuredModel.startsWith("sk-")) {
    return "deepseek-v4-flash";
  }

  return configuredModel;
}

function redactSecrets(message) {
  return message.replace(/sk-[A-Za-z0-9_-]+/g, "sk-***");
}

function buildUserPrompt(input) {
  return JSON.stringify(
    {
      task: "请根据用户粘贴的对方消息，输出聊天回复建议。",
      relationship_type: input.relationType,
      chat_goal: input.chatGoal,
      reply_style: input.replyStyle,
      other_person_message: input.message,
      output_language: "简体中文",
      tone_requirements: [
        "自然",
        "有温度",
        "不油腻",
        "不尴尬",
        "保留普通男生真实说话感",
      ],
    },
    null,
    2,
  );
}

function isAdvice(value) {
  return (
    typeof value?.emotion_analysis === "string" &&
    typeof value?.avoid_reply === "string" &&
    typeof value?.replies?.natural === "string" &&
    typeof value?.replies?.humorous === "string" &&
    typeof value?.replies?.warm === "string" &&
    typeof value?.replies?.progressive === "string" &&
    typeof value?.best_reply === "string" &&
    typeof value?.reason === "string"
  );
}
