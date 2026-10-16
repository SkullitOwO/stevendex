# Graph Report - PokeBooster  (2026-10-17)

## Corpus Check
- 4 files · ~5,229 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 63 nodes · 112 edges · 11 communities (10 shown, 1 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e221ee66`
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
- cardHTML

## God Nodes (most connected - your core abstractions)
1. `f1()` - 10 edges
2. `deck()` - 8 edges
3. `openPack()` - 7 edges
4. `buy()` - 7 edges
5. `summary()` - 7 edges
6. `cardHTML()` - 6 edges
7. `openFlow()` - 6 edges
8. `renderShop()` - 5 edges
9. `pocketHTML()` - 5 edges
10. `renderBook()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `pageHTML()` --indirect_call--> `pocketHTML()`  [INFERRED]
  app.js → app.js  _Bridges community 10 → community 9_
- `packHTML()` --calls--> `art()`  [EXTRACTED]
  app.js → app.js  _Bridges community 10 → community 4_
- `draw()` --calls--> `owns()`  [EXTRACTED]
  app.js → app.js  _Bridges community 0 → community 2_
- `renderShop()` --calls--> `packHTML()`  [EXTRACTED]
  app.js → app.js  _Bridges community 4 → community 5_
- `buy()` --calls--> `renderShop()`  [EXTRACTED]
  app.js → app.js  _Bridges community 5 → community 0_

## Import Cycles
- None detected.

## Communities (11 total, 1 thin omitted)

### Community 0 - "buy"
Cohesion: 0.50
Nodes (4): buy(), owns(), renderTop(), save()

### Community 1 - "app.js"
Cohesion: 0.29
Nodes (5): PAGES, RAR, RKEYS, saved, state

### Community 2 - "openPack"
Cohesion: 0.40
Nodes (6): dist(), draw(), openPack(), pick(), poolOf(), roll()

### Community 3 - "data.js"
Cohesion: 0.40
Nodes (4): BOOSTERS, POKEMON, RARITIES, TYPES

### Community 4 - "deck"
Cohesion: 0.24
Nodes (10): backHTML(), burst(), closeOverlay(), deck(), LABEL(), openFlow(), packHTML(), show() (+2 more)

### Community 5 - "renderShop"
Cohesion: 0.67
Nodes (3): renderShop(), select(), tick()

### Community 7 - "scenes.js"
Cohesion: 0.22
Nodes (6): bolt(), dots(), rnd(), scene(), SCENE_OF, SCENES

### Community 8 - "f1"
Cohesion: 0.25
Nodes (8): aurora(), birds(), cloud(), cloudBank(), f1(), pines(), rays(), ridge()

### Community 9 - "renderBook"
Cohesion: 0.83
Nodes (4): pageHTML(), perView(), renderBook(), turn()

### Community 10 - "cardHTML"
Cohesion: 0.83
Nodes (4): art(), cardHTML(), pad(), pocketHTML()

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `f1()` connect `f1` to `scenes.js`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `deck()` connect `deck` to `app.js`, `cardHTML`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `openPack()` connect `openPack` to `buy`, `app.js`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._