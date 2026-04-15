# Contributing

Contributions are welcome! Please open an issue first to discuss significant changes before submitting a pull request.

## Development Setup

```bash
git clone https://github.com/flarelight-io/reporting
cd reporting
npm install
npm start   # dev server with hot reload at http://localhost:3333
```

## Running Tests

```bash
npm test            # unit (Jest) + e2e (Puppeteer)
npm run test.watch  # watch mode
```

## Building

```bash
npm run build          # compile to /dist
npm run bundle:esbuild # build standalone IIFE bundle
```

## Project Structure

See [docs/development.md](docs/development.md) for a full guide to the architecture, component patterns, and how to add new widgets or visualizations.

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR.
- Ensure tests pass (`npm test`) before submitting.
- Update documentation in `docs/` if your change affects public-facing behaviour.
- Follow the existing code style (Stencil decorators, TypeScript, SCSS per component).

## Reporting Issues

Please use [GitHub Issues](../../issues) to report bugs or request features. Include:
- Steps to reproduce
- Expected vs actual behaviour
- Browser / runtime version if relevant
