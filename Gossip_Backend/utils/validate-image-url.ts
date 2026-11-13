export async function validateImageUrl(url: string): Promise<void> {
  // 1. Validate URL format
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Invalid image URL format");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Image URL must use HTTP or HTTPS");
  }

  // 2. Check whether the URL points to an image
  const response = await fetch(parsedUrl, {
    method: "HEAD",
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Image URL returned HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type");

  if (!contentType?.startsWith("image/")) {
    throw new Error("URL does not point to a valid image");
  }
}
