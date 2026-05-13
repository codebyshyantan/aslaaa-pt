import type { Sql } from "postgres";

import { hashPassword } from "../lib/security/password.js";
import type { UserRole } from "../modules/auth/auth.types.js";

const demoUsers: Array<{
  password: string;
  role: UserRole;
  username: string;
}> = [
  {
    password: "Admin@123",
    role: "ADMIN",
    username: "ADMIN_MASTER",
  },
  {
    password: "Pt@123",
    role: "PT_MAKER",
    username: "PT_SAHA",
  },
];

export async function ensureDemoUsers(sql: Sql) {
  const now = new Date().toISOString();
  const seededUsers = await Promise.all(
    demoUsers.map(async (user) => ({
      ...user,
      passwordHash: await hashPassword(user.password),
    })),
  );

  for (const user of seededUsers) {
    await sql`
      insert into users (username, role, password_hash, is_active, created_at, updated_at)
      values (${user.username}, ${user.role}, ${user.passwordHash}, true, ${now}, ${now})
      on conflict (username)
      do update set
        role = excluded.role,
        password_hash = excluded.password_hash,
        is_active = true,
        updated_at = excluded.updated_at
    `;
  }
}
