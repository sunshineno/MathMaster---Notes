export const APP_VERSION = __APP_VERSION__;
export const BUILD_DATE_ISO = __BUILD_DATE__;
export const BUILD_COMMIT = __BUILD_COMMIT__;
export const BUILD_DATE_LABEL = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(BUILD_DATE_ISO));
export const VERSION_LABEL = `v${APP_VERSION}`;

export function formatBuildDate(
  value: string = BUILD_DATE_ISO
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}