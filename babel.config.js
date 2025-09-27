module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
        modules: 'auto',
      },
    ],
    [
      '@babel/preset-react',
      {
        runtime: 'automatic',
      },
    ],
    [
      '@babel/preset-typescript',
      {
        isTSX: true,
        allExtensions: true,
        allowDeclareFields: true,
        allowNamespaces: true,
        onlyRemoveTypeImports: true,
      },
    ],
  ],
  plugins: [
    '@babel/plugin-transform-class-properties',
    '@babel/plugin-transform-async-to-generator',
  ],
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current',
            },
            modules: 'auto',
          },
        ],
        [
          '@babel/preset-react',
          {
            runtime: 'automatic',
          },
        ],
        [
          '@babel/preset-typescript',
          {
            isTSX: true,
            allExtensions: true,
            allowDeclareFields: true,
            allowNamespaces: true,
            onlyRemoveTypeImports: true,
          },
        ],
      ],
      plugins: [
        '@babel/plugin-transform-class-properties',
        '@babel/plugin-transform-async-to-generator',
      ],
    },
  },
};