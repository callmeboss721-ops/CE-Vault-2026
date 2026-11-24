// api/[...path].ts — environment-portable API proxy (Vercel Edge Function)
export const config = { runtime: "edge" };

const FALLBACK_API_BASE = "https://friendly-fiesta.replit.app";
const STRIP_REQ = new Set(["host", "connection", "content-length"]);
const STRIP_RES = new Set(["content-encoding", "content-length", "connection"]);

export default async function handler(request: Request): Promise<Response> {
  const apiBase = (process.env.CE_API_BASE_URL || FALLBACK_API_BASE).replace(/\/+$/, "");
  const url = new URL(request.url);
  const target = `${apiBase}${url.pathname}${url.search}`;

  const headers = new Headers();
  request.headers.forEach((v, k) => { if (!STRIP_REQ.has(k.toLowerCase())) headers.set(k, v); });
  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      // @ts-expect-error — required by the edge runtime when streaming a body
      duplex: hasBody ? "half" : undefined,
      redirect: "manual",
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "upstream_unreachable", message: "ไม่สามารถเชื่อมต่อ backend API ได้ กรุณาตรวจสอบค่า CE_API_BASE_URL" }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }

  const out = new Headers();
  upstream.headers.forEach((v, k) => { if (!STRIP_RES.has(k.toLowerCase())) out.set(k, v); });
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
}
