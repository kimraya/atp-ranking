# FEATURES.md: Balanced open-play matching for my tennis app

## 1. What we are building

Add an **open-play session manager** to my existing tennis app. An organizer checks players in, runs several courts, and the app automatically forms the next doubles (or singles) games from a waiting queue using a **"Balanced" matching mode**: evenly matched teams, first-come queue order, and varied partners and opponents.

This spec was written by observing a public pickleball product (PickleQ) and reading its in-app changelog. Re-implement the behavior independently. Do not copy its code, wording, logo, name or assets.

### Before you write code
1. Read my existing app first: stack, folder layout, data models, routing, state management, how matches and players are stored.
2. Reuse existing player, match and session models where they exist. Extend them rather than creating parallel ones.
3. Read `DESIGN.md` for the UI.
4. Write a short plan (files to add or change, data model changes, open questions) and wait for my OK before large changes.

### Out of scope
- Other matching modes (Social Mix, Skill Separated, Winners/Losers, Skill Courts, Mixed Doubles, King/Queen, Club Wars). Only **Balanced**.
- Clubs, logins, kiosks, paid tiers, DUPR export, tournaments, public Live View, languages.
- **Tennis score entry.** I will build that as a separate button. See `DESIGN.md`, section "Tennis score button". Win/loss per match is the only result this feature records.

## 2. Screens and flows

### 2.1 Session setup
- **Session name** (default "Open Play", renamable).
- **Courts:** a stepper (minus, number, plus), minimum 1. More courts can be added during a session.
- **Game type:** Doubles (default) or Singles.
- **Limit games per player:** off by default, optional number.
- **Linked pairs:** two players can be linked so they always play on the same team. Setting "Automatically unpair after N games" (unlimited, or 1 to 50) counts completed games played together. After the limit both players return to normal matching.
- **Player standings on the public view:** on or off. Keep as a stored setting even if there is no public view yet.
- **Ranking rule for the session:** rank by **total wins** (default) or **win percentage**; **games needed to be ranked** (default 3). Ties: win percentage, then point differential (only if every finished game has a score, which is future work), then schedule strength (strength of the opponents faced).
- **Matching mode:** show "Balanced" as selected and recommended. Other modes are not built, so do not show them.
- **Add players:** a search-or-add box. Typing a new name and pressing Enter adds a saved player. Optional "Import player list" (paste one name per line, optional rating).
- **Check-in:** a "Not yet here" list with a Check In button per player and a Check in all button. Check-in order sets queue order. "Check in all" checks in the list top to bottom.
- **Start button:** disabled until at least 4 players are checked in (2 for singles). Label shows progress, for example "0/4 checked in", then "Start play".

### 2.2 Player roster
- List of saved players with search, A-Z sort, edit name, remove.
- **Skill rating:** a 6-step star control (1 to 6). Observed labels in the source product: 1 star = Beginner (about 2.0 DUPR), 2 = Advanced Beginner (about 2.5), 3 = Intermediate (about 3.0), 6 = Expert (about 4.5+). **For tennis, use the rating scale already in my app** (for example NTRP or UTR) if one exists. If none exists, propose one in the plan. A player may be **unrated**.

### 2.3 Live session screen
Three tabs under a session header: **Courts**, **Up Next**, **Queue**. Header shows session name and live counts: courts in use of total, players, queue length.

**Courts tab**
- One card per court, plus an "Add court" button.
- An **available** court shows a preview of the next Up Next match, a "Start Up Next 1" button and a "Choose Players" button (manual pick).
- An **in-play** court shows a game timer, the four (or two) players with their ratings, a remove-player control, and two result buttons: **Team 1 Wins** and **Team 2 Wins**.
- Courts can be renamed and removed.

**Up Next tab**
- Stack of upcoming matches. Each card shows the two teams, an "Auto" badge for automatically formed matches, and actions: **Send to Court**, **Call Players** (announce or notify), **Rebuild** (re-form automatic matches), plus remove.
- Global actions: **Refresh Up Next** and **Add match** (manual match).
- If there are not enough waiting players the card says "Not enough players waiting yet."
- **Repeat warning:** a "Matchup heads-up" banner on a card when it contains repeated partners, repeated opponents, or a full repeat of a recent matchup (for example "These players just played together"). It warns before sending to court and does not block.
- **Switch teams:** open a player's actions, choose "Switch teams", then tap a valid player on the other team to swap them. Valid choices are highlighted. Tapping the selected player again cancels.

**Queue tab**
- Numbered list in waiting order. Each row shows name, rating (or "Unrated"), games played, and time waiting. Remove button per row.
- "Add player" (walk-ins mid-session).
- **Match log:** every finished match with court, winners, losers, and actions: **Fix teams**, **Swap winner**, **Delete match**. Shows average game length.

**Global behaviors**
- **Undo:** a toast after each recorded result with an Undo button. Undo restores players and queue positions and leaves future rotations clean.
- **Toasts:** short stacked cards, for example "Court 1 ready, Start" and "Recorded result, Undo".
- **End session** button, with confirmation.

### 2.4 Stats and history
- **Leaderboard:** sort by adjusted win rate (default) or total wins. Adjusted win rate gives more weight to players with more games. Show raw win percentage next to it. Players need 10 or more games to be ranked. Date filters.
- **Recent sessions:** list of past sessions. Deleting one asks for confirmation and **reverses the player stats** it contributed.
- **Player summary:** every game a player played in a session.

