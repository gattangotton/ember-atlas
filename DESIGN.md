# EMBER ATLAS — design and data decisions

## Visual references

- User reference: http://localhost:5173/ — white sidebar, grouped navigation, violet active state, light dashboard cards, distinct data and settings sections. Inspected read-only on 2026-09-25.
- Inspo MCP search: “dashboard productivity clean sidebar data management”. Candidates: Capacities, Amie, DuckDB.
- Primary Inspo reference: https://capacities.io — inspected the returned design system: calm light surfaces, muted category colors, functional typography, grouped blocks, 4/8/16/24 spacing, restrained corners. This app adopts the organization and tone; it does not reproduce the marketing page.

## Applied system

Background #f6f7fb, white panels, text #25263d, violet #6650cf, muted green for saved/owned status. Desktop side navigation becomes a horizontally scrollable menu on narrow screens. All attributes also have text labels; color is supplementary. Native dialogs, labelled forms, visible keyboard focus, and reduced motion are supported.

The dashboard begins with database actions and real counts. No invented player progress, member names, rankings, or game images. Version 0.2 includes 71 character portraits cropped from the supplied gameplay video; remaining entries use textual placeholders. Cards support browsing; tables and a three-item comparison support detailed decisions.

## Excel analysis

43 sheets: fixed reference tables, formula-based calculators, research/building matrices, event/reward lists and notes. Imported cached values as a read-only source library with source sheet and row/cell addresses. Original workbook unchanged.

- エンバースリスト: 71 named characters. Four unnamed future rows (59–62) excluded from the catalog.
- コアアビ: 70 named records. Final “追加エンバースを更新要” maintenance row excluded. 朱天残夜 exists in the character list but not this separate ability list; the two are not silently reconciled.
- 対魔獣倍加スキル計算機: BI–BQ fixed equipment table, 54 records, six grade values per record. Blank grades remain null; zero remains zero. These are material bonus equipment entries, not an assertion that all game equipment is covered.
- 99 cached formula-error cells across the workbook retained visibly in the source library. Calculators are not recomputed by the prototype.
- Percent-formatted numeric cells are converted to percentage strings for display. Other units and source abbreviations are preserved. Dates are not treated as verified release dates, and source chronology is not repaired speculatively.
- “☆5育成” notes are attributed to the source author, not presented as independently verified current recommendations.
- Copies of construction sheets remain accessible as separate references, never merged into counts for normalized entities.

## Data identity and sharing

Base IDs are category + SHA-256 of source name (first 14 characters). UI additions use UUIDs. Edits retain IDs. Future Excel renames require an explicit ID migration; fuzzy matching is intentionally avoided. Source data and user state are separated.

Progress snapshots carry a schema version, stable player ID, export timestamp and item IDs. Same-player imports replace an older snapshot only; self-import and older snapshots are rejected. Private notes and favorites never enter the alliance snapshot. Unknown catalog IDs are displayed using the snapshot's item name.

## Online phase

Version 0.2 separates local profiles (profile, progress, favorites, research) while sharing catalog overrides, growth patterns and imported member snapshots. These are local profiles, not authenticated accounts. Backup validates and restores active and inactive profiles. Share schema v2 adds current/target skill levels and research; v1 remains supported. Source supplements are generated in mechanics.json, separate from the original read-only cell library. Unknown effect values remain null, and only observed research edges are drawn. Growth patterns copy explicit value arrays; they never infer unobserved ratios.

Local file exchange is implemented; hosting, authentication and live multi-user synchronization are not. To add them, move persistence behind a repository adapter and provide tables for users, alliances, memberships, catalog_items and progress. Enforce alliance membership on the server, restrict progress writes to the owning user, restrict catalog writes to editors, and use record revisions for conflicts. Do not expose the prototype server as an unauthenticated shared backend. The current server listens on loopback only.


## Construction and equipment additions
Construction uses a searchable facility picker beside a level detail panel, four resource tiles, base duration, prerequisite navigation and a collapsible complete level table. Source disagreements remain visible beside the selected level. Unknown and zero values are distinct. Equipment uses slot subnavigation and search-first main-effect cards with grade-specific power at the upper right. Patterns copy effect matrices for a matching G1 power; they do not infer unknown growth.
