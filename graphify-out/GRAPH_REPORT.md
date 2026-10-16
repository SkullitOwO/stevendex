# Graph Report - PokeBooster  (2026-10-17)

## Corpus Check
- 5 files · ~6,401 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 71 nodes · 132 edges · 12 communities (10 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4780885a`
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
- cardHTML
- renderMarket
- sfx.js

## God Nodes (most connected - your core abstractions)
1. `f1()` - 10 edges
2. `deck()` - 9 edges
3. `openPack()` - 7 edges
4. `cardHTML()` - 7 edges
5. `buy()` - 7 edges
6. `summary()` - 7 edges
7. `renderMarket()` - 7 edges
8. `openFlow()` - 6 edges
9. `sell()` - 6 edges
10. `renderShop()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `renderTop()` --indirect_call--> `owns()`  [INFERRED]
  app.js → app.js  _Bridges community 2 → community 0_
- `sell()` --calls--> `save()`  [EXTRACTED]
  app.js → app.js  _Bridges community 0 → community 10_
- `renderShop()` --calls--> `packHTML()`  [EXTRACTED]
  app.js → app.js  _Bridges community 4 → community 5_
- `deck()` --calls--> `cardHTML()`  [EXTRACTED]
  app.js → app.js  _Bridges community 9 → community 4_
- `renderMarket()` --calls--> `cardHTML()`  [EXTRACTED]
  app.js → app.js  _Bridges community 9 → community 10_

## Import Cycles
- None detected.

## Communities (12 total, 2 thin omitted)

### Community 0 - "buy"
Cohesion: 0.50
Nodes (4): buy(), dupKeys(), renderTop(), save()

### Community 1 - "app.js"
Cohesion: 0.33
Nodes (5): PAGES, RAR, RKEYS, saved, state

### Community 2 - "openPack"
Cohesion: 0.33
Nodes (7): dist(), draw(), openPack(), owns(), pick(), poolOf(), roll()

### Community 3 - "data.js"
Cohesion: 0.40
Nodes (4): BOOSTERS, POKEMON, RARITIES, TYPES

### Community 4 - "deck"
Cohesion: 0.22
Nodes (11): backHTML(), burst(), closeOverlay(), deck(), LABEL(), openFlow(), packHTML(), rcOf() (+3 more)

### Community 5 - "renderShop"
Cohesion: 0.67
Nodes (3): renderShop(), select(), tick()

### Community 7 - "scenes.js"
Cohesion: 0.22
Nodes (6): bolt(), dots(), rnd(), scene(), SCENE_OF, SCENES

### Community 8 - "f1"
Cohesion: 0.25
Nodes (8): aurora(), birds(), cloud(), cloudBank(), f1(), pines(), rays(), ridge()

### Community 9 - "cardHTML"
Cohesion: 0.39
Nodes (8): art(), cardHTML(), pad(), pageHTML(), perView(), pocketHTML(), renderBook(), turn()

### Community 10 - "renderMarket"
Cohesion: 0.60
Nodes (5): flyCoin(), keyInfo(), priceOf(), renderMarket(), sell()

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `f1()` connect `f1` to `scenes.js`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `deck()` connect `deck` to `app.js`, `cardHTML`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `openPack()` connect `openPack` to `buy`, `app.js`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._