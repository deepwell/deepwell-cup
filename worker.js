const NHL_API_BASE = "https://api-web.nhle.com/v1";
const PROXY_PREFIX = "/nhle/v1";

export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);

    if (isNhlProxyPath(requestUrl.pathname)) {
      return proxyNhlApi(request, requestUrl);
    }

    return env.ASSETS.fetch(request);
  },
};

function isNhlProxyPath(pathname) {
  return pathname === PROXY_PREFIX || pathname.startsWith(`${PROXY_PREFIX}/`);
}

async function proxyNhlApi(request, requestUrl) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { allow: "GET, HEAD" },
    });
  }

  const upstreamPath = requestUrl.pathname.slice(PROXY_PREFIX.length);
  const upstreamUrl = new URL(`${NHL_API_BASE}${upstreamPath}`);
  upstreamUrl.search = requestUrl.search;

  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers: { accept: "application/json" },
  });

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("cache-control", "public, max-age=60");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}
