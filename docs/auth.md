# Настройка аутентификации

Эта страница описывает, как подготовить окружение для аутентификации через Google OAuth в проекте CodeW.

## Переменные окружения

Скопируйте `.env.example` в `.env` и задайте значения переменных:

| Переменная             | Описание                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | Строка подключения к PostgreSQL (например, `postgresql://postgres:postgres@localhost:5432/codew?schema=public`). |
| `NEXTAUTH_SECRET`      | Произвольная строка, используемая для подписи токенов NextAuth. Генерируйте случайное значение.                  |
| `NEXTAUTH_URL`         | Базовый URL приложения. Для локальной разработки используйте `http://localhost:3000`.                            |
| `GOOGLE_CLIENT_ID`     | Идентификатор OAuth-клиента Google.                                                                              |
| `GOOGLE_CLIENT_SECRET` | Секрет OAuth-клиента Google.                                                                                     |

> Совет: `NEXTAUTH_SECRET` можно сгенерировать командой `openssl rand -base64 32`.

## Создание Google OAuth Credentials

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/).
2. Создайте новый проект либо используйте существующий.
3. В разделе **APIs & Services → Credentials** создайте OAuth Client ID.
   - Тип приложения: **Web application**.
   - Добавьте авторизованный JavaScript origin: `http://localhost:3000`.
   - Добавьте авторизованный redirect URI: `http://localhost:3000/api/auth/callback/google`.
4. Сохраните выданные `Client ID` и `Client Secret` и пропишите их в `.env`.

## Генерация Prisma Client и синхронизация базы

После обновления `.env` выполните:

```bash
yarn prisma migrate dev # создаст/обновит базу данных
yarn prisma generate    # сгенерирует Prisma Client
```

В репозитории уже есть миграция `add_auth`, поэтому повторное выполнение команды `migrate dev` просто применит изменения к локальной базе.

## Утилиты аутентификации

- `getCurrentUser` (`src/lib/auth.ts`) — серверная функция, возвращающая пользователя текущей сессии или `null`.
- `getServerAuthSession` (`src/lib/auth.ts`) — обёртка над `getServerSession` для Server Actions.
- `login` и `logout` (`src/lib/auth-client.ts`) — клиентские функции, вызывающие `signIn`/`signOut` из `next-auth/react`.

Пример использования в клиентском компоненте:

```tsx
"use client";

import { login, logout } from "@/lib/auth-client";

export function AuthButtons() {
  return (
    <div>
      <button onClick={() => login()}>Войти через Google</button>
      <button onClick={() => logout({ callbackUrl: "/" })}>Выйти</button>
    </div>
  );
}
```

Пример в серверном компоненте:

```tsx
import { getCurrentUser } from "@/lib/auth";

export default async function Dashboard() {
  const user = await getCurrentUser();

  return <pre>{JSON.stringify(user, null, 2)}</pre>;
}
```

## Smoke-checklist

- Вход через тестовый Google-аккаунт перенаправляет пользователя обратно в приложение и создаёт запись в базе `User`.
- `getCurrentUser` возвращает данные текущего пользователя в серверном компоненте/Server Action.
- Функция `logout` завершает сессию и очищает куки.
