# Graph Report - PokeBooster  (2026-10-17)

## Corpus Check
- 8 files · ~25,489 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 141 nodes · 299 edges · 16 communities (13 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a8d87655`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- play.js
- battleTeam
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

## God Nodes (most connected - your core abstractions)
1. `send()` - 11 edges
2. `joinRoom()` - 11 edges
3. `duelSetup()` - 11 edges
4. `stage()` - 10 edges
5. `hostRoom()` - 10 edges
6. `duelWait()` - 10 edges
7. `f1()` - 10 edges
8. `openPack()` - 9 edges
9. `deck()` - 9 edges
10. `battleTeam()` - 9 edges

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

## Communities (16 total, 3 thin omitted)

### Community 0 - "play.js"
Cohesion: 0.14
Nodes (16): BASE, endBattle(), G, inbox, net, netClose(), netHost(), netJoin() (+8 more)

### Community 1 - "battleTeam"
Cohesion: 0.40
Nodes (5): battleTeam(), errBox(), mkSide(), stats(), vsTxt()

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
Cohesion: 0.39
Nodes (9): askAction(), battle(), choose(), drawFighters(), mult(), opp(), playRound(), pname() (+1 more)

### Community 9 - "cardHTML"
Cohesion: 0.83
Nodes (4): art(), cardHTML(), pad(), pocketHTML()

### Community 10 - "renderMarket"
Cohesion: 0.33
Nodes (9): buy(), dupKeys(), flyCoin(), keyInfo(), priceOf(), renderMarket(), renderTop(), save() (+1 more)

### Community 12 - "duelSetup"
Cohesion: 0.52
Nodes (12): duelReveal(), duelSetup(), duelWait(), gameScreen(), hostRoom(), joinRoom(), recv(), runDuel() (+4 more)

### Community 13 - "renderBook"
Cohesion: 0.80
Nodes (5): pageHTML(), pager(), perView(), renderBook(), turn()

### Community 14 - "museum.js"
Cohesion: 0.18
Nodes (18): cleanWall(), dec(), DECOS, enc(), esc(), frameHTML(), pickCard(), pickDeco() (+10 more)

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `joinRoom()` connect `duelSetup` to `play.js`, `battleTeam`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **Should `play.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1437908496732026 - nodes in this community are weakly interconnected._
- **Why does `openPack()` connect `app.js` to `renderMarket`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._