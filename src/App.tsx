import { Check, Clipboard, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { generateAdvice } from "./api";
import type { AdviceResult } from "./types";

const RELATION_TYPES = ["普通朋友", "有好感的女生", "同事", "客户", "家人"];
const CHAT_GOALS = ["接住情绪", "继续聊下去", "轻松幽默", "推进关系", "道歉缓和", "不显得太热情"];
const REPLY_STYLES = ["自然一点", "稍微幽默", "温柔一点", "简短一点", "不要太油腻"];

const EXAMPLE_MESSAGE = "比如：今天真的有点累，感觉什么事都堆在一起了。";

type PreferenceGroupProps = {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
};

type CopyButtonProps = {
  text: string;
  copyKey: string;
  copiedKey: string;
  onCopy: (text: string, key: string) => void;
};

function PreferenceGroup({ label, options, value, onChange }: PreferenceGroupProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-ink">{label}</legend>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {options.map((option) => {
          const selected = option === value;
          return (
            <button
              type="button"
              key={option}
              onClick={() => onChange(option)}
              className={[
                "shrink-0 rounded-full border px-3.5 py-2 text-sm transition",
                "focus:outline-none focus:ring-2 focus:ring-mint/30",
                selected
                  ? "border-mint bg-mint text-white shadow-sm"
                  : "border-ink/10 bg-white text-muted active:bg-mint-soft",
              ].join(" ")}
              aria-pressed={selected}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function CopyButton({ text, copyKey, copiedKey, onCopy }: CopyButtonProps) {
  const copied = copiedKey === copyKey;

  return (
    <button
      type="button"
      onClick={() => onCopy(text, copyKey)}
      className={[
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium",
        "transition focus:outline-none focus:ring-2 focus:ring-mint/30",
        copied
          ? "border-mint bg-mint-soft text-mint"
          : "border-ink/10 bg-white text-muted active:bg-paper",
      ].join(" ")}
      aria-label={copied ? "已复制" : "复制这条回复"}
    >
      {copied ? <Check size={15} aria-hidden="true" /> : <Clipboard size={15} aria-hidden="true" />}
      {copied ? "已复制" : "复制"}
    </button>
  );
}

function InfoBlock({
  title,
  children,
  tone = "default",
}: {
  title: string;
  children: string;
  tone?: "default" | "warning" | "best";
}) {
  const toneClass =
    tone === "warning"
      ? "border-coral/20 bg-coral-soft"
      : tone === "best"
        ? "border-mint/25 bg-mint-soft"
        : "border-ink/8 bg-white";

  return (
    <section className={`rounded-lg border p-4 ${toneClass}`}>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-ink">{children}</p>
    </section>
  );
}

function ReplyCard({
  title,
  text,
  copyKey,
  copiedKey,
  onCopy,
}: {
  title: string;
  text: string;
  copyKey: string;
  copiedKey: string;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <article className="rounded-lg border border-ink/8 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 text-sm font-semibold leading-6 text-ink">{title}</h2>
        <CopyButton text={text} copyKey={copyKey} copiedKey={copiedKey} onCopy={onCopy} />
      </div>
      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-ink">{text}</p>
    </article>
  );
}

function ResultPanel({
  result,
  copiedKey,
  onCopy,
}: {
  result: AdviceResult;
  copiedKey: string;
  onCopy: (text: string, key: string) => void;
}) {
  const replyItems = [
    { key: "natural", title: "推荐回复 1：自然版", text: result.replies.natural },
    { key: "humorous", title: "推荐回复 2：轻松幽默版", text: result.replies.humorous },
    { key: "warm", title: "推荐回复 3：温柔关心版", text: result.replies.warm },
    { key: "progressive", title: "推荐回复 4：稍微推进关系版", text: result.replies.progressive },
  ];

  return (
    <section className="space-y-3" aria-live="polite">
      <InfoBlock title="对方状态判断">{result.emotion_analysis}</InfoBlock>
      <InfoBlock title="这时候不要怎么回" tone="warning">
        {result.avoid_reply}
      </InfoBlock>

      {replyItems.map((item) => (
        <ReplyCard
          key={item.key}
          title={item.title}
          text={item.text}
          copyKey={item.key}
          copiedKey={copiedKey}
          onCopy={onCopy}
        />
      ))}

      <section className="rounded-lg border border-mint/25 bg-mint-soft p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-sm font-semibold leading-6 text-ink">最推荐发送的一句</h2>
          <CopyButton
            text={result.best_reply}
            copyKey="best"
            copiedKey={copiedKey}
            onCopy={onCopy}
          />
        </div>
        <p className="mt-3 whitespace-pre-wrap text-[16px] font-medium leading-7 text-ink">
          {result.best_reply}
        </p>
      </section>

      <InfoBlock title="为什么这么回">{result.reason}</InfoBlock>
    </section>
  );
}

function App() {
  const [message, setMessage] = useState("");
  const [relationType, setRelationType] = useState(RELATION_TYPES[0]);
  const [chatGoal, setChatGoal] = useState(CHAT_GOALS[0]);
  const [replyStyle, setReplyStyle] = useState(REPLY_STYLES[0]);
  const [result, setResult] = useState<AdviceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState("");

  const canGenerate = useMemo(() => message.trim().length > 0 && !loading, [message, loading]);

  async function copyText(text: string, key: string) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(""), 1800);
    } catch {
      setError("复制失败了，可以先手动选中这句回复复制。");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canGenerate) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const advice = await generateAdvice({
        message: message.trim(),
        relationType,
        chatGoal,
        replyStyle,
      });
      setResult(advice);
    } catch (error) {
      if (error instanceof Error && error.message === "missing_openai_api_key") {
        setError("还没有配置服务端 API Key，请先在 .env 中填写后再测试生成回复。");
      } else {
        setError("生成回复建议失败了，请稍后再试。");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-paper">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-8 pt-[calc(env(safe-area-inset-top)+16px)]">
        <header className="mb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-normal text-ink">聊天回复教练</h1>
              <p className="mt-1 text-sm leading-6 text-muted">先理解对方，再写一句像你会说的话。</p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mint text-white shadow-soft">
              <Sparkles size={22} aria-hidden="true" />
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="rounded-lg border border-ink/8 bg-white p-4 shadow-soft">
            <label htmlFor="message" className="text-sm font-semibold text-ink">
              粘贴对方刚刚发来的消息
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={EXAMPLE_MESSAGE}
              rows={7}
              className="mt-3 min-h-40 w-full resize-none rounded-lg border border-ink/10 bg-paper px-3 py-3 text-base leading-7 text-ink outline-none transition placeholder:text-muted/70 focus:border-mint focus:bg-white focus:ring-4 focus:ring-mint/10"
            />
          </section>

          <section className="space-y-4 rounded-lg border border-ink/8 bg-white p-4 shadow-soft">
            <PreferenceGroup
              label="关系类型"
              options={RELATION_TYPES}
              value={relationType}
              onChange={setRelationType}
            />
            <PreferenceGroup
              label="聊天目标"
              options={CHAT_GOALS}
              value={chatGoal}
              onChange={setChatGoal}
            />
            <PreferenceGroup
              label="回复风格"
              options={REPLY_STYLES}
              value={replyStyle}
              onChange={setReplyStyle}
            />
          </section>

          <section className="flex items-start gap-2 rounded-lg border border-mint/20 bg-mint-soft px-3 py-3 text-sm leading-6 text-ink">
            <ShieldCheck className="mt-0.5 shrink-0 text-mint" size={18} aria-hidden="true" />
            <p>不读取微信，不自动发送，默认不保存聊天记录。</p>
          </section>

          {error && (
            <div
              className="rounded-lg border border-coral/20 bg-coral-soft px-3 py-3 text-sm leading-6 text-ink"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canGenerate}
            className={[
              "flex h-12 w-full items-center justify-center gap-2 rounded-full text-base font-semibold",
              "transition focus:outline-none focus:ring-4 focus:ring-mint/20",
              canGenerate
                ? "bg-mint text-white shadow-soft active:translate-y-px"
                : "bg-ink/10 text-muted",
            ].join(" ")}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} aria-hidden="true" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles size={20} aria-hidden="true" />
                生成回复建议
              </>
            )}
          </button>
        </form>

        <div className="mt-5">
          {loading && (
            <section className="rounded-lg border border-ink/8 bg-white p-4 text-sm leading-6 text-muted shadow-soft">
              正在分析对方情绪和这段关系里的说话分寸...
            </section>
          )}
          {result && <ResultPanel result={result} copiedKey={copiedKey} onCopy={copyText} />}
        </div>
      </div>
    </main>
  );
}

export default App;
