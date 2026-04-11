# Plugin Authoring Smoke Example

A Cyberpunk Company plugin

## Development

```bash
pnpm install
pnpm dev            # watch builds
pnpm dev:ui         # local dev server with hot-reload events
pnpm test
```

## Install Into Cyberpunk Company

```bash
pnpm cyberpunk-company plugin install ./
```

## Build Options

- `pnpm build` uses esbuild presets from `@cyberpunk-company/plugin-sdk/bundlers`.
- `pnpm build:rollup` uses rollup presets from the same SDK.
