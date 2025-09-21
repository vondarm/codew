# Проект CodeW — стартовый каркас

Этот репозиторий содержит заготовку для продукта CodeW на базе Next.js 15 с App Router, TypeScript, Material UI, Prisma и инструментария для контроля качества кода.

## Требования

- Node.js 20 LTS или выше (в проекте тестировалось на Node 22)
- Yarn 4 (Berry) — поставляется вместе с Corepack (`corepack enable`)
- PostgreSQL 14+ (локальный экземпляр или контейнер, доступный по `DATABASE_URL`)

## Быстрый старт

```bash
# Установка зависимостей
yarn install

# Подготовка переменных окружения
cp .env.example .env
# Обновите DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET согласно инструкциям из docs/auth.md

# Применение миграций и генерация клиента
yarn prisma migrate dev

# Запуск приложения в dev-режиме
yarn dev
```

Приложение будет доступно по адресу <http://localhost:3000>.

> Перед запуском убедитесь, что Postgres доступен и переменная `DATABASE_URL` указывает на нужную базу.

## Скрипты Yarn

| Скрипт                 | Назначение                                                              |
| ---------------------- | ----------------------------------------------------------------------- |
| `yarn dev`             | Запуск Next.js dev-сервера.                                             |
| `yarn build`           | Сборка production-версии приложения с запуском `prisma migrate deploy`. |
| `yarn start`           | Запуск собранного приложения.                                           |
| `yarn lint`            | Проверка ESLint во всем репозитории.                                    |
| `yarn lint:fix`        | Автоматическое исправление обнаруженных замечаний ESLint.               |
| `yarn format`          | Форматирование файлов с помощью Prettier.                               |
| `yarn format:check`    | Проверка форматирования без внесения изменений.                         |
| `yarn prisma:generate` | Генерация Prisma Client.                                                |
| `yarn prisma:db-push`  | Синхронизация схемы Prisma с базой из `DATABASE_URL` (PostgreSQL).      |

## Husky и lint-staged

Перед каждым коммитом автоматически выполняется `lint-staged`, который запускает ESLint и Prettier для затронутых файлов. При наличии ошибок коммит будет остановлен.

## Настройка Prisma

- Схема хранится в `prisma/schema.prisma` и рассчитана на PostgreSQL. Перед выполнением команд Prisma проверьте переменную окружения `DATABASE_URL`.
- После изменения схемы выполните `yarn prisma migrate dev` для создания миграции, обновления базы и генерации клиента. Команда скачивает движки Prisma с `binaries.prisma.sh`, убедитесь, что есть доступ в интернет.
- В офлайн-средах можно указать зеркало с помощью переменной `PRISMA_ENGINES_MIRROR` или отключить проверку контрольных сумм через `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1`.
- Для проверки данных можно использовать `yarn prisma studio` через `yarn dlx prisma studio` (опционально).

## Структура темизации MUI

- Тема определяется в `src/theme/index.ts`.
- Провайдер темы подключён в `src/app/layout.tsx` через компонент `AppThemeProvider`.
- Пример использования компонент Material UI доступен на главной странице `src/app/page.tsx`.

## Smoke-checklist

| Статус | Проверка                   | Команда                   |
| ------ | -------------------------- | ------------------------- |
| ✅     | Линт без ошибок            | `yarn lint`               |
| ✅     | Успешная сборка            | `yarn build`              |
| ✅     | Dev-сервер запускается     | `yarn dev`                |
| ⚠️     | Синхронизация схемы Prisma | `yarn prisma migrate dev` |

> Примечание: для запуска dev-сервера в первый раз убедитесь, что база данных создана командой `yarn prisma migrate dev`.

## Настройка аутентификации

- Конфигурация NextAuth расположена в `src/lib/auth.ts`, а обработчик маршрута — в `src/app/api/auth/[...nextauth]/route.ts`.
- Для работы входа через Google заполните переменные окружения в `.env` (см. `docs/auth.md`).
- Утилиты `login` и `logout` для клиентских компонентов размещены в `src/lib/auth-client.ts`, серверный доступ к сессии обеспечивает `getCurrentUser` из `src/lib/auth.ts`.
