"use client";

import { useEffect, useMemo, useState } from "react";
import ActionCard from "@/components/ActionCard";
import { generateDocument, rephraseItem, replaceItem, streamGenerate } from "@/lib/api";
import type { SuggestionItem } from "@/lib/types";

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [goals, setGoals] = useState<SuggestionItem[]>([]);
  const [tasks, setTasks] = useState<SuggestionItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasksStageVisible, setTasksStageVisible] = useState(false);
  const [profile, setProfile] = useState<"gost" | "msu" | "hse">("gost");
  const [docError, setDocError] = useState<string | null>(null);
  const [form, setForm] = useState({
    university: "",
    faculty: "",
    department: "",
    workTitle: "",
    studentName: "",
    supervisorName: "",
    city: "",
    year: new Date().getFullYear().toString()
  });

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
    setDocError(null);
    setForm((prev) => ({ ...prev, workTitle: topic.trim() }));
    setIsGenerating(true);

    try {
      await streamGenerate(topic, (chunk) => {
        if (chunk.type === "goal") {
          setGoals((prev) => [
            ...prev,
            { id: chunk.id, type: chunk.type, text: chunk.text, selected: true }
          ]);
          return;
        }

        setTasks((prev) => [
          ...prev,
          { id: chunk.id, type: chunk.type, text: chunk.text, selected: true }
        ]);
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

  const toggleSelect = (id: string) => {
    setGoals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
    setTasks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleFormChange =
    (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleGenerateDoc = async () => {
    const selectedGoals = goals.filter((item) => item.selected).map((item) => item.text);
    const selectedTasks = tasks.filter((item) => item.selected).map((item) => item.text);

    if (!selectedGoals.length || !selectedTasks.length) {
      setDocError("Выберите хотя бы одну цель и одну задачу для генерации документа.");
      return;
    }

    if (
      !form.university.trim() ||
      !form.faculty.trim() ||
      !form.department.trim() ||
      !form.workTitle.trim() ||
      !form.studentName.trim() ||
      !form.supervisorName.trim() ||
      !form.city.trim() ||
      !form.year.trim()
    ) {
      setDocError("Пожалуйста, заполните все поля титульного листа.");
      return;
    }

    setDocError(null);
    setIsGeneratingDoc(true);

    try {
      const blob = await generateDocument({
        profile,
        title: form,
        goals: selectedGoals,
        tasks: selectedTasks
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "diplom-structure.docx";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setDocError(err instanceof Error ? err.message : "Не удалось сформировать документ.");
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  useEffect(() => {
    if (goals.length > 0) {
      const timer = window.setTimeout(() => setTasksStageVisible(true), 120);
      return () => window.clearTimeout(timer);
    }

    setTasksStageVisible(false);
  }, [goals.length]);

  const showTasksStage = tasksStageVisible || tasks.length > 0;
  const showDocStage = tasks.length > 0;

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
              <p className="text-xs uppercase tracking-[0.2em] text-slate">
                Отметьте нужные варианты, они попадут в документ.
              </p>
              <div className="flex flex-col gap-4">
                {goals.length ? (
                  goals.map((goal) => (
                    <ActionCard
                      key={goal.id}
                      item={goal}
                      onRephrase={handleRephrase}
                      onReplace={handleReplace}
                      onToggleSelect={toggleSelect}
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
                        onToggleSelect={toggleSelect}
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

          {showDocStage && (
            <div className="funnel-stage relative flex gap-6 is-visible">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-sm font-semibold text-ink">
                03
              </div>
              <div className="flex flex-1 flex-col gap-6">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-serif text-2xl text-ink">Титульный лист и структура</h2>
                  <span className="text-xs uppercase tracking-[0.2em] text-slate">
                    Document stage
                  </span>
                </div>
                <p className="text-sm text-slate">
                  Выберите профиль оформления и заполните данные для титульного листа. На основе
                  выбранных целей и задач мы соберём каркас диплома и Word-файл.
                </p>

                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    {
                      id: "gost",
                      title: "По ГОСТ (база)",
                      hint: "Базовая структура с опорой на ГОСТ."
                    },
                    {
                      id: "msu",
                      title: "МГУ",
                      hint: "Приоритет требований методички МГУ."
                    },
                    {
                      id: "hse",
                      title: "НИУ ВШЭ",
                      hint: "Приоритет требований методички ВШЭ."
                    }
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setProfile(option.id as "gost" | "msu" | "hse")}
                      className={`rounded-2xl border px-4 py-4 text-left text-sm transition ${
                        profile === option.id
                          ? "border-ink bg-ink text-white"
                          : "border-border bg-white text-slate hover:border-slate"
                      }`}
                    >
                      <p className="text-sm font-semibold">{option.title}</p>
                      <p className="text-xs opacity-80">{option.hint}</p>
                    </button>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    value={form.university}
                    onChange={handleFormChange("university")}
                    placeholder="Университет"
                    className="rounded-2xl border border-border bg-white px-5 py-3 text-sm shadow-sm outline-none transition focus:border-slate"
                  />
                  <input
                    value={form.faculty}
                    onChange={handleFormChange("faculty")}
                    placeholder="Факультет / институт"
                    className="rounded-2xl border border-border bg-white px-5 py-3 text-sm shadow-sm outline-none transition focus:border-slate"
                  />
                  <input
                    value={form.department}
                    onChange={handleFormChange("department")}
                    placeholder="Кафедра / программа"
                    className="rounded-2xl border border-border bg-white px-5 py-3 text-sm shadow-sm outline-none transition focus:border-slate"
                  />
                  <input
                    value={form.workTitle}
                    onChange={handleFormChange("workTitle")}
                    placeholder="Тема диплома"
                    className="rounded-2xl border border-border bg-white px-5 py-3 text-sm shadow-sm outline-none transition focus:border-slate"
                  />
                  <input
                    value={form.studentName}
                    onChange={handleFormChange("studentName")}
                    placeholder="ФИО студента"
                    className="rounded-2xl border border-border bg-white px-5 py-3 text-sm shadow-sm outline-none transition focus:border-slate"
                  />
                  <input
                    value={form.supervisorName}
                    onChange={handleFormChange("supervisorName")}
                    placeholder="Научный руководитель"
                    className="rounded-2xl border border-border bg-white px-5 py-3 text-sm shadow-sm outline-none transition focus:border-slate"
                  />
                  <input
                    value={form.city}
                    onChange={handleFormChange("city")}
                    placeholder="Город"
                    className="rounded-2xl border border-border bg-white px-5 py-3 text-sm shadow-sm outline-none transition focus:border-slate"
                  />
                  <input
                    value={form.year}
                    onChange={handleFormChange("year")}
                    placeholder="Год"
                    className="rounded-2xl border border-border bg-white px-5 py-3 text-sm shadow-sm outline-none transition focus:border-slate"
                  />
                </div>

                {docError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {docError}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={handleGenerateDoc}
                    className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-black"
                    disabled={isGeneratingDoc}
                  >
                    {isGeneratingDoc ? "Формируем Word..." : "Скачать Word-файл"}
                  </button>
                  <p className="text-xs text-slate">
                    В файл попадут выбранные цели и задачи, а также структура диплома.
                  </p>
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
