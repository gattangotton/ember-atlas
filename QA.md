# Validation

## Automated checks

Six checks passed using Node's test runner with process isolation disabled in the sandbox:

1. 43 source sheets, 71 characters, 54 equipment entries, 70 abilities; unique stable IDs; representative percentages and grade values agree with Excel extraction.
2. Combined search, ownership and attribute filters; width-insensitive Japanese/ASCII normalization.
3. Alliance export excludes private notes and unrelated state.
4. Alliance import rejects invalid levels, duplicate IDs, null items and reserved keys.
5. Catalog validation rejects malformed types, names and grade arrays.
6. Missing grade values are distinct from zero.

App JavaScript syntax check passed.

## Browser checks

The validation server used a separate localhost origin on port 5175 so the deliverable on port 5174 remains free of test records.

- Dashboard with actual imported counts.
- Search for ニュクス returns the two source variants; side-by-side comparison shows their distinct troops, charge skills and core abilities.
- Saved owned ニュクス with current level 20, target 60 and a private memo. Level values remain visible after reload.
- Imported a test member snapshot (level 40, target 60); alliance comparison shows both players' values.
- Added an equipment record with G1=0, G2=1.2 and empty G3–G6. Detail correctly displays 0%, 1.2%, and 未登録.
- Imported one ability record through the catalog JSON flow; it becomes searchable.
- Source search in コアアビ returns ユウナ and the separate maintenance-column mention with their correct cell positions.
- Inspected normal desktop layout and 390×844 viewport. Navigation remains usable by horizontal scrolling; cards and forms stack vertically.
- Browser console had no error entries at the end of the tested flows.

The file picker initially used a detached input element; it was corrected to attach the input while selecting a file and remove it after selection/cancel. Both sharing and catalog imports passed after correction.

## Boundaries

The prototype does not implement cloud login, real-time synchronization, or Excel formula recalculation. Backup/restore is implemented with validation and confirmation, but a complete browser download-and-restore round trip was not exercised in this session. Spreadsheet charts, embedded images and merged layout are not reproduced by the read-only cell library.
