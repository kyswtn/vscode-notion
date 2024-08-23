import path from 'node:path'
import type {Config as SwcConfig} from '@swc/core'
import type {Configuration} from 'webpack'

// todo: check for browser conditional imports, remove them unless needed

import TerserPlugin from 'terser-webpack-plugin'

const cwd = (p: string) => path.resolve(__dirname, p)

// [SWC](https://swc.rs) compiles TypeScript to JavaScript
const swcLoader = {
  loader: 'swc-loader',
  options: {
    jsc: {
      loose: true,
      target: 'es2022',
      parser: {
        tsx: true,
        syntax: 'typescript',
        decorators: true,
      },
      keepClassNames: true,
      transform: {
        legacyDecorator: true,
        decoratorMetadata: true,
      },
    },
  } satisfies SwcConfig,
}

// [Terser](https://terser.org) minifies the outputted JavaScript, using SWC under the hood.
const terserMinimizer = new TerserPlugin({
  minify: TerserPlugin.swcMinify,
  terserOptions: {
    sourceMap: true,
    mangle: {
      keep_classnames: true,
      keep_fnames: true,
    },
  },
})

const sharedConfig = {
  mode: 'none',
  externals: {
    // vscode module is only provided to extensions during
    // extension runtime, and doesn't exists as a real dependency
    vscode: 'commonjs vscode',
  },
  output: {
    path: cwd('dist'),
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.js'],
    mainFields: ['main', 'module'],
  },
  optimization: {
    minimize: true,
    minimizer: [terserMinimizer],
  },
} satisfies Configuration

const buildConfig = {
  ...sharedConfig,
  target: 'node',
  name: 'build-extension',
  entry: './src/extension.ts',
  output: {
    ...sharedConfig.output,
    libraryTarget: 'commonjs2',
    filename: 'extension.js',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: swcLoader,
      },
    ],
  },
} satisfies Configuration

const webviewConfig = {
  ...sharedConfig,
  target: 'web',
  name: 'build-webview',
  entry: './src/webview/index.tsx',
  output: {
    ...sharedConfig.output,
    filename: 'webview.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: swcLoader,
      },
    ],
  },
} satisfies Configuration

module.exports = [buildConfig, webviewConfig]
