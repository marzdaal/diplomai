# MVP: веб‑продукт для помощи студентам с дипломами (RU)

## 1) Assumptions (допущения)
- Авторизация в MVP отсутствует; идентификация через `session_id` (cookie).
- Пользователь вводит тему вручную; AI генерирует «Цели» и «Задачи».
- Данные **не сохраняются между сессиями** (по требованиям).
- Основной язык интерфейса и генерации — **русский**.
- Бюджет ограничен; предпочтение бесплатным/дешёвым managed‑сервисам.
- Высокий UX приоритетнее расширяемости сейчас, но архитектура готова к росту.

---

## 2) Рекомендуемый стек (с аргументацией)

### Frontend
- **Framework:** Next.js (TypeScript)
  - Быстрый старт, SSR/Streaming, простое деплой‑окружение.
- **UI:** Tailwind CSS + shadcn/ui (академичный, строгий стиль)
  - Можно стилизовать под «Claude Code» — спокойная типографика, бежево‑серые оттенки, тонкие разделители.
- **State:** React Query (TanStack Query)
  - Отлично подходит для работы с запросами и локального обновления одного элемента.
- **Forms:** React Hook Form + zod
  - Надёжная валидация ввода.

### Backend/API
- **Python + FastAPI**
  - Высокая производительность, удобный async + streaming.
- Архитектура: **легкий монолит** (API + AI‑слой + store), готовый к разделению.

### AI provider + промптинг
- **Рекомендация по умолчанию:** OpenAI (модель уровня GPT‑4o‑mini/mini)
  - Дёшево и быстро. Для теста можно использовать более слабую/дешёвую версию.
- **Промпт‑шаблоны:**
  - `Generate`: 3–6 целей, 5–10 задач, в академическом стиле, по теме.
  - `Rephrase`: сохранить смысл, изменить формулировку.
  - `Replace`: альтернативная формулировка с тем же назначением.
- **Температура:**
  - Rephrase: 0.4–0.6
  - Replace: 0.7–0.9
- **Safety:** минимальные фильтры (проверка длины, стоп‑слова).

### Database + схема данных
- **PostgreSQL (managed)**
  - Для будущих функций (версии, планы, оглавления).
- В MVP можно хранить только временные данные с TTL.

### Cache/Queue
- **Redis (managed)**
  - Rate limit + кэш повторных запросов (Rephrase/Replace).

### Auth
- Пока не нужен, но закладываем:
  - `session_id` как будущий `user_id` (nullable).
  - Структуру таблиц с `user_id`.

### Hosting / Infra (рекомендация + альтернативы)
**Рекомендовано (по умолчанию):**
- **Frontend:** Vercel (free/low‑cost)
- **Backend:** Render или Fly.io (простота контейнеров)
- **DB:** Supabase Postgres (free tier)
- **Redis:** Upstash (free tier)

**Альтернативы:**
1) **GCP Cloud Run**
   - Лёгкий деплой контейнеров. Быстрое масштабирование.
2) **AWS (Lambda + API Gateway)**
   - Хороший масштаб, но сложнее streaming и выше DevOps‑порог.
3) **Railway**
   - Очень быстрый запуск, но менее предсказуемая стоимость.

### Observability
- Sentry (frontend + backend)
- Логи: JSON + простой dashboard

### CI/CD
- GitHub Actions: lint + tests + deploy

### Стоимость
- **Low/Medium**
  - Основной драйвер — AI запросы.
  - Хранение минимально.

---

## 3) Архитектура (high level)

```
[Web Client (Next.js)]
        |
        v
[FastAPI Backend] --(stream)--> [AI Provider]
        |                         
        +--> [Redis: rate limit/cache]
        +--> [Postgres: future расширения]
```

### Потоки данных
**Generate**:
1. Client -> POST /generate (topic)
2. Backend -> AI stream
3. Backend -> stream to client
4. Client показывает потоковые элементы

**Rephrase**:
1. Client -> POST /items/{id}/rephrase
2. Backend -> AI -> новая формулировка
3. UI обновляет один элемент

**Replace**:
1. Client -> POST /items/{id}/replace
2. Backend -> AI -> новая альтернатива
3. UI заменяет элемент

### Где лимиты/кэш/ретраи
- Rate limit в Redis (per session/IP)
- Кэш переформулировок по hash(item_text + action)
- Timeout 15–20s
- Retry 1–2 раза для AI

---

## 4) UX/UI спецификация (MVP)

### Экран
- Одна страница:
  - Поле ввода темы
  - Кнопка «Сгенерировать»
  - Секция «Цели»
  - Секция «Задачи»

### Состояния
- Empty: ничего не введено
- Loading: skeleton + progress
- Partial: stream частично получен
- Error: сообщение + retry

### Поведение кнопок
- **Переформулировать**: заменяет текст, сохраняя смысл
- **Заменить**: новый альтернативный вариант

### Обновление одного элемента
- React Query: локальный cache update по id

### Streaming
- Появление карточек по мере генерации
- Возможность отмены запроса

---

## 5) API контракт (MVP)

### POST /generate
```json
{ "topic": "Влияние ИИ на дипломные работы" }
```
Streaming response:
```json
{ "type": "goal", "id": "g1", "text": "..." }
{ "type": "task", "id": "t1", "text": "..." }
```

### POST /items/{id}/rephrase
```json
{ "type": "goal" }
```

### POST /items/{id}/replace
```json
{ "type": "task" }
```

### Ошибки
```json
{ "error": { "code": "RATE_LIMIT", "message": "Too many requests" } }
```

---

## 6) Производительность и масштабирование до 1000 concurrent
- **Streaming** снижает perceived latency.
- **Async FastAPI** + connection pooling.
- **Rate limit** и **quota** для защиты бюджета.
- **Кэш** rephrase/replace при повторе.

---

## 7) Security & Privacy
- CORS ограничен доменом.
- Валидация input + лимит длины.
- Secrets в managed vault.
- **Retention:** 0 дней (по требованиям — не хранить), только временно в памяти/кэше.

---

## 8) План разработки

### 1–2 недели (MVP)
**Milestone 1:** UI + streaming generate
- Acceptance: генерируются цели/задачи, потоковый UI.

**Milestone 2:** Per-item rephrase/replace
- Acceptance: кнопки работают, обновление карточек.

**Milestone 3:** Rate limit + monitoring
- Acceptance: лимиты, метрики, базовые логи.

### Backlog (v1)
- Личный кабинет
- История сессий
- Экспорт DOCX/PDF
- План/оглавление, главы

---

## 9) Риски и альтернативы

### Альтернативные стеки
1. **Node.js + NestJS**
   - + Единый язык
   - − меньше AI‑экосистема
2. **Serverless AWS**
   - + Масштаб
   - − сложнее streaming

### Когда мигрировать
- >10k concurrent -> Cloud Run / k8s
- Высокая стоимость AI -> оптимизация кэша/батчинг

---

## Уточняющие вопросы
1. Нужен ли экспорт в DOCX/PDF в ближайшие 2–3 месяца?
2. Какой лимит запросов на пользователя/сессию допустим?
3. Хотите ли вы сохранять историю для аналитики (анонимно)?
4. Есть ли желаемая цветовая палитра для академичного UI?
5. Нужна ли интеграция со справочниками/ГОСТ?
6. Планируется ли мобильная версия сразу?
7. Нужна ли возможность ручного редактирования элементов?
