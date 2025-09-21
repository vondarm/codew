# Управление рабочими областями

Страница `/workspaces` позволяет аутентифицированным пользователям создавать, редактировать и удалять рабочие области. Реализация использует Prisma, NextAuth и Server Actions Next.js 15.

## Модель базы данных

В `prisma/schema.prisma` добавлена модель `Workspace`:

```prisma
model Workspace {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  ownerId   String
  owner     User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([ownerId])
}

model User {
  // ...
  workspaces Workspace[]
}
```

- `slug` уникален на уровне базы и используется в URL.
- Поле `ownerId` связывает рабочую область с владельцем (модель `User`).
- При удалении пользователя каскадно удаляются его рабочие области.

Примените изменения командой:

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/codew?schema=public"
npx prisma migrate dev --name add-workspaces
```

Команда создаст файл `prisma/migrations/*_add_workspaces/migration.sql` и применит изменения к базе данных PostgreSQL.

## Сервисный слой

Основная бизнес-логика расположена в `src/lib/services/workspace.ts`:

- `createWorkspace(ownerId, { name, slug? })` — валидация названия, генерация slug и создание записи.
- `updateWorkspace(ownerId, workspaceId, { name, slug? })` — проверка прав владельца, переобновление slug с учётом уникальности.
- `deleteWorkspace(ownerId, workspaceId)` — удаление рабочего пространства с валидацией прав.
- `listWorkspaces(ownerId)` и `getWorkspace(ownerId, workspaceId)` — выборка рабочих областей пользователя.

Slug формируется функциями `slugify` и `withSlugFallback` (`src/lib/utils/slugify.ts`). При конфликте добавляется числовой суффикс (`design`, `design-2`, `design-3`, …).

## Server Actions

Для интеграции UI с сервером используются Server Actions в `src/app/workspaces/actions.ts`:

- `createWorkspaceAction` и `updateWorkspaceAction` работают с формами `useActionState`, возвращают ошибки валидации и сообщения об успехе.
- `deleteWorkspaceAction` вызывается напрямую из клиентского компонента через `useTransition`.
- Все действия проверяют, что пользователь аутентифицирован (`getCurrentUser`) и выполняют `revalidatePath("/workspaces")` после успешной операции.

## UI страницы `/workspaces`

Маршрут `src/app/workspaces/page.tsx` является защищённым — неавторизованных пользователей перенаправляет на страницу входа NextAuth. Список рабочих областей загружается на сервере и передаётся клиентскому компоненту `WorkspacesClient` (`src/app/workspaces/workspaces-client.tsx`).

Интерфейс построен на Material UI и включает:

- Таблицу с названиями, slug и датой создания.
- Диалог создания рабочей области с автоматической генерацией slug (можно переопределить вручную).
- Диалог редактирования с возможностью пересчитать slug.
- Диалог подтверждения удаления.
- Snackbar с уведомлениями об успешных действиях и отображение ошибок валидации в формах.

## Smoke-тест

1. Авторизуйтесь через `/api/auth/signin`, выбрав подходящего OAuth-провайдера (Google, GitHub или Яндекс; см. `docs/auth.md`).
2. Перейдите на `/workspaces` — список должен быть пустым.
3. Создайте новую рабочую область, убедитесь, что slug уникален и отображается в таблице.
4. Отредактируйте название и slug, убедитесь, что изменения применились.
5. Удалите рабочую область и убедитесь, что запись исчезла из списка.

При необходимости повторно примените миграции и перезапустите dev-сервер.
