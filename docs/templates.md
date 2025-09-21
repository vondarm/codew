# Библиотека шаблонов кода

Страница `/workspaces/[workspaceId]/templates` позволяет команде хранить и переиспользовать фрагменты кода внутри рабочей
области. Реализация включает обновлённую Prisma-схему, слой доступа к данным, сервис `TemplateService`, server actions и
Material UI интерфейс с формами создания/редактирования.

## Модель базы данных

В `prisma/schema.prisma` добавлена модель `Template` и enum `TemplateLanguage`:

```prisma
enum TemplateLanguage {
  JAVASCRIPT
  TYPESCRIPT
  REACT
}

model Template {
  id           String           @id @default(cuid())
  workspaceId  String
  createdById  String
  name         String
  description  String?
  hiddenDescription String?
  language     TemplateLanguage
  content      String
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  createdBy User      @relation(fields: [createdById], references: [id], onDelete: Cascade)

  @@index([workspaceId])
  @@unique([workspaceId, name])
}
```

- Каждому шаблону соответствует рабочая область и автор (`User`).
- Название уникально внутри рабочей области.
- При удалении рабочей области или автора шаблоны удаляются каскадно.
- Enum определяет поддерживаемые языки для фильтров и валидации.
- Поле `hiddenDescription` хранит заметки для интервьюеров и не отображается кандидату.

Миграции находятся в `prisma/migrations/20250922000000_add_templates/migration.sql` и `prisma/migrations/20250922010000_add_template_hidden_description/migration.sql`. Для применения изменений выполните:

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/codew?schema=public"
prisma migrate dev
prisma generate
```

## Доступ к данным

Файл `src/lib/prisma/template.ts` содержит CRUD-функции для таблицы `Template`:

- `createTemplate`, `updateTemplate`, `deleteTemplate` — операции модификации.
- `findTemplatesByWorkspace(workspaceId, { language? })` — список шаблонов по рабочей области и необязательному фильтру.
- `findTemplateById(id)` — получение конкретного шаблона.

Функции принимают опциональный `Prisma.TransactionClient`, что позволяет переиспользовать их внутри транзакций.

## Сервисный слой

`src/lib/services/template.ts` инкапсулирует бизнес-правила:

- Валидация названия (3–120 символов), описания (до 500 символов) и содержимого (до 20 000 символов).
- Валидация скрытого описания (до 1000 символов) с автоматическим обрезанием пробелов и преобразованием пустой строки в `null`.
- Проверка доступа: владелец или участник с ролью `ADMIN`/`EDITOR` может создавать и редактировать шаблоны, остальные видят
  только список.
- Обработка ошибок Prisma (`TemplateError` с кодами `VALIDATION_ERROR`, `FORBIDDEN`, `NOT_FOUND`).
- Утилита `serializeTemplateForClient` преобразует даты в ISO-строки и по флагу `includeHiddenDescription` добавляет скрытое описание в DTO.

## Server Actions

`src/app/workspaces/[workspaceId]/templates/actions.ts` реализует действия `createTemplateAction`, `updateTemplateAction` и
`deleteTemplateAction`. Каждое действие:

1. Проверяет авторизацию (`getCurrentUser`).
2. Валидирует обязательные поля формы.
3. Вызывает соответствующий метод `TemplateService`.
4. Делает `revalidatePath(ROUTES.workspaceTemplates(workspaceId))`, чтобы обновить страницу после изменений.
5. Возвращает единый `TemplateActionState` для отображения ошибок или сообщений об успехе на клиенте.

## Интерфейс пользователя

UI построен из трёх клиентских компонентов:

- `templates-client.tsx` — основной экран с фильтром по языку, списком шаблонов, предпросмотром содержимого и уведомлениями.
- `template-form-dialog.tsx` — модальное окно создания/редактирования (работает через `useActionState`) с отдельным полем для скрытого описания.
- `template-delete-dialog.tsx` — подтверждение удаления.

Интерфейс поддерживает роли: участники с правами только на просмотр видят информационный баннер и не могут открыть диалоги
редактирования. Скрытое описание отображается в подробном просмотре только для администраторов и редакторов. Кнопки
навигации позволяют быстро вернуться к списку рабочих областей или управлению участниками.

## Тестирование

Юнит-тесты `TemplateService` расположены в `src/lib/services/__tests__/template.test.ts` и проверяют:

- Успешное создание шаблона редактором.
- Валидацию названия и запрет действий для `VIEWER`.
- Получение списка и удаление с корректными правами.

Для smoke-теста UI:

1. Авторизуйтесь и откройте `/workspaces/{id}/templates`.
2. Создайте шаблон, убедитесь, что он появляется в списке и предпросмотре.
3. Отредактируйте шаблон, проверьте обновление содержимого.
4. Удалите шаблон и убедитесь, что он исчез из списка.

При изменениях запускайте:

```bash
yarn lint
yarn test
```

Это гарантирует корректность TypeScript-типов, server actions и клиентских компонентов.
