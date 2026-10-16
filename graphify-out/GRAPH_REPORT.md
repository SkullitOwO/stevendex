# Graph Report - PokeBooster  (2026-10-17)

## Corpus Check
- 4 files · ~5,022 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 52 nodes · 86 edges · 9 communities (8 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3cf3ded3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- art
- app.js
- buy
- data.js
- cardHTML
- renderPanel
- scenes.js
- f1

## God Nodes (most connected - your core abstractions)
1. `f1()` - 10 edges
2. `renderPanel()` - 7 edges
3. `openPack()` - 6 edges
4. `cardHTML()` - 6 edges
5. `renderDex()` - 6 edges
6. `buy()` - 5 edges
7. `art()` - 4 edges
8. `poolOf()` - 4 edges
9. `packHTML()` - 4 edges
10. `render()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `renderDex()` --calls--> `pad()`  [EXTRACTED]
  app.js → app.js  _Bridges community 4 → community 5_
- `cardHTML()` --calls--> `art()`  [EXTRACTED]
  app.js → app.js  _Bridges community 0 → community 4_
- `renderDex()` --calls--> `art()`  [EXTRACTED]
  app.js → app.js  _Bridges community 0 → community 5_
- `buy()` --calls--> `openPack()`  [EXTRACTED]
  app.js → app.js  _Bridges community 5 → community 2_
- `buy()` --calls--> `showOpening()`  [EXTRACTED]
  app.js → app.js  _Bridges community 2 → community 0_

## Import Cycles
- None detected.

## Communities (9 total, 1 thin omitted)

### Community 0 - "art"
Cohesion: 0.50
Nodes (4): art(), packHTML(), reveal(), showOpening()

### Community 1 - "app.js"
Cohesion: 0.33
Nodes (5): faPick, RAR, RKEYS, saved, state

### Community 2 - "buy"
Cohesion: 0.67
Nodes (3): buy(), render(), save()

### Community 3 - "data.js"
Cohesion: 0.40
Nodes (4): BOOSTERS, POKEMON, RARITIES, TYPES

### Community 4 - "cardHTML"
Cohesion: 0.50
Nodes (4): cardHTML(), fanList(), fanOf(), pad()

### Community 5 - "renderPanel"
Cohesion: 0.24
Nodes (10): dist(), fmt(), openPack(), pick(), poolOf(), renderDex(), renderPanel(), roll() (+2 more)

### Community 7 - "scenes.js"
Cohesion: 0.22
Nodes (6): bolt(), dots(), rnd(), scene(), SCENE_OF, SCENES

### Community 8 - "f1"
Cohesion: 0.25
Nodes (8): aurora(), birds(), cloud(), cloudBank(), f1(), pines(), rays(), ridge()

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `f1()` connect `f1` to `scenes.js`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `renderPanel()` connect `renderPanel` to `app.js`, `buy`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `openPack()` connect `renderPanel` to `app.js`, `buy`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._