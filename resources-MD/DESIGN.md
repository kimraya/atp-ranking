# DESIGN.md: layout to follow, style to match my app

## 1. The rule

**Layout and structure come from the reference layout below. Colors, typography, spacing, icons and component styling come from my existing tennis app.** Where the two conflict, my existing app wins.

Do not copy the reference product's name, logo, wordmark, icons or exact copy. Use my app's branding and my app's own wording style.

## 2. Before you design anything: read my app

Do this first and summarize it back in your plan:

1. Find my design tokens: Tailwind config, CSS variables, theme file, or component library. List the colors (primary, secondary, success, danger, warning, surfaces, borders, text), font families and sizes, spacing scale, border radius, shadows.
2. Find my existing components: buttons, cards, tabs, modals, toasts, form inputs, list rows, badges, nav/header. **Reuse them.** Only create a new component when none fits.
3. Find where my app currently records a game or match result. I need this to place the tennis score button (section 6).
4. Find the navigation pattern (side drawer, bottom tabs, top nav) and keep it.
5. Check light and dark mode support, mobile breakpoints, and accessibility conventions already in use. Match them.

## 3. Reference layout

The reference is a mobile-first web app. On phones it is one column; on wider screens content stays in a centered column (about 640 to 830 px wide) with two-column court grids. Describe nothing with exact pixel values unless my app already uses them.

### 3.1 Live session screen (the main screen)

```
+-------------------------------------------------------+
| [menu]  App name        [Live view] [trophy] [sound] [End] |   dark top bar
| Session name   COURTS 1/2   PLAYERS 12   QUEUE 4          |   dark sub-bar with live counts
+-------------------------------------------------------+
|   Courts (2)   |   Up Next (2)   |   Queue (12)         |   3 equal-width tabs, underline on active
+-------------------------------------------------------+
| Live Courts (2)                         [+ Add Court]   |
| +----------------------+ +----------------------+      |
| | Court 1  [edit] [x]  | | Court 2  [edit] [x]  |      |   2-column grid of court cards
| | ...                  | | ...                  |      |
| +----------------------+ +----------------------+      |
| Up Next (2)        [Refresh Up Next] [+ Add match]      |
| ... Up Next cards ...                                   |
| Match log (collapsible)                                 |
+-------------------------------------------------------+
| toast stack, pinned to the bottom                      |
+-------------------------------------------------------+
```

- **Top bar:** dark surface. Left: menu button and app name. Right: a prominent info button (blue family), an icon button for standings, an icon button for sound/announcements, and a red **End** button. Use my app's equivalents.
- **Sub-bar:** session name in bold, then small uppercase labels with the number emphasized in a color: courts in use in green, players in white, queue length in amber.
- **Tabs:** Courts, Up Next, Queue, each with a count in parentheses. Active tab has an underline.
- **Page background:** very light gray. Cards are white with large rounded corners and a subtle border or shadow.

### 3.2 Court card

- **Available court:** dashed border. Header: court name, a small edit (pencil) icon, a pill saying "Available", and a close (x). Body: preview of the next match as `Player A / Player B  vs  Player C / Player D`. Primary full-width **green** button "Start Up Next 1". Secondary full-width **gray** button "Choose Players".
- **In-play court:** solid dark header with court name, running timer, a speaker icon, and a close (x). Below it the card is split into two halves: Team 1 on a **light blue** tint and Team 2 on a **light orange** tint. Each player row shows name, star rating, and a small remove (x). At the bottom: **Team 1 Wins** (blue button) and **Team 2 Wins** (orange button), each half width.
- Team colors are the one place the two colors blue and orange must stay consistent across court cards, Up Next cards and the match log.

### 3.3 Up Next card

- White card. Top row: "Up Next 1", a small **Auto** badge, and a **Rebuild** text button with a refresh icon. A close (x) on the right.
- A thin two-part bar under the header: left half blue, right half orange.
- Two columns "TEAM 1" and "TEAM 2" with player names, star ratings and small remove (x) controls.
- If repeats are detected: an amber banner "MATCHUP HEADS-UP" with a short reason and a "Show details" link.
- Footer actions: **Send to Court** (green) and **Call Players** (secondary).
- Empty slot: dashed, muted card saying "Not enough players waiting yet."

### 3.4 Queue tab

