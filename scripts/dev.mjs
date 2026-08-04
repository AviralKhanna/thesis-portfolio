import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 4000);
const root = process.cwd();
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf"
};

createServer(async (request, response) => {
  try {
    const rawPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const relative = rawPath === "/" ? "index.html" : rawPath.replace(/^\/+/, "");
    const target = normalize(join(root, relative));
    if (!target.startsWith(root)) throw new Error("Invalid path");
    const info = await stat(target);
    const file = info.isDirectory() ? join(target, "index.html") : target;
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Investment Intelligence running at http://localhost:${port}`);
});
