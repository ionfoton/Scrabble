const BOARD_SIZE = 15;
const BOARD_CELLS = BOARD_SIZE * BOARD_SIZE;
const CENTER_INDEX = 112;

const boardEl = document.getElementById("board");
const rackEl = document.getElementById("rack");
const scoreEl = document.getElementById("score");
const turnEl = document.getElementById("turn");
const tilesLeftEl = document.getElementById("tiles-left");
const rackCountEl = document.getElementById("rack-count");
const currentPlayerEl = document.getElementById("current-player");
const statusEl = document.getElementById("status");
const lastMoveTitleEl = document.getElementById("last-move-title");
const lastMoveEl = document.getElementById("last-move");
const tileInventoryEl = document.getElementById("tile-inventory");
const inventoryTotalEl = document.getElementById("inventory-total");
const playerCountEl = document.getElementById("player-count");
const playerScoreboardEl = document.getElementById("player-scoreboard");

const submitBtn = document.getElementById("submit-btn");
const recallBtn = document.getElementById("recall-btn");
const shuffleBtn = document.getElementById("shuffle-btn");
const passBtn = document.getElementById("pass-btn");
const newBtn = document.getElementById("new-btn");

const TW = new Set([0, 7, 14, 105, 119, 210, 217, 224]);
const DW = new Set([16, 28, 32, 42, 48, 56, 64, 70, 80, 84, 96, 112, 128, 140, 144, 154, 160, 168, 176, 182, 192, 196, 208]);
const TL = new Set([20, 24, 76, 80, 84, 88, 136, 140, 144, 148, 200, 204]);
const DL = new Set([3, 11, 36, 38, 45, 52, 59, 92, 96, 98, 102, 108, 116, 122, 126, 128, 132, 165, 172, 179, 186, 188, 213, 221]);

const TILE_CONFIG = {
    A: [11, 1], B: [2, 9], C: [5, 1], D: [4, 2], E: [9, 1],
    F: [2, 8], G: [2, 9], H: [1, 10], I: [10, 1], J: [1, 10],
    L: [4, 1], M: [3, 4], N: [6, 1], O: [5, 1], P: [4, 2],
    R: [6, 1], S: [5, 1], T: [7, 1], U: [6, 1], V: [2, 8],
    X: [1, 10], Z: [1, 10]
};

const PLAYER_THEME_CLASSES = ["player-theme-1", "player-theme-2", "player-theme-3", "player-theme-4"];

let board = [];
let playerRacks = [];
let bag = [];
let placedThisTurn = new Set();
let playerScores = [];
let playerNames = [];
let playerCount = 2;
let currentPlayer = 0;
let turn = 1;
let tileIdCounter = 0;
let consecutivePasses = 0;
let gameEnded = false;

function rowOf(index) {
    return Math.floor(index / BOARD_SIZE);
}

function colOf(index) {
    return index % BOARD_SIZE;
}

function indexFrom(row, col) {
    return row * BOARD_SIZE + col;
}

function buildBag() {
    const nextBag = [];
    Object.entries(TILE_CONFIG).forEach(([letter, [count, value]]) => {
        for (let i = 0; i < count; i += 1) {
            nextBag.push({ id: `tile-${tileIdCounter++}`, letter, value });
        }
    });
    for (let i = 0; i < 2; i += 1) {
        nextBag.push({ id: `tile-${tileIdCounter++}`, letter: "", value: 0, isJoker: true });
    }
    for (let i = nextBag.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [nextBag[i], nextBag[j]] = [nextBag[j], nextBag[i]];
    }
    return nextBag;
}

function drawTiles(count, owner) {
    const drawn = [];
    for (let i = 0; i < count && bag.length > 0; i += 1) {
        const tile = bag.pop();
        drawn.push({ ...tile, owner });
    }
    return drawn;
}

function getActiveRack() {
    return playerRacks[currentPlayer] || [];
}

function applyCurrentTheme() {
    document.body.classList.remove(...PLAYER_THEME_CLASSES);
    document.body.classList.add(PLAYER_THEME_CLASSES[currentPlayer]);
}

function getMultiplierType(index) {
    if (index === CENTER_INDEX) return "center";
    if (TW.has(index)) return "tw";
    if (DW.has(index)) return "dw";
    if (TL.has(index)) return "tl";
    if (DL.has(index)) return "dl";
    return "normal";
}

