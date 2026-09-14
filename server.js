const http = require("http");

const TARGET = "https://medical-catalog.medical-catalog.workers.dev";
const PUBLIC_HOST = "binsharafaldin.onrender.com";

const GOOGLE_META =
  '<meta name="google-site-verification" content="_gCYrZns9aCQ8pWW043FecaRMNWXU4sgtH9Veb_IQXk" />';

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => {
      chunks.push(chunk);
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const targetUrl = new URL(req.url, TARGET);

    const headers = { ...req.headers };

    headers.host = new URL(TARGET).host;
    headers.origin = TARGET;
    headers.referer = `${TARGET}/admin/login`;

    const body =
      ["GET", "HEAD"].includes(req.method)
        ? undefined
        : await readBody(req);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      redirect: "manual",
      body,
    });

    res.statusCode = response.status;

    const contentType = response.headers.get("content-type") || "";

    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();

      if (
        lowerKey !== "set-cookie" &&
        lowerKey !== "content-length" &&
        lowerKey !== "content-encoding"
      ) {
        res.setHeader(key, value);
      }
    });

    if (response.headers.getSetCookie) {
      const cookies = response.headers.getSetCookie();

      if (cookies.length > 0) {
        res.setHeader("Set-Cookie", cookies);
      }
    }

    let responseBody = Buffer.from(await response.arrayBuffer());

    /*
     * Google Search Console verification
     */
    if (
      req.url === "/" &&
      contentType.toLowerCase().includes("text/html")
    ) {
      let html = responseBody.toString("utf8");

      if (!html.includes("google-site-verification")) {
        html = html.replace(
          /<head([^>]*)>/i,
          `<head$1>\n${GOOGLE_META}`
        );
      }

      responseBody = Buffer.from(html, "utf8");
    }

    /*
     * Fix sitemap URLs so Google sees the public Render domain
     * instead of the internal Cloudflare Worker domain.
     */
    if (
      req.url === "/sitemap.xml" &&
      contentType.toLowerCase().includes("xml")
    ) {
      let sitemap = responseBody.toString("utf8");

      sitemap = sitemap.replaceAll(
        "https://medical-catalog.medical-catalog.workers.dev",
        `https://${PUBLIC_HOST}`
      );

      responseBody = Buffer.from(sitemap, "utf8");
    }

    res.setHeader("Content-Length", responseBody.length);

    res.end(responseBody);
  } catch (error) {
    console.error(error);

    res.statusCode = 502;
    res.end("Proxy Error");
  }
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Proxy running");
});
