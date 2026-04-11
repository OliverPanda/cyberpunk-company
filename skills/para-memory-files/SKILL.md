---
name: para-memory-files
description: >
  File-based memory system combining Tiago Forte's PARA method with MemPalace spatial
  organization. Use this skill whenever you need to store, retrieve, update, or organize
  knowledge across sessions. Covers four memory layers: (0) Identity data, (1) Knowledge
  graph in PARA+Palace structure with atomic YAML facts and temporal validity, (2) Daily
  notes as raw timeline, (3) Tacit knowledge about user patterns. Also handles planning
  files, memory decay, weekly synthesis, recall via qmd, spatial filtering, and
  cross-domain tunnels.
  Trigger on any memory operation: saving facts, writing daily notes, creating entities,
  running weekly synthesis, recalling past context, or managing plans.
---

# PARA + Palace Memory System

Persistent, file-based memory organized by Tiago Forte's PARA method, enhanced with MemPalace spatial organization for improved retrieval. All paths are relative to `$AGENT_HOME`.

## Memory Architecture Overview

```text
 Layer 0 (Identity)     ~50 tokens    Always loaded
     |
 Layer 1 (Key Facts)    ~120 tokens   Always loaded
     |
 Layer 2 (Room Recall)  Variable      On-demand by wing/room
     |
 Layer 3 (Deep Search)  Variable      Explicit semantic query
```

---

## Four Memory Layers

### Layer 0: Identity (`$AGENT_HOME/IDENTITY.md`)

Core identity data loaded at every session start. ~50 tokens max.

Contains: agent role, primary mission, key relationships, active projects list.

Update sparingly -- only when fundamental identity changes.

### Layer 1: Knowledge Graph (`$AGENT_HOME/life/` -- PARA + Palace)

Entity-based storage with spatial organization. Each entity gets a folder with two tiers:

1. `summary.md` -- quick context, load first (~120 tokens budget across all hot entities).
2. `items.yaml` -- atomic facts with temporal validity, load on demand.

```text
$AGENT_HOME/life/
  projects/          # Active work with clear goals/deadlines (Wings)
    <name>/
      summary.md
      items.yaml
  areas/             # Ongoing responsibilities, no end date
    people/<name>/
    companies/<name>/
  resources/         # Reference material, topics of interest (Rooms)
    <topic>/
  archives/          # Inactive items from the other three
  tunnels.yaml       # Cross-domain connections
  index.md
```

#### PARA Rules

- **Projects** -- active work with a goal or deadline. Move to archives when complete.
- **Areas** -- ongoing (people, companies, responsibilities). No end date.
- **Resources** -- reference material, topics of interest.
- **Archives** -- inactive items from any category.

#### Palace Spatial Mapping

The PARA structure maps to the MemPalace spatial metaphor for enhanced retrieval:

| PARA | Palace | Purpose |
|---|---|---|
| Projects | **Wings** | Top-level containers for active work domains |
| Areas/Resources | **Rooms** | Topic-specific sections within wings |
| Fact categories | **Halls** | Memory type corridors connecting related facts |
| `tunnels.yaml` | **Tunnels** | Cross-wing connections for the same topic |
| `summary.md` | **Closets** | Summaries pointing to original content |
| `items.yaml` | **Drawers** | Original verbatim facts, never summarized away |

#### Halls (Fact Type Corridors)

Each fact belongs to a hall, which enables type-based filtering during search:

| Hall | Description | Example |
|---|---|---|
| `facts` | Decisions and commitments | "Team decided to use PostgreSQL" |
| `events` | Sessions and milestones | "v2.0 launched on 2026-03-15" |
| `discoveries` | Insights and breakthroughs | "Found that batch processing reduces costs 40%" |
| `preferences` | Habits and opinions | "User prefers terse responses" |
| `advice` | Recommendations | "Always run migrations before deploy" |

#### Tunnels (Cross-Domain Connections)

When the same topic appears across multiple projects/areas, create a tunnel in `tunnels.yaml`:

