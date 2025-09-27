document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('tetris');
    const context = canvas.getContext('2d');
    const nextCanvas = document.getElementById('next');
    const nextContext = nextCanvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const startButton = document.getElementById('start-button');
    const rankingList = document.getElementById('ranking-list');

    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 48;
    const NEXT_BLOCK_SIZE = 40;

    context.scale(BLOCK_SIZE, BLOCK_SIZE);
    nextContext.scale(NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE);

    let board = createBoard(ROWS, COLS);
    let score = 0;
    let dropCounter = 0;
    let dropInterval = 1000;
    let lastTime = 0;
    let animationFrameId;
    let lockTimeoutId = null;

    function startLockDelay() {
        cancelLockDelay(); // Ensure no other timer is running
        lockTimeoutId = setTimeout(() => {
            merge(board, player);
            playerReset();
            sweepBoard();
            updateScore();
            lockTimeoutId = null;
        }, 1000);
    }

    function cancelLockDelay() {
        if (lockTimeoutId) {
            clearTimeout(lockTimeoutId);
            lockTimeoutId = null;
        }
    }

    const COLORS = [
        null,
        '#FF0D72', // T
        '#0DC2FF', // O
        '#0DFF72', // L
        '#F538FF', // J
        '#FF8E0D', // I
        '#FFE138', // S
        '#3877FF', // Z
    ];

    const TETROMINOES = {
        'T': [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0],
        ],
        'O': [
            [2, 2],
            [2, 2],
        ],
        'L': [
            [0, 3, 0],
            [0, 3, 0],
            [0, 3, 3],
        ],
        'J': [
            [0, 4, 0],
            [0, 4, 0],
            [4, 4, 0],
        ],
        'I': [
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
        ],
        'S': [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0],
        ],
        'Z': [
            [7, 7, 0],
            [0, 7, 7],
            [0, 0, 0],
        ],
    };

    let player = {
        pos: { x: 0, y: 0 },
        matrix: null,
        next: null,
    };

    function createBoard(rows, cols) {
        const board = [];
        while (rows--) {
            board.push(new Array(cols).fill(0));
        }
        return board;
    }

    function createPiece(type) {
        return TETROMINOES[type];
    }

    function drawMatrix(matrix, offset, ctx = context) {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    ctx.fillStyle = COLORS[value];
                    ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
                }
            });
        });
    }

    function draw() {
        context.fillStyle = '#000';
        context.fillRect(0, 0, canvas.width, canvas.height);
        drawMatrix(board, { x: 0, y: 0 });
        drawMatrix(player.matrix, player.pos);
    }
    
    function drawNext() {
        nextContext.fillStyle = '#000';
        nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
        const matrix = player.next;
        const offset = {
            x: (nextCanvas.width / NEXT_BLOCK_SIZE - matrix[0].length) / 2,
            y: (nextCanvas.height / NEXT_BLOCK_SIZE - matrix.length) / 2,
        };
        drawMatrix(matrix, offset, nextContext);
    }

    function merge(board, player) {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[y + player.pos.y][x + player.pos.x] = value;
                }
            });
        });
    }

    function collide(board, player) {
        const [m, o] = [player.matrix, player.pos];
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                    (board[y + o.y] &&
                     board[y + o.y][x + o.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    function rotate(matrix, dir) {
        for (let y = 0; y < matrix.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
            }
        }
        if (dir > 0) {
            matrix.forEach(row => row.reverse());
        } else {
            matrix.reverse();
        }
    }

    function playerDrop() {
        if (lockTimeoutId) return; // Don't auto-drop while lock delay is active
        player.pos.y++;
        if (collide(board, player)) {
            player.pos.y--;
            startLockDelay();
        } else {
            dropCounter = 0;
        }
    }

    function playerMove(dir) {
        cancelLockDelay();
        player.pos.x += dir;
        if (collide(board, player)) {
            player.pos.x -= dir;
        }
        // Check if grounded after move to restart lock delay
        player.pos.y++;
        if (collide(board, player)) {
            startLockDelay();
        }
        player.pos.y--;
        draw(); // Redraw immediately after move
    }

    function playerReset() {
        cancelLockDelay();
        const pieces = 'TJLOSZI';
        if (!player.next) {
            player.matrix = createPiece(pieces[pieces.length * Math.random() | 0]);
            player.next = createPiece(pieces[pieces.length * Math.random() | 0]);
        } else {
            player.matrix = player.next;
            player.next = createPiece(pieces[pieces.length * Math.random() | 0]);
        }
        
        player.pos.y = 0;
        player.pos.x = (board[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);

        if (collide(board, player)) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            alert('ゲームオーバー');
            updateRanking(score);
            displayRanking();
            board.forEach(row => row.fill(0));
            score = 0;
            updateScore();
        }
        drawNext();
    }

    function playerRotate(dir) {
        cancelLockDelay();
        const pos = player.pos.x;
        let offset = 1;
        rotate(player.matrix, dir);
        while (collide(board, player)) {
            player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > player.matrix[0].length) {
                rotate(player.matrix, -dir);
                player.pos.x = pos;
                return;
            }
        }
        // Check if grounded after rotate to restart lock delay
        player.pos.y++;
        if (collide(board, player)) {
            startLockDelay();
        }
        player.pos.y--;
        draw(); // Redraw immediately after rotate
    }

    function sweepBoard() {
        let rowCount = 1;
        outer: for (let y = board.length - 1; y > 0; --y) {
            for (let x = 0; x < board[y].length; ++x) {
                if (board[y][x] === 0) {
                    continue outer;
                }
            }
            const row = board.splice(y, 1)[0].fill(0);
            board.unshift(row);
            ++y;

            score += rowCount * 10;
            rowCount *= 2;
        }
        // スコアに基づいて落下速度を更新
        if (score > 500) {
            dropInterval = 300;
        } else if (score > 300) {
            dropInterval = 400;
        } else if (score > 150) {
            dropInterval = 600;
        } else if (score > 50) {
            dropInterval = 800;
        }
    }

    function update(time = 0) {
        const deltaTime = time - lastTime;
        lastTime = time;

        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            playerDrop();
        }

        draw();
        animationFrameId = requestAnimationFrame(update);
    }
    
    function updateScore() {
        scoreElement.innerText = score;
    }

    function updateRanking(score) {
        const scores = JSON.parse(localStorage.getItem('tetrisScores')) || [];
        scores.push(score);
        scores.sort((a, b) => b - a);
        const newScores = scores.slice(0, 5);
        localStorage.setItem('tetrisScores', JSON.stringify(newScores));
    }

    function displayRanking() {
        const scores = JSON.parse(localStorage.getItem('tetrisScores')) || [];
        rankingList.innerHTML = '';
        scores.forEach(score => {
            const li = document.createElement('li');
            li.textContent = score;
            rankingList.appendChild(li);
        });
    }

    document.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') {
            playerMove(-1);
        } else if (event.key === 'ArrowRight') {
            playerMove(1);
        } else if (event.key === 'ArrowDown') {
            playerDrop();
        } else if (event.key === 'ArrowUp') {
            playerRotate(1);
        }
    });

    function startGame() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        cancelLockDelay();
        board = createBoard(ROWS, COLS);
        score = 0;
        dropInterval = 1000; // 速度をリセット
        updateScore();
        playerReset();
        update();
        startButton.textContent = 'リスタート';
    }

    startButton.addEventListener('click', startGame);

    displayRanking();
});