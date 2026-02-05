import { getCloudflareContext } from "@opennextjs/cloudflare";

// Define the shape of our Database interface to match common usages
// We only need the methods we actually use.
export interface D1DatabaseInterface {
    prepare(query: string): D1PreparedStatementInterface;
}

export interface D1PreparedStatementInterface {
    bind(...values: any[]): D1PreparedStatementInterface;
    all<T = any>(): Promise<D1Result<T>>;
    run(): Promise<D1Response>;
    first<T = any>(colName?: string): Promise<T | null>;
}

export interface D1Result<T = any> {
    results: T[];
    success: boolean;
    meta: any;
    error?: string;
}

export interface D1Response {
    success: boolean;
    meta: any;
    error?: string;
}

// =============================================================================
// SQLite Adapter (For Local Node.js Dev)
// =============================================================================

class SQLiteAdapter implements D1DatabaseInterface {
    private db: any;

    constructor() {
        // Safe check for Node environment
        const isNode = typeof process !== 'undefined' &&
            process.versions &&
            process.versions.node;

        if (!isNode) {
            console.warn("SQLiteAdapter: Warning - Environment does not look like standard Node.js. Native modules might fail.");
        }

        try {
            // Use eval to hide require from bundlers that might try to bundle it for Edge
            const Database = eval('require')('better-sqlite3');
            const path = eval('require')('path');
            const dbPath = path.join(process.cwd(), 'local.db');
            console.log("Using Database File:", dbPath);
            this.db = new Database(dbPath);
        } catch (e: any) {
            console.error("Failed to initialize SQLiteAdapter:", e);
            throw new Error(`Failed to load better-sqlite3: ${e.message}`);
        }
    }

    prepare(query: string): D1PreparedStatementInterface {
        const stmt = this.db.prepare(query);
        return new SQLiteStatementAdapter(stmt);
    }
}

class SQLiteStatementAdapter implements D1PreparedStatementInterface {
    private stmt: any;
    private bindings: any[] = [];

    constructor(stmt: any) {
        this.stmt = stmt;
    }

    bind(...values: any[]): D1PreparedStatementInterface {
        this.bindings = values;
        return this;
    }

    async all<T = any>(): Promise<D1Result<T>> {
        try {
            const results = this.stmt.all(...this.bindings);
            return {
                results: results as T[],
                success: true,
                meta: {},
            };
        } catch (e: any) {
            console.error("SQLite Error:", e);
            return {
                results: [],
                success: false,
                meta: {},
                error: e.message
            };
        }
    }

    async run(): Promise<D1Response> {
        try {
            const info = this.stmt.run(...this.bindings);
            return {
                success: true,
                meta: {
                    last_row_id: info.lastInsertRowid,
                    changes: info.changes
                }
            };
        } catch (e: any) {
            console.error("SQLite Error:", e);
            return {
                success: false,
                meta: {},
                error: e.message
            };
        }
    }

    async first<T = any>(colName?: string): Promise<T | null> {
        try {
            const result = this.stmt.get(...this.bindings);
            if (!result) return null;
            if (colName && result[colName] !== undefined) {
                return result[colName] as T;
            }
            return result as T;
        } catch (e) {
            console.error("SQLite Error:", e);
            return null;
        }
    }
}

// =============================================================================
// Main Accessor
// =============================================================================

export async function getDB(): Promise<D1DatabaseInterface> {
    // 1. Try Cloudflare Context (Platform D1)
    try {
        const ctx = await getCloudflareContext({ async: true });
        if (ctx && ctx.env && ctx.env.DB) {
            return ctx.env.DB as unknown as D1DatabaseInterface;
        }
    } catch (e: any) {
        // Ignored
    }

    // 2. Fallback to SQLite (Local Node.js Dev)
    try {
        if (typeof process !== 'undefined') {
            return new SQLiteAdapter();
        }
    } catch (e) {
        // Ignored
    }

    // 3. Last Resort Attempt
    try {
        return new SQLiteAdapter();
    } catch (e) { }

    console.error("CRITICAL: Failed to get D1 database and not in Node.js environment.");
    throw new Error("Database connection unavailable");
}
