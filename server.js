const http = require("http");

const TARGET = "https://medical-catalog.medical-catalog.workers.dev";
const GOOGLE_FILE = "google92c4c289d561eba5.html";
const GOOGLE_CONTENT = `google-site-verification: ${GOOGLE_FILE}`;

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
    // Google Search Console verification
    if (req.url === `/${GOOGLE_FILE}`) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(GOOGLE_CONTENT);
      return;
    }

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

    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "set-cookie") {
        res.setHeader(key, value);
      }
    });

    if (response.headers.getSetCookie) {
      const cookies = response.headers.getSetCookie();

      if (cookies.length > 0) {
        res.setHeader("Set-Cookie", cookies);
      }
    }

    const responseBody = Buffer.from(await response.arrayBuffer());

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