function createTileElement(tile, locked, onDoubleClick = null) {
    const tileEl = document.createElement("div");
    const playerClass = Number.isInteger(tile.owner) ? ` player-${tile.owner + 1}` : "";
    const displayLetter = tile.isJoker ? (tile.assignedLetter || "&#9786;") : tile.letter;
    tileEl.className = `tile${playerClass}${locked ? " locked" : ""}`;
    tileEl.draggable = !locked;
    tileEl.dataset.tileId = tile.id;
    tileEl.innerHTML = `${displayLetter}<span class="tile-value">${tile.value}</span>`;
    if (!locked) {
        tileEl.addEventListener("dragstart", onDragStart);
        if (onDoubleClick) {
            tileEl.addEventListener("dblclick", onDoubleClick);
        }
    }
    return tileEl;
}

function renderBoard() {
    boardEl.innerHTML = "";

    for (let i = 0; i < BOARD_CELLS; i += 1) {
        const cell = document.createElement("div");
        const multiplierType = getMultiplierType(i);
        cell.className = `cell ${multiplierType !== "normal" ? multiplierType : ""}`.trim();
        cell.dataset.index = String(i);
        cell.addEventListener("dragover", onAllowDrop);
        cell.addEventListener("drop", onDropToCell);

        const tile = board[i];
        if (tile) {
            cell.appendChild(createTileElement(tile, tile.locked));
        } else if (multiplierType !== "normal") {
            const bonus = document.createElement("span");
            bonus.className = "bonus";
            bonus.textContent = multiplierType === "center" ? "*" : multiplierType.toUpperCase();
            cell.appendChild(bonus);
        }

        boardEl.appendChild(cell);
    }
}

function renderRack() {
    const rack = getActiveRack();
    rackEl.innerHTML = "";
    rackEl.addEventListener("dragover", onAllowDrop);
    rackEl.addEventListener("drop", onDropToRack);

    rack.forEach((tile) => {
        const slot = document.createElement("div");
        slot.className = "rack-slot";
        slot.appendChild(createTileElement(tile, false, onTileDoubleClick));
        rackEl.appendChild(slot);
    });

    for (let i = rack.length; i < 7; i += 1) {
        const slot = document.createElement("div");
        slot.className = "rack-slot";
        rackEl.appendChild(slot);
    }
}

function updateStats() {
    const rack = getActiveRack();
    if (scoreEl) scoreEl.textContent = String(playerScores[currentPlayer] || 0);
    if (currentPlayerEl) currentPlayerEl.textContent = String(currentPlayer + 1);
    if (turnEl) turnEl.textContent = String(turn);
    if (tilesLeftEl) tilesLeftEl.textContent = String(bag.length);
    if (rackCountEl) rackCountEl.textContent = `${rack.length}/7`;
}

function renderPlayerScores() {
    playerScoreboardEl.innerHTML = "";
    for (let i = 0; i < playerCount; i += 1) {
        const playerItem = document.createElement("div");
        playerItem.className = `scoreboard-item player-row-${i + 1}${i === currentPlayer ? " active" : ""}`;
        const name = playerNames[i] || `Player ${i + 1}`;
        playerItem.innerHTML = `<span>${name}</span><span>${playerScores[i]}</span>`;
        playerItem.title = "Click to edit player name";
        playerItem.addEventListener("click", () => editPlayerName(i, playerItem));
        playerScoreboardEl.appendChild(playerItem);
    }
}

function editPlayerName(playerIndex, playerItem) {
    if (playerItem.querySelector("input")) {
        return;
    }

    const currentName = playerNames[playerIndex] || `Player ${playerIndex + 1}`;
    const input = document.createElement("input");
    input.type = "text";
    input.value = currentName;
    input.maxLength = 20;
    input.className = "player-name-input";
    input.setAttribute("aria-label", `Name for Player ${playerIndex + 1}`);
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            savePlayerName(playerIndex, input.value);
        }
        if (event.key === "Escape") {
            rerender();
        }
    });
    input.addEventListener("blur", () => savePlayerName(playerIndex, input.value));

    playerItem.replaceChildren(input, document.createTextNode(String(playerScores[playerIndex])));
    input.focus();
    input.select();
}

function savePlayerName(playerIndex, value) {
    playerNames[playerIndex] = value.trim().slice(0, 20);
    rerender();
}

