function getCashflowFormConfig() {
  const user = getCashflowActiveUser_();

  return {
    user: {
      name: user.name,
      email: user.email,
    },
    categories: getCashflowCategoryOptions_(),
  };
}

function submitCashflowMoneyEntry(payload) {
  validateCashflowPayload_(payload);

  const user = getCashflowActiveUser_();
  const sheet = getCashflowTargetSheet_();
  const columns = CASHFLOW_FORM_CONFIG.columns;
  const row = findCashflowFirstFreeRow_(sheet, columns.operation);

  const amount = resolveCashflowPersonAmount_(payload.incomeAmount, payload.expenseAmount);
  const entryDate = parseCashflowDate_(payload.date);
  const category = payload.category.trim();

  if (!getCashflowCategoryOptions_().includes(category)) {
    throw new Error('Выберите категорию из списка.');
  }

  sheet.getRange(row, columns.operation).setValue(payload.operation.trim());
  sheet.getRange(row, columns.date).setValue(entryDate).setNumberFormat('dd.mm.yyyy');
  sheet.getRange(row, columns.contractor).setValue(payload.contractor.trim());
  sheet.getRange(row, columns.paymentMethod).setValue(payload.paymentMethod.trim());
  sheet.getRange(row, columns.category).setValue(category);
  sheet.getRange(row, user.column).setValue(amount);

  return {
    success: true,
    row: row,
    message: `Запись добавлена для пользователя ${user.name}.`,
  };
}

function getCashflowTargetSheet_() {
  const spreadsheet = SpreadsheetApp.openById(CASHFLOW_FORM_CONFIG.spreadsheetId);
  const sheet = spreadsheet.getSheetByName(CASHFLOW_FORM_CONFIG.sheetName);

  if (!sheet) {
    throw new Error(`Лист "${CASHFLOW_FORM_CONFIG.sheetName}" не найден.`);
  }

  return sheet;
}

function getCashflowActiveUser_() {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const columns = CASHFLOW_FORM_CONFIG.columns;

  if (!email) {
    throw new Error('Не удалось определить Google аккаунт. Откройте форму под Google аккаунтом Антона или Лёни.');
  }

  const user = Object.keys(CASHFLOW_FORM_CONFIG.users)
    .map((key) => CASHFLOW_FORM_CONFIG.users[key])
    .find((item) => item.emails.map((value) => value.toLowerCase()).includes(email));

  if (!user) {
    throw new Error(`Аккаунт ${email} не допущен к заполнению формы.`);
  }

  return {
    name: user.name,
    email: email,
    column: columns[user.columnKey],
  };
}

function getCashflowCategoryOptions_() {
  const sheet = getCashflowTargetSheet_();
  const categoryCell = sheet.getRange(
    CASHFLOW_FORM_CONFIG.dataStartRow,
    CASHFLOW_FORM_CONFIG.columns.category
  );
  const validation = categoryCell.getDataValidation();

  if (!validation) {
    return splitCashflowCategoryValues_(categoryCell.getDisplayValue());
  }

  const criteriaType = validation.getCriteriaType();
  const criteriaValues = validation.getCriteriaValues();

  if (criteriaType === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
    return normalizeCashflowCategoryOptions_(criteriaValues[0] || []);
  }

  if (criteriaType === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE && criteriaValues[0]) {
    const values = criteriaValues[0].getDisplayValues().reduce((items, row) => items.concat(row), []);
    return normalizeCashflowCategoryOptions_(values);
  }

  return splitCashflowCategoryValues_(categoryCell.getDisplayValue());
}

function splitCashflowCategoryValues_(value) {
  return normalizeCashflowCategoryOptions_(String(value || '').split(/[,;\n]/));
}

function normalizeCashflowCategoryOptions_(values) {
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

function findCashflowFirstFreeRow_(sheet, columnIndex) {
  const maxRows = sheet.getMaxRows();
  const values = sheet
    .getRange(
      CASHFLOW_FORM_CONFIG.dataStartRow,
      columnIndex,
      maxRows - CASHFLOW_FORM_CONFIG.dataStartRow + 1,
      1
    )
    .getDisplayValues();

  for (let index = 0; index < values.length; index += 1) {
    if (!String(values[index][0]).trim()) {
      return CASHFLOW_FORM_CONFIG.dataStartRow + index;
    }
  }

  return sheet.getLastRow() + 1;
}

function resolveCashflowPersonAmount_(incomeValue, expenseValue) {
  const income = parseCashflowAmount_(incomeValue);
  const expense = parseCashflowAmount_(expenseValue);

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

function parseCashflowAmount_(value) {
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

function parseCashflowDate_(value) {
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

function validateCashflowPayload_(payload) {
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
