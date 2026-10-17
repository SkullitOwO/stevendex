# Graph Report - PokeBooster  (2026-10-17)

## Corpus Check
- 7 files · ~23,986 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 120 nodes · 263 edges · 13 communities (10 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5ee44f6b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- play.js
- app.js
- data.js
- deck
- renderShop
- scenes.js
- cardHTML
- renderMarket
- sfx.js
- duelSetup
- renderBook
- fx.js

## God Nodes (most connected - your core abstractions)
1. `send()` - 11 edges
2. `joinRoom()` - 11 edges
3. `duelSetup()` - 11 edges
4. `stage()` - 10 edges
5. `hostRoom()` - 10 edges
6. `duelWait()` - 10 edges
7. `f1()` - 10 edges
8. `deck()` - 9 edges
9. `battleTeam()` - 9 edges
10. `askAction()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `pageHTML()` --indirect_call--> `pocketHTML()`  [INFERRED]
  app.js → app.js  _Bridges community 9 → community 13_
- `draw()` --calls--> `owns()`  [EXTRACTED]
  app.js → app.js  _Bridges community 10 → community 2_
- `openFlow()` --calls--> `packHTML()`  [EXTRACTED]
  app.js → app.js  _Bridges community 5 → community 4_
- `deck()` --calls--> `cardHTML()`  [EXTRACTED]
  app.js → app.js  _Bridges community 9 → community 4_
- `renderMarket()` --calls--> `cardHTML()`  [EXTRACTED]
  app.js → app.js  _Bridges community 9 → community 10_

## Import Cycles
- None detected.

## Communities (13 total, 3 thin omitted)

### Community 0 - "play.js"
Cohesion: 0.13
Nodes (25): askAction(), BASE, battle(), choose(), drawFighters(), endBattle(), G, inbox (+17 more)

### Community 2 - "app.js"
Cohesion: 0.23
Nodes (11): dist(), draw(), openPack(), PAGES, pick(), poolOf(), RAR, RKEYS (+3 more)

### Community 3 - "data.js"
Cohesion: 0.40
Nodes (4): BOOSTERS, POKEMON, RARITIES, TYPES

### Community 4 - "deck"
Cohesion: 0.22
Nodes (11): backHTML(), closeOverlay(), deck(), epicOf(), LABEL(), openFlow(), packBackHTML(), rcOf() (+3 more)

### Community 5 - "renderShop"
Cohesion: 0.50
Nodes (4): packHTML(), renderShop(), select(), tick()

### Community 7 - "scenes.js"
Cohesion: 0.18
Nodes (14): aurora(), birds(), bolt(), cloud(), cloudBank(), dots(), f1(), pines() (+6 more)

### Community 9 - "cardHTML"
Cohesion: 0.83
Nodes (4): art(), cardHTML(), pad(), pocketHTML()

### Community 10 - "renderMarket"
Cohesion: 0.29
Nodes (10): buy(), dupKeys(), flyCoin(), keyInfo(), owns(), priceOf(), renderMarket(), renderTop() (+2 more)

### Community 12 - "duelSetup"
Cohesion: 0.34
Nodes (17): battleTeam(), duelReveal(), duelSetup(), duelWait(), errBox(), gameScreen(), hostRoom(), joinRoom() (+9 more)

### Community 13 - "renderBook"
Cohesion: 0.80
Nodes (5): pageHTML(), pager(), perView(), renderBook(), turn()

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `joinRoom()` connect `duelSetup` to `play.js`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Should `play.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13105413105413105 - nodes in this community are weakly interconnected._
- **Why does `deck()` connect `deck` to `cardHTML`, `app.js`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._