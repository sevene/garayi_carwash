# Local Development Workflow

To ensure your local environment matches the Cloudflare production environment (including D1 database access), follow these steps:

## 1. Initial Setup

One-time setup to initialize the local D1 database schema:

```bash
npm run db:setup:local
```

This applies the `schema.sql` file to your local `.wrangler` state.

## 2. Development Cycle

Since we are using `open-next` with Cloudflare Pages, we must build the project before running the dev server to correctly emulate the bindings.

1.  **Build the project**:
    ```bash
    npm run pages:build
    ```

2.  **Run the local development server**:
    ```bash
    npm run pages:dev
    ```

The application will be available at `http://localhost:8787` (or whatever port wrangler assigns).

## Notes

-   **Database**: The local database is isolated from production. Data added locally will not appear in production and vice versa.
-   **Changes**: If you make code changes, you must re-run `npm run pages:build` to see them in `npm run pages:dev`. For rapid UI development without bindings, you can still use `npm run dev` (standard Next.js dev), but API routes using D1 will likely fail or require a mock fallback.
