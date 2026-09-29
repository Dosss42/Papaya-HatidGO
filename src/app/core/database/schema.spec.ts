import { SCHEMA } from './schema';

describe('SQLite schema', () => {
  it('numbers its versions 1, 2, 3… with no gaps or repeats', () => {
    expect(SCHEMA.map((s) => s.version)).toEqual(SCHEMA.map((_, i) => i + 1));
  });

  it('gives every version at least one statement and a description', () => {
    for (const step of SCHEMA) {
      expect(step.statements.length).toBeGreaterThan(0);
      expect(step.description.trim()).not.toBe('');
    }
  });

  it('never stores secrets on the phone (token and password stay out of SQLite)', () => {
    const allSql = SCHEMA.flatMap((s) => s.statements).join('\n').toLowerCase();
    expect(allSql).not.toMatch(/token|password|secret/);
  });
});
