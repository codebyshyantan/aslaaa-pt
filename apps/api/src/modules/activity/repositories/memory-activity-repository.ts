import { randomUUID } from "node:crypto";

import type { ActivityRepository } from "../activity.repository.js";
import type { ActivityLogRecord, CreateActivityLogInput } from "../activity.types.js";

export class MemoryActivityRepository implements ActivityRepository {
  private readonly logs = new Map<string, ActivityLogRecord>();

  async create(input: CreateActivityLogInput) {
    const record: ActivityLogRecord = {
      id: randomUUID(),
      ...input,
    };

    this.logs.set(record.id, record);
    return structuredClone(record);
  }

  async listRecent(limit: number) {
    return [...this.logs.values()]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit)
      .map((record) => structuredClone(record));
  }
}
