import argon2 from "argon2";

const passwordHashOptions: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 3,
  parallelism: 1,
};

export async function hashPassword(password: string) {
  return argon2.hash(password, passwordHashOptions);
}

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}
