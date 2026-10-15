export function isValidImageUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isLocalImage(value: string): boolean {
  return /^(file|content|blob|data):/i.test(value.trim());
}

export function isValidImageReference(value: string): boolean {
  const image = value.trim();
  return !image || isLocalImage(image) || isValidImageUrl(image);
}
