// Chess Game JavaScript
class ChessGame {
    constructor(boardId, isOnline = false) {
        this.boardId = boardId;
        this.isOnline = isOnline;
        this.board = [];
        this.selectedSquare = null;
        this.currentTurn = 'white';
        this.gameOver = false;
        this.capturedPieces = { white: [], black: [] };
        this.moveHistory = [];
        this.promotionPending = null;
        
        this.initializeBoard();
        this.renderBoard();
        this.bindEvents();
    }

    initializeBoard() {
        // Initialize empty board
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        
        // Place pieces
        const initialSetup = [
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'], // Black back rank
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'], // Black pawns
            [null, null, null, null, null, null, null, null], // Empty
            [null, null, null, null, null, null, null, null], // Empty
            [null, null, null, null, null, null, null, null], // Empty
            [null, null, null, null, null, null, null, null], // Empty
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'], // White pawns
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']  // White back rank
        ];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (initialSetup[row][col]) {
                    this.board[row][col] = {
                        type: initialSetup[row][col].toLowerCase(),
                        color: initialSetup[row][col] === initialSetup[row][col].toLowerCase() ? 'white' : 'black'
                    };
                }
            }
        }
    }

    renderBoard() {
        const boardElement = document.getElementById(this.boardId);
        boardElement.innerHTML = '';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                
                if (this.board[row][col]) {
                    const piece = document.createElement('div');
                    piece.className = `piece ${this.board[row][col].color}`;
                    piece.textContent = this.getPieceSymbol(this.board[row][col]);
                    square.appendChild(piece);
                }
                
                if (this.selectedSquare && this.selectedSquare.row === row && this.selectedSquare.col === col) {
                    square.classList.add('selected');
                }
                
                boardElement.appendChild(square);
            }
        }
    }

    getPieceSymbol(piece) {
        const symbols = {
            'k': '♔', 'q': '♕', 'r': '♖', 'b': '♗', 'n': '♘', 'p': '♙',
            'K': '♚', 'Q': '♛', 'R': '♜', 'B': '♝', 'N': '♞', 'P': '♟'
        };
        return symbols[piece.type.toUpperCase() + (piece.color === 'black' ? '' : '')] || '';
    }

    bindEvents() {
        const boardElement = document.getElementById(this.boardId);
        boardElement.addEventListener('click', (e) => {
            const square = e.target.closest('.square');
            if (!square) return;
            
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            
            this.handleSquareClick(row, col);
        });
    }

    handleSquareClick(row, col) {
        if (this.gameOver) return;
        
        const piece = this.board[row][col];
        
        if (this.selectedSquare) {
            // Try to move
            if (this.isValidMove(this.selectedSquare.row, this.selectedSquare.col, row, col)) {
                this.makeMove(this.selectedSquare.row, this.selectedSquare.col, row, col);
                this.selectedSquare = null;
                this.renderBoard();
                this.updateUI();
            } else {
                this.selectedSquare = null;
                this.renderBoard();
            }
        } else {
            // Select piece
            if (piece && piece.color === this.currentTurn) {
                this.selectedSquare = { row, col };
                this.renderBoard();
            }
        }
    }

    isValidMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        if (!piece) return false;
        
        // Basic validation - can be expanded
        if (fromRow === toRow && fromCol === toCol) return false;
        
        const targetPiece = this.board[toRow][toCol];
        if (targetPiece && targetPiece.color === piece.color) return false;
        
        // Simple move validation (not complete chess rules)
        switch (piece.type) {
            case 'p': // Pawn
                const direction = piece.color === 'white' ? -1 : 1;
                const startRow = piece.color === 'white' ? 6 : 1;
                
                if (fromCol === toCol && !targetPiece) {
                    if (toRow === fromRow + direction) return true;
                    if (fromRow === startRow && toRow === fromRow + 2 * direction && !this.board[fromRow + direction][fromCol]) return true;
                }
                if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction && targetPiece) return true;
                break;
                
            case 'r': // Rook
                if (fromRow === toRow || fromCol === toCol) {
                    return this.isPathClear(fromRow, fromCol, toRow, toCol);
                }
                break;
                
            case 'n': // Knight
                const knightMoves = [
                    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                    [1, -2], [1, 2], [2, -1], [2, 1]
                ];
                return knightMoves.some(([dr, dc]) => 
                    fromRow + dr === toRow && fromCol + dc === toCol
                );
                
            case 'b': // Bishop
                if (Math.abs(fromRow - toRow) === Math.abs(fromCol - toCol)) {
                    return this.isPathClear(fromRow, fromCol, toRow, toCol);
                }
                break;
                
            case 'q': // Queen
                if (fromRow === toRow || fromCol === toCol || 
                    Math.abs(fromRow - toRow) === Math.abs(fromCol - toCol)) {
                    return this.isPathClear(fromRow, fromCol, toRow, toCol);
                }
                break;
                
            case 'k': // King
                return Math.abs(fromRow - toRow) <= 1 && Math.abs(fromCol - toCol) <= 1;
        }
        
        return false;
    }

    isPathClear(fromRow, fromCol, toRow, toCol) {
        const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
        const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
        
        let r = fromRow + rowStep;
        let c = fromCol + colStep;
        
        while (r !== toRow || c !== toCol) {
            if (this.board[r][c]) return false;
            r += rowStep;
            c += colStep;
        }
        
        return true;
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];
        
        if (capturedPiece) {
            this.capturedPieces[capturedPiece.color].push(capturedPiece);
        }
        
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        // Pawn promotion
        if (piece.type === 'p' && (toRow === 0 || toRow === 7)) {
            this.showPromotionModal(toRow, toCol);
            return;
        }
        
        this.moveHistory.push({
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: piece,
            captured: capturedPiece
        });
        
        this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
        this.checkGameEnd();
    }

    showPromotionModal(row, col) {
        this.promotionPending = { row, col };
        document.getElementById('promotion-modal').classList.remove('hidden');
        
        document.querySelectorAll('.promotion-btn').forEach(btn => {
            btn.onclick = () => {
                const pieceType = btn.dataset.piece.toLowerCase();
                this.board[row][col].type = pieceType;
                document.getElementById('promotion-modal').classList.add('hidden');
                this.promotionPending = null;
                this.moveHistory.push({
                    from: this.moveHistory[this.moveHistory.length - 1].from,
                    to: { row, col },
                    piece: this.board[row][col],
                    promotion: true
                });
                this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
                this.renderBoard();
                this.updateUI();
            };
        });
    }

    checkGameEnd() {
        // Simple check - can be expanded
        const kingPositions = this.findKings();
        if (!kingPositions.white || !kingPositions.black) {
            this.gameOver = true;
            this.showGameOver('Checkmate!');
        }
    }

    findKings() {
        const kings = {};
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'k') {
                    kings[piece.color] = { row, col };
                }
            }
        }
        return kings;
    }

    showGameOver(message) {
        document.getElementById('game-over-title').textContent = 'Game Over';
        document.getElementById('game-over-message').textContent = message;
        document.getElementById('game-over-modal').classList.remove('hidden');
    }

    updateUI() {
        const turnIndicator = document.getElementById(this.isOnline ? 'turn-indicator' : 'offline-turn-indicator');
        const gameStatus = document.getElementById(this.isOnline ? 'game-status' : 'offline-game-status');
        
        turnIndicator.textContent = `${this.currentTurn.charAt(0).toUpperCase() + this.currentTurn.slice(1)}'s Turn`;
        gameStatus.textContent = this.gameOver ? 'Game Over' : '';
        
        this.updateCapturedPieces();
        this.updateMoveHistory();
    }

    updateCapturedPieces() {
        const whiteCaptured = document.getElementById(this.isOnline ? 'white-captured' : 'offline-white-captured');
        const blackCaptured = document.getElementById(this.isOnline ? 'black-captured' : 'offline-black-captured');
        
        whiteCaptured.innerHTML = this.capturedPieces.white.map(p => this.getPieceSymbol(p)).join('');
        blackCaptured.innerHTML = this.capturedPieces.black.map(p => this.getPieceSymbol(p)).join('');
    }

    updateMoveHistory() {
        const movesList = document.getElementById('moves-list');
        movesList.innerHTML = '';
        
        this.moveHistory.forEach((move, index) => {
            const moveElement = document.createElement('div');
            moveElement.textContent = `${Math.floor(index / 2) + 1}. ${this.formatMove(move)}`;
            movesList.appendChild(moveElement);
        });
    }

    formatMove(move) {
        const from = String.fromCharCode(97 + move.from.col) + (8 - move.from.row);
        const to = String.fromCharCode(97 + move.to.col) + (8 - move.to.row);
        return `${move.piece.type.toUpperCase()}${from}-${to}`;
    }
}

