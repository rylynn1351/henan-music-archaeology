import path from "node:path";

const nativeRelative = path.relative.bind(path);

// vinext 0.0.50 indexes dist/client with Windows path separators, while URL
// lookups always use forward slashes. Normalize only for the local production
// server process; the build output and Cloudflare deployment stay unchanged.
if (process.platform === "win32") {
  path.relative = (from, to) => nativeRelative(from, to).split(path.sep).join("/");
}

function readOption(longName, shortName) {
  const index = process.argv.findIndex(
    (argument) => argument === longName || argument === shortName,
  );

  return index >= 0 ? process.argv[index + 1] : undefined;
}

const requestedPort = readOption("--port", "-p") ?? process.env.PORT ?? "3000";
const port = Number.parseInt(requestedPort, 10);
const host =
  readOption("--host", "-H") ?? process.env.HOST ?? "0.0.0.0";

if (!Number.isInteger(port) || port < 0 || port > 65_535) {
  throw new Error(`Invalid production server port: ${requestedPort}`);
}

const { startProdServer } = await import("vinext/server/prod-server");

await startProdServer({
  port,
  host,
  outDir: path.resolve("dist"),
});
