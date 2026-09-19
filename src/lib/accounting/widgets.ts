export function filterEmployeeWidgetsForAccounting<T extends { id: string }>(
  widgets: T[],
  options: {
    timeRegistrationEnabled?: boolean | null;
    accountingProvider?: string | null;
  }
): T[] {
  if (!options.timeRegistrationEnabled) {
    return widgets.filter((w) => w.id !== "emp-time" && w.id !== "emp-jobs");
  }
  return widgets;
}
