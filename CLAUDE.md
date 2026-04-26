# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**"Автоматизация учёта производительности компании и расчёт рентабельности"**

Web-приложение на Google Apps Script с двумя ролями: менеджер (admin) и сотрудник (client). ~30 пользователей, авторизация по логину/паролю. Данные хранятся в Google Sheets. Полный PRD — в `prd.md`.

## Architecture

```
Google Apps Script Web App
├── Code.gs           →  doGet() — роутинг по ?page= параметру
├── Config.gs         →  APP_ROUTES, CASHFLOW_FORM_CONFIG и другие константы
├── cashflowform.gs   →  бизнес-логика формы учёта денег
├── *.html            →  HTML-шаблоны (по одному на маршрут)
└── appsscript.json   →  манифест GAS (scopes, timeZone, runtimeVersion)

Google Sheets          →  база данных (две таблицы — см. раздел ниже)
GmailApp Trigger       →  парсинг писем СКУД → лист Attendance
```

### Роутинг

`doGet(e)` читает `e.parameter.page`, ищет маршрут в `APP_ROUTES` (`Config.gs`) и отдаёт соответствующий HTML-шаблон через `HtmlService.createHtmlOutputFromFile(route.template)`. При добавлении нового экрана: добавить запись в `APP_ROUTES` + создать `НазваниеФормы.html`.

Текущие маршруты:
| `?page=` | Шаблон | Назначение |
|----------|--------|-----------|
| `cashflow` (default) | `CashFlowForm.html` | Форма учёта денег |
| — (макет) | `EmployeeTaskForm.html` | Форма задания сотрудника |

## Deployment (Google Apps Script)

```bash
npm install -g @google/clasp   # установить clasp
clasp login                    # авторизация
clasp push                     # запушить изменения в GAS
clasp open                     # открыть редактор GAS
```

Файл `.clasp.json` хранит `scriptId` проекта (создаётся командой `clasp create` или вручную). Основные файлы GAS:
- `Code.gs` — только `doGet()`, остальное разнесено по файлам
- `Config.gs` — все константы и конфиги (`APP_ROUTES`, `CASHFLOW_FORM_CONFIG`)
- `cashflowform.gs` — серверные функции формы cashflow
- `*.html` — HTML-шаблоны, имя файла = значение `template` в `APP_ROUTES`
- `appsscript.json` — манифест (права доступа, тайм-зона Europe/Moscow, V8)

## GAS Constraints

- Нет `require()` / npm — весь код в `.gs`-файлах, библиотеки подключаются через редактор GAS
- `google.script.run` — **асинхронный**, требует `.withSuccessHandler()` / `.withFailureHandler()`
- Лимит выполнения — **6 минут** на один вызов
- `doGet(e)` обязан вернуть `HtmlService.createHtmlOutput(...)` или `ContentService`
- `doPost(e)` получает тело запроса через `e.postData.contents` (JSON-строка → `JSON.parse`)
- `PropertiesService` — единственное постоянное хранилище на стороне сервера (сессии, токены)

## Google Sheets (база данных)

### Spreadsheet: Производительность
ID: `1v9KJuBGUiStzdS6oUvyODnxpUBUkIHQV3-KXDls7cbQ`

| Лист | sheetId | Назначение |
|------|---------|-----------|
| Исходник (2026)_init | 1496055204 | Исходные данные выработки 2026 (начальная версия) |
| Исходник (2026)_ver.01 | 2100796552 | Данные выработки 2026 г. (активный) |
| 2_Услуги_Цены_Темпы | 1346228000 | Справочник услуг, цен и темпов обработки |
| 1_Библиотека | 14199843 | Справочник клиентов и операций |
| План/факт Общий | 594472193 | Сводный план/факт |
| План/факт Сотр. | 416839089 | План/факт по сотрудникам |
| тестовый лист cli | 668253734 | Тестовый лист (создан через MCP CLI) |

### Spreadsheet: Сотрудники 2026
ID: `1pziBY8pv85-fnkNrH81A9-VenWsnFn5IVc4DAXcCFFk`

