# Graph Report - PokeBooster  (2026-10-17)

## Corpus Check
- 4 files · ~5,353 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 63 nodes · 116 edges · 10 communities (9 shown, 1 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `74877fc1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- buy
- app.js
- openPack
- data.js
- deck
- renderShop
- scenes.js
- f1
- renderBook

## God Nodes (most connected - your core abstractions)
1. `f1()` - 10 edges
2. `renderShop()` - 9 edges
3. `deck()` - 8 edges
4. `openPack()` - 7 edges
5. `buy()` - 7 edges
6. `summary()` - 7 edges
7. `cardHTML()` - 6 edges
8. `openFlow()` - 6 edges
9. `pocketHTML()` - 5 edges
10. `renderBook()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `renderShop()` --indirect_call--> `owns()`  [INFERRED]
  app.js → app.js  _Bridges community 0 → community 5_
- `pageHTML()` --indirect_call--> `pocketHTML()`  [INFERRED]
  app.js → app.js  _Bridges community 4 → community 9_
- `renderShop()` --calls--> `poolOf()`  [EXTRACTED]
  app.js → app.js  _Bridges community 2 → community 5_
- `draw()` --calls--> `owns()`  [EXTRACTED]
  app.js → app.js  _Bridges community 0 → community 2_
- `renderShop()` --calls--> `packHTML()`  [EXTRACTED]
  app.js → app.js  _Bridges community 4 → community 5_

## Import Cycles
- None detected.

## Communities (10 total, 1 thin omitted)

### Community 0 - "buy"
Cohesion: 0.50
Nodes (4): buy(), owns(), renderTop(), save()

### Community 1 - "app.js"
Cohesion: 0.33
Nodes (5): PAGES, RAR, RKEYS, saved, state

### Community 2 - "openPack"
Cohesion: 0.40
Nodes (6): dist(), draw(), openPack(), pick(), poolOf(), roll()

### Community 3 - "data.js"
Cohesion: 0.40
Nodes (4): BOOSTERS, POKEMON, RARITIES, TYPES

### Community 4 - "deck"
Cohesion: 0.21
Nodes (14): art(), backHTML(), burst(), cardHTML(), closeOverlay(), deck(), LABEL(), openFlow() (+6 more)

### Community 5 - "renderShop"
Cohesion: 0.50
Nodes (4): fmt(), renderShop(), select(), tick()

### Community 7 - "scenes.js"
Cohesion: 0.22
Nodes (6): bolt(), dots(), rnd(), scene(), SCENE_OF, SCENES

### Community 8 - "f1"
Cohesion: 0.25
Nodes (8): aurora(), birds(), cloud(), cloudBank(), f1(), pines(), rays(), ridge()

### Community 9 - "renderBook"
Cohesion: 0.83
Nodes (4): pageHTML(), perView(), renderBook(), turn()

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `f1()` connect `f1` to `scenes.js`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `renderShop()` connect `renderShop` to `buy`, `app.js`, `openPack`, `deck`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `deck()` connect `deck` to `app.js`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._