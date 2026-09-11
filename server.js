const http = require("http");

const TARGET = "https://medical-catalog.medical-catalog.workers.dev";

const server = http.createServer(async (req, res) => {
  try {
    const targetUrl = new URL(req.url, TARGET);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: req.headers,
      redirect: "manual",
      body: ["GET", "HEAD"].includes(req.method) ? undefined : req,duplex: "half",
    });

    res.statusCode = response.status;

    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

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
