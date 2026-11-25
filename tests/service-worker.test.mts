import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

const script = await readFile(
  new URL("../public/demo/sw.js", import.meta.url),
  "utf8",
);
const origin = "https://prototype.example.test";
const shell = "/demo/offline";
type WorkerEvent = {
  request?: Request;
  waitUntil: (work: Promise<unknown>) => void;
  respondWith: (work: Promise<unknown>) => void;
};

function worker(headers: Record<string, string> = {}) {
  const listeners = new Map<string, (event: WorkerEvent) => void>();
  const saved = new Map<string, Response>();
  const deleted: string[] = [];
  const fetches: [string, RequestInit | undefined][] = [];
  let online = true;
  runInNewContext(script, {
    URL,
    Response,
    self: {
      location: { origin },
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
      addEventListener: (
        name: string,
        callback: (event: WorkerEvent) => void,
      ) => listeners.set(name, callback),
    },
    caches: {
      open: async () => ({
        put: async (url: string, response: Response) =>
          saved.set(url, response),
        match: async (url: string) => saved.get(url)?.clone(),
      }),
      keys: async () => [
        "rose-care-shell-v1",
        "rose-care-demo-v3",
        "unrelated",
      ],
      delete: async (key: string) => {
        deleted.push(key);
        if (key.endsWith("v2")) saved.clear();
      },
    },
    fetch: async (request: string | Request, options?: RequestInit) => {
      const path =
        typeof request === "string" ? request : new URL(request.url).pathname;
      fetches.push([path, options]);
      if (!online) throw new Error("Offline");
      if (path === "/demo/") return new Response("Sign in", { status: 401 });
      if (path !== shell) return new Response("public asset");
      return new Response(
        '<script src="/_next/static/chunks/demo.js"></script><script src="/api/private"></script>',
        {
          headers: {
            "Content-Type": "text/html",
            "X-Rose-Offline-Shell": "public-demo-v3",
            ...headers,
          },
        },
      );
    },
  });
  return {
    saved,
    deleted,
    fetches,
    offline() {
      online = false;
    },
    dispatch(name: string, request?: Request) {
      let result: Promise<unknown> | undefined;
      const capture = (work: Promise<unknown>) => {
        result = work;
      };
      listeners.get(name)!({
        request,
        waitUntil: capture,
        respondWith: capture,
      });
      return result;
    },
  };
}

test("worker caches only verified public shell assets and never substitutes an HTTP auth failure", async () => {
  const harness = worker();
  await harness.dispatch("install");
  await harness.dispatch("activate");
  assert.ok(harness.saved.has(shell));
  assert.ok(harness.saved.has("/_next/static/chunks/demo.js"));
  assert.ok(
    harness.fetches.every(
      ([, options]) =>
        options?.credentials === "omit" && options.redirect === "error",
    ),
  );
  assert.deepEqual(harness.deleted, ["rose-care-shell-v1"]);
  const navigation = {
    url: origin + "/demo/",
    method: "GET",
    mode: "navigate",
    headers: new Headers(),
  } as Request;
  assert.equal(
    ((await harness.dispatch("fetch", navigation)) as Response).status,
    401,
  );
  assert.equal(harness.saved.has("/demo/"), false);
  for (const request of [
    { ...navigation, url: origin + "/api/private" },
    { ...navigation, url: origin + "/?token=fictional" },
    {
      ...navigation,
      headers: new Headers({ Authorization: "Bearer fictional" }),
    },
    { ...navigation, method: "POST" },
    { ...navigation, url: "https://other.example.test/" },
  ])
    assert.equal(harness.dispatch("fetch", request), undefined);
  harness.offline();
  assert.match(
    await ((await harness.dispatch("fetch", navigation)) as Response).text(),
    /demo.js/,
  );
});
test("worker fails closed for private, cookie-varying, unmarked and session-setting shells", async () => {
  const scenarios: Record<string, string>[] = [
    { "Cache-Control": "private" },
    { "Cache-Control": "no-store" },
    { Vary: "Accept-Encoding, Cookie" },
    { "X-Rose-Offline-Shell": "other" },
    { "Set-Cookie": "fictional=yes" },
  ];
  for (const headers of scenarios) {
    const harness = worker(headers);
    await harness.dispatch("install");
    await harness.dispatch("activate");
    assert.equal(harness.saved.size, 0);
    assert.deepEqual(harness.deleted, [
      "rose-care-demo-v3",
      "rose-care-shell-v1",
    ]);
  }
});
