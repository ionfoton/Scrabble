# Scrabble Skill

This skill documents the official Romanian Scrabble rules and tile distribution used in the current project.

## Official Romanian Scrabble Rules

- Board: 15x15 grid with bonus squares for double/triple letter and word scores.
- Tiles: 100 tiles, including 2 blank tiles worth 0 points.
- Rack: Each player holds 7 tiles.
- First move: must place a word of at least two letters and cover the center square (H8). In this implementation, the center is treated as a double-word square.
- Word placement: Words may be placed horizontally or vertically only.
- Contiguity: All tiles placed in one move must form a contiguous line with no gaps.
- Connectivity: All moves after the first must connect to existing board tiles.
- Diacritics: Romanian accents are ignored. Letters such as Ă, Â, Î, Ș, and Ț are played as their base letters (A, A, I, S, T) and do not appear as separate tiles in the official set.
- Absent letters: K, Q, W, and Y are not included in the Romanian tile set; blanks may represent these letters if needed.
- Blanks: Blank tiles score 0 points and can represent any letter chosen by the player.
- Bongos: Using all 7 tiles in a single move awards a 50-point bonus.
- Scoring: Letter and word multipliers apply only on the turn the tile is placed.

## Romanian Tile Distribution (Official)

| Letter | Count | Value |
| --- | --- | --- |
| Blank | 2 | 0 |
| I | 11 | 1 |
| A | 10 | 1 |
| E | 9 | 1 |
| T | 7 | 1 |
| N | 6 | 1 |
| R | 6 | 1 |
| S | 6 | 1 |
| C | 5 | 1 |
| L | 5 | 1 |
| U | 5 | 1 |
| O | 5 | 2 |
| P | 4 | 2 |
| D | 4 | 3 |
| M | 3 | 4 |
| F | 2 | 4 |
| V | 2 | 4 |
| B | 2 | 9 |
| G | 2 | 6 |
| H | 1 | 8 |
| Z | 1 | 8 |
| J | 1 | 10 |
| X | 1 | 10 |

## Notes

- The current implementation should reflect this distribution in the tile bag and inventory display.
- The official 1982 distribution differs slightly from the current set; this skill uses the modern Romanian distribution described above.
- This skill is intended as a reference for implementing and validating Romanian Scrabble behavior in the project.