- Dark card header "Queue (n)" with a right-aligned **+ Add player** button.
- Rows: large number, player name, then a muted line: rating, games played, waiting time. Remove (x) on the right.
- Empty state: centered text "No players in queue."

### 3.5 Match log

- Collapsible card "Match log (n)" with average game time.
- Table-like rows: game number, court, winners (check mark), losers, and three small actions: **Fix teams**, **Swap winner**, **Delete match**.

### 3.6 Toasts

White rounded cards stacked at the bottom of the screen, full width on mobile: a bold title, a muted second line, and one right-aligned action button. Examples: "Court 1 ready" with a green **Start** button; "Recorded result" with a dark **Undo** button.

### 3.7 Session setup screen

Single column of cards, top to bottom:

1. A progress card with a small label, three numbered steps (Set up session, Add players, Start) and a **Guide me** button.
2. A card with Session name plus a **Rename** link, and a Courts stepper (minus, big number, plus).
3. A "Session settings" summary card listing key settings as label and value rows, with a **View options** link that expands the full settings.
4. A "Matching mode" card with a selectable row for Balanced (checked, with a "Recommended" badge and one-line description).
5. An "Add players" card: search-or-add input, an **Import player list** button, then a "Not yet here" list. Each row shows name, star rating, a green **Check In** button and a red **Remove** text button. A **Check in all** button sits in the list header.
6. A sticky bottom bar with a wide green primary button ("0/4 checked in", then "Start play") and an "Add players" or "Check in players" toggle link under it.

### 3.8 Other screens

- **Players:** search field, **Import player list** button, a short tips banner, a list with A-Z sort toggle, an empty state with an icon.
- **Stats (leaderboard):** sort dropdown, filters button, two summary numbers (Total players, Total games), then a ranked list. Empty state: trophy icon and "Play 10+ games to get ranked".
- **Recent sessions:** simple list, each row opens details, delete with confirmation.
- **Navigation:** a left drawer with sections (Session, Players, Club, Help). Keep my app's existing navigation instead if it differs, and add entries there.

## 4. Visual style observed (use only if my app has no equivalent)

These are Tailwind-style values read from the reference page. Prefer my own tokens.

| Role | Observed |
| --- | --- |
| Font | System UI stack, 14 px semi-bold (600) for buttons |
| Top bar | Very dark slate (Tailwind gray-900 family) |
| Primary action | Green (Tailwind green-600 family) |
| Info / secondary highlight | Blue (blue-600 family) |
| Destructive (End) | Red (red-600 family) |
| Team 1 / Team 2 | Blue and orange |
| Warning / queue count | Amber |
| Button radius | 12 px for large buttons, 8 px for small ones |
| Cards | White, large radius, light border or shadow |

## 5. Interaction rules

- Large tap targets (at least 44 px) on all primary actions. This is used courtside on a phone.
- One primary action per card (green). Destructive actions are red and require confirmation, except remove-from-queue which is undoable.
- Every state change that moves players (send to court, record result, remove) gives a toast with Undo.
- Skeleton or empty states for every list. No blank screens.
- Works offline-tolerant if my app already does. Do not add network dependencies my app does not have.
- Keyboard and screen reader labels on icon-only buttons (menu, edit, close, sound, remove).

## 6. Tennis score button (placeholder only)

I will build tennis scoring separately. In this task you only add the **button and its wiring point**:

1. Read my current app to find where a match result is recorded today, and where a match is shown with its score. Choose the placement that fits my app. Likely spots: on the in-play court card next to **Team 1 Wins / Team 2 Wins**, and on the Match log row beside **Fix teams**.
2. Add a button labeled **Record score** (use my app's wording style) in that spot, styled as my app's secondary button.
3. Wire it to the match id and open a clearly marked placeholder (a modal or route that says "Tennis scoring coming soon"). Do **not** implement sets, games, tiebreaks or point entry.
4. Tell me in your plan exactly where you placed it and why, and which file my scoring work should plug into.

## 7. Done means

- The live session screen follows section 3 using my app's own tokens and components.
- A screenshot comparison at phone width (about 390 px) and tablet width (about 830 px) shows the same structure as the reference, in my app's colors.
- Light and dark mode both work if my app supports them.
- No leftover reference branding, copy or assets.
