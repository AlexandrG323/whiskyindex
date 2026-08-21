# Домашка: MCP в Cursor + Vercel Analytics

Задание на выходные. Сайт уже на Vercel, корзина и страницы работают — теперь учимся
**подключать внешние инструменты к агенту** и **считать, сколько людей заходят на прод**.

Читай параллельно:

- как ставить MCP в Cursor: [docs](https://cursor.com/docs/context/mcp)
- Vercel MCP (логи, деплои, потом и визиты): [docs](https://vercel.com/docs/mcp/vercel-mcp)
- Web Analytics quickstart (раздел **Create React App / React**): [docs](https://vercel.com/docs/analytics/quickstart)
- текущий код: `frontend/src/main.tsx`, `frontend/src/App.tsx`
- деплой фронта: корневой `README.md` → «Frontend (Vercel)», `frontend/vercel.json`

---



## Шаг 0 — MCP в Cursor (сделай первым делом!)

MCP (Model Context Protocol) — это «розетка»: Cursor-агент ходит в Jira / Neon / Vercel
сам, а не просит тебя копировать тикеты, схему БД и логи деплоя в чат.

Нужны **три** MCP. Neon у тебя уже залогинен — его только проверить. Jira и Vercel нужно **поставить и авторизовать**.

Проще всего через UI Cursor:

1. Открой **Customize** (шестерёнка в сайдбаре) → **MCPs**
2. Либо Marketplace: ищи плагин и **Add to Cursor**
3. Если сервер серый / `Needs login` — кликни и пройди OAuth в браузере
  (логин тем же аккаунтом, которым пользуешься в сервисе)


| Что        | Как поставить                                                                                                                                                                                                       | Auth                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Jira**   | Плагин [Atlassian](https://cursor.com/marketplace/mcp/atlassian). В репо уже есть `.cursor/mcp.json` с URL `https://mcp.atlassian.com/v1/mcp/authv2` — часто достаточно залогиниться, а не копировать конфиг заново | OAuth, нужен                       |
| **Neon**   | Плагин [Neon Postgres](https://cursor.com/marketplace/neon) (`/add-plugin neon-postgres`)                                                                                                                           | уже ок, только проверь что зелёный |
| **Vercel** | Официальный remote MCP. Добавь в `.cursor/mcp.json` рядом с `atlassian` (см. ниже)                                                                                                                                  | OAuth, нужен                       |


Фрагмент для Vercel (допиши в существующий `.cursor/mcp.json`, **не** затирай `atlassian`):

```json
"vercel": {
  "url": "https://mcp.vercel.com"
}
```

После сохранения Cursor покажет `Needs login` у `vercel` — залогинься аккаунтом,
на котором крутится фронт whiskyindex.

Токены и пароли в git **не клади**. OAuth остаётся в Cursor, в репо только публичный URL.

Проверка, что MCP живые — спроси агента (не гугли руками):

- Jira: «какие у меня открытые задачи в Jira?»
- Neon: «какие Neon-проекты мне доступны?» (должен ответить без повторного логина)
- Vercel: «какие у меня проекты на Vercel? где задеплоен frontend whiskyindex?»

> Наводящий вопрос: чем проектный `.cursor/mcp.json` отличается от `~/.cursor/mcp.json`?
> Что попадёт к тиммейту, если закоммитить URL, а что — нет?

---



## Шаг 1 — включи Web Analytics в дашборде Vercel

Пакет в коде **сам по себе ничего не считает**, пока в проекте на Vercel не нажато Enable.

1. [Vercel Dashboard](https://vercel.com/dashboard) → проект фронта whiskyindex
2. В сайдбаре **Analytics** → **Enable**
3. Дождись, пока включится (после следующего деплоя появятся роуты
  `/_vercel/insights/*`)

Если Шаг 0 сделан, можно спросить агента через Vercel MCP, какой это проект и
включён ли Analytics — но кнопку Enable всё равно стоит увидеть своими глазами.

> Наводящий вопрос: почему счётчик на локальном `localhost:5173` почти наверняка
> будет пустой, даже если компонент уже вставлен? Где тогда смотреть цифры?

---



## Зачем это нужно

Сайт публичный, без логина. Мы не знаем, заходят ли люди, с каких страниц
уходят, откуда пришли. Vercel Web Analytics как раз про это: визиты и просмотры
страниц, без Google Analytics и без cookie-баннера «ради метрики».

После домашки:

1. В Cursor подключены Jira, Neon, Vercel — агенту не нужно «вслепую»
2. На проде считается, сколько человек открыли сайт
3. В дашборде Vercel → Analytics видны Visitors / Pageviews
4. Переходы по React Router (`/`, `/about`, `/compare`, …) тоже видны как страницы,
  а не одна вечная `/`

---



## Что реализовать (чеклист)



### 1. Поставить `@vercel/analytics`

`node_modules` фронта ставим **на хосте**, чтобы `package.json` / lockfile уехали в git
(как в прошлой домашке с `react-router-dom`):

```bash
# из корня репо
cd frontend
npm install @vercel/analytics
cd ..
```

Это **не** `@vercel/analytics/next` — у нас Vite + React, не Next.js.

> Наводящий вопрос: что будет, если импортировать `@vercel/analytics/next` в Vite-приложение?
> Как это проявится — на `npm run typecheck` или только на проде?



### 2. Вставить компонент в приложение

Официальный React-вход:

```tsx
import { Analytics } from '@vercel/analytics/react'
```

Нужно один раз смонтировать `<Analytics />` так, чтобы он жил на **всех** страницах.

Куда логичнее:

- `frontend/src/main.tsx` — рядом с `BrowserRouter`, или
- `frontend/src/App.tsx` — внутри роутера (удобнее, если понадобится `useLocation`)

Не копируй компонент на каждую страницу (`HomePage`, `AboutPage`, …).

`frontend/vercel.json` **не трогай**: там уже rewrite `/api` на Fly. Если заменить его
на «все пути → `index.html`», сломается прокси API на проде.

> Наводящий вопрос: клик по `<Link to="/about">` не перезагружает документ.
> Откуда Analytics узнает, что сменилась страница? Нужно ли передавать `path`
> (посмотри пропсы в доке пакета), или компонента в корне достаточно?



### 3. Задеплоить и проверить на проде

Локальный `npm run dev` / Docker тут почти бесполезны: скрипт шлёт события
на Vercel с прод-деплоя.

После мержа/пуша в ветку, с которой собирается Vercel:

1. Дождись успешного деплоя (можно спросить агента через Vercel MCP: последний деплой, логи)
2. Открой прод в браузере, походи по `/`, `/about`, `/compare`
3. DevTools → Network: должен уйти запрос в духе `/_vercel/insights/view`
  (если фильтр мешает — ищи `insights` / `vercel`)
4. Dashboard → проект → **Analytics**: через несколько минут появятся Visitors / Pageviews
  (свой визит тоже считается; больших цифр за вечер может не быть — это ок)

Кастомные события (клики по кнопкам) на Hobby **не обязательны**. Нужны визиты и просмотры.

---



## Как устроен Vercel Analytics (кратко)

```text
браузер открыл прод
  → <Analytics /> вставляет скрипт
  → pageview уходит на /_vercel/insights/view
  → Vercel агрегирует Visitors / Pageviews / Referrers
  → смотришь в Dashboard (и позже — через Vercel MCP)
```

Типичные ошибки новичка:


| Симптом                                       | Причина                                    | Что сделать                                            |
| --------------------------------------------- | ------------------------------------------ | ------------------------------------------------------ |
| Дашборд пустой, кода нет                      | забыли Enable в Vercel                     | Шаг 1, потом новый деплой                              |
| Код есть, дашборд пустой                      | смотришь localhost / старый деплой         | открой **прод** после деплоя с `<Analytics />`         |
| `Cannot find module '@vercel/analytics/next'` | не тот entry                               | `@vercel/analytics/react`                              |
| Считается только `/`, внутренние роуты нет    | компонент вне роутера / не трекает history | держи его внутри `BrowserRouter`, сверь доку           |
| `/api` на проде 404 после правок              | сломали `vercel.json`                      | верни rewrite на Fly, не копируй чужой SPA-only конфиг |
| MCP `Needs login` вечно                       | OAuth не дожали / не тот аккаунт           | ещё раз Login, тот же email что в Jira/Vercel          |
| Агент не видит Vercel                         | URL не в `mcp.json` или сервер выключен    | Customize → MCPs, тогл включён                         |


---



## Сценарии тестирования



### Сценарий A — MCP

1. Customize → MCPs: Atlassian (Jira), Neon, Vercel включены, не красные
2. Агент отвечает по Jira (хотя бы список задач или «нет доступа к проекту X» — не «нет инструмента»)
3. Агент отвечает по Neon без повторного логина
4. Агент называет Vercel-проект фронта whiskyindex



### Сценарий B — код

1. В `frontend/package.json` есть `@vercel/analytics`
2. `<Analytics />` из `@vercel/analytics/react` монтируется один раз на всё приложение
3. Из корня: `npm run check` проходит
4. `frontend/vercel.json` по-прежнему проксирует `/api` на `https://whiskyindex.fly.dev`



### Сценарий C — прод

1. После деплоя главная на Vercel открывается как раньше
2. Network: запрос к `/_vercel/insights/...` при заходе и при переходе на другую страницу
3. Vercel → Analytics: виден хотя бы твой визит (может быть задержка в минуты)

---



## Подсказки по файлам (с чего начать)

Рекомендуемый порядок:

1. Шаг 0: MCP (Jira + Vercel залогинить, Neon проверить)
2. Шаг 1: Enable Analytics в дашборде
3. `cd frontend && npm install @vercel/analytics`
4. Вставь `<Analytics />` в `App.tsx` или `main.tsx`
5. `npm run check` из корня
6. PR → дождись деплоя Vercel → проверь Network и дашборд

---



## Критерии «готово»

- [ ] В Cursor работают MCP: Jira (Atlassian), Neon, Vercel
- [ ] Neon без повторного логина; Jira и Vercel прошли OAuth
- [ ] В `.cursor/mcp.json` есть `vercel` с `https://mcp.vercel.com` (atlassian не сломан)
- [ ] Web Analytics включён в Vercel-проекте фронта
- [ ] В приложении один `<Analytics />` из `@vercel/analytics/react`
- [ ] `npm run check` проходит (из корня репо)
- [ ] `vercel.json` не сломан (API на проде жив)
- [ ] На проде в Network есть insights-запрос
- [ ] Открой PR: скрин Customize → MCPs (три сервера) + скрин Vercel Analytics
  ```
  (хотя бы свой визит) + коротко куда поставил компонент и почему
  ```

Удачи. Если Stuck > 30 минут на «дашборд пустой» — сначала проверь, что смотришь
**прод после деплоя**, а не localhost, и что в Network вообще есть `insights`.
Не гадай, не добавляй Google Analytics «на всякий случай».