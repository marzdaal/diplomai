import type { StreamChunk } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function streamGenerate(topic: string, onChunk: (chunk: StreamChunk) => void) {
  const response = await fetch(`${API_BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic })
  });

  if (!response.ok || !response.body) {
    throw new Error("Не удалось получить ответ от сервера");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const chunk = JSON.parse(line) as StreamChunk;
      onChunk(chunk);
    }
  }
}

export async function rephraseItem(id: string, type: "goal" | "task") {
  const response = await fetch(`${API_BASE}/items/${id}/rephrase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type })
  });

  if (!response.ok) {
    throw new Error("Не удалось переформулировать");
  }

  return (await response.json()) as { id: string; text: string };
}

export async function replaceItem(id: string, type: "goal" | "task") {
  const response = await fetch(`${API_BASE}/items/${id}/replace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type })
  });

  if (!response.ok) {
    throw new Error("Не удалось заменить формулировку");
  }

  return (await response.json()) as { id: string; text: string };
}
