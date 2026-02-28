declare module "sql.js" {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database;
  }

  interface Database {
    exec(sql: string): QueryExecResult[];
    run(
      sql: string,
      params?: (string | number | null | Uint8Array)[],
    ): Database;
    export(): Uint8Array;
    close(): void;
  }

  interface QueryExecResult {
    columns: string[];
    values: (string | number | Uint8Array | null)[][];
  }

  interface SqlJsConfig {
    locateFile?: (filename: string) => string;
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}
