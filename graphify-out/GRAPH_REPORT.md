# Graph Report - PokeBooster  (2026-10-17)

## Corpus Check
- 6 files · ~10,108 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 119 nodes · 263 edges · 12 communities (10 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fb01fcea`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- play.js
- openPack
- data.js
- app.js
- renderShop
- scenes.js
- cardHTML
- renderMarket
- sfx.js
- duelSetup
- renderBook

## God Nodes (most connected - your core abstractions)
1. `deck()` - 12 edges
2. `send()` - 11 edges
3. `joinRoom()` - 11 edges
4. `duelSetup()` - 11 edges
5. `stage()` - 10 edges
6. `hostRoom()` - 10 edges
7. `duelWait()` - 10 edges
8. `f1()` - 10 edges
9. `runDuel()` - 9 edges
10. `battleTeam()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `renderTop()` --indirect_call--> `owns()`  [INFERRED]
  app.js → app.js  _Bridges community 2 → community 10_
- `pageHTML()` --indirect_call--> `pocketHTML()`  [INFERRED]
  app.js → app.js  _Bridges community 9 → community 13_
- `renderShop()` --calls--> `packHTML()`  [EXTRACTED]
  app.js → app.js  _Bridges community 4 → community 5_
- `deck()` --calls--> `cardHTML()`  [EXTRACTED]
  app.js → app.js  _Bridges community 9 → community 4_
- `renderMarket()` --calls--> `cardHTML()`  [EXTRACTED]
  app.js → app.js  _Bridges community 9 → community 10_

## Import Cycles
- None detected.

## Communities (12 total, 2 thin omitted)

### Community 0 - "play.js"
Cohesion: 0.13
Nodes (26): askAction(), BASE, battle(), choose(), drawFighters(), endBattle(), G, inbox (+18 more)

### Community 2 - "openPack"
Cohesion: 0.33
Nodes (7): dist(), draw(), openPack(), owns(), pick(), poolOf(), roll()

### Community 3 - "data.js"
Cohesion: 0.40
Nodes (4): BOOSTERS, POKEMON, RARITIES, TYPES

### Community 4 - "app.js"
Cohesion: 0.20
Nodes (16): backHTML(), burst(), confetti(), deck(), epicOf(), implode(), LABEL(), openFlow() (+8 more)

### Community 5 - "renderShop"
Cohesion: 0.67
Nodes (3): renderShop(), select(), tick()

### Community 7 - "scenes.js"
Cohesion: 0.18
Nodes (14): aurora(), birds(), bolt(), cloud(), cloudBank(), dots(), f1(), pines() (+6 more)

### Community 9 - "cardHTML"
Cohesion: 0.83
Nodes (4): art(), cardHTML(), pad(), pocketHTML()

### Community 10 - "renderMarket"
Cohesion: 0.33
Nodes (9): buy(), dupKeys(), flyCoin(), keyInfo(), priceOf(), renderMarket(), renderTop(), save() (+1 more)

### Community 12 - "duelSetup"
Cohesion: 0.33
Nodes (17): battleTeam(), botPack(), duelReveal(), duelSetup(), duelWait(), errBox(), gameScreen(), hostRoom() (+9 more)

### Community 13 - "renderBook"
Cohesion: 0.38
Nodes (7): closeOverlay(), pageHTML(), perView(), renderBook(), show(), summary(), turn()

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `deck()` connect `app.js` to `cardHTML`, `renderBook`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Should `play.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12698412698412698 - nodes in this community are weakly interconnected._
- **Why does `joinRoom()` connect `duelSetup` to `play.js`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._