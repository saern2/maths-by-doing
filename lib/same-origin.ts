/** Compare against the incoming Host, since Next.js may use an internal hostname in request.url. */
export function sameOrigin(request: Request) {
  const value = request.headers.get("origin");
  if (!value) return false;
  try {
    const origin = new URL(value);
    const host = request.headers.get("host") || new URL(request.url).host;
    return (
      ["https:", "http:"].includes(origin.protocol) &&
      origin.origin === value &&
      origin.host.toLowerCase() === host.toLowerCase()
    );
  } catch {
    return false;
  }
}
