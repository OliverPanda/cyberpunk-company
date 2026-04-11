# Schemas, Temporal Validity, and Memory Decay

## Atomic Fact Schema (items.yaml)

```yaml
- id: entity-001
  fact: "The actual fact"
  category: relationship | milestone | status | preference
  hall: facts | events | discoveries | preferences | advice
  wing: "projects/webapp"       # Palace wing (PARA path)
  room: "authentication"        # Palace room (topic within wing)
  timestamp: "YYYY-MM-DD"       # When the fact was recorded
  source: "YYYY-MM-DD"          # Original source date
  valid_from: "YYYY-MM-DD"      # When this fact became true (null = since recorded)
  valid_until: null              # When this fact stopped being true (null = still valid)
  status: active                 # active | superseded | invalidated
  superseded_by: null            # e.g. entity-002
  invalidation_reason: null      # Why the fact was invalidated
  related_entities:
    - companies/acme
    - people/jeff
  tunnels:                       # Cross-domain connections
    - projects/mobile-app        # Same topic appears here too
  last_accessed: "YYYY-MM-DD"
  access_count: 0
```

### New Fields (MemPalace-Enhanced)

| Field | Type | Purpose |
|---|---|---|
| `hall` | enum | Fact type corridor: facts, events, discoveries, preferences, advice |
| `wing` | string | Palace wing = PARA path (e.g., "projects/webapp") |
| `room` | string | Topic within wing (e.g., "authentication", "database") |
| `valid_from` | date/null | When fact became true. null = since timestamp |
| `valid_until` | date/null | When fact stopped being true. null = still valid |
| `invalidation_reason` | string/null | Why the fact was invalidated |
| `tunnels` | list | Cross-wing connections for same topic |

### Status Values

| Status | Meaning |
|---|---|
| `active` | Fact is current and valid |
| `superseded` | Replaced by a newer version (`superseded_by` set) |
| `invalidated` | No longer true (`valid_until` and `invalidation_reason` set) |

### Temporal Validity

Facts now support time-windowed validity, inspired by mempalace's temporal knowledge graph:

```yaml
# A fact that was true for a specific period
- id: team-003
  fact: "Maya is assigned to auth-migration"
  hall: facts
  wing: "projects/backend-v2"
  room: "team-assignments"
  valid_from: "2026-01-15"
  valid_until: "2026-02-01"
  status: invalidated
  invalidation_reason: "Maya moved to mobile team"

# A fact that is currently true (no end date)
- id: team-004
  fact: "Maya is assigned to mobile-app"
  hall: facts
  wing: "projects/mobile-app"
  room: "team-assignments"
  valid_from: "2026-02-01"
  valid_until: null
  status: active
```

**Querying by time:**

- `as_of("2026-01-20")` → returns team-003 (Maya on auth-migration)
- `as_of("2026-02-15")` → returns team-004 (Maya on mobile-app)
- `current_only()` → returns only facts where `valid_until` is null and status is active

**Invalidation vs. Supersession:**

- Use `superseded` when a fact is replaced by a more accurate version of the same information
- Use `invalidated` when a fact was once true but is no longer true (temporal change)
- Both are non-destructive -- original facts remain in items.yaml

---

## Hall Classification Guide

When storing a fact, classify it into the correct hall:

| Hall | Use When | Examples |
|---|---|---|
| `facts` | Recording decisions, commitments, configurations | "Team uses PostgreSQL", "API rate limit is 1000/min" |
| `events` | Recording sessions, milestones, incidents | "v2.0 launched", "Production outage on March 5" |
| `discoveries` | Recording insights, learnings, breakthroughs | "Batch processing reduces costs 40%" |
| `preferences` | Recording habits, opinions, working styles | "User prefers terse responses", "Team reviews PRs async" |
| `advice` | Recording recommendations, best practices | "Always run migrations before deploy" |

---

## Memory Decay

Facts decay in retrieval priority over time so stale info does not crowd out recent context.

### Access Tracking

When a fact is used in conversation, bump `access_count` and set `last_accessed` to today. During heartbeat extraction, scan the session for referenced entity facts and update their access metadata.

### Recency Tiers (for summary.md rewriting)

- **Hot** (accessed in last 7 days) -- include prominently in summary.md. Candidates for L1 loading.
- **Warm** (8-30 days ago) -- include at lower priority. Available for L2 recall.
- **Cold** (30+ days or never accessed) -- omit from summary.md. Still in items.yaml, retrievable via L3 search.
- High `access_count` resists decay -- frequently used facts stay warm longer.

### Weekly Synthesis

Sort by recency tier, then by access_count within tier. Cold facts drop out of the summary but remain in items.yaml. Accessing a cold fact reheats it.

No deletion. Decay only affects retrieval priority via summary.md curation. The full record always lives in items.yaml.

### L1 Budget Allocation

During weekly synthesis, select the most critical hot facts across all entities to fit the ~120 token L1 budget. Prioritize by:

1. Access frequency (highest access_count first)
2. Recency (most recently accessed first)
3. Relevance to active projects
4. Hall type (facts and preferences are typically more useful in L1 than events)

---

## Tunnel Maintenance

### When to Create Tunnels

Create a tunnel entry in `$AGENT_HOME/life/tunnels.yaml` when:

- The same topic (room) appears in 2+ wings
- Cross-project dependencies exist
- A decision in one project affects another

### Tunnel Schema

```yaml
# tunnels.yaml
- topic: "authentication"
  connections:
    - path: "projects/webapp/items.yaml"
      relevance: "Frontend auth flows"
    - path: "projects/mobile-app/items.yaml"
      relevance: "Mobile OAuth integration"
    - path: "areas/companies/acme/items.yaml"
      relevance: "Client SSO requirements"
  note: "Auth decisions are cross-cutting across all client-facing projects"
  created: "2026-01-15"
  last_updated: "2026-03-01"
```

### Using Tunnels During Recall

When working on a topic, check `tunnels.yaml` for cross-domain connections. Load related facts from connected paths to ensure decisions are consistent across projects.

---

## Migration from Legacy Schema

Existing `items.yaml` files without the new fields remain valid. Treat missing fields as:

- `hall`: infer from `category` (relationship→facts, milestone→events, status→facts, preference→preferences)
- `wing`: infer from file path
- `room`: null (unclassified)
- `valid_from`: same as `timestamp`
- `valid_until`: null (assumed current)
- `tunnels`: empty list

Backfill spatial metadata during weekly synthesis when touching old facts.
