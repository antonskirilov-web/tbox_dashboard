const DEFAULT_ROUTE = 'cashflow';

const APP_ROUTES = {
  cashflow: {
    title: 'Все деньги',
    template: 'CashFlowForm',
  },
};

const CASHFLOW_FORM_CONFIG = {
  spreadsheetId: '1Y3qAFBw8o8AQixxINUrtFXBFM_K7qNiN3KYzWxPYVro',
  sheetName: 'Все деньги',
  dataStartRow: 3,
  columns: {
    operation: 5, // E
    date: 7, // G
    anton: 9, // I
    lenya: 10, // J
    contractor: 14, // N
    paymentMethod: 15, // O
    category: 18, // R
  },
  users: {
    anton: {
      name: 'Антон',
      columnKey: 'anton',
      emails: [
        'anton.s.kirilov@gmail.com',
      ],
    },
    lenya: {
      name: 'Лёня',
      columnKey: 'lenya',
      emails: [
        'leogurv@gmail.com',
      ],
    },
  },
};
