import { Config } from '@stencil/core';
import { sass } from '@stencil/sass';

export const config: Config = {
  namespace: 'flarelight-reporting',
  plugins: [
    sass()
  ],
  globalStyle: 'src/global/theme.scss',
  extras: {
    // Emit literal import() calls for each lazy bundle so Vite/Parcel/webpack can follow them
    // (without this the loader builds the path at runtime: import(`./${bundleId}.entry.js`))
    enableImportInjection: true,
  },
  outputTargets: [
    {
      type: 'dist',
      esmLoaderPath: '../loader',
    },
    {
      type: 'dist-custom-elements',
      // Static, tree-shakeable ESM for bundlers: import { defineCustomElements } from '@flarelight-io/reporting/components'
      customElementsExportBehavior: 'bundle',
      externalRuntime: false,
      generateTypeDeclarations: true,
    },
    {
      type: 'dist-hydrate-script',
      dir: 'dist/hydrate',
    },
    {
      type: 'docs-readme',
    },
    {
      type: 'www',
      serviceWorker: null, // disable service workers
      copy: [
        {
          src: '**/*.html'
        }
      ]
    },
  ],
  testing: {
    browserHeadless: "shell",
  }
};
