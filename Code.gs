const SPREADSHEET_ID = '1Y3qAFBw8o8AQixxINUrtFXBFM_K7qNiN3KYzWxPYVro';
const SHEET_NAME = 'Все деньги';
const DATA_START_ROW = 3;

const COLS = {
  operation: 5, // E
  date: 7, // G
  anton: 9, // I
  lenya: 10, // J
  contractor: 14, // N
  paymentMethod: 15, // O
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Все деньги')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function submitMoneyEntry(payload) {
  validatePayload_(payload);

  const sheet = getTargetSheet_();
  const row = findFirstFreeRow_(sheet, COLS.operation);

  const antonValue = resolvePersonAmount_(payload.incomeAnton, payload.expenseAnton);
  const lenyaValue = resolvePersonAmount_(payload.incomeLenya, payload.expenseLenya);
  const entryDate = parseDate_(payload.date);

  sheet.getRange(row, COLS.operation).setValue(payload.operation.trim());
  sheet.getRange(row, COLS.date).setValue(entryDate).setNumberFormat('dd.mm.yyyy');
  sheet.getRange(row, COLS.contractor).setValue(payload.contractor.trim());
  sheet.getRange(row, COLS.paymentMethod).setValue(payload.paymentMethod.trim());

  if (antonValue !== null) {
    sheet.getRange(row, COLS.anton).setValue(antonValue);
  }

  if (lenyaValue !== null) {
    sheet.getRange(row, COLS.lenya).setValue(lenyaValue);
  }

  return {
    success: true,
    row: row,
    message: 'Запись добавлена в лист "Все деньги".',
  };
}

function getTargetSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error('Лист "Все деньги" не найден.');
  }

  return sheet;
}

function findFirstFreeRow_(sheet, columnIndex) {
  const maxRows = sheet.getMaxRows();
  const values = sheet
    .getRange(DATA_START_ROW, columnIndex, maxRows - DATA_START_ROW + 1, 1)
    .getDisplayValues();

  for (let index = 0; index < values.length; index += 1) {
    if (!String(values[index][0]).trim()) {
      return DATA_START_ROW + index;
    }
  }

  return sheet.getLastRow() + 1;
}

function resolvePersonAmount_(incomeValue, expenseValue) {
  const income = parseAmount_(incomeValue);
  const expense = parseAmount_(expenseValue);

  if (income !== null && expense !== null) {
    throw new Error('Для одного человека можно заполнить либо доход, либо расход.');
  }

  if (income !== null) {
    return -Math.abs(income);
  }

  if (expense !== null) {
    return Math.abs(expense);
  }

  return null;
}

function parseAmount_(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = String(value)
    .replace(/\s/g, '')
    .replace(/р|₽/gi, '')
    .replace(',', '.');

  if (!normalized) {
    return null;
  }

  const amount = Number(normalized);

  if (!Number.isFinite(amount)) {
    throw new Error('Сумма должна быть числом.');
  }

  if (amount < 0) {
    throw new Error('Сумму нужно вводить без знака минус.');
  }

  return amount;
}

function parseDate_(value) {
  if (!value) {
    throw new Error('Выберите дату.');
  }

  const parts = String(value).split('-');

  if (parts.length !== 3) {
    throw new Error('Дата передана в неверном формате.');
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const date = new Date(year, month - 1, day);

  if (
    !Number.isFinite(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error('Не удалось обработать дату.');
  }

  return date;
}

function validatePayload_(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Данные формы не получены.');
  }

  const requiredFields = [
    ['operation', 'Укажите операцию.'],
    ['date', 'Выберите дату.'],
    ['contractor', 'Укажите контрагента.'],
    ['paymentMethod', 'Укажите платёжку.'],
  ];

  requiredFields.forEach(([key, message]) => {
    if (!String(payload[key] || '').trim()) {
      throw new Error(message);
    }
  });

  const hasAnyAmount = [
    payload.incomeAnton,
    payload.expenseAnton,
    payload.incomeLenya,
    payload.expenseLenya,
  ].some((value) => String(value || '').trim());

  if (!hasAnyAmount) {
    throw new Error('Заполните хотя бы одно поле с суммой.');
  }
}