| Лист | sheetId | Назначение |
|------|---------|-----------|
| ЗП Главное | 1484917861 | Расчёт зарплат |
| СКУД | 357511922 | Данные face ID (посещаемость) |
| Подработчики | 2042830266 | Данные по подработчикам |
| ЗП Илья (продв.) | 1076242760 | Продвинутый расчёт ЗП |
| Ставки | 929371880 | Ставки оплаты |

### Новые листы (создать в рамках проекта)

Создавать в таблице **Сотрудники 2026** (`1pziBY8pv85-fnkNrH81A9-VenWsnFn5IVc4DAXcCFFk`):

**Users** — авторизация
`id | login | passwordHash | role (admin|client) | fullName | active`

**Tasks** — задания
`id | employeeId | clientId | operationId | planQty | status (new|in_progress|paused|done|partial) | assignedAt | assignedBy`

**TimeLogs** — события таймера
`id | taskId | employeeId | event (start|pause|resume|stop) | timestamp`

**QuantityLogs** — количество при стопе
`id | taskId | employeeId | qty | loggedAt`

**Attendance** — табель посещаемости
`id | employeeId | date | timeIn | timeOut | source (skud|manual)`

## Business Logic

### Жизненный цикл задания (сотрудник)

1. Получает задание → нажимает **Старт** → пишется запись в TimeLogs
2. При перерыве → **Пауза** / **Возобновить**
3. При завершении → **Закончил полностью** (количество не вводится) или **Закончил частично** (+ вводит количество)
4. Следующий день → **Продолжить выполнение задания**
5. Менеджер может переназначить незавершённое задание другому сотруднику

### Расчёт рентабельности

```
Выручка = количество товара × тариф клиента
Себестоимость = время сотрудника × ставка + материалы
Рентабельность = Выручка − Себестоимость
```

### Авторизация

Хэши паролей хранятся в листе `Users`; сессия — через `PropertiesService` или токен в клиенте.

## Data Flow

```
Сотрудник (браузер)
  → google.script.run.serverFunction()   # GAS клиент-серверный вызов
  → Code.gs (doPost / named functions)
  → SpreadsheetApp                       # чтение/запись Google Sheets
```

## Development Phases

| Фаза | Описание | Статус |
|------|----------|--------|
| 1 | Авторизация + задания (выдача менеджером, просмотр сотрудником) | в работе |
| 2 | Кнопки Старт/Пауза/Стоп, запись TimeLogs | — |
| 3 | Ввод количества, расчёт себестоимости и рентабельности | — |
| 4 | Парсинг СКУД из Gmail, сверка с TimeLogs | — |
| 5 | Дашборд с метриками (ABC-анализ, гистограммы, KPI) | — |
| 6 | Проверка качества (QA): тестирование всех ролей, сценариев и расчётов | — |

## MCP Tools (Google Sheets)

Доступ через `google-sheets` MCP сервер. Сервер активируется через `enableAllProjectMcpServers: true` в `.claude/settings.local.json` (глобальная конфигурация MCP, не требует `.mcp.json` в корне). Схемы инструментов — deferred, загружать через `ToolSearch` перед вызовом.

Полный список инструментов:

| Инструмент | Назначение |
|-----------|-----------|
| `sheets_get_metadata` | Метаданные таблицы (листы, ID) |
| `sheets_get_values` | Чтение диапазона |
| `sheets_batch_get_values` | Чтение нескольких диапазонов |
| `sheets_update_values` | Запись в диапазон |
| `sheets_batch_update_values` | Запись в несколько диапазонов |
| `sheets_append_values` | Добавление строк |
| `sheets_clear_values` | Очистка диапазона |
| `sheets_insert_sheet` | Создание нового листа |
| `sheets_delete_sheet` | Удаление листа |
| `sheets_duplicate_sheet` | Копирование листа |
| `sheets_insert_rows` | Вставка строк |
| `sheets_format_cells` | Форматирование ячеек |
| `sheets_batch_format_cells` | Пакетное форматирование |
| `sheets_merge_cells` | Объединение ячеек |
| `sheets_unmerge_cells` | Разъединение ячеек |
| `sheets_update_borders` | Границы ячеек |
| `sheets_insert_link` | Вставка гиперссылки |
| `sheets_insert_date` | Вставка даты |
| `sheets_add_conditional_formatting` | Условное форматирование |
| `sheets_create_chart` | Создание графика |
| `sheets_update_chart` | Обновление графика |
| `sheets_delete_chart` | Удаление графика |
| `sheets_copy_to` | Копирование листа в другую таблицу |
| `sheets_create_spreadsheet` | Создание новой таблицы |
| `sheets_check_access` | Проверка прав доступа |
| `sheets_update_sheet_properties` | Свойства листа (название, цвет вкладки) |

