export const APP_VERSION = __APP_VERSION__;
export const BUILD_DATE_ISO = __BUILD_DATE__;

export function formatBuildDate(locale = "fr-FR") {
  const date = new Date(BUILD_DATE_ISO);
  if (Number.isNaN(date.getTime())) return BUILD_DATE_ISO;

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short"
  }).format(date);
}