```yaml
- topic: "authentication"
  connections:
    - projects/webapp/items.yaml
    - projects/mobile-app/items.yaml
    - areas/companies/acme/items.yaml
  note: "Auth decisions affect all three domains"

- topic: "database-migration"
  connections:
    - projects/backend-v2/items.yaml
    - resources/postgresql/items.yaml
  note: "Migration patterns shared across projects"
```

Tunnels help recall related facts across domains when working on a topic.

#### Fact Rules

- Save durable facts immediately to `items.yaml`.
- Weekly: rewrite `summary.md` from active facts.
- Never delete facts. Use temporal invalidation instead (`valid_until` or `status: superseded`).
- When an entity goes inactive, move its folder to `$AGENT_HOME/life/archives/`.

#### When to Create an Entity

- Mentioned 3+ times, OR
- Direct relationship to the user (family, coworker, partner, client), OR
- Significant project or company in the user's life.
- Otherwise, note it in daily notes.

For the atomic fact YAML schema and memory decay rules, see [references/schemas.md](references/schemas.md).

### Layer 2: Daily Notes (`$AGENT_HOME/memory/YYYY-MM-DD.md`)

Raw timeline of events -- the "when" layer.

- Write continuously during conversations.
- Extract durable facts to Layer 1 during heartbeats.

### Layer 3: Tacit Knowledge (`$AGENT_HOME/MEMORY.md`)

How the user operates -- patterns, preferences, lessons learned.

- Not facts about the world; facts about the user.
- Update whenever you learn new operating patterns.

---

## Context Loading Strategy

### Session Start (Automatic)

Load **L0 + L1** on every session start:

1. Read `$AGENT_HOME/IDENTITY.md` (L0, ~50 tokens)
2. Read `summary.md` from all **hot** entities (L1, ~120 tokens total)
3. Read `$AGENT_HOME/MEMORY.md` (tacit knowledge)

Total budget: ~170-200 tokens of critical context.

### On-Demand Recall (L2)

When a specific topic comes up, load the relevant room/wing:

```bash
# Load a specific wing (project)
qmd query "auth migration" --wing projects/webapp

# Load a specific room (topic)
qmd query "database schema" --room resources/postgresql
```

### Deep Search (L3)

For questions about past context not covered by L0-L2:

```bash
qmd query "what happened at Christmas"   # Semantic search with reranking
qmd search "specific phrase"              # BM25 keyword search
qmd vsearch "conceptual question"         # Pure vector similarity
```

---

## Memory Recall -- Use qmd

Use `qmd` rather than grepping files:

```bash
# Basic search modes
qmd query "what happened at Christmas"   # Semantic search with reranking
qmd search "specific phrase"              # BM25 keyword search
qmd vsearch "conceptual question"         # Pure vector similarity

# Structural filtering (Palace-enhanced, +34% retrieval improvement)
qmd query "auth bug" --wing projects/webapp          # Wing-scoped
qmd query "auth bug" --hall facts                    # Hall-scoped (facts only)
qmd query "auth bug" --wing projects/webapp --hall facts  # Combined

# Temporal filtering
qmd query "team lead" --as-of 2026-01-15            # Historical query
qmd query "database choice" --current-only           # Only valid facts
```

Index your personal folder: `qmd index $AGENT_HOME`

Vectors + BM25 + reranking finds things even when the wording differs. Structural filtering narrows results to the relevant domain.

---

## Write It Down -- No Mental Notes

Memory does not survive session restarts. Files do.

- Want to remember something -> WRITE IT TO A FILE.
- "Remember this" -> update `$AGENT_HOME/memory/YYYY-MM-DD.md` or the relevant entity file.
- Learn a lesson -> update AGENTS.md, TOOLS.md, or the relevant skill file.
- Make a mistake -> document it so future-you does not repeat it.
- On-disk text files are always better than holding it in temporary context.

---

## Planning

Keep plans in timestamped files in `plans/` at the project root (outside personal memory so other agents can access them). Use `qmd` to search plans. Plans go stale -- if a newer plan exists, do not confuse yourself with an older version. If you notice staleness, update the file to note what it is supersededBy.