## Testing (Playwright e2e)

```bash
npm test                        # headless, chromium
npm run test:headed             # с открытием браузера
npm run test:ui                 # интерактивный UI-режим Playwright
APP_URL=https://... npm test    # тестировать конкретный деплой
```

Тесты живут в `tests/`. Переменная `APP_URL` указывает на задеплоенный GAS web app; по умолчанию подставляется заглушка `YOUR_DEPLOYMENT_ID`. Конфиг — `playwright.config.js` (только Chromium, timeout 30s, retries 1).

## GitHub Actions

`.github/workflows/morning.yml` — ежедневный cron-job, запускается в **8:00 МСК** (5:00 UTC), выводит `Поехали!`. Служит шаблоном для будущих автоматизаций (ночные отчёты, экспорт данных и т.п.).

## Statusline

`.claude/statusline.js` — Node.js скрипт строки состояния Claude Code. Читает JSON из stdin, выводит: модель │ задача │ директория │ git-статус │ контекст │ rate limits │ пиковые часы (Pacific Time).

Запуск для проверки:
```bash
echo '{}' | node .claude/statusline.js
```

Пиковые часы: Пн–Пт, 05:00–11:00 PT (время Anthropic). Скрипт показывает обратный отсчёт до начала/конца пика.

## Settings

`.claude/settings.local.json`:
- MCP сервер `google-sheets` включён (`enableAllProjectMcpServers: true`)
- `statusLine.command` указывает на `.claude/statusline.js` с **абсолютным путём** — при смене машины обновить путь
- Разрешения (allow): `mcp__google-sheets__sheets_get_metadata`, `Bash(code *)`, `Bash(node .claude/statusline.js)`, `Bash(git add *)`, `Bash(git commit *)`, `Bash(git push *)`, `Bash(git pull *)`

**Stop hook** — `.claude/git-status-hook.js` запускается при каждой остановке Claude. Выводит `systemMessage` с состоянием репозитория: незакоммиченные файлы, непушнутые коммиты, непулленные изменения. При чистом состоянии — зелёная галочка.

## Cashflow Form (`cashflowform.gs`)

Форма учёта денег. Конфиг — `CASHFLOW_FORM_CONFIG` в `Config.gs`.

| Параметр | Значение |
|----------|----------|
| Spreadsheet ID | `1Y3qAFBw8o8AQixxINUrtFXBFM_K7qNiN3KYzWxPYVro` |
| Лист | `Все деньги` |
| Данные с строки | 3 |

**Колонки:**

| Поле | Колонка | Индекс |
|------|---------|--------|
| operation | E | 5 |
| date | G | 7 |
| anton (сумма) | I | 9 |
| lenya (сумма) | J | 10 |
| contractor | N | 14 |
| paymentMethod | O | 15 |
| category | R | 18 |

**Пользователи:**

| Ключ | Имя | Email |
|------|-----|-------|
| anton | Антон | anton.s.kirilov@gmail.com |
| lenya | Лёня | leogurv@gmail.com |

Доход записывается как отрицательное число, расход — как положительное.

## Current State (апрель 2026)

Серверные GAS-файлы существуют: `Code.gs`, `Config.gs`, `cashflowform.gs`, `appsscript.json`. `.clasp.json` ещё не создан — `clasp push` не настроен. HTML-шаблоны: `CashFlowForm.html` (рабочая форма), `EmployeeTaskForm.html` (макет, без подключения к GAS). Фаза 1 (авторизация + задания) в работе.
