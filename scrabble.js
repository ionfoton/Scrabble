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
const tileInventoryEl = document.getElementById("tile-inventory");
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
    A: [10, 1], B: [2, 9], C: [5, 1], D: [4, 3], E: [9, 1],
    F: [2, 4], G: [2, 6], H: [1, 8], I: [11, 1], J: [1, 10],
    L: [5, 1], M: [3, 4], N: [6, 1], O: [5, 2], P: [4, 2],
    R: [6, 1], S: [6, 1], T: [7, 1], U: [5, 1], V: [2, 4],
    X: [1, 10], Z: [1, 8]
};

let board = [];
let rack = [];
let bag = [];
let placedThisTurn = new Set();
let playerScores = [];
let playerCount = 2;
let currentPlayer = 0;
let turn = 1;
let tileIdCounter = 0;

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
    for (let i = nextBag.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [nextBag[i], nextBag[j]] = [nextBag[j], nextBag[i]];
    }
    return nextBag;
}

function drawTiles(count) {
    const drawn = [];
    for (let i = 0; i < count && bag.length > 0; i += 1) {
        drawn.push(bag.pop());
    }
    return drawn;
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
    tileEl.className = `tile${locked ? " locked" : ""}`;
    tileEl.draggable = !locked;
    tileEl.dataset.tileId = tile.id;
    tileEl.innerHTML = `${tile.letter}<span class="tile-value">${tile.value}</span>`;
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
    scoreEl.textContent = String(playerScores[currentPlayer] || 0);
    currentPlayerEl.textContent = String(currentPlayer + 1);
    turnEl.textContent = String(turn);
    tilesLeftEl.textContent = String(bag.length);
    rackCountEl.textContent = `${rack.length}/7`;
}

function renderPlayerScores() {
    playerScoreboardEl.innerHTML = "";
    for (let i = 0; i < playerCount; i += 1) {
        const playerItem = document.createElement("div");
        playerItem.className = `scoreboard-item${i === currentPlayer ? " active" : ""}`;
        playerItem.innerHTML = `<span>Player ${i + 1}</span><span>${playerScores[i]}</span>`;
        playerScoreboardEl.appendChild(playerItem);
    }
}

function renderTileInventory() {
    const counts = {};
    Object.keys(TILE_CONFIG).forEach((letter) => {
        counts[letter] = 0;
    });

    [...bag, ...rack].forEach((tile) => {
        counts[tile.letter] += 1;
    });

    tileInventoryEl.innerHTML = "";
    Object.keys(counts).sort().forEach((letter) => {
        const item = document.createElement("div");
        item.className = "inventory-tile";
        item.innerHTML = `${letter}<span class="tile-count">${counts[letter]}</span><span class="tile-value">${TILE_CONFIG[letter][1]}</span>`;
        tileInventoryEl.appendChild(item);
    });
}

function setStatus(message, type = "warn") {
    statusEl.textContent = message;
    statusEl.className = type;
}

function rerender() {
    renderBoard();
    renderRack();
    updateStats();
    renderPlayerScores();
    renderTileInventory();
}

function findTileLocation(tileId) {
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

function moveTileToCell(tileId, targetIndex) {
    if (board[targetIndex]) {
        return;
    }

    const location = findTileLocation(tileId);
    if (!location) {
        return;
    }

    let tile;
    if (location.area === "rack") {
        tile = rack.splice(location.rackIndex, 1)[0];
        placedThisTurn.add(targetIndex);
    } else {
        tile = board[location.boardIndex];
        if (!tile || tile.locked) {
            return;
        }
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
    for (let i = rack.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [rack[i], rack[j]] = [rack[j], rack[i]];
    }
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

        for (let col = minCol; col <= maxCol; col += 1) {
            if (!board[indexFrom(row, col)]) {
                return { ok: false, message: "Move must be contiguous (no gaps)." };
            }
        }
    } else {
        const col = colOf(placed[0]);
        const minRow = Math.min(...placed.map(rowOf));
        const maxRow = Math.max(...placed.map(rowOf));

        for (let row = minRow; row <= maxRow; row += 1) {
            if (!board[indexFrom(row, col)]) {
                return { ok: false, message: "Move must be contiguous (no gaps)." };
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

function submitMove() {
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

    const gained = words.reduce((sum, word) => sum + scoreWord(word), 0);
    playerScores[currentPlayer] += gained;

    placed.forEach((idx) => {
        if (board[idx]) {
            board[idx].locked = true;
        }
    });

    placedThisTurn.clear();
    rack.push(...drawTiles(7 - rack.length));
    rerender();
    setStatus(`Great move. +${gained} points.`, "ok");

    if (bag.length === 0 && rack.length === 0) {
        setStatus(`Game over. Final score: ${playerScores[currentPlayer]}`, "ok");
        return;
    }

    currentPlayer = (currentPlayer + 1) % playerCount;
    turn += 1;
    rerender();
}

function passTurn() {
    recallTiles();
    currentPlayer = (currentPlayer + 1) % playerCount;
    turn += 1;
    updateStats();
    setStatus("Turn passed.", "warn");
}

function newGame() {
    board = Array(BOARD_CELLS).fill(null);
    rack = [];
    placedThisTurn = new Set();
    playerScores = Array(playerCount).fill(0);
    currentPlayer = 0;
    turn = 1;
    bag = buildBag();
    rack.push(...drawTiles(7));
    playerCountEl.value = String(playerCount);
    rerender();
    setStatus(`New game started for ${playerCount} players. Player 1 begins.`, "warn");
}

playerCountEl.addEventListener("change", (event) => {
    const selected = Number(event.target.value);
    if (selected >= 2 && selected <= 4) {
        playerCount = selected;
        newGame();
    }
});

submitBtn.addEventListener("click", submitMove);
recallBtn.addEventListener("click", recallTiles);
shuffleBtn.addEventListener("click", shuffleRack);
passBtn.addEventListener("click", passTurn);
newBtn.addEventListener("click", newGame);

newGame();
