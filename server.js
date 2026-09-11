const http = require("http");

const TARGET = "https://medical-catalog.medical-catalog.workers.dev";

const server = http.createServer(async (req, res) => {
  try {
    const targetUrl = new URL(req.url, TARGET);

    const headers = { ...req.headers };

    // Make the request appear to come from the original Worker site
    headers.host = new URL(TARGET).host;
    headers.origin = TARGET;
    headers.referer = `${TARGET}/admin/login`;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      redirect: "manual",
      body: ["GET", "HEAD"].includes(req.method) ? undefined : req,
      duplex: "half",
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

    const body = Buffer.from(await response.arrayBuffer());
    res.end(body);
  } catch (error) {
    console.error(error);
    res.statusCode = 502;
    res.end("Proxy Error");
  }
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Proxy running");
});
