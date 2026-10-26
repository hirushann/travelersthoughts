/**
 * Creates (or resets) an admin login from the terminal. The password is typed hidden and never
 * stored anywhere but as a scrypt hash.
 *
 *   npm run admin:create
 *
 * Non-interactive (CI or scripted setup): ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD, ADMIN_ROLE.
 */
import "dotenv/config";
import readline from "node:readline";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { hashPassword, passwordProblem } from "../lib/auth/password";
import { slugify } from "../lib/content/sanitize";
import * as schema from "../lib/db/schema";

const { authors, sessions, users } = schema;

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // Print the prompt, swallow the echoed keystrokes.
      const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput.bind(rl);
      (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s) => {
        if (s.startsWith(question) || s === "\r\n" || s === "\n") write(s);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? (await ask("Email: "))).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("That doesn't look like an email address.");
  const name = process.env.ADMIN_NAME ?? (await ask("Display name (shown as the byline): "));
  if (!name) throw new Error("A name is required.");
  const role = (process.env.ADMIN_ROLE ?? "admin") as "admin" | "author";

  let password = process.env.ADMIN_PASSWORD ?? "";
  if (!password) {
    password = await ask("Password: ", true);
    const problem = passwordProblem(password);
    if (problem) throw new Error(problem);
    if ((await ask("Repeat password: ", true)) !== password) throw new Error("Passwords didn't match.");
  } else if (passwordProblem(password)) {
    throw new Error(passwordProblem(password)!);
  }

  const pool = mysql.createPool({ uri: process.env.DATABASE_URL!, connectionLimit: 2 });
  const db = drizzle(pool, { schema, mode: "default" });
  try {
    // Reuse an imported author with the same name, so this login inherits their posts.
    let [author] = await db.select().from(authors).where(sql`lower(${authors.name}) = ${name.toLowerCase()}`);
    if (!author) {
      const [{ id }] = await db.insert(authors).values({ slug: slugify(name), name }).$returningId();
      [author] = await db.select().from(authors).where(eq(authors.id, id));
    }

    const now = new Date();
    const passwordHash = await hashPassword(password);
    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) {
      await db
        .update(users)
        .set({ name, role, passwordHash, authorId: author.id, active: true, failedLogins: 0, lockedUntil: null, updatedAt: now })
        .where(eq(users.id, existing.id));
      await db.delete(sessions).where(eq(sessions.userId, existing.id));
      console.log(`Updated ${email} (${role}) and signed out its existing sessions.`);
    } else {
      await db.insert(users).values({ email, name, role, passwordHash, authorId: author.id, createdAt: now, updatedAt: now });
      console.log(`Created ${role} ${email}, writing as "${author.name}".`);
    }
    console.log("Sign in at /admin/login/");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
