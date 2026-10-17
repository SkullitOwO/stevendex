# Graph Report - PokeBooster  (2026-10-17)

## Corpus Check
- 10 files · ~27,600 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 22 file(s) not represented in the graph (top: .glb 21, .css 1)

## Summary
- 167 nodes · 335 edges · 18 communities (14 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f230de51`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- play.js
- joinRoom
- app.js
- data.js
- deck
- renderShop
- scenes.js
- askAction
- cardHTML
- renderMarket
- sfx.js
- duelSetup
- renderBook
- museum.js
- fx.js
- decor3d.js
- devserver.py

## God Nodes (most connected - your core abstractions)
1. `send()` - 11 edges
2. `joinRoom()` - 11 edges
3. `duelSetup()` - 11 edges
4. `stage()` - 10 edges
5. `hostRoom()` - 10 edges
6. `duelWait()` - 10 edges
7. `battleTeam()` - 10 edges
8. `f1()` - 10 edges
9. `openPack()` - 9 edges
10. `deck()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `renderTop()` --indirect_call--> `owns()`  [INFERRED]
  app.js → app.js  _Bridges community 2 → community 10_
- `pageHTML()` --indirect_call--> `pocketHTML()`  [INFERRED]
  app.js → app.js  _Bridges community 9 → community 13_
- `openFlow()` --calls--> `packHTML()`  [EXTRACTED]
  app.js → app.js  _Bridges community 5 → community 4_
- `deck()` --calls--> `cardHTML()`  [EXTRACTED]
  app.js → app.js  _Bridges community 9 → community 4_
- `renderMarket()` --calls--> `cardHTML()`  [EXTRACTED]
  app.js → app.js  _Bridges community 9 → community 10_

## Import Cycles
- None detected.

## Communities (18 total, 4 thin omitted)

### Community 0 - "play.js"
Cohesion: 0.14
Nodes (16): BASE, G, inbox, mkSide(), net, netHost(), netJoin(), onMsg() (+8 more)

### Community 1 - "joinRoom"
Cohesion: 0.32
Nodes (8): battleTeam(), endBattle(), errBox(), gameScreen(), joinRoom(), netClose(), quitGame(), vsTxt()

### Community 2 - "app.js"
Cohesion: 0.20
Nodes (14): dist(), draw(), keyOf(), openPack(), owns(), PAGES, pick(), poolOf() (+6 more)

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

### Community 8 - "askAction"
Cohesion: 0.27
Nodes (12): askAction(), battle(), choose(), drawFighters(), mult(), opp(), passiveOf(), playRound() (+4 more)

### Community 9 - "cardHTML"
Cohesion: 0.83
Nodes (4): art(), cardHTML(), pad(), pocketHTML()

### Community 10 - "renderMarket"
Cohesion: 0.33
Nodes (9): buy(), dupKeys(), flyCoin(), keyInfo(), priceOf(), renderMarket(), renderTop(), save() (+1 more)

### Community 12 - "duelSetup"
Cohesion: 0.60
Nodes (10): duelReveal(), duelSetup(), duelWait(), hostRoom(), recv(), runDuel(), send(), stage() (+2 more)

### Community 13 - "renderBook"
Cohesion: 0.80
Nodes (5): pageHTML(), pager(), perView(), renderBook(), turn()

### Community 14 - "museum.js"
Cohesion: 0.15
Nodes (21): clamp(), cleanWall(), dec(), decorReady(), enc(), esc(), fillItems(), frameHTML() (+13 more)

### Community 16 - "decor3d.js"
Cohesion: 0.20
Nodes (9): ELEV, load(), loader, models, renderer, scene, shot(), shots (+1 more)

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `joinRoom()` connect `joinRoom` to `play.js`, `duelSetup`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **Should `play.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13725490196078433 - nodes in this community are weakly interconnected._
- **Why does `battleTeam()` connect `joinRoom` to `play.js`, `askAction`, `duelSetup`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._