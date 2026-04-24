# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**"Автоматизация учёта производительности компании и расчёт рентабельности"**

Web-приложение на Google Apps Script с двумя ролями: менеджер (admin) и сотрудник (client). ~30 пользователей, авторизация по логину/паролю. Данные хранятся в Google Sheets. Полный PRD — в `prd.md`.

## Architecture

```
Google Apps Script Web App
├── doGet()           →  HTML/CSS/JS frontend (single-page, role-based)
├── doPost()          →  API (бизнес-логика)
└── Google Sheets     →  база данных

GmailApp Trigger      →  парсинг писем СКУД → лист Attendance
```

## Deployment (Google Apps Script)

```bash
npm install -g @google/clasp   # установить clasp
clasp login                    # авторизация
clasp push                     # запушить изменения в GAS
clasp open                     # открыть редактор GAS
```

Файл `.clasp.json` хранит `scriptId` проекта. Основные файлы GAS:
- `Code.gs` — серверная логика (`doGet`, `doPost`, бизнес-логика)
- `Index.html` — фронтенд (HTML/CSS/JS, single-page)
- `appsscript.json` — манифест (права доступа, тайм-зона)

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

| Лист | Назначение |
|------|-----------|
| Users | Логины, хэши паролей, роли, ФИО |
| Tasks | Задания: сотрудник, клиент, операция, план, статус |
| TimeLogs | События: старт/пауза/стоп + timestamps |
| QuantityLogs | Кол-во обработанного товара на каждое событие |
| Attendance | Сводный табель (AppScript + СКУД) |

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

## MCP Tools (Google Sheets)

Доступ через `google-sheets` MCP сервер. Схемы инструментов — deferred, загружать через `ToolSearch` перед вызовом.

Ключевые инструменты: `sheets_get_metadata`, `sheets_get_values`, `sheets_batch_get_values`, `sheets_update_values`, `sheets_batch_update_values`, `sheets_append_values`, `sheets_format_cells`.

## Statusline

`statusline.js` — Node.js скрипт для строки состояния Claude Code. Читает JSON из stdin, выводит: модель │ задача │ директория │ git-статус │ контекст │ rate limits │ пиковые часы (Pacific Time).

Запуск для проверки:
```bash
echo '{}' | node statusline.js
```

`.claude/statusline-command.sh` — упрощённая bash-версия (используется в `settings.local.json` как `statusLine.command`). `statusline.js` — расширенная версия с git-интеграцией, bridge-файлом контекста и peak-hours индикатором.

## Settings

`.claude/settings.local.json`:
- MCP сервер `google-sheets` включён (`enableAllProjectMcpServers: true`)
- `statusLine.command` указывает на `.claude/statusline-command.sh`
- Разрешения: `mcp__google-sheets__sheets_get_metadata`, `Bash(code *)`

## Current State (апрель 2026)

GAS-файлы (`Code.gs`, `Index.html`, `appsscript.json`, `.clasp.json`) ещё не созданы — проект на стадии планирования/настройки окружения. Фаза 1 (авторизация + задания) в работе.