## 3. Balanced matching algorithm (core of this spec)

The product describes it as: "Balances teams by rating. Avoids repeat matchups when possible." Rules below are ordered by priority. Where the source did not publish a number, I mark it **[choose]**. Make it a named constant in one config file so I can tune it.

1. **Queue order is the baseline.** Players are taken roughly in arrival order. A player who finishes a game rejoins at the **back** of the queue. Late arrivals are **not** boosted for having fewer games played.
2. **Tie-break on identical check-in time:** the player with fewer games played goes first (so bulk check-ins stay balanced).
3. **Bounded lookahead:** to form a game, consider candidate groups from the front of the queue, not only the first four. Look a little further ahead when the queue is large (for example more than about 16 waiting players) **[choose window sizes]**. Small and medium sessions behave close to strict queue order.
4. **Match quality first:** among candidate groups, choose the split into two teams that makes the teams most evenly matched by combined rating (for doubles, compare team sums, or sum plus a penalty for large spread). Evaluate the **actual two teams**, not just "which four players are free".
5. **Unrated players:** treat as a neutral midpoint rating **[choose]**, and keep them eligible for any game.
6. **Repeat avoidance as a tie-breaker:** when several matchups are similarly balanced, prefer the one with **fresher partner combinations**, and also consider recent opponents. **Repeating a partner counts more than repeating an opponent.** Maintain a recent-history window per player (for example the last few games) **[choose]**.
7. **Skip limit:** a waiting player may be passed over **at most twice** while the algorithm searches for a better matchup. After that, nobody further back in the queue may be chosen until that player is included.
8. **Fallback:** if there is no better nearby option, use straight queue order.
9. **Linked pairs:** linked partners are always on the same team and are scored as staying together. Their repeat partnership is **not** an avoidable repeat. When pairs are involved, evaluate the forced teams so two strong linked players are less likely to land in a one-sided game. Nearby fill-in players may be chosen to make the forced teams more playable. Fixed pairs avoid facing the same pair twice in a row when another fair whole-pair matchup exists.
10. **Singles:** pick the opponent with the closest rating first, then use recent opponent history to avoid repeat 1v1 matches.
11. **Results do not affect pairings.** Winners and losers are not grouped. Wins only affect stats.
12. **Manual edits win:** matches on court, and matches an organizer edited by hand in Up Next, are never changed by automatic logic. Automatic logic only runs when forming a **future** match or when the organizer presses Rebuild or Refresh.
13. **Public/organizer parity:** if a public or player-facing Up Next view exists, it must use the same matching logic as the organizer screen.
14. **Source tracking:** store on each match whether it was **auto-formed** or **manually selected**.

## 4. Suggested data model (adapt to my existing models)

- `Player`: id, name, rating (nullable), createdAt.
- `Session`: id, name, courtCount, gameType (`doubles` | `singles`), gamesPerPlayerLimit (nullable), unpairAfter (nullable), rankingBy (`wins` | `winPct`), minGamesToRank, status, startedAt, endedAt.
- `SessionPlayer`: sessionId, playerId, checkedInAt, queueEnteredAt, gamesPlayed, passedOverCount, linkedPartnerId (nullable), linkedGamesTogether.
- `Match`: id, sessionId, courtId (nullable until sent), team1PlayerIds, team2PlayerIds, winnerTeam (nullable), source (`auto` | `manual`), createdAt, startedAt, endedAt.
- Derived: recent partner and opponent history per player, built from finished matches.

Keep matching logic in a **pure, unit-testable function**: `formNextMatch(queue, history, settings) -> {team1, team2, warnings[]}`.

## 5. Acceptance tests (behavior seen in the source product)

Write these as automated tests.

1. **Rating split.** Queue in order: A (1), B (1), C (6), D (6) on one court. The first match has exactly one 6 and one 1 on each team. The two 6s are never teammates.
2. **Two courts, eight players.** Queue A(1) B(1) C(6) D(6) E(1) F(6) G(6) H(1). Match 1 is the first four, match 2 is the next four, and both are rating-balanced.
3. **Partner rotation.** After A,B,C,D play (C+B vs D+A), the next time those same four are chosen, partners are different (for example C+A vs D+B) and teams stay rating-balanced.
4. **Rejoin at back.** After a game finishes, those players are behind everyone already waiting, including walk-ins who joined during the game.
5. **Walk-ins first.** Four unrated walk-ins added while eight players are on court appear as the next match, ahead of the eight finishers.
6. **Repeat warning, not block.** When the next match exactly repeats a recent match, the Up Next card shows the "Matchup heads-up" banner and can still be sent to court.
7. **Results do not change pairings.** The two winners of a game are not forced together or apart next game.
8. **Skip limit.** A waiting player is never passed over more than twice in a row.
9. **Linked pair.** Two linked players are always on the same team. After "unpair after N games", they are matched normally.
10. **Manual edits stick.** A hand-edited Up Next match is unchanged after other matches are formed or finished.
11. **Undo.** After undoing a recorded result, players return to the court, stats revert, and queue order is the same as before the result.
12. **Delete session.** Deleting a session from history removes its contribution from the leaderboard.

## 6. Known unknowns (do not guess silently)

- The exact rating weighting and repeat-history window are not public. Pick sensible values, put them in one config file, and list them in your plan.
- Tennis rating scale and singles/doubles mix: follow my existing app. Ask me if it is unclear.
- Whether matches should ever record scores: not in this feature. A separate button will be added (see `DESIGN.md`).
