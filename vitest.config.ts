import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Unit and component tests run under Vite, not under Next — which sets a hard
 * boundary on what belongs here.
 *
 * Next's own testing guidance is explicit: *"Since async Server Components are
 * new to the React ecosystem, Vitest currently does not support them… we
 * recommend using E2E tests for async components."* So this suite covers the
 * deterministic layers — the API client, schemas, stores and UI primitives — and
 * everything that needs a request, a cookie or a Server Action is covered by
 * Playwright in e2e/. That split is also why `coverage.include` is an allowlist
 * rather than "everything minus ignores": a coverage number that includes
 * untestable files is a number nobody trusts.
 *
 * Tests mirror `src/` 1:1 under `__tests__/`. Finding the test for
 * `src/api/client.ts` is a path substitution, not a search.
 */
export default defineConfig({
  resolve: {
    // Native tsconfig `paths` resolution (Vite 8) — replaces vite-tsconfig-paths.
    tsconfigPaths: true,
  },
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './__tests__/setup/setupTests.ts',
    css: true,
    /**
     * Next injects `NEXT_PUBLIC_*` at build time; Vitest does not, so the env
     * `src/config/env.ts` validates has to be provided here. Without this every
     * test that touches the API client fails at module evaluation.
     */
    env: {
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_API_URL: 'https://api.test',
      NEXT_PUBLIC_ENABLE_DEVTOOLS: 'false',
      API_URL: 'https://api.test',
    },
    // `.claude/worktrees` holds live git worktrees of background agent sessions —
    // full repo copies that must never leak into a test run.
    exclude: ['**/node_modules/**', '**/.next/**', '**/.claude/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      /**
       * An allowlist, and every entry is here because it is genuinely unit
       * testable. Not included, on purpose:
       *   - `src/app/**`, `src/features/**` — async Server Components and Server
       *     Actions, covered by Playwright in e2e/;
       *   - `src/server/**` — needs a request context (`cookies()`), same;
       *   - `src/constants/**`, `src/config/**` — data, not logic. A threshold
       *     over a file of constants measures nothing.
       */
      include: [
        'src/api/client.ts',
        'src/api/errors.ts',
        'src/schemas/**/*',
        'src/store/**/*',
        'src/components/ui/**/*',
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        branches: 75,
        functions: 70,
      },
    },
  },
});
