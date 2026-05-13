import postgres, { type Sql } from "postgres";

export function createPostgresClient(databaseUrl: string): Sql {
  return postgres(databaseUrl, {
    idle_timeout: 20,
    max: 10,
    prepare: true,
  });
}