function renderTileInventory() {
    const counts = {};
    Object.keys(TILE_CONFIG).forEach((letter) => {
        counts[letter] = 0;
    });
    counts.JOKER = 0;

    bag.forEach((tile) => {
        counts[tile.isJoker ? "JOKER" : tile.letter] += 1;
    });

    if (inventoryTotalEl) inventoryTotalEl.textContent = String(bag.length);
    tileInventoryEl.innerHTML = "";
    Object.keys(counts).sort().forEach((letter) => {
        const item = document.createElement("div");
        item.className = "inventory-tile";
        if (letter === "JOKER") {
            item.classList.add("inventory-joker");
            item.innerHTML = `&#9786;<span class="tile-count">${counts[letter]}</span><span class="tile-value">0</span>`;
        } else {
            item.innerHTML = `${letter}<span class="tile-count">${counts[letter]}</span><span class="tile-value">${TILE_CONFIG[letter][1]}</span>`;
        }
        tileInventoryEl.appendChild(item);
    });
}

function setStatus(message, type = "warn") {
    if (!statusEl) {
        return;
    }
    statusEl.textContent = message;
    statusEl.className = type;
}

function rerender() {
    applyCurrentTheme();
    renderBoard();
    renderRack();
    updateStats();
    renderPlayerScores();
    renderTileInventory();
}

function findTileLocation(tileId) {
    const rack = getActiveRack();
    const rackIndex = rack.findIndex((tile) => tile.id === tileId);
    if (rackIndex >= 0) {
        return { area: "rack", rackIndex };
    }

    for (let i = 0; i < board.length; i += 1) {
        const tile = board[i];
        if (tile && tile.id === tileId) {
            return { area: "board", boardIndex: i };
        }
    }
    return null;
}

function getAutoPlacementIndex() {
    const placed = Array.from(placedThisTurn);
    if (placed.length < 2) {
        return null;
    }

    const rows = new Set(placed.map(rowOf));
    const cols = new Set(placed.map(colOf));
    const orientation = rows.size === 1 ? "row" : cols.size === 1 ? "col" : null;
    if (!orientation) {
        return null;
    }

    if (orientation === "row") {
        const row = rowOf(placed[0]);
        let maxCol = Math.max(...placed.map(colOf));
        let nextCol = maxCol + 1;
        while (nextCol < BOARD_SIZE && board[indexFrom(row, nextCol)]) {
            nextCol += 1;
        }
        return nextCol < BOARD_SIZE ? indexFrom(row, nextCol) : null;
    }

    const col = colOf(placed[0]);
    let maxRow = Math.max(...placed.map(rowOf));
    let nextRow = maxRow + 1;
    while (nextRow < BOARD_SIZE && board[indexFrom(nextRow, col)]) {
        nextRow += 1;
    }
    return nextRow < BOARD_SIZE ? indexFrom(nextRow, col) : null;
}

function onTileDoubleClick(event) {
    const tileId = event.currentTarget.dataset.tileId;
    const location = findTileLocation(tileId);
    if (!location || location.area !== "rack") {
        return;
    }

    const targetIndex = getAutoPlacementIndex();
    if (targetIndex === null) {
        setStatus("Unable to auto-place tile. Place at least two letters in a line first.", "warn");
        return;
    }

    moveTileToCell(tileId, targetIndex);
}

function onDragStart(event) {
    const tileId = event.currentTarget.dataset.tileId;
    event.dataTransfer.setData("text/plain", tileId);
}

function onAllowDrop(event) {
    event.preventDefault();
}

function assignJokerLetter(tile) {
    if (!tile.isJoker || tile.assignedLetter) {
        return true;
    }

    const input = window.prompt("Choose the letter this joker represents (A-Z):", "A");
    if (input === null) {
        return false;
    }

    const assignedLetter = input.trim().toUpperCase();
    if (!/^[A-Z]$/.test(assignedLetter)) {
        setStatus("Enter one letter from A to Z for the joker.", "warn");
        return false;
    }

    tile.assignedLetter = assignedLetter;
    return true;
}

function moveTileToCell(tileId, targetIndex) {
    const rack = getActiveRack();
    if (board[targetIndex]) {
        return;
    }

    const location = findTileLocation(tileId);
    if (!location) {
        return;
    }

    let tile;
    if (location.area === "rack") {
        tile = rack[location.rackIndex];
    } else {
        tile = board[location.boardIndex];
        if (!tile || tile.locked) {
            return;
        }
    }

    if (!assignJokerLetter(tile)) {
        return;
    }

    if (location.area === "rack") {
        rack.splice(location.rackIndex, 1);
        placedThisTurn.add(targetIndex);
    } else {
        board[location.boardIndex] = null;
        placedThisTurn.delete(location.boardIndex);
        placedThisTurn.add(targetIndex);
    }

    board[targetIndex] = tile;
    rerender();
}

function onDropToCell(event) {
    event.preventDefault();
    const tileId = event.dataTransfer.getData("text/plain");
    const cell = event.currentTarget;
    const targetIndex = Number(cell.dataset.index);
    moveTileToCell(tileId, targetIndex);
}

function onDropToRack(event) {
    const rack = getActiveRack();
    event.preventDefault();
    const tileId = event.dataTransfer.getData("text/plain");
    const location = findTileLocation(tileId);
    if (!location || location.area !== "board") {
        return;
    }

    const tile = board[location.boardIndex];
    if (!tile || tile.locked) {
        return;
    }

    board[location.boardIndex] = null;
    placedThisTurn.delete(location.boardIndex);
    rack.push(tile);
    rerender();
}

function recallTiles() {
    const rack = getActiveRack();
    const indexes = Array.from(placedThisTurn);
    indexes.forEach((index) => {
        const tile = board[index];
        if (tile && !tile.locked) {
            rack.push(tile);
            board[index] = null;
        }
    });
    placedThisTurn.clear();
    rerender();
    setStatus("Tiles recalled to rack.", "warn");
}

function shuffleRack() {
    const shuffledRack = [...getActiveRack()];
    for (let i = shuffledRack.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledRack[i], shuffledRack[j]] = [shuffledRack[j], shuffledRack[i]];
    }
    playerRacks[currentPlayer] = shuffledRack;
    renderRack();
    updateStats();
    setStatus("Rack shuffled.", "warn");
}

function isFirstMove() {
    return !board.some((tile) => tile && tile.locked);
}

function hasAdjacentLocked(index) {
    const row = rowOf(index);
    const col = colOf(index);
    const neighbors = [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1]
    ];
    return neighbors.some(([r, c]) => {
        if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) {
            return false;
        }
        const tile = board[indexFrom(r, c)];
        return tile && tile.locked;
    });
}

function validateLine(placed) {
    const rows = new Set(placed.map(rowOf));
    const cols = new Set(placed.map(colOf));

    if (rows.size !== 1 && cols.size !== 1) {
        return { ok: false, message: "Tiles must be in one row or one column." };
    }

    const orientation = rows.size === 1 ? "row" : "col";

    if (orientation === "row") {
        const row = rowOf(placed[0]);
        const minCol = Math.min(...placed.map(colOf));
        const maxCol = Math.max(...placed.map(colOf));
        let consecutiveLocked = 0;

        for (let col = minCol; col <= maxCol; col += 1) {
            const tile = board[indexFrom(row, col)];
            if (!tile) {
                return { ok: false, message: "Move must be contiguous (no gaps)." };
            }
            consecutiveLocked = tile.locked ? consecutiveLocked + 1 : 0;
            if (consecutiveLocked > 1) {
                return { ok: false, message: "You may jump over only one adjacent existing letter." };
            }
        }
    } else {
        const col = colOf(placed[0]);
        const minRow = Math.min(...placed.map(rowOf));
        const maxRow = Math.max(...placed.map(rowOf));
        let consecutiveLocked = 0;

        for (let row = minRow; row <= maxRow; row += 1) {
            const tile = board[indexFrom(row, col)];
            if (!tile) {
                return { ok: false, message: "Move must be contiguous (no gaps)." };
            }
            consecutiveLocked = tile.locked ? consecutiveLocked + 1 : 0;
            if (consecutiveLocked > 1) {
                return { ok: false, message: "You may jump over only one adjacent existing letter." };
            }
        }
    }

    return { ok: true, orientation };
}

