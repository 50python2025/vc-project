document.addEventListener('DOMContentLoaded', () => {
    try {
        const BOARD_SIZE = 10;
        const DEFAULT_CELL_SIZE = 28;
        const HINT_PADDING_CELLS = 5;

        // --- Element Selectors ---
        const toolButtons = Array.from(document.querySelectorAll('.tool-button'));
        const statusText = document.getElementById('status-text');
        const puzzleTitle = document.getElementById('puzzle-title');
        const puzzleDifficulty = document.getElementById('puzzle-difficulty');
        const puzzleProgress = document.getElementById('puzzle-progress');
        const filledCountEl = document.getElementById('filled-count');
        const crossCountEl = document.getElementById('cross-count');
        const mistakeCountEl = document.getElementById('mistake-count');
        const timerDisplay = document.getElementById('timer-display');
        const cellSizeSlider = document.getElementById('cell-size-slider');
        const cellSizeValue = document.getElementById('cell-size-value');
        const highlightSlider = document.getElementById('highlight-slider');
        const highlightValue = document.getElementById('highlight-value');
        const resetButton = document.getElementById('reset-button');
        const startButton = document.getElementById('start-button');
        const prevButton = document.getElementById('prev-puzzle');
        const nextButton = document.getElementById('next-puzzle');
        const revealToggle = document.getElementById('reveal-toggle');
        const toast = document.getElementById('toast');
        const overlay = document.getElementById('victory-overlay');
        const overlayTitle = document.getElementById('victory-title');
        const overlayMessage = document.getElementById('victory-message');
        const continueButton = document.getElementById('continue-button');
        const boardSurface = document.querySelector('.board-surface');

        const boardCanvas = document.getElementById('board-canvas');
        const rowCanvas = document.getElementById('row-hints-canvas');
        const colCanvas = document.getElementById('col-hints-canvas');
        const cornerCanvas = document.getElementById('corner-canvas');

        const boardCtx = boardCanvas.getContext('2d');
        const rowCtx = rowCanvas.getContext('2d');
        const colCtx = colCanvas.getContext('2d');
        const cornerCtx = cornerCanvas.getContext('2d');

        // --- Game State ---
        let currentTool = 'fill';
        let currentPuzzleIndex = 0;
        let cellSize = DEFAULT_CELL_SIZE;
        let highlightStrength = parseFloat(highlightSlider.value);
        let highlightMistakes = false;
        let timerHandle = null;
        let elapsedSeconds = 0;
        let puzzles = [];
        let activePuzzle = null;
        let playerGrid = createEmptyState();
        let hoverCell = null;
        let dragInfo = null;

        // --- Initialization ---
        puzzles = createPuzzleDefinitions().map((def, idx) => preparePuzzle(def, idx));
        setupUI();
        loadPuzzle(0);

        // --- Functions ---

        function createPuzzleDefinitions() {
            const puzzleData = [
                { name: 'スマイリー', difficulty: 'EASY', description: '基本の十字と四角の練習。', grid: [
                    [0,0,1,1,1,1,1,1,0,0],
                    [0,1,0,0,0,0,0,0,1,0],
                    [1,0,1,0,0,0,0,1,0,1],
                    [1,0,0,1,0,0,1,0,0,1],
                    [1,0,0,0,0,0,0,0,0,1],
                    [1,0,0,1,1,1,1,0,0,1],
                    [1,0,0,0,0,0,0,0,0,1],
                    [1,0,1,0,0,0,0,1,0,1],
                    [0,1,0,0,0,0,0,0,1,0],
                    [0,0,1,1,1,1,1,1,0,0]
                ]},
                { name: 'ハート', difficulty: 'EASY', description: '愛らしいハート形に挑戦。', grid: [
                    [0,0,0,0,0,0,0,0,0,0],[0,1,1,0,0,0,1,1,0,0],[1,1,1,1,0,1,1,1,1,0],[1,1,1,1,1,1,1,1,1,0],[1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,0,0],[0,0,1,1,1,1,1,0,0,0],[0,0,0,1,1,1,0,0,0,0],[0,0,0,0,1,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],
                ]},
                { name: 'ダイヤモンド', difficulty: 'NORMAL', description: '輝く宝石のシルエット。', grid: [
                    [0,0,0,0,1,1,0,0,0,0],[0,0,0,1,1,1,1,0,0,0],[0,0,1,1,1,1,1,1,0,0],[0,1,1,1,1,1,1,1,1,0],[1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1],[0,1,1,1,1,1,1,1,1,0],[0,0,1,1,1,1,1,1,0,0],[0,0,0,1,1,1,1,0,0,0],[0,0,0,0,1,1,0,0,0,0],
                ]},
                { name: 'チェック', difficulty: 'NORMAL', description: '市松模様のパターン。', grid: [
                    [1,1,0,0,1,1,0,0,1,1],[1,1,0,0,1,1,0,0,1,1],[0,0,1,1,0,0,1,1,0,0],[0,0,1,1,0,0,1,1,0,0],[1,1,0,0,1,1,0,0,1,1],[1,1,0,0,1,1,0,0,1,1],[0,0,1,1,0,0,1,1,0,0],[0,0,1,1,0,0,1,1,0,0],[1,1,0,0,1,1,0,0,1,1],[1,1,0,0,1,1,0,0,1,1],
                ]},
                { name: 'アロー', difficulty: 'NORMAL', description: 'まっすぐ進む矢印。', grid: [
                    [0,0,0,0,1,0,0,0,0,0],[0,0,0,1,1,1,0,0,0,0],[0,0,1,1,1,1,1,0,0,0],[0,1,1,0,1,0,1,1,0,0],[1,1,0,0,1,0,0,1,1,0],[0,0,0,0,1,0,0,0,0,0],[0,0,0,0,1,0,0,0,0,0],[0,0,0,0,1,0,0,0,0,0],[0,0,0,0,1,0,0,0,0,0],[0,0,0,0,1,0,0,0,0,0],
                ]},
                { name: 'ツリー', difficulty: 'HARD', description: 'そびえ立つ大きな木。', grid: [
                    [0,0,0,0,1,1,0,0,0,0],[0,0,0,1,1,1,1,0,0,0],[0,0,1,1,1,1,1,1,0,0],[0,1,1,1,1,1,1,1,1,0],[1,1,1,1,1,1,1,1,1,1],[0,0,0,1,1,1,1,0,0,0],[0,0,0,0,1,1,0,0,0,0],[0,0,0,0,1,1,0,0,0,0],[0,0,0,0,1,1,0,0,0,0],[0,0,0,0,1,1,0,0,0,0],
                ]},
                { name: 'ボート', difficulty: 'HARD', description: '水面を進む帆船。', grid: [
                    [0,0,0,0,1,0,0,0,0,0],[0,0,0,1,1,0,0,0,0,0],[0,0,1,1,1,0,0,0,0,0],[0,1,1,1,1,0,0,0,0,0],[1,1,1,1,1,1,1,1,1,1],[0,1,1,1,1,1,1,1,0,0],[0,0,1,1,1,1,1,0,0,0],[0,0,0,1,1,1,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[1,1,1,1,1,1,1,1,1,1],
                ]},
                { name: 'キャット', difficulty: 'EXPERT', description: 'しなやかな猫の横顔。', grid: [
                    [0,0,0,1,1,0,0,0,0,0],[0,0,1,1,1,1,0,0,0,0],[0,0,1,1,0,1,1,0,0,0],[0,1,1,0,0,0,1,1,0,0],[0,1,1,0,0,0,1,1,0,0],[0,1,1,1,1,1,1,1,0,0],[0,0,1,1,1,1,1,0,0,0],[0,0,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1],
                ]},
                { name: 'キー', difficulty: 'EXPERT', description: '秘密の扉を開ける鍵。', grid: [
                    [0,1,1,1,0,0,0,0,0,0],[1,1,0,1,1,0,0,0,0,0],[1,0,0,0,1,0,0,1,1,0],[1,1,0,1,1,0,1,1,1,1],[0,1,1,1,0,0,1,1,0,0],[0,0,0,0,0,0,0,1,1,0],[0,0,0,0,0,0,0,1,1,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],
                ]},
                { name: 'クラウン', difficulty: 'MASTER', description: '王の証、輝く王冠。', grid: [
                    [1,0,1,0,1,0,1,0,1,0],[1,0,1,0,1,0,1,0,1,0],[1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,0,0],[0,0,1,1,1,1,1,0,0,0],[0,0,0,1,1,1,0,0,0],[0,0,1,1,1,1,1,0,0,0],[0,1,1,1,1,1,1,1,0,0],[1,1,1,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0,0,0],
                ]}
            ];
            return puzzleData;
        }

        function preparePuzzle(def, index) {
            const grid = def.grid.map(row => row.map(cell => !!cell));
            const rowHints = grid.map(compressLine);
            const colHints = computeColumnHints(grid);
            const filledCells = grid.reduce((acc, row) => acc + row.filter(Boolean).length, 0);
            const maxRowHints = rowHints.reduce((max, hints) => Math.max(max, hints.length), 0);
            const maxColHints = colHints.reduce((max, hints) => Math.max(max, hints.length), 0);
            return { ...def, index, solution: grid, rowHints, colHints, filledCells, maxRowHints, maxColHints };
        }

        function createEmptyState() {
            return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
        }

        function compressLine(line) {
            const hints = [];
            let run = 0;
            for (const cell of line) {
                if (cell) { run += 1; } else if (run > 0) { hints.push(run); run = 0; }
            }
            if (run > 0) hints.push(run);
            return hints.length ? hints : [0];
        }

        function computeColumnHints(grid) {
            const hints = [];
            for (let x = 0; x < BOARD_SIZE; x += 1) {
                const column = Array.from({ length: BOARD_SIZE }, (_, y) => grid[y][x]);
                hints.push(compressLine(column));
            }
            return hints;
        }

        function setupUI() {
            toolButtons.forEach(button => button.addEventListener('click', () => selectTool(button.dataset.tool)));
            
            startButton.addEventListener('click', () => {
                startTimer();
                startButton.style.display = 'none';
                resetButton.style.display = 'block';
            });

            cellSizeSlider.addEventListener('input', () => {
                cellSize = parseInt(cellSizeSlider.value, 10);
                cellSizeValue.textContent = `${cellSize}px`;
                resizeCanvases();
                drawAll();
            });
            cellSizeValue.textContent = `${cellSize}px`;
            highlightSlider.addEventListener('input', () => {
                highlightStrength = parseFloat(highlightSlider.value);
                highlightValue.textContent = `${Math.round(highlightStrength * 100)}%`;
                drawAll();
            });
            highlightValue.textContent = `${Math.round(highlightStrength * 100)}%`;
            resetButton.addEventListener('click', () => { resetPuzzleState(); showToast('盤面をリセットしました。'); });
            prevButton.addEventListener('click', () => { if (currentPuzzleIndex > 0) loadPuzzle(currentPuzzleIndex - 1); });
            nextButton.addEventListener('click', () => { if (currentPuzzleIndex < puzzles.length - 1) loadPuzzle(currentPuzzleIndex + 1); });
            revealToggle.addEventListener('click', () => {
                highlightMistakes = !highlightMistakes;
                revealToggle.classList.toggle('active', highlightMistakes);
                revealToggle.textContent = highlightMistakes ? 'ヒントラインをオフ' : 'ヒントラインを点灯';
                drawAll();
            });
            continueButton.addEventListener('click', () => {
                overlay.classList.add('hidden');
                if (currentPuzzleIndex < puzzles.length - 1) loadPuzzle(currentPuzzleIndex + 1);
            });
            boardCanvas.addEventListener('mousedown', handlePointerDown);
            boardCanvas.addEventListener('mousemove', handlePointerMove);
            boardCanvas.addEventListener('mouseleave', () => { hoverCell = null; drawBoard(); });
            boardCanvas.addEventListener('wheel', handleWheel, { passive: false });
            boardCanvas.addEventListener('contextmenu', e => e.preventDefault());
            window.addEventListener('mouseup', handlePointerUp);
        }

        function selectTool(tool) {
            currentTool = tool;
            toolButtons.forEach(button => button.classList.toggle('active', button.dataset.tool === tool));
            const labels = { fill: '塗りつぶしモード', cross: 'バツマーカー', inspect: '消しゴムモード' };
            statusText.textContent = `${labels[tool] || ''}が選択されました。`;
        }

        function loadPuzzle(index) {
            currentPuzzleIndex = index;
            activePuzzle = puzzles[index];
            playerGrid = createEmptyState();
            hoverCell = null;
            highlightMistakes = false;
            revealToggle.classList.remove('active');
            revealToggle.textContent = 'ヒントラインを点灯';
            resetTimer();
            
            startButton.style.display = 'block';
            resetButton.style.display = 'none';

            updateHeader();
            resizeCanvases();
            drawAll();
            updateStats();
            showToast(`${activePuzzle.name}（${index + 1}/${puzzles.length}）スタート！`);
            statusText.textContent = activePuzzle.description;
            continueButton.textContent = index === puzzles.length - 1 ? 'ギャラリーへ戻る' : '次のパズルへ';
        }

        function resetPuzzleState() {
            playerGrid = createEmptyState();
            hoverCell = null;
            highlightMistakes = false;
            revealToggle.classList.remove('active');
            revealToggle.textContent = 'ヒントラインを点灯';
            elapsedSeconds = 0;
            resetTimer();

            startButton.style.display = 'block';
            resetButton.style.display = 'none';

            drawAll();
            updateStats();
        }

        function updateHeader() {
            puzzleTitle.textContent = activePuzzle.name;
            puzzleDifficulty.textContent = difficultyLabel(activePuzzle.difficulty);
            prevButton.disabled = currentPuzzleIndex === 0;
            nextButton.disabled = currentPuzzleIndex === puzzles.length - 1;
        }

        function difficultyLabel(level) {
            const stars = { EASY: '★☆☆', NORMAL: '★★☆', HARD: '★★★', EXPERT: '★★★★', MASTER: '★★★★★' };
            return `${stars[level] || ''} ${level}`;
        }

        function resizeCanvases() {
            const boardPixels = BOARD_SIZE * cellSize;
            const rowHintCols = Math.max(activePuzzle.maxRowHints, HINT_PADDING_CELLS);
            const colHintRows = Math.max(activePuzzle.maxColHints, HINT_PADDING_CELLS);
            const hintUnit = Math.ceil(cellSize * 0.9) + 4;
            const rowWidth = rowHintCols * hintUnit;
            const colHeight = colHintRows * hintUnit;

            setupHiDPICanvas(boardCanvas, boardPixels, boardPixels);
            setupHiDPICanvas(rowCanvas, rowWidth, boardPixels);
            setupHiDPICanvas(colCanvas, boardPixels, colHeight);
            setupHiDPICanvas(cornerCanvas, rowWidth, colHeight);

            positionCanvas(rowCanvas, 0, colHeight);
            positionCanvas(boardCanvas, rowWidth, colHeight);
            positionCanvas(colCanvas, rowWidth, 0);
            positionCanvas(cornerCanvas, 0, 0);

            rowCanvas.dataset.hintUnit = hintUnit;
            colCanvas.dataset.hintUnit = hintUnit;

            const totalWidth = rowWidth + boardPixels;
            const totalHeight = colHeight + boardPixels;
            boardSurface.style.width = `${totalWidth}px`;
            boardSurface.style.height = `${totalHeight}px`;
        }

        function setupHiDPICanvas(canvas, width, height) {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.max(1, Math.round(width * dpr));
            canvas.height = Math.max(1, Math.round(height * dpr));
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            const ctx = canvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function positionCanvas(canvas, left, top) {
            canvas.style.left = `${left}px`;
            canvas.style.top = `${top}px`;
        }

        function drawAll() {
            drawBoard();
            drawRowHints();
            drawColHints();
            drawCorner();
            updateStats();
        }

        function drawBoard() {
            const ctx = boardCtx;
            const boardPixels = BOARD_SIZE * cellSize;
            ctx.clearRect(0, 0, boardPixels, boardPixels);
            ctx.fillStyle = '#fafafa';
            ctx.fillRect(0, 0, boardPixels, boardPixels);
            if (highlightMistakes) {
                ctx.save();
                ctx.globalAlpha = highlightStrength;
                ctx.fillStyle = '#ffe7e7';
                solvedRows().forEach(rowIdx => ctx.fillRect(0, rowIdx * cellSize, boardPixels, cellSize));
                ctx.fillStyle = '#e7f5ff';
                solvedColumns().forEach(colIdx => ctx.fillRect(colIdx * cellSize, 0, cellSize, boardPixels));
                ctx.restore();
            }
            for (let y = 0; y < BOARD_SIZE; y++) {
                for (let x = 0; x < BOARD_SIZE; x++) {
                    const state = playerGrid[y][x];
                    if (state === 1) {
                        ctx.fillStyle = '#1f2933';
                        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                    } else if (state === -1) {
                        ctx.strokeStyle = '#a7b0c2';
                        ctx.lineWidth = Math.max(1, cellSize / 8);
                        const padding = cellSize * 0.2;
                        ctx.beginPath();
                        ctx.moveTo(x * cellSize + padding, y * cellSize + padding);
                        ctx.lineTo((x + 1) * cellSize - padding, (y + 1) * cellSize - padding);
                        ctx.moveTo((x + 1) * cellSize - padding, y * cellSize + padding);
                        ctx.lineTo(x * cellSize + padding, (y + 1) * cellSize - padding);
                        ctx.stroke();
                    }
                }
            }
            if (hoverCell) {
                ctx.save();
                ctx.fillStyle = 'rgba(255, 153, 0, 0.18)';
                ctx.fillRect(hoverCell.x * cellSize, hoverCell.y * cellSize, cellSize, cellSize);
                ctx.restore();
            }
            ctx.strokeStyle = 'rgba(31, 35, 45, 0.15)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= BOARD_SIZE; i++) {
                const pos = i * cellSize;
                ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, boardPixels); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(boardPixels, pos); ctx.stroke();
            }
            ctx.strokeStyle = '#1f232d';
            ctx.lineWidth = 1.4;
            for (let i = 0; i <= BOARD_SIZE; i += 5) {
                const pos = i * cellSize;
                ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, boardPixels); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(boardPixels, pos); ctx.stroke();
            }
        }

        function drawRowHints() {
            const ctx = rowCtx;
            const boardPixels = BOARD_SIZE * cellSize;
            const hintUnit = parseInt(rowCanvas.dataset.hintUnit, 10) || cellSize;
            const width = parseInt(rowCanvas.style.width, 10);
            ctx.clearRect(0, 0, width, boardPixels);
            ctx.fillStyle = '#f9fbff';
            ctx.fillRect(0, 0, width, boardPixels);
            ctx.strokeStyle = 'rgba(31, 35, 45, 0.12)';
            ctx.beginPath(); ctx.moveTo(width - 1, 0); ctx.lineTo(width - 1, boardPixels); ctx.stroke();
            ctx.fillStyle = '#1f232d';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `${Math.max(10, Math.round(cellSize * 0.6))}px 'Segoe UI', sans-serif`;
            activePuzzle.rowHints.forEach((hints, rowIdx) => {
                const y = rowIdx * cellSize + cellSize / 2;
                ctx.globalAlpha = isRowSolved(rowIdx) ? 0.5 : 1;
                // Simplified drawing logic to draw from right-to-left
                hints.forEach((hint, hintIdx) => {
                    const dx = width - (hintIdx * hintUnit) - (hintUnit / 2);
                    ctx.fillText(String(hint), dx, y);
                });
            });
            ctx.globalAlpha = 1;
        }

        function drawColHints() {
            const ctx = colCtx;
            const boardPixels = BOARD_SIZE * cellSize;
            const hintUnit = parseInt(colCanvas.dataset.hintUnit, 10) || cellSize;
            const height = parseInt(colCanvas.style.height, 10);
            ctx.clearRect(0, 0, boardPixels, height);
            ctx.fillStyle = '#f9fbff';
            ctx.fillRect(0, 0, boardPixels, height);
            ctx.strokeStyle = 'rgba(31, 35, 45, 0.12)';
            ctx.beginPath(); ctx.moveTo(0, height - 1); ctx.lineTo(boardPixels, height - 1); ctx.stroke();
            ctx.fillStyle = '#1f232d';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `${Math.max(10, Math.round(cellSize * 0.6))}px 'Segoe UI', sans-serif`;
            activePuzzle.colHints.forEach((hints, colIdx) => {
                const x = colIdx * cellSize + cellSize / 2;
                ctx.globalAlpha = isColumnSolved(colIdx) ? 0.5 : 1;
                // Simplified drawing logic to draw from bottom-to-top
                hints.forEach((hint, hintIdx) => {
                    const dy = height - (hintIdx * hintUnit) - (hintUnit / 2);
                    ctx.fillText(String(hint), x, dy);
                });
            });
            ctx.globalAlpha = 1;
        }

        function drawCorner() {
            const ctx = cornerCtx;
            const width = parseInt(rowCanvas.style.width, 10);
            const height = parseInt(colCanvas.style.height, 10);
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#eef2ff';
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = '#1f232d';
            ctx.font = 'bold 16px "Segoe UI"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('10x10', width / 2, height / 2);
        }

        function handlePointerDown(event) {
            event.preventDefault();
            const cell = locateCell(event);
            if (!cell) return;
            const action = determineAction(cell, event.button === 2 ? (currentTool === 'fill' ? 'cross' : 'fill') : currentTool);
            dragInfo = { tool: currentTool, action };
            applyAction(cell, action);
        }

        function handlePointerMove(event) {
            const cell = locateCell(event);
            hoverCell = cell;
            if (dragInfo && cell) applyAction(cell, dragInfo.action);
            drawBoard();
        }

        function handlePointerUp() {
            if (dragInfo) {
                dragInfo = null;
                checkCompletion();
                updateStats();
            }
        }

        function handleWheel(event) {
            if (event.ctrlKey) {
                event.preventDefault();
                const delta = Math.sign(event.deltaY);
                const next = Math.min(40, Math.max(8, cellSize - delta));
                if (next !== cellSize) {
                    cellSize = next;
                    cellSizeSlider.value = String(next);
                    cellSizeValue.textContent = `${next}px`;
                    resizeCanvases();
                    drawAll();
                }
            }
        }

        function locateCell(event) {
            const rect = boardCanvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            if (x < 0 || y < 0) return null;
            const cx = Math.floor(x / cellSize);
            const cy = Math.floor(y / cellSize);
            return (cx < 0 || cy < 0 || cx >= BOARD_SIZE || cy >= BOARD_SIZE) ? null : { x: cx, y: cy };
        }

        function determineAction(cell, tool) {
            const current = playerGrid[cell.y][cell.x];
            if (tool === 'fill') return current === 1 ? 0 : 1;
            if (tool === 'cross') return current === -1 ? 0 : -1;
            return 0;
        }

        function applyAction(cell, value) {
            if (playerGrid[cell.y][cell.x] === value) return;
            playerGrid[cell.y][cell.x] = value;
            if (value === 1 || value === 0) { drawRowHints(); drawColHints(); }
            drawBoard();
            updateStats();
        }

        function updateStats() {
            const filled = countCells(1);
            const crosses = countCells(-1);
            const mistakes = computeMistakes();
            const progress = activePuzzle.filledCells > 0 ? (matchesCount() / activePuzzle.filledCells) * 100 : 0;
            filledCountEl.textContent = `塗りマス: ${filled}`;
            crossCountEl.textContent = `バツ: ${crosses}`;
            mistakeCountEl.textContent = `ミス: ${mistakes}`;
            puzzleProgress.textContent = `${progress.toFixed(1)}%`;
        }

        function countCells(target) {
            return playerGrid.flat().filter(cell => cell === target).length;
        }

        function computeMistakes() {
            return playerGrid.flat().reduce((acc, state, i) => {
                const shouldFill = activePuzzle.solution.flat()[i];
                if ((state === 1 && !shouldFill) || (state === -1 && shouldFill)) acc++;
                return acc;
            }, 0);
        }

        function matchesCount() {
            return playerGrid.flat().reduce((acc, state, i) => {
                if (activePuzzle.solution.flat()[i] && state === 1) acc++;
                return acc;
            }, 0);
        }

        function solvedRows() {
            return playerGrid.map((_, y) => isRowSolved(y) ? y : -1).filter(y => y !== -1);
        }

        function solvedColumns() {
            return playerGrid[0].map((_, x) => isColumnSolved(x) ? x : -1).filter(x => x !== -1);
        }

        function isRowSolved(rowIdx) {
            const row = playerGrid[rowIdx];
            const hints = compressLine(row.map(cell => cell === 1));
            return arraysEqual(hints, activePuzzle.rowHints[rowIdx]);
        }

        function isColumnSolved(colIdx) {
            const column = playerGrid.map(row => row[colIdx] === 1);
            const hints = compressLine(column);
            return arraysEqual(hints, activePuzzle.colHints[colIdx]);
        }

        function arraysEqual(a, b) {
            return a.length === b.length && a.every((val, i) => val === b[i]);
        }

        function checkCompletion() {
            if (computeMistakes() === 0 && matchesCount() === activePuzzle.filledCells) {
                stopTimer();
                overlay.classList.remove('hidden');
            }
        }

        function nextPuzzleName() {
            return currentPuzzleIndex >= puzzles.length - 1 ? 'ギャラリーリストから好きな作品に再挑戦を' : puzzles[currentPuzzleIndex + 1].name;
        }

        function showToast(message) {
            toast.textContent = message;
            toast.classList.remove('hidden');
            toast.classList.add('visible');
            clearTimeout(showToast._timer);
            showToast._timer = setTimeout(() => toast.classList.remove('visible'), 2600);
        }

        function startTimer() {
            stopTimer();
            timerHandle = setInterval(() => {
                elapsedSeconds++;
                timerDisplay.textContent = `タイマー: ${formatTime(elapsedSeconds)}`;
            }, 1000);
            timerDisplay.textContent = `タイマー: ${formatTime(elapsedSeconds)}`;
        }

        function stopTimer() {
            if (timerHandle) clearInterval(timerHandle);
            timerHandle = null;
        }

        function resetTimer() {
            stopTimer();
            elapsedSeconds = 0;
            timerDisplay.textContent = 'タイマー: 00:00';
        }

        function formatTime(totalSeconds) {
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

    } catch (e) {
        alert(`A critical and unexpected error occurred: 

Error: ${e.message}

Stack Trace: ${e.stack}`);
        console.error("Caught global error:", e);
    }
});