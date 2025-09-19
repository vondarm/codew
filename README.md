# CodeW Starter Kit

Стартовый каркас приложения на Next.js 15 с App Router, Material UI и Prisma. Репозиторий настроен на использование Yarn (Berry), TypeScript, ESLint, Prettier и Husky с lint-staged.

## Быстрый старт

1. Установите зависимости: `yarn install`
2. Скопируйте переменные окружения: `cp .env.example .env`
3. Примените схему БД и сгенерируйте Prisma Client: `yarn prisma:db-push`
4. Запустите dev-сервер: `yarn dev`

Подробные инструкции и чек-лист smoke-проверок доступны в [docs/setup.md](docs/setup.md).

> Файл `prisma/dev.db` исключён из Git. Production-сборка (`yarn build`) автоматически очищает локальную базу и пересобирает её по схеме Prisma.

## Основные возможности

- ✅ Next.js 15, React 19 и Turbopack для быстрого дев-цикла.
- 🎨 Material UI с готовой темой (`src/theme/index.ts`) и примером интерфейса на главной странице.
- 🛡️ ESLint + Prettier + Husky + lint-staged для единого стиля и pre-commit проверок.
- 🗄️ Prisma ORM с dev-базой SQLite (`prisma/schema.prisma`).
- 📦 Yarn Berry с преднастроенными скриптами (`package.json`).

## Полезные ссылки

- [Next.js documentation](https://nextjs.org/docs)
- [Material UI documentation](https://mui.com/material-ui/getting-started/overview/)
- [Prisma documentation](https://www.prisma.io/docs)
