# Graph Report - PokeBooster  (2026-10-16)

## Corpus Check
- 3 files · ~2,067 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 30 nodes · 53 edges · 7 communities (6 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `600e7958`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- buy
- app.js
- openPack
- data.js
- renderDex
- renderPanel

## God Nodes (most connected - your core abstractions)
1. `renderPanel()` - 7 edges
2. `openPack()` - 6 edges
3. `renderDex()` - 6 edges
4. `buy()` - 5 edges
5. `cardHTML()` - 5 edges
6. `art()` - 4 edges
7. `poolOf()` - 4 edges
8. `packHTML()` - 4 edges
9. `render()` - 4 edges
10. `showOpening()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `packHTML()` --calls--> `art()`  [EXTRACTED]
  app.js → app.js  _Bridges community 4 → community 0_
- `renderDex()` --calls--> `poolOf()`  [EXTRACTED]
  app.js → app.js  _Bridges community 2 → community 4_
- `renderPanel()` --calls--> `poolOf()`  [EXTRACTED]
  app.js → app.js  _Bridges community 2 → community 5_
- `buy()` --calls--> `openPack()`  [EXTRACTED]
  app.js → app.js  _Bridges community 2 → community 0_
- `render()` --calls--> `renderPanel()`  [EXTRACTED]
  app.js → app.js  _Bridges community 5 → community 0_

## Import Cycles
- None detected.

## Communities (7 total, 1 thin omitted)

### Community 0 - "buy"
Cohesion: 0.40
Nodes (6): buy(), packHTML(), render(), reveal(), save(), showOpening()

### Community 1 - "app.js"
Cohesion: 0.40
Nodes (4): RAR, RKEYS, saved, state

### Community 2 - "openPack"
Cohesion: 0.40
Nodes (5): dist(), openPack(), pick(), poolOf(), roll()

### Community 3 - "data.js"
Cohesion: 0.40
Nodes (4): BOOSTERS, POKEMON, RARITIES, TYPES

### Community 4 - "renderDex"
Cohesion: 0.83
Nodes (4): art(), cardHTML(), pad(), renderDex()

### Community 5 - "renderPanel"
Cohesion: 0.50
Nodes (4): fmt(), renderPanel(), show(), tick()

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `renderPanel()` connect `renderPanel` to `buy`, `app.js`, `openPack`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `openPack()` connect `openPack` to `buy`, `app.js`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `renderDex()` connect `renderDex` to `app.js`, `openPack`, `renderPanel`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._