// Minimal D1-compatible wrapper over node:sqlite so tests run the real migration and SQL.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

export function createTestD1() {
  const db = new DatabaseSync(':memory:');
  for (const f of readdirSync('migrations').sort()) db.exec(readFileSync(`migrations/${f}`, 'utf8'));
  const stmt = (sql: string, args: unknown[] = []) => ({
    bind: (...a: unknown[]) => stmt(sql, a),
    async run() { db.prepare(sql).run(...(args as any[])); return { success: true }; },
    async first<T>() { return (db.prepare(sql).get(...(args as any[])) as T) ?? null; },
    async all<T>() { return { results: db.prepare(sql).all(...(args as any[])) as T[] }; },
  });
  return { prepare: (sql: string) => stmt(sql), raw: db } as any;
}
