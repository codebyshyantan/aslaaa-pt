import "dotenv/config";

import type { Server } from "node:http";

import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = await createApp();
let shuttingDown = false;
const scheduler = setInterval(() => {
  if (typeof app.locals.runScheduledAutomation === "function") {
    void app.locals.runScheduledAutomation().catch((error: unknown) => {
      console.error("Aslaaa PT automation scheduler failed.", error);
    });
  }
}, 60000);

const server = app.listen(env.PORT, () => {
  console.log(`Aslaaa PT API listening on port ${env.PORT}`);
});

async function shutdown(signal: string, httpServer: Server) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`Received ${signal}. Shutting down Aslaaa PT API.`);
  clearInterval(scheduler);

  await new Promise<void>((resolve, reject) => {
    httpServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  if (typeof app.locals.shutdown === "function") {
    await app.locals.shutdown();
  }

  console.log("Aslaaa PT API shutdown complete.");
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void shutdown(signal, server).finally(() => {
      process.exit(0);
    });
  });
}
