# CodeW Starter Kit

Стартовый каркас приложения на Next.js 15 с App Router, Material UI и Prisma. Репозиторий настроен на использование Yarn (Berry), TypeScript, ESLint, Prettier и Husky с lint-staged.

## Быстрый старт

1. Установите зависимости: `yarn install`
2. Скопируйте переменные окружения: `cp .env.example .env`
3. Примените миграции и сгенерируйте Prisma Client: `yarn prisma migrate dev`
4. Запустите dev-сервер: `yarn dev`

Подробные инструкции и чек-лист smoke-проверок доступны в [docs/setup.md](docs/setup.md). Обзор рабочих областей и сервисных контрактов — в [docs/workspaces.md](docs/workspaces.md).

> Перед запуском убедитесь, что переменная `DATABASE_URL` указывает на доступный экземпляр PostgreSQL.

## Основные возможности

- ✅ Next.js 15, React 19 и Turbopack для быстрого дев-цикла.
- 🎨 Material UI с готовой темой (`src/theme/index.ts`) и примером интерфейса на главной странице.
- 🧩 Страница `/workspaces` с CRUD-интерфейсом, Server Actions и валидацией slug рабочих областей.
- 🛡️ ESLint + Prettier + Husky + lint-staged для единого стиля и pre-commit проверок.
- 🗄️ Prisma ORM с dev-базой PostgreSQL (`prisma/schema.prisma`).
- 📦 Yarn Berry с преднастроенными скриптами (`package.json`).

## Полезные ссылки

- [Next.js documentation](https://nextjs.org/docs)
- [Material UI documentation](https://mui.com/material-ui/getting-started/overview/)
- [Prisma documentation](https://www.prisma.io/docs)
