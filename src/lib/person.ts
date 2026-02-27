export function getInitials(name: string) {
  const parts = name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "--";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}
