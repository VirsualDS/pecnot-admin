import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  const normalized = password.trim();

  if (!normalized) {
    throw new Error("Password vuota");
  }

  return bcrypt.hash(normalized, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  const normalized = password.trim();

  if (!normalized || !passwordHash) {
    return false;
  }

  return bcrypt.compare(normalized, passwordHash);
}