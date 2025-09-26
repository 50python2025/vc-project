document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gomoku-board');
    const context = canvas.getContext('2d');
    const statusElement = document.getElementById('status');
    const restartButton = document.getElementById('restart-button');

    const BOARD_SIZE = 19;
    const CELL_SIZE = 25;
    const PADDING = 12.5;

    let board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
    let currentPlayer = 1;
    let gameOver = false;
    const SEARCH_DEPTH = 2;

    function drawBoard() {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = '#000';
        context.lineWidth = 1;

        for (let i = 0; i < BOARD_SIZE; i++) {
            context.beginPath();
            context.moveTo(PADDING + i * CELL_SIZE, PADDING);
            context.lineTo(PADDING + i * CELL_SIZE, PADDING + (BOARD_SIZE - 1) * CELL_SIZE);
            context.stroke();

            context.beginPath();
            context.moveTo(PADDING, PADDING + i * CELL_SIZE);
            context.lineTo(PADDING + (BOARD_SIZE - 1) * CELL_SIZE, PADDING + i * CELL_SIZE);
            context.stroke();
        }

        const starPoints = [
            { x: 3, y: 3 }, { x: 3, y: 15 },
            { x: 15, y: 3 }, { x: 15, y: 15 },
            { x: 9, y: 9 }
        ];
        context.fillStyle = '#000';
        starPoints.forEach(point => {
            context.beginPath();
            context.arc(PADDING + point.x * CELL_SIZE, PADDING + point.y * CELL_SIZE, 4, 0, 2 * Math.PI);
            context.fill();
        });
    }

    function drawStone(x, y, player) {
        context.beginPath();
        context.arc(PADDING + x * CELL_SIZE, PADDING + y * CELL_SIZE, CELL_SIZE / 2 - 2, 0, 2 * Math.PI);
        context.fillStyle = (player === 1) ? '#000' : '#fff';
        context.fill();
        context.strokeStyle = (player === 1) ? '#000' : '#aaa';
        context.stroke();
    }

    function handleCanvasClick(event) {
        if (gameOver || currentPlayer !== 1) return;

        const rect = canvas.getBoundingClientRect();
        const x = Math.round((event.clientX - rect.left - PADDING) / CELL_SIZE);
        const y = Math.round((event.clientY - rect.top - PADDING) / CELL_SIZE);

        if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE || board[y][x] !== 0) return;

        makeMove(x, y, 1);
    }

    function makeMove(x, y, player) {
        board[y][x] = player;
        drawStone(x, y, player);

        if (checkWinner(x, y, player)) {
            gameOver = true;
            statusElement.textContent = `${player === 1 ? 'あなた' : 'AI'}の勝ちです！`;
            return;
        }

        if (board.flat().every(cell => cell !== 0)) {
            gameOver = true;
            statusElement.textContent = '引き分けです！';
            return;
        }

        currentPlayer = (player === 1) ? 2 : 1;
        statusElement.textContent = (currentPlayer === 1) ? 'あなたの番です' : 'AIの番です...';

        if (!gameOver && currentPlayer === 2) {
            setTimeout(computerMove, 100);
        }
    }

    function checkWinner(x, y, player) {
        const directions = [
            { dx: 1, dy: 0 }, { dx: 0, dy: 1 },
            { dx: 1, dy: 1 }, { dx: 1, dy: -1 }
        ];

        for (const { dx, dy } of directions) {
            let count = 1;
            for (let i = 1; i < 5; i++) {
                const nx = x + i * dx, ny = y + i * dy;
                if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && board[ny][nx] === player) count++;
                else break;
            }
            for (let i = 1; i < 5; i++) {
                const nx = x - i * dx, ny = y - i * dy;
                if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && board[ny][nx] === player) count++;
                else break;
            }
            if (count >= 5) return true;
        }
        return false;
    }

    function computerMove() {
        if (gameOver) return;
        const bestMove = findBestMove();
        if (bestMove) {
            makeMove(bestMove.x, bestMove.y, 2);
        }
    }

    function findBestMove() {
        let bestScore = -Infinity;
        let move = null;
        const possibleMoves = getPossibleMoves();

        if (possibleMoves.length === 0) return null;
        if (possibleMoves.length === 1) return possibleMoves[0];

        const moveCandidates = [];
        for (const m of possibleMoves) {
            const { x, y } = m;
            board[y][x] = 2;
            moveCandidates.push({ move: m, score: evaluateBoard() });
            board[y][x] = 0;
        }

        moveCandidates.sort((a, b) => b.score - a.score);

        const topMoves = moveCandidates.slice(0, 10);

        for (const candidate of topMoves) {
            const { x, y } = candidate.move;
            board[y][x] = 2;
            let score = minimax(SEARCH_DEPTH, -Infinity, Infinity, false);
            board[y][x] = 0;

            if (score > bestScore) {
                bestScore = score;
                move = candidate.move;
            }
        }
        
        if (!move) {
            return possibleMoves[0];
        }

        return move;
    }

    function minimax(depth, alpha, beta, isMaximizingPlayer) {
        const score = evaluateBoard();

        if (depth === 0 || Math.abs(score) >= 1000000) {
            return score;
        }

        const possibleMoves = getPossibleMoves();
        if (possibleMoves.length === 0) {
            return 0;
        }

        if (isMaximizingPlayer) {
            let maxEval = -Infinity;
            for (const m of possibleMoves) {
                const { x, y } = m;
                board[y][x] = 2;
                let evalScore = minimax(depth - 1, alpha, beta, false);
                board[y][x] = 0;
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const m of possibleMoves) {
                const { x, y } = m;
                board[y][x] = 1;
                let evalScore = minimax(depth - 1, alpha, beta, true);
                board[y][x] = 0;
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    function getPossibleMoves() {
        const moves = [];
        const radius = 2;
        let hasStone = false;

        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                if (board[y][x] !== 0) {
                    hasStone = true;
                    for (let i = -radius; i <= radius; i++) {
                        for (let j = -radius; j <= radius; j++) {
                            const nx = x + j;
                            const ny = y + i;
                            if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && board[ny][nx] === 0) {
                                moves.push({ x: nx, y: ny });
                            }
                        }
                    }
                }
            }
        }
        if (!hasStone) {
             return [{ x: Math.floor(BOARD_SIZE/2), y: Math.floor(BOARD_SIZE/2)}];
        }
        return Array.from(new Set(moves.map(JSON.stringify))).map(JSON.parse);
    }

    function evaluateWindowScore(window) {
        let aiCount = window.filter(c => c === 2).length;
        let playerCount = window.filter(c => c === 1).length;
        let emptyCount = window.filter(c => c === 0).length;

        if (aiCount > 0 && playerCount > 0) return 0; // Mixed window

        if (aiCount === 5) return 1000000;
        if (playerCount === 5) return -1000000;

        // Defensive scores are higher than offensive scores
        if (playerCount === 4 && emptyCount === 1) return -100000;
        if (aiCount === 4 && emptyCount === 1) return 50000;

        if (playerCount === 3 && emptyCount === 2 && window[0] === 0 && window[4] === 0) return -10000;
        if (aiCount === 3 && emptyCount === 2 && window[0] === 0 && window[4] === 0) return 5000;

        if (playerCount === 3 && emptyCount === 2) return -100;
        if (aiCount === 3 && emptyCount === 2) return 100;

        if (playerCount === 2 && emptyCount === 3) return -10;
        if (aiCount === 2 && emptyCount === 3) return 10;

        return 0;
    }

    function evaluateBoard() {
        let totalScore = 0;

        // Horizontal check
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x <= BOARD_SIZE - 5; x++) {
                const window = board[y].slice(x, x + 5);
                totalScore += evaluateWindowScore(window);
            }
        }

        // Vertical check
        for (let x = 0; x < BOARD_SIZE; x++) {
            for (let y = 0; y <= BOARD_SIZE - 5; y++) {
                const window = [];
                for (let i = 0; i < 5; i++) window.push(board[y + i][x]);
                totalScore += evaluateWindowScore(window);
            }
        }

        // Diagonal (\) check
        for (let y = 0; y <= BOARD_SIZE - 5; y++) {
            for (let x = 0; x <= BOARD_SIZE - 5; x++) {
                const window = [];
                for (let i = 0; i < 5; i++) window.push(board[y + i][x + i]);
                totalScore += evaluateWindowScore(window);
            }
        }

        // Diagonal (/) check
        for (let y = 4; y < BOARD_SIZE; y++) {
            for (let x = 0; x <= BOARD_SIZE - 5; x++) {
                const window = [];
                for (let i = 0; i < 5; i++) window.push(board[y - i][x + i]);
                totalScore += evaluateWindowScore(window);
            }
        }

        return totalScore;
    }

    function restartGame() {
        board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
        currentPlayer = 1;
        gameOver = false;
        statusElement.textContent = 'あなたの番です';
        drawBoard();
    }

    drawBoard();
    canvas.addEventListener('click', handleCanvasClick);
    restartButton.addEventListener('click', restartGame);
});
