# Using the library with a bundler (Vite, webpack, Rollup, Parcel, Next.js)

The package ships three ways to load the components. For bundled apps use **`/components`**.

| Entry | Import | Loading | Use when |
| ----- | ------ | ------- | -------- |
| `@flarelight-io/reporting/components` | `defineCustomElements()` | Static ESM, no dynamic imports | Vite, webpack, Rollup, Parcel, Next.js, anything that bundles |
| `@flarelight-io/reporting/loader` | `defineCustomElements()` | Lazy, bundles are `import()`ed on demand | You want lazy loading and your bundler handles code splitting |
| `dist/flarelight-reporting/flarelight-reporting.esm.js` | `<script type="module">` | Lazy, resolved relative to the script | CDN / plain HTML, no bundler |

## Recommended: static ESM (`/components`)

```ts
import { defineCustomElements, ChartThemeUtils } from '@flarelight-io/reporting/components';
import '@flarelight-io/reporting/styles.css';

defineCustomElements();   // registers every element, once
```

Everything is reachable through plain `import` statements, so bundlers can analyze, hash and tree-shake it.
No path is built at runtime, so there is nothing for the bundler to miss.

Individual components are also available, for example
`import { defineCustomElement } from '@flarelight-io/reporting/components/report-viewer'`.
`report-viewer` creates its widgets dynamically, so register all elements with `defineCustomElements()` unless
you know which widgets a report uses.

Types ship with each entry (`dist/components/*.d.ts`); use `moduleResolution: "bundler"` (or `node16`/`nodenext`)
so TypeScript honors the `exports` map.

## Lazy loader (`/loader`)

```ts
import { defineCustomElements } from '@flarelight-io/reporting/loader';
defineCustomElements();
```

The lazy build is compiled with Stencil's `enableImportInjection`, so each lazy bundle is referenced by a literal
`import('./<bundle>.entry.js')`. Without it Stencil builds the path at runtime (`` import(`./${bundleId}.entry.js`) ``),
which Vite/Rollup cannot follow: a production build completes without errors but silently leaves the component code
out of the output. Prefer `/components` unless you specifically want lazy loading.

## Styles

Import the stylesheet once (`@flarelight-io/reporting/styles.css`). It defines the `--fl-*` theme variables; see
[theming.md](theming.md) for overriding them.

## Frameworks

- **React / Vue / Angular (Vite or CLI builds):** call `defineCustomElements()` once at startup, then use
  `<report-viewer>` like any element. Set object props (`configuration`, `fetchChartData`) as properties, not attributes.
- **Next.js / SSR:** custom elements need the DOM. Call `defineCustomElements()` in a client-only effect or a
  `'use client'` module. A hydrate bundle for server rendering is published under `dist/hydrate`.
