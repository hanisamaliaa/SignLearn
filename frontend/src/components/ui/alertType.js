const ALERT_TYPES = new Set(["success", "warning", "danger", "info"]);

export function normalizeAlertType(type) {
  if (type === "error") return "danger";
  return ALERT_TYPES.has(type) ? type : "info";
}
