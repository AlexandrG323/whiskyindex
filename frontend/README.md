# Whisky Index — Frontend (React + TypeScript)

UI на React + TypeScript (сборка через Vite). Показывает продуктовую корзину, набор акций,
выбор диапазона лет и сравнение динамики.

## Запуск

```bash
npm install
npm run dev
```

Откроется на `http://localhost:5173`. Запросы к `/api/*` проксируются на backend
(`http://localhost:3000`) — см. `vite.config.ts`.

## Домашка

См. [HOMEWORK.md](./HOMEWORK.md) — левая панель навигации + пустые страницы через React Router.
Ориентир по UI: `mocks/mock1.png`, `mocks/mock2.png`.

## Дальше по плану

- [ ] Выбор диапазона лет.
- [ ] Графики динамики акций и стоимости корзины.
- [ ] Экран сравнения (2007 vs 2026: акции % / продукты %).
- [ ] Разбивка по каждой акции и продукту.