function collectWord(startIndex, dRow, dCol) {
    let row = rowOf(startIndex);
    let col = colOf(startIndex);

    while (true) {
        const prevRow = row - dRow;
        const prevCol = col - dCol;
        if (prevRow < 0 || prevRow >= BOARD_SIZE || prevCol < 0 || prevCol >= BOARD_SIZE) {
            break;
        }
        if (!board[indexFrom(prevRow, prevCol)]) {
            break;
        }
        row = prevRow;
        col = prevCol;
    }

    const indices = [];
    while (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
        const idx = indexFrom(row, col);
        if (!board[idx]) {
            break;
        }
        indices.push(idx);
        row += dRow;
        col += dCol;
    }

    return indices;
}

function scoreWord(indices) {
    let sum = 0;
    let wordMultiplier = 1;

    indices.forEach((idx) => {
        const tile = board[idx];
        const isNew = placedThisTurn.has(idx);
        let letterScore = tile.value;

        if (isNew) {
            const type = getMultiplierType(idx);
            if (type === "dl") letterScore *= 2;
            if (type === "tl") letterScore *= 3;
            if (type === "dw" || type === "center") wordMultiplier *= 2;
            if (type === "tw") wordMultiplier *= 3;
        }

        sum += letterScore;
    });

    return sum * wordMultiplier;
}

function getTileLetter(tile) {
    return tile.isJoker ? tile.assignedLetter : tile.letter;
}

function getPlayerLabel(playerIndex) {
    return playerNames[playerIndex] || `Player ${playerIndex + 1}`;
}

function renderLastMove(words, wordScores, gained, bonus) {
    const details = words.map((word, index) => {
        const wordText = word.map((idx) => getTileLetter(board[idx])).join("");
        return `${wordText} - ${wordScores[index]} pts`;
    });
    const playerLabel = getPlayerLabel(currentPlayer);
    lastMoveTitleEl.textContent = `LAST MOVE FOR ${playerLabel}`;
    lastMoveEl.replaceChildren();

    const addRow = (text, className = "") => {
        const row = document.createElement("div");
        row.className = `last-move-row ${className}`.trim();
        row.textContent = text;
        lastMoveEl.appendChild(row);
    };

    if (details.length > 0) {
        addRow(details[0], "main-word");
    }

    if (details.length <= 3) {
        details.slice(1).forEach((detail) => addRow(detail, "secondary-word"));
    } else {
        const packedWords = details.slice(1);
        if (bonus > 0) {
            packedWords.push(`Scrabble bonus - ${bonus} pts`);
        }
        addRow(packedWords.join("; "), "packed-secondary");
    }

    if (bonus > 0 && details.length <= 3) {
        addRow(`Scrabble bonus - ${bonus} pts`, "secondary-word");
    }
    addRow(`Total - ${gained} pts`, "move-total");
}

function getRackPenalty(rack) {
    return rack.reduce((sum, tile) => sum + tile.value, 0);
}

function renderGameOver(reason, deductions) {
    const highestScore = Math.max(...playerScores);
    const winners = playerScores
        .map((score, index) => score === highestScore ? getPlayerLabel(index) : null)
        .filter(Boolean);

    lastMoveTitleEl.textContent = "GAME OVER";
    lastMoveEl.replaceChildren();

    const addRow = (text, className = "") => {
        const row = document.createElement("div");
        row.className = `last-move-row ${className}`.trim();
        row.textContent = text;
        lastMoveEl.appendChild(row);
    };

    addRow(`${winners.join(" and ")} won.`, "main-word");
    addRow(reason, "secondary-word");
    deductions.forEach(({ playerIndex, penalty }) => {
        if (penalty > 0) {
            addRow(`${getPlayerLabel(playerIndex)}: -${penalty} pts for remaining tiles.`, "secondary-word");
        }
    });
    playerScores.forEach((score, index) => {
        addRow(`${getPlayerLabel(index)} final score: ${score} pts`, "secondary-word");
    });
}

function endGame(reason) {
    if (gameEnded) {
        return;
    }

    const deductions = playerRacks.map((rack, playerIndex) => ({
        playerIndex,
        penalty: getRackPenalty(rack)
    }));
    deductions.forEach(({ playerIndex, penalty }) => {
        playerScores[playerIndex] -= penalty;
    });
    gameEnded = true;
    rerender();
    renderGameOver(reason, deductions);
}

