import path from "node:path";

import { FileStore } from "@/lib/store/file-store";
import type { Store } from "@/lib/store/store";

declare global {
  var __automnator_store: Store | undefined;
}

export function getStore(): Store {
  if (globalThis.__automnator_store) return globalThis.__automnator_store;

  const dbPath =
    process.env.AUTOMNATOR_DB_PATH ??
    path.join(process.cwd(), ".data", "automnator.db.json");

  // For now we default to file-backed store. Supabase-backed implementation can
  // be added later once migrations and RLS are deployed.
  const store = new FileStore({ dbPath });

  globalThis.__automnator_store = store;
  return store;
}
