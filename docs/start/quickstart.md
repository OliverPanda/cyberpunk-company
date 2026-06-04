---
title: Quickstart
summary: Get Cyberpunk Company running in minutes
---

Get Cyberpunk Company running locally in under 5 minutes.

## Quick Start (Recommended)

```sh
git clone https://github.com/OliverPanda/cyberpunk-company.git
cd cyberpunk-company
pnpm install
npx cyberpunk-company onboard --yes
```

This walks you through setup, configures your environment, and gets Cyberpunk Company running.

To start Cyberpunk Company again later:

```sh
npx cyberpunk-company run
```

> **Note:** If you used `npx` for setup, always use `npx cyberpunk-company` to run commands. The `pnpm cyberpunk-company` form only works inside a cloned copy of the Cyberpunk Company repository (see Local Development below).
>
> GitHub source checkouts are different from the published CLI package. Do not use `npx github:OliverPanda/cyberpunk-company`. Clone the repo, run `pnpm install`, then use `npx cyberpunk-company` or `pnpm cyberpunk-company` from that checkout.

## Local Development

For contributors working on Cyberpunk Company itself. Prerequisites: Node.js 20+ and pnpm 9+.

Clone the repository, then:

```sh
pnpm install
pnpm dev
```

This starts the API server and UI at [http://localhost:3100](http://localhost:3100).

No external database required — Cyberpunk Company uses an embedded PostgreSQL instance by default.

When working from the cloned repo, you can also use:

```sh
pnpm cyberpunk-company run
```

This auto-onboards if config is missing, runs health checks with auto-repair, and starts the server.

## What's Next

Once Cyberpunk Company is running:

1. Create your first company in the web UI
2. Define a company goal
3. Create a CEO agent and configure its adapter
4. Build out the org chart with more agents
5. Set budgets and assign initial tasks
6. Hit go — agents start their heartbeats and the company runs

<Card title="Core Concepts" href="/start/core-concepts">
  Learn the key concepts behind Cyberpunk Company
</Card>
