import type { AdviceRequest, AdviceResult } from "./types";

function isAdviceResult(value: unknown): value is AdviceResult {
  const item = value as AdviceResult;
  return (
    typeof item?.emotion_analysis === "string" &&
    typeof item?.avoid_reply === "string" &&
    typeof item?.replies?.natural === "string" &&
    typeof item?.replies?.humorous === "string" &&
    typeof item?.replies?.warm === "string" &&
    typeof item?.replies?.progressive === "string" &&
    typeof item?.best_reply === "string" &&
    typeof item?.reason === "string"
  );
}

export async function generateAdvice(payload: AdviceRequest): Promise<AdviceResult> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorCode =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : "generate_failed";
    throw new Error(errorCode);
  }

  if (!isAdviceResult(data)) {
    throw new Error("generate_failed");
  }

  return data;
}
