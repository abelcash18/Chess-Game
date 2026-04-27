// Modern Chess Game JavaScript
class ChessGame {
    constructor(boardId, isOffline = true) {
        this.boardId = boardId;
        this.isOffline = isOffline;
        this.board = [];
        this.selectedSquare = null;
        this.validMoves = [];
        this.currentTurn = 'white';
        this.gameOver = false;
        this.gameResult = null;
        this.capturedPieces = { white: [], black: [] };
        this.moveHistory = [];
        this.boardFlipped = false;
        this.soundEnabled = true;
        this.lastMove = null;

        this.initializeBoard();
        this.renderBoard();
        this.setupEventListeners();
        this.updateUI();
    }

    initializeBoard() {
        // Initialize empty board
        this.board = Array(8).fill().map(() => Array(8).fill(null));

        // Place pieces
        const initialSetup = [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = initialSetup[row][col];
                if (piece) {
                    this.board[row][col] = {
                        type: piece.toLowerCase(),
                        color: piece === piece.toUpperCase() ? 'white' : 'black'
                    };
                }
            }
        }
    }

    setupEventListeners() {
        const boardElement = document.getElementById(this.boardId);
        boardElement.addEventListener('click', (e) => this.handleSquareClick(e));
    }

    renderBoard() {
        const boardElement = document.getElementById(this.boardId);
        boardElement.innerHTML = '';

        let rows = Array.from({length: 8}, (_, i) => i);
        let cols = Array.from({length: 8}, (_, i) => i);

        if (this.boardFlipped) {
            rows.reverse();
            cols.reverse();
        }

        rows.forEach(row => {
            cols.forEach(col => {
                const square = document.createElement('div');
                const isLight = (row + col) % 2 === 0;
                square.className = `square ${isLight ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                // Check for valid moves
                const isValidMove = this.validMoves.some(m => m.row === row && m.col === col);
                const isValidCapture = isValidMove && this.board[row][col];
                if (isValidMove) {
                    square.classList.add(isValidCapture ? 'valid-capture' : 'valid-move');
                }

                // Check for selected square
                if (this.selectedSquare && this.selectedSquare.row === row && this.selectedSquare.col === col) {
                    square.classList.add('selected');
                }

                // Check for last move
                if (this.lastMove && ((this.lastMove.from.row === row && this.lastMove.from.col === col) ||
                    (this.lastMove.to.row === row && this.lastMove.to.col === col))) {
                    square.classList.add('last-move');
                }

                // Add piece
                if (this.board[row][col]) {
                    const piece = document.createElement('div');
                    piece.className = `piece ${this.board[row][col].color}`;
                    piece.textContent = this.getPieceSymbol(this.board[row][col]);
                    square.appendChild(piece);
                }

                // Check for check
                if (this.isInCheck(this.board[row][col]?.color)) {
                    const king = this.findKing(this.board[row][col]?.color);
                    if (king && king.row === row && king.col === col) {
                        square.classList.add('check');
                    }
                }

                boardElement.appendChild(square);
            });
        });
    }

    getPieceSymbol(piece) {
        const symbols = {
            'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
            'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙'
        };
        return symbols[piece.type.toUpperCase() + (piece.color === 'white' ? '' : '')] || '';
    }

    handleSquareClick(e) {
        const square = e.target.closest('.square');
        if (!square) return;

        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const piece = this.board[row][col];

        // If a valid move is available, move the piece
        if (this.validMoves.some(m => m.row === row && m.col === col)) {
            this.makeMove(this.selectedSquare.row, this.selectedSquare.col, row, col);
            this.selectedSquare = null;
            this.validMoves = [];
        } else if (piece && piece.color === this.currentTurn && !this.gameOver) {
            // Select a new piece
            this.selectedSquare = { row, col };
            this.validMoves = this.getValidMoves(row, col);
        } else {
            // Deselect
            this.selectedSquare = null;
            this.validMoves = [];
        }

        this.renderBoard();
    }

    getValidMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        const moves = [];
        const directions = {
            'p': this.getPawnMoves,
            'n': this.getKnightMoves,
            'b': this.getBishopMoves,
            'r': this.getRookMoves,
            'q': this.getQueenMoves,
            'k': this.getKingMoves
        };

        const getMoves = directions[piece.type];
        if (getMoves) {
            const candidateMoves = getMoves.call(this, row, col, piece.color);
            for (const move of candidateMoves) {
                if (this.isLegalMove(row, col, move.row, move.col)) {
                    moves.push(move);
                }
            }
        }

        return moves;
    }

    getPawnMoves(row, col, color) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;

        // Forward move
        const forwardRow = row + direction;
        if (forwardRow >= 0 && forwardRow < 8 && !this.board[forwardRow][col]) {
            moves.push({ row: forwardRow, col });

            // Double move from start
            if (row === startRow && !this.board[row + 2 * direction][col]) {
                moves.push({ row: row + 2 * direction, col });
            }
        }

        // Captures
        [-1, 1].forEach(colDir => {
            const captureCol = col + colDir;
            const captureRow = row + direction;
            if (captureCol >= 0 && captureCol < 8 && captureRow >= 0 && captureRow < 8) {
                const target = this.board[captureRow][captureCol];
                if (target && target.color !== color) {
                    moves.push({ row: captureRow, col: captureCol });
                }
            }
        });

        return moves;
    }

    getKnightMoves(row, col, color) {
        const moves = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        knightMoves.forEach(([dr, dc]) => {
            const newRow = row + dr;
            const newCol = col + dc;
            if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                const target = this.board[newRow][newCol];
                if (!target || target.color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        });

        return moves;
    }

    getBishopMoves(row, col, color) {
        const moves = [];
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        this.addSlidingMoves(row, col, color, directions, moves);
        return moves;
    }

    getRookMoves(row, col, color) {
        const moves = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        this.addSlidingMoves(row, col, color, directions, moves);
        return moves;
    }

    getQueenMoves(row, col, color) {
        const moves = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];
        this.addSlidingMoves(row, col, color, directions, moves);
        return moves;
    }

    getKingMoves(row, col, color) {
        const moves = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const newRow = row + dr;
                const newCol = col + dc;
                if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                    const target = this.board[newRow][newCol];
                    if (!target || target.color !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            }
        }
        return moves;
    }

    addSlidingMoves(row, col, color, directions, moves) {
        directions.forEach(([dr, dc]) => {
            let newRow = row + dr;
            let newCol = col + dc;
            while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                const target = this.board[newRow][newCol];
                if (!target) {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (target.color !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break;
                }
                newRow += dr;
                newCol += dc;
            }
        });
    }

    isLegalMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const target = this.board[toRow][toCol];

        // Simulate move
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        const isLegal = !this.isInCheck(piece.color);

        // Undo simulation
        this.board[fromRow][fromCol] = piece;
        this.board[toRow][toCol] = target;

        return isLegal;
    }

    isInCheck(color) {
        const king = this.findKing(color);
        if (!king) return false;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color !== color) {
                    const moves = this.getValidMovesWithoutCheckValidation(row, col);
                    if (moves.some(m => m.row === king.row && m.col === king.col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    getValidMovesWithoutCheckValidation(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        const directions = {
            'p': this.getPawnMoves,
            'n': this.getKnightMoves,
            'b': this.getBishopMoves,
            'r': this.getRookMoves,
            'q': this.getQueenMoves,
            'k': this.getKingMoves
        };

        const getMoves = directions[piece.type];
        return getMoves ? getMoves.call(this, row, col, piece.color) : [];
    }

    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'k' && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];

        if (capturedPiece) {
            this.capturedPieces[capturedPiece.color].push(capturedPiece);
        }

        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        this.lastMove = {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol }
        };

        // Pawn promotion
        if (piece.type === 'p' && (toRow === 0 || toRow === 7)) {
            this.showPromotionModal(toRow, toCol);
            return;
        }

        this.addMoveToHistory(fromRow, fromCol, toRow, toCol, piece, capturedPiece);
        this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
        this.checkGameEnd();
        this.updateUI();
        this.playSound('move');
    }

    showPromotionModal(row, col) {
        const modal = document.getElementById('promotion-modal');
        modal.classList.remove('hidden');

        document.querySelectorAll('.promotion-btn').forEach(btn => {
            btn.onclick = () => {
                const pieceType = btn.dataset.piece;
                this.board[row][col].type = pieceType;
                modal.classList.add('hidden');

                const fromRow = this.lastMove.from.row;
                const fromCol = this.lastMove.from.col;
                const capturedPiece = this.moveHistory[this.moveHistory.length - 1]?.captured;

                this.addMoveToHistory(fromRow, fromCol, row, col, this.board[row][col], capturedPiece);
                this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
                this.checkGameEnd();
                this.updateUI();
                this.playSound('promotion');
            };
        });
    }

    addMoveToHistory(fromRow, fromCol, toRow, toCol, piece, capturedPiece) {
        const moveNotation = this.formatMove(fromRow, fromCol, toRow, toCol, piece, capturedPiece);
        this.moveHistory.push({
            notation: moveNotation,
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: piece,
            captured: capturedPiece
        });
    }

    formatMove(fromRow, fromCol, toRow, toCol, piece, capturedPiece) {
        const fromSquare = String.fromCharCode(97 + fromCol) + (8 - fromRow);
        const toSquare = String.fromCharCode(97 + toCol) + (8 - toRow);
        const capture = capturedPiece ? 'x' : '';
        const pieceSymbol = piece.type === 'p' ? '' : piece.type.toUpperCase();
        return `${pieceSymbol}${fromSquare}${capture}${toSquare}`;
    }

    checkGameEnd() {
        const inCheck = this.isInCheck(this.currentTurn);
        const hasValidMoves = this.hasValidMoves(this.currentTurn);

        if (!hasValidMoves) {
            if (inCheck) {
                this.gameOver = true;
                this.gameResult = `Checkmate! ${this.currentTurn === 'white' ? 'Black' : 'White'} wins!`;
                this.showGameResult();
            } else {
                this.gameOver = true;
                this.gameResult = 'Stalemate! Draw!';
                this.showGameResult();
            }
        } else if (inCheck) {
            this.showGameMessage(`Check! ${this.currentTurn.charAt(0).toUpperCase() + this.currentTurn.slice(1)} in check!`);
        }
    }

    hasValidMoves(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const moves = this.getValidMoves(row, col);
                    if (moves.length > 0) return true;
                }
            }
        }
        return false;
    }

    showGameMessage(message) {
        const statusElement = document.getElementById('offline-game-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    showGameResult() {
        const modal = document.getElementById('game-result-modal');
        const title = modal.querySelector('#result-title');
        const message = modal.querySelector('#result-message');

        title.textContent = this.gameResult.includes('Checkmate') ? 'Checkmate!' : 'Stalemate!';
        message.textContent = this.gameResult;
        modal.classList.remove('hidden');

        document.getElementById('result-new-game-btn').onclick = () => this.resetGame();
        document.getElementById('result-back-btn').onclick = () => this.backToMenu();
    }

    resetGame() {
        document.getElementById('game-result-modal').classList.add('hidden');
        this.board = [];
        this.selectedSquare = null;
        this.validMoves = [];
        this.currentTurn = 'white';
        this.gameOver = false;
        this.gameResult = null;
        this.capturedPieces = { white: [], black: [] };
        this.moveHistory = [];
        this.lastMove = null;

        this.initializeBoard();
        this.renderBoard();
        this.updateUI();
    }

    backToMenu() {
        document.getElementById('game-result-modal').classList.add('hidden');
        document.getElementById('offline-game').classList.add('hidden');
        document.getElementById('mode-selection').classList.remove('hidden');
        this.resetGame();
    }

    undoMove() {
        if (this.moveHistory.length === 0) return;

        const lastMove = this.moveHistory.pop();
        this.board[lastMove.from.row][lastMove.from.col] = lastMove.piece;
        this.board[lastMove.to.row][lastMove.to.col] = lastMove.captured || null;

        if (lastMove.captured) {
            const capturedList = this.capturedPieces[lastMove.captured.color];
            capturedList.pop();
        }

        this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
        this.gameOver = false;
        this.gameResult = null;
        this.lastMove = this.moveHistory[this.moveHistory.length - 1] || null;

        this.selectedSquare = null;
        this.validMoves = [];
        this.renderBoard();
        this.updateUI();
        this.playSound('move');
    }

    flipBoard() {
        this.boardFlipped = !this.boardFlipped;
        this.renderBoard();
    }

    updateUI() {
        // Update turn indicator
        const turnWhiteBlack = this.currentTurn === 'white' ? 'offline-turn-indicator-white' : 'offline-turn-indicator-black';
        const turnOther = this.currentTurn === 'white' ? 'offline-turn-indicator-black' : 'offline-turn-indicator-white';

        const whiteEl = document.getElementById('offline-turn-indicator-white');
        const blackEl = document.getElementById('offline-turn-indicator-black');

        if (whiteEl) whiteEl.textContent = this.currentTurn === 'white' ? 'Your Turn' : 'Waiting...';
        if (blackEl) blackEl.textContent = this.currentTurn === 'black' ? 'Your Turn' : 'Waiting...';

        // Update move count
        const moveCountEl = document.getElementById('move-count');
        if (moveCountEl) {
            moveCountEl.textContent = Math.floor(this.moveHistory.length / 2);
        }

        // Update captured pieces
        this.updateCapturedPieces();
        this.updateMoveHistory();

        // Update game status
        const statusEl = document.getElementById('offline-game-status');
        if (statusEl && !this.gameResult) {
            statusEl.textContent = '';
        }
    }

    updateCapturedPieces() {
        const whiteCaptured = document.getElementById('offline-white-captured');
        const blackCaptured = document.getElementById('offline-black-captured');

        if (whiteCaptured) {
            whiteCaptured.innerHTML = this.capturedPieces.white
                .map(p => this.getPieceSymbol(p))
                .join('');
        }
        if (blackCaptured) {
            blackCaptured.innerHTML = this.capturedPieces.black
                .map(p => this.getPieceSymbol(p))
                .join('');
        }
    }

    updateMoveHistory() {
        const historyEl = document.getElementById('move-history');
        if (!historyEl) return;

        historyEl.innerHTML = '';
        this.moveHistory.forEach((move, index) => {
            const moveEl = document.createElement('div');
            moveEl.className = 'move-item';
            const moveNumber = Math.floor(index / 2) + 1;
            const isWhiteMove = index % 2 === 0;
            moveEl.textContent = `${isWhiteMove ? moveNumber + '.' : ''} ${move.notation}`;
            historyEl.appendChild(moveEl);
        });
    }

    playSound(type) {
        if (!this.soundEnabled) return;
        // Add sound effects if needed
        // This can be enhanced with actual audio files
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const btn = document.getElementById('sound-toggle-btn');
        if (btn) {
            btn.textContent = this.soundEnabled ? '🔊' : '🔇';
        }
    }
}

// Global game instance
let game = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    // Mode selection
    document.getElementById('offline-btn').addEventListener('click', () => {
        document.getElementById('mode-selection').classList.add('hidden');
        document.getElementById('offline-game').classList.remove('hidden');
        game = new ChessGame('offline-chess-board', true);
    });

    // Back button
    document.getElementById('back-btn').addEventListener('click', () => {
        document.getElementById('offline-game').classList.add('hidden');
        document.getElementById('mode-selection').classList.remove('hidden');
    });

    // Game controls
    document.getElementById('offline-new-game-btn').addEventListener('click', () => {
        if (game) game.resetGame();
    });

    document.getElementById('undo-btn').addEventListener('click', () => {
        if (game) game.undoMove();
    });

    document.getElementById('flip-board-btn').addEventListener('click', () => {
        if (game) game.flipBoard();
    });

    document.getElementById('sound-toggle-btn').addEventListener('click', () => {
        if (game) game.toggleSound();
    });

    document.getElementById('offline-resign-btn').addEventListener('click', () => {
        if (game && !game.gameOver) {
            game.gameResult = `${game.currentTurn === 'white' ? 'Black' : 'White'} wins by resignation!`;
            game.gameOver = true;
            game.showGameResult();
        }
    });

    // Modal close handlers
    document.getElementById('result-new-game-btn').addEventListener('click', () => {
        if (game) game.resetGame();
    });

    document.getElementById('result-back-btn').addEventListener('click', () => {
        if (game) game.backToMenu();
    });
});
