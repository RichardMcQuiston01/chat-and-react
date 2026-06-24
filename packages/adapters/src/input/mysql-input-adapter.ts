import type { InputAdapter } from '@chat-and-react/core';

interface MySqlConnectionLike {
  execute(sql: string, params?: unknown[]): Promise<[unknown[], unknown]>;
}

export class MySqlInputAdapter implements InputAdapter {
  private constructor(private readonly schema: unknown) {}

  /** Executes `sql` and caches the first row as the schema. */
  static async create(
    connection: MySqlConnectionLike,
    sql: string,
    params?: unknown[],
  ): Promise<MySqlInputAdapter> {
    const [rows] = await connection.execute(sql, params);
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('MySqlInputAdapter: query returned no rows');
    }
    return new MySqlInputAdapter(rows[0]);
  }

  transform(_raw: unknown): unknown {
    return this.schema;
  }
}
