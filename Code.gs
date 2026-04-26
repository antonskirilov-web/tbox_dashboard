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
  category: 18, // R
};

const FORM_USERS = {
  anton: {
    name: 'Антон',
    column: COLS.anton,
    emails: [
      'anton.s.kirilov@gmail.com',
    ],
  },
  lenya: {
    name: 'Лёня',
    column: COLS.lenya,
    emails: [
      'leogurv@gmail.com',
    ],
  },
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('CashFlowForm')
    .setTitle('Все деньги')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getFormConfig() {
  const user = getActiveFormUser_();

  return {
    user: {
      name: user.name,
      email: user.email,
    },
    categories: getCategoryOptions_(),
  };
}

function submitMoneyEntry(payload) {
  validatePayload_(payload);

  const user = getActiveFormUser_();
  const sheet = getTargetSheet_();
  const row = findFirstFreeRow_(sheet, COLS.operation);

  const amount = resolvePersonAmount_(payload.incomeAmount, payload.expenseAmount);
  const entryDate = parseDate_(payload.date);
  const category = payload.category.trim();

  if (!getCategoryOptions_().includes(category)) {
    throw new Error('Выберите категорию из списка.');
  }

  sheet.getRange(row, COLS.operation).setValue(payload.operation.trim());
  sheet.getRange(row, COLS.date).setValue(entryDate).setNumberFormat('dd.mm.yyyy');
  sheet.getRange(row, COLS.contractor).setValue(payload.contractor.trim());
  sheet.getRange(row, COLS.paymentMethod).setValue(payload.paymentMethod.trim());
  sheet.getRange(row, COLS.category).setValue(category);
  sheet.getRange(row, user.column).setValue(amount);

  return {
    success: true,
    row: row,
    message: `Запись добавлена для пользователя ${user.name}.`,
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

function getActiveFormUser_() {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();

  if (!email) {
    throw new Error('Не удалось определить Google аккаунт. Откройте форму под Google аккаунтом Антона или Лёни.');
  }

  const user = Object.keys(FORM_USERS)
    .map((key) => FORM_USERS[key])
    .find((item) => item.emails.map((value) => value.toLowerCase()).includes(email));

  if (!user) {
    throw new Error(`Аккаунт ${email} не допущен к заполнению формы.`);
  }

  return {
    name: user.name,
    email: email,
    column: user.column,
  };
}

function getCategoryOptions_() {
  const sheet = getTargetSheet_();
  const categoryCell = sheet.getRange(DATA_START_ROW, COLS.category);
  const validation = categoryCell.getDataValidation();

  if (!validation) {
    return splitCategoryValues_(categoryCell.getDisplayValue());
  }

  const criteriaType = validation.getCriteriaType();
  const criteriaValues = validation.getCriteriaValues();

  if (criteriaType === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
    return normalizeCategoryOptions_(criteriaValues[0] || []);
  }

  if (criteriaType === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE && criteriaValues[0]) {
    const values = criteriaValues[0].getDisplayValues().reduce((items, row) => items.concat(row), []);
    return normalizeCategoryOptions_(values);
  }

  return splitCategoryValues_(categoryCell.getDisplayValue());
}

function splitCategoryValues_(value) {
  return normalizeCategoryOptions_(String(value || '').split(/[,;\n]/));
}

function normalizeCategoryOptions_(values) {
  const seen = {};

  return values
    .map((value) => String(value || '').trim())
    .filter((value) => {
      if (!value || seen[value]) {
        return false;
      }

      seen[value] = true;
      return true;
    });
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
    ['category', 'Выберите категорию.'],
  ];

  requiredFields.forEach(([key, message]) => {
    if (!String(payload[key] || '').trim()) {
      throw new Error(message);
    }
  });

  const hasAnyAmount = [
    payload.incomeAmount,
    payload.expenseAmount,
  ].some((value) => String(value || '').trim());

  if (!hasAnyAmount) {
    throw new Error('Заполните хотя бы одно поле с суммой.');
  }
}
