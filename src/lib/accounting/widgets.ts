export function filterEmployeeWidgetsForAccounting<T extends { id: string }>(
  widgets: T[],
  options: {
    timeRegistrationEnabled?: boolean | null;
    accountingProvider?: string | null;
    visibleToEmployees?: boolean | null;
  }
): T[] {
  if (!options.timeRegistrationEnabled || options.visibleToEmployees === false) {
    return widgets.filter((w) => w.id !== "emp-time" && w.id !== "emp-jobs");
  }
  return widgets;
}
