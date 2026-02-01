"use client";

import { useEffect, useMemo, useState } from "react";
import ActionCard from "@/components/ActionCard";
import { rephraseItem, replaceItem, streamGenerate } from "@/lib/api";
import type { SuggestionItem } from "@/lib/types";

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [goals, setGoals] = useState<SuggestionItem[]>([]);
  const [tasks, setTasks] = useState<SuggestionItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasksStageVisible, setTasksStageVisible] = useState(false);

  const isEmpty = useMemo(() => !goals.length && !tasks.length, [goals.length, tasks.length]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Пожалуйста, введите тему дипломной работы.");
      return;
    }

    setError(null);
    setGoals([]);
    setTasks([]);
    setTasksStageVisible(false);
    setIsGenerating(true);

    try {
      await streamGenerate(topic, (chunk) => {
        if (chunk.type === "goal") {
          setGoals((prev) => [...prev, { id: chunk.id, type: chunk.type, text: chunk.text }]);
          return;
        }

        setTasks((prev) => [...prev, { id: chunk.id, type: chunk.type, text: chunk.text }]);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось получить ответ.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRephrase = async (id: string) => {
    const updateItem = async (
      items: SuggestionItem[],
      setItems: React.Dispatch<React.SetStateAction<SuggestionItem[]>>
    ) => {
      const current = items.find((item) => item.id === id);
      if (!current) return;

      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: "loading" } : item))
      );

      try {
        const updated = await rephraseItem(id, current.type);
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, text: updated.text, status: "idle" } : item))
        );
      } catch {
        setError("Не удалось переформулировать элемент.");
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: "idle" } : item))
        );
      }
    };

    await updateItem(goals, setGoals);
    await updateItem(tasks, setTasks);
  };

  const handleReplace = async (id: string) => {
    const updateItem = async (
      items: SuggestionItem[],
      setItems: React.Dispatch<React.SetStateAction<SuggestionItem[]>>
    ) => {
      const current = items.find((item) => item.id === id);
      if (!current) return;

      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: "loading" } : item))
      );

      try {
        const updated = await replaceItem(id, current.type);
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, text: updated.text, status: "idle" } : item))
        );
      } catch {
        setError("Не удалось заменить формулировку.");
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: "idle" } : item))
        );
      }
    };

    await updateItem(goals, setGoals);
    await updateItem(tasks, setTasks);
  };

  useEffect(() => {
    if (goals.length > 0) {
      const timer = window.setTimeout(() => setTasksStageVisible(true), 120);
      return () => window.clearTimeout(timer);
    }

    setTasksStageVisible(false);
  }, [goals.length]);

  const showTasksStage = tasksStageVisible || tasks.length > 0;

  return (
    <main className="min-h-screen bg-canvas px-6 py-12">
      <section className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="flex flex-col gap-4 rounded-3xl border border-border bg-card px-8 py-10 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-slate">DiplomAI</p>
          <h1 className="font-serif text-3xl text-ink md:text-4xl">
            Академичный помощник для целей и задач дипломной работы
          </h1>
          <p className="max-w-2xl text-base text-slate">
            Введите тему диплома, чтобы получить несколько вариантов цели и задач. Вы можете
            переформулировать или заменить каждый пункт отдельно.
          </p>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Например: Влияние ИИ на качество дипломных исследований"
              className="flex-1 rounded-2xl border border-border bg-white px-5 py-3 text-sm shadow-sm outline-none transition focus:border-slate"
            />
            <button
              type="button"
              onClick={handleGenerate}
              className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-black"
              disabled={isGenerating}
            >
              {isGenerating ? "Генерация..." : "Сгенерировать"}
            </button>
          </div>
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </header>

        <section className="funnel flex flex-col gap-10 rounded-3xl border border-border bg-card px-6 py-10 shadow-sm md:px-10">
          <div className="relative flex gap-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-sm font-semibold text-ink">
              01
            </div>
            <div className="flex flex-1 flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-serif text-2xl text-ink">Формирование целей</h2>
                <span className="text-xs uppercase tracking-[0.2em] text-slate">Goal stage</span>
              </div>
              <p className="text-sm text-slate">
                На первом шаге формируем несколько формулировок цели. Отсюда начинается
                декомпозиция.
              </p>
              <div className="flex flex-col gap-4">
                {goals.length ? (
                  goals.map((goal) => (
                    <ActionCard
                      key={goal.id}
                      item={goal}
                      onRephrase={handleRephrase}
                      onReplace={handleReplace}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border px-6 py-8 text-sm text-slate">
                    Здесь появятся варианты целей после генерации.
                  </div>
                )}
              </div>
            </div>
          </div>

          {showTasksStage && (
            <div className="funnel-stage relative flex gap-6 is-visible">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-sm font-semibold text-ink">
                02
              </div>
              <div className="flex flex-1 flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-serif text-2xl text-ink">Декомпозиция на задачи</h2>
                  <span className="text-xs uppercase tracking-[0.2em] text-slate">Task stage</span>
                </div>
                <p className="text-sm text-slate">
                  После появления целей мы автоматически раскладываем их на перечень
                  исследовательских задач.
                </p>
                <div className="flex flex-col gap-4">
                  {tasks.length ? (
                    tasks.map((task) => (
                      <ActionCard
                        key={task.id}
                        item={task}
                        onRephrase={handleRephrase}
                        onReplace={handleReplace}
                      />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border px-6 py-8 text-sm text-slate">
                      Подбираем задачи на основе целей — первые варианты появятся через мгновение.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {isGenerating && isEmpty && (
          <section className="rounded-2xl border border-border bg-white px-6 py-5 text-sm text-slate">
            Генерация идёт... первые элементы появятся в ближайшие секунды.
          </section>
        )}
      </section>
    </main>
  );
}
