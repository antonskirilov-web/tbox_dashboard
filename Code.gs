function doGet(e) {
  const page = String((e && e.parameter && e.parameter.page) || DEFAULT_ROUTE);
  const route = APP_ROUTES[page] || APP_ROUTES[DEFAULT_ROUTE];

  return HtmlService.createHtmlOutputFromFile(route.template)
    .setTitle(route.title)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
