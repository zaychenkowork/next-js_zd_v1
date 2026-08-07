import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX, { createNodeResolver } from 'eslint-plugin-import-x';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import queryPlugin from '@tanstack/eslint-plugin-query';
import tseslint from 'typescript-eslint';

const restrictedLayerImport = (name) => ({
  name,
  message: `Import a specific file from '${name}/...' instead of the layer root (no barrel files in src/).`,
});

/**
 * Layers, top to bottom. An import may only point downwards:
 *
 *   app → features → components → components/ui
 *                       ↘ api → store
 *   app, features → server         (server-only: session, DAL, cache, actions)
 *   everything     → i18n, schemas, utils, types, config, constants
 *
 * Two rules in there are load-bearing rather than tidiness:
 *
 * `components/` may **not** import `server/`. A shared component has to be
 * renderable from either environment, and the moment it reaches into the DAL it
 * can only ever run on the server — so data fetching belongs one level up, in
 * `app/` or `features/`, which pass the result down as props. This is what keeps
 * `components/` testable and Storybook-able without a request context.
 *
 * `server/` must not be reachable from a Client Component at all, which is why
 * every client-side layer lists it as forbidden. The `server-only` package is the
 * second line of defence — it turns a violation into a build error even if the
 * import slips past the linter. See docs/architecture.md.
 */
const LAYER_ZONES = [
  {
    target: './src/components/ui',
    from: [
      './src/api',
      './src/store',
      './src/server',
      './src/features',
      './src/app',
    ],
    message:
      'components/ui/ must not know about stores, the API or the server — pass data in via props.',
  },
  {
    target: './src/components/ui',
    from: './src/components',
    except: ['./ui'],
    message:
      'components/ui/ must not import connected components — it is the presentational tier.',
  },
  {
    target: './src/components',
    from: ['./src/features', './src/app', './src/server'],
    message:
      'components/ must not import features/, app/ or server/ — it sits below them.',
  },
  {
    target: './src/api',
    from: './src/components',
    except: ['./ui'],
    message:
      'api/ may import components/ui/ (e.g. showToast) but not connected components.',
  },
  {
    target: './src/api',
    from: ['./src/store', './src/features', './src/app', './src/server'],
    message:
      'api/ must not import store/, features/, app/ or server/ — the client is auth-agnostic, the seam lives inside api/client.ts.',
  },
  {
    target: './src/store',
    from: [
      './src/api',
      './src/server',
      './src/components',
      './src/features',
      './src/app',
    ],
    message:
      'store/ is client state only — it must not import api/, server/, components/, features/ or app/.',
  },
  {
    target: './src/hooks',
    from: [
      './src/api',
      './src/server',
      './src/components',
      './src/features',
      './src/app',
    ],
    message:
      'hooks/ may wrap store/i18n but must not import api/ (query hooks live in features/*/api), server/, components/, features/ or app/.',
  },
  {
    target: './src/features',
    from: './src/app',
    message: 'features/ must not import app/ — app/ only holds routing.',
  },
  {
    target: './src/server',
    from: ['./src/components', './src/features', './src/app', './src/store'],
    message:
      'server/ is the bottom of the server chain — it must not import UI or feature code.',
  },
];