// Global variables
let offlineGame = null;
let onlineGame = null;

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Mode selection
    document.getElementById('offline-btn').addEventListener('click', () => {
        document.getElementById('mode-selection').classList.add('hidden');
        document.getElementById('offline-game').classList.remove('hidden');
        offlineGame = new ChessGame('offline-chess-board', false);
    });

    document.getElementById('online-btn').addEventListener('click', () => {
        document.getElementById('mode-selection').classList.add('hidden');
        document.getElementById('online-setup').classList.remove('hidden');
    });

    // Online setup
    document.getElementById('back-to-mode').addEventListener('click', () => {
        document.getElementById('online-setup').classList.add('hidden');
        document.getElementById('mode-selection').classList.remove('hidden');
    });

    // Game controls
    document.getElementById('offline-new-game-btn').addEventListener('click', () => {
        if (offlineGame) {
            offlineGame = new ChessGame('offline-chess-board', false);
        }
    });

    document.getElementById('game-over-new-game').addEventListener('click', () => {
        document.getElementById('game-over-modal').classList.add('hidden');
        if (offlineGame) {
            offlineGame = new ChessGame('offline-chess-board', false);
        }
    });

    document.getElementById('game-over-close').addEventListener('click', () => {
        document.getElementById('game-over-modal').classList.add('hidden');
    });

    // Placeholder for online functionality
    document.getElementById('create-room-btn').addEventListener('click', () => {
        alert('Online multiplayer not implemented yet. Please use offline mode.');
    });

    document.getElementById('join-room-btn').addEventListener('click', () => {
        alert('Online multiplayer not implemented yet. Please use offline mode.');
    });
});