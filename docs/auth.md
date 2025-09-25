# Настройка аутентификации

Эта страница описывает, как подготовить окружение для аутентификации через Google, GitHub и Яндекс OAuth в проекте CodeW.

## Переменные окружения

Скопируйте `.env.example` в `.env` и задайте значения переменных:

| Переменная             | Описание                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | Строка подключения к PostgreSQL (например, `postgresql://postgres:postgres@localhost:5432/codew?schema=public`). |
| `NEXTAUTH_SECRET`      | Произвольная строка, используемая для подписи токенов NextAuth. Генерируйте случайное значение.                  |
| `NEXTAUTH_URL`         | Базовый URL приложения. Для локальной разработки используйте `http://localhost:3000`.                            |
| `GOOGLE_CLIENT_ID`     | Идентификатор OAuth-клиента Google.                                                                              |
| `GOOGLE_CLIENT_SECRET` | Секрет OAuth-клиента Google.                                                                                     |
| `GITHUB_CLIENT_ID`     | Идентификатор OAuth-приложения GitHub.                                                                           |
| `GITHUB_CLIENT_SECRET` | Секрет OAuth-приложения GitHub.                                                                                  |
| `YANDEX_CLIENT_ID`     | Идентификатор OAuth-приложения Яндекса.                                                                          |
| `YANDEX_CLIENT_SECRET` | Пароль OAuth-приложения Яндекса.                                                                                 |

> Совет: `NEXTAUTH_SECRET` можно сгенерировать командой `openssl rand -base64 32`.

## Создание Google OAuth credentials

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/).
2. Создайте новый проект либо используйте существующий.
3. В разделе **APIs & Services → Credentials** создайте OAuth Client ID.
   - Тип приложения: **Web application**.
   - Добавьте авторизованный JavaScript origin: `http://localhost:3000`.
   - Добавьте авторизованный redirect URI: `http://localhost:3000/api/auth/callback/google`.
4. Сохраните выданные `Client ID` и `Client Secret` и пропишите их в `.env`.

## Создание GitHub OAuth credentials

1. Перейдите в [настройки разработчика GitHub](https://github.com/settings/developers).
2. В разделе **OAuth Apps** нажмите **New OAuth App**.
3. Заполните форму:
   - **Application name** — произвольное название.
   - **Homepage URL** — `http://localhost:3000` для локальной разработки.
   - **Authorization callback URL** — `http://localhost:3000/api/auth/callback/github`.
4. После создания нажмите **Generate a new client secret**.
5. Сохраните `Client ID` и сгенерированный `Client secret` и пропишите их в `.env`.

## Создание Яндекс OAuth credentials

1. Перейдите на [страницу регистрации приложения Яндекс OAuth](https://oauth.yandex.ru/client/new).
2. Укажите произвольное название и выберите тип приложения **Веб-сервисы**.
3. В блоке **Платформы** добавьте платформу «Веб-сервисы» и задайте URL сайта `http://localhost:3000`.
4. В поле **Callback URL** (Redirect URI) укажите `http://localhost:3000/api/auth/callback/yandex`.
5. Сохраните приложение и на странице его настроек создайте пароль. Пропишите `ID приложения` и `Пароль приложения` в `.env` как `YANDEX_CLIENT_ID` и `YANDEX_CLIENT_SECRET`.

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
      <button onClick={() => login("google")}>Войти через Google</button>
      <button onClick={() => login("github")}>Войти через GitHub</button>
      <button onClick={() => login("yandex")}>Войти через Яндекс</button>
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

- Вход через любой из настроенных OAuth-провайдеров (Google, GitHub или Яндекс) перенаправляет пользователя обратно в приложение и создаёт запись в базе `User`.
- `getCurrentUser` возвращает данные текущего пользователя в серверном компоненте/Server Action.
- Функция `logout` завершает сессию и очищает куки.
