# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**"Автоматизация учёта производительности компании и расчёт рентабельности"**

Web-приложение на Google Apps Script с двумя ролями: менеджер (admin) и сотрудник (client). ~30 пользователей, авторизация по логину/паролю. Данные хранятся в Google Sheets.

## Architecture

```
Google Apps Script Web App
├── doGet()           →  HTML/CSS/JS frontend (single-page, role-based)
├── doPost()          →  API (бизнес-логика)
└── Google Sheets     →  база данных

GmailApp Trigger      →  парсинг писем СКУД → лист Attendance
```

## Google Sheets (база данных)

### Spreadsheet: Производительность
ID: `1v9KJuBGUiStzdS6oUvyODnxpUBUkIHQV3-KXDls7cbQ`

| Лист | Назначение |
|------|-----------|
| Исходник | Исторические данные выработки |
| Исходник (2026) | Данные выработки 2026 г. (активный) |
| План/факт Общий | Сводный план/факт |
| План/факт Сотр. | План/факт по сотрудникам |
| Темпы | Темпы обработки товаров |
| Списки.Клиенты_Операции | Справочник клиентов и операций |

### Spreadsheet: Сотрудники 2026
ID: `1pziBY8pv85-fnkNrH81A9-VenWsnFn5IVc4DAXcCFFk`

| Лист | Назначение |
|------|-----------|
| ЗП Главное | Расчёт зарплат |
| СКУД | Данные face ID (посещаемость) |
| Подработчики | Данные по подработчикам |
| ЗП Илья (продв.) | Продвинутый расчёт ЗП |
| Ставки | Ставки оплаты |

### Новые листы (создать в рамках проекта)

| Лист | Назначение |
|------|-----------|
| Users | Логины, хэши паролей, роли, ФИО |
| Tasks | Задания: сотрудник, клиент, операция, план, статус |
| TimeLogs | События: старт/пауза/стоп + timestamps |
| QuantityLogs | Кол-во обработанного товара на каждое событие |
| Attendance | Сводный табель (AppScript + СКУД) |

## Development Phases

1. **Фаза 1** — Авторизация + задания (выдача менеджером, просмотр сотрудником)
2. **Фаза 2** — Кнопки Старт/Пауза/Стоп, запись TimeLogs
3. **Фаза 3** — Ввод количества, расчёт себестоимости и рентабельности
4. **Фаза 4** — Парсинг СКУД из Gmail, сверка с TimeLogs
5. **Фаза 5** — Дашборд с метриками (ABC-анализ, гистограммы, KPI)

## MCP Tools (Google Sheets)

Доступ через `google-sheets` MCP сервер. Схемы инструментов — deferred, загружать через `ToolSearch` перед вызовом.

Ключевые инструменты: `sheets_get_metadata`, `sheets_get_values`, `sheets_batch_get_values`, `sheets_update_values`, `sheets_batch_update_values`, `sheets_append_values`, `sheets_format_cells`.

## Settings

`.claude/settings.local.json` — включает MCP `google-sheets`, управляет разрешениями инструментов.