function submitMove() {
    if (gameEnded) {
        return;
    }
    const rack = getActiveRack();
    const placed = Array.from(placedThisTurn);
    if (placed.length === 0) {
        setStatus("Place at least one tile before submitting.", "warn");
        return;
    }

    const lineValidation = validateLine(placed);
    if (!lineValidation.ok) {
        setStatus(lineValidation.message, "warn");
        return;
    }

    if (isFirstMove() && !placed.includes(CENTER_INDEX)) {
        setStatus("First move must use the center star.", "warn");
        return;
    }

    if (!isFirstMove()) {
        const connected = placed.some((idx) => hasAdjacentLocked(idx));
        if (!connected) {
            setStatus("Move must connect to existing tiles.", "warn");
            return;
        }
    }

    const words = [];
    const usedWords = new Set();
    const mainDirection = lineValidation.orientation === "row" ? [0, 1] : [1, 0];
    const crossDirection = lineValidation.orientation === "row" ? [1, 0] : [0, 1];

    const mainWord = collectWord(placed[0], mainDirection[0], mainDirection[1]);
    if (mainWord.length > 1 || placed.length === 1) {
        const key = mainWord.join("-");
        if (!usedWords.has(key)) {
            words.push(mainWord);
            usedWords.add(key);
        }
    }

    placed.forEach((idx) => {
        const crossWord = collectWord(idx, crossDirection[0], crossDirection[1]);
        if (crossWord.length > 1) {
            const key = crossWord.join("-");
            if (!usedWords.has(key)) {
                words.push(crossWord);
                usedWords.add(key);
            }
        }
    });

    const wordScores = words.map((word) => scoreWord(word));
    const bonus = placed.length === 7 ? 50 : 0;
    const gained = wordScores.reduce((sum, score) => sum + score, 0) + bonus;
    playerScores[currentPlayer] += gained;
    consecutivePasses = 0;
    renderLastMove(words, wordScores, gained, bonus);

    placed.forEach((idx) => {
        if (board[idx]) {
            board[idx].locked = true;
        }
    });

    placedThisTurn.clear();
    const playerFinished = rack.length === 0;
    if (!playerFinished) {
        rack.push(...drawTiles(7 - rack.length, currentPlayer));
    }
    rerender();

    if (playerFinished) {
        endGame(`${getPlayerLabel(currentPlayer)} used all tiles.`);
        return;
    }

    currentPlayer = (currentPlayer + 1) % playerCount;
    turn += 1;
    rerender();
}

function passTurn() {
    if (gameEnded) {
        return;
    }
    recallTiles();
    consecutivePasses += 1;
    if (consecutivePasses >= playerCount) {
        endGame("All players passed.");
        return;
    }
    currentPlayer = (currentPlayer + 1) % playerCount;
    turn += 1;
    rerender();
    setStatus("Turn passed.", "warn");
}

function isGameStarted() {
    return playerRacks.length > 0 || turn > 1 || placedThisTurn.size > 0 || board.some(Boolean) || playerScores.some((score) => score > 0);
}

function newGame(skipConfirmation = false) {
    if (!skipConfirmation && isGameStarted() && !window.confirm("A game is already in progress. Start a new game?")) {
        return false;
    }

    board = Array(BOARD_CELLS).fill(null);
    playerRacks = [];
    placedThisTurn = new Set();
    playerScores = Array(playerCount).fill(0);
    consecutivePasses = 0;
    gameEnded = false;
    currentPlayer = 0;
    turn = 1;
    bag = buildBag();

    for (let i = 0; i < playerCount; i += 1) {
        playerRacks.push(drawTiles(7, i));
    }

    playerCountEl.value = String(playerCount);
    playerNames = Array.from({ length: playerCount }, (_, index) => playerNames[index] || "");
    lastMoveTitleEl.textContent = "LAST MOVE FOR";
    lastMoveEl.textContent = "No move scored yet.";
    lastMoveEl.classList.remove("compact");
    rerender();
    setStatus(`New game started for ${playerCount} players. Player 1 begins.`, "warn");
    return true;
}

playerCountEl.addEventListener("change", (event) => {
    const selected = Number(event.target.value);
    if (selected >= 2 && selected <= 4) {
        const previousPlayerCount = playerCount;
        playerCount = selected;
        if (!newGame()) {
            playerCount = previousPlayerCount;
            playerCountEl.value = String(previousPlayerCount);
        }
    }
});

submitBtn.addEventListener("click", submitMove);
recallBtn.addEventListener("click", recallTiles);
shuffleBtn.addEventListener("click", shuffleRack);
passBtn.addEventListener("click", passTurn);
newBtn.addEventListener("click", () => newGame());

newGame(true);