export default tseslint.config(
  {
    ignores: [
      '.next',
      'coverage',
      'storybook-static',
      'test-results',
      'playwright-report',
      '.claude/worktrees',
      'next-env.d.ts',
      'public/mockServiceWorker.js',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    extends: [
      sonarjs.configs.recommended,
      ...queryPlugin.configs['flat/recommended'],
      prettierConfig,
    ],
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'import-x': importX,
      'simple-import-sort': simpleImportSort,
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver(),
        createNodeResolver(),
      ],
    },
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'],
            ['^react', '^next', '^@?\\w'],
            ['^~/app'],
            ['^~/features'],
            ['^~/components'],
            ['^~/server'],
            ['^~/api'],
            ['^~/store'],
            ['^~/hooks'],
            ['^~/i18n'],
            ['^~/schemas'],
            ['^~/utils'],
            ['^~/types'],
            ['^~/config'],
            ['^~/constants'],
            ['^~/assets'],
            ['^\\.'],
            ['^.+\\.css$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      'import-x/no-restricted-paths': ['error', { zones: LAYER_ZONES }],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            restrictedLayerImport('~/app'),
            restrictedLayerImport('~/features'),
            restrictedLayerImport('~/components'),
            restrictedLayerImport('~/server'),
            restrictedLayerImport('~/api'),
            restrictedLayerImport('~/store'),
            restrictedLayerImport('~/hooks'),
            restrictedLayerImport('~/i18n'),
            restrictedLayerImport('~/schemas'),
            restrictedLayerImport('~/utils'),
            restrictedLayerImport('~/types'),
            restrictedLayerImport('~/config'),
            restrictedLayerImport('~/constants'),
            restrictedLayerImport('~/assets'),
            restrictedLayerImport('~/styles'),
          ],
          patterns: [
            {
              /**
               * `components/ui/Icon/types.ts` is the single place that imports a
               * glyph; the override below exempts it. Everywhere else, an icon
               * arrives as `Icons.Foo`. Without this the registry decays into a
               * hundred imports scattered across features, and the catalogue
               * story stops being the answer to "do we already have this icon?".
               */
              group: ['~/assets/icons/*'],
              message:
                'Import icons through ~/components/ui/Icon/Icon and the Icons enum, not the .svg file. Register new glyphs in components/ui/Icon/types.ts — see docs/assets.md.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.name='process'][property.name='env']",
          message:
            'Use the validated env from ~/config/env instead of process.env directly.',
        },
        {
          /**
           * `const { env } = process` reaches the same object without ever
           * writing `process.env`, so the selector above misses it. Worth its
           * own entry rather than being written off as pedantry: Next inlines
           * `NEXT_PUBLIC_*` by static analysis, so this form does not just
           * dodge the convention, it silently yields `undefined` in the
           * browser.
           */
          selector: "VariableDeclarator[init.name='process'] > ObjectPattern",
          message:
            'Destructuring `process` bypasses ~/config/env and breaks Next’s build-time inlining of NEXT_PUBLIC_* variables.',
        },
        {
          selector:
            "JSXAttribute[name.name='className'] > JSXExpressionContainer > TemplateLiteral",
          message:
            'Compose class names with cn() from `classnames`, not a template literal.',
        },
        {
          selector:
            "JSXAttribute[name.name='className'] > JSXExpressionContainer > BinaryExpression[operator='+']",
          message:
            'Compose class names with cn() from `classnames`, not string concatenation.',
        },
        {
          /**
           * Hand-written `<svg>` in a component is how an icon set quietly
           * becomes untranslatable to the design system: it does not go through
           * SVGR, so it misses the `currentColor` rewrite, the shared sizing and
           * the accessibility defaults in `components/ui/Icon`, and it is
           * invisible to the Icon story that serves as the catalogue. Put the
           * file in `src/assets/icons/` and register it instead — see
           * docs/assets.md.
           */
          selector: "JSXOpeningElement[name.name='svg']",
          message:
            'Do not inline SVG markup. Add the file to src/assets/icons/ and render it through ~/components/ui/Icon/Icon.',
        },
      ],
      /**
       * `eslint-config-next` ships this as a warning. docs/assets.md states the
       * rule as "never a bare `<img>`", and a warning does not enforce a rule —
       * it just makes the output noisier until someone stops reading it.
       */
      '@next/next/no-img-element': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
      'sonarjs/cognitive-complexity': 'off',
    },
  },
  {
    /**
     * These files run before (or outside of) the app runtime, so they are the
     * only legitimate place to read `process.env` directly: the validated env
     * object does not exist yet at that point.
     */
    files: [
      'src/config/env.ts',
      'next.config.ts',
      'src/instrumentation.ts',
      'src/instrumentation-client.ts',
      'sentry.*.config.ts',
      'playwright.config.ts',
      'vitest.config.ts',
      '.storybook/**/*.ts',
      'e2e/**/*.ts',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    /**
     * The one file allowed to import a `.svg` — it *is* the icon registry. See
     * docs/assets.md.
     */
    files: ['src/components/ui/Icon/types.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['__tests__/**/*.{ts,tsx}', 'e2e/**/*.ts', 'stories/**/*.tsx'],
    rules: {
      'sonarjs/no-hardcoded-passwords': 'off',
      'sonarjs/no-hardcoded-credentials': 'off',
    },
  },
);
