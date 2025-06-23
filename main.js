// 游戏配置
const DIFFICULTY_SETTINGS = {
    easy: { rows: 8, cols: 8, mines: 10 },
    medium: { rows: 12, cols: 12, mines: 20 },
    hard: { rows: 16, cols: 16, mines: 40 }
};

// 游戏状态
let gameState = {
    difficulty: 'easy',
    board: [],
    revealed: 0,
    flagged: 0,
    mines: 0,
    gameOver: false,
    gameWon: false,
    startTime: null,
    timerInterval: null
};

// DOM元素
const gameBoard = document.getElementById('game-board');
const timerDisplay = document.getElementById('timer');
const minesLeftDisplay = document.getElementById('mines-left');
const gameStatus = document.getElementById('game-status');
const restartBtn = document.getElementById('restart');
const difficultyBtns = document.querySelectorAll('.difficulty-btn');
const leaderboard = document.getElementById('leaderboard');
const touchMenu = document.getElementById('touch-menu');
let touchStartCell = null;
let selectedAction = null;

// 音效
const clickSound = document.getElementById('click-sound');
const explosionSound = document.getElementById('explosion-sound');
const winSound = document.getElementById('win-sound');

// 初始化游戏
function initGame() {
    clearInterval(gameState.timerInterval);
    timerDisplay.textContent = '00:00';
    
    const { rows, cols, mines } = DIFFICULTY_SETTINGS[gameState.difficulty];
    gameState = {
        ...gameState,
        board: createBoard(rows, cols, mines),
        revealed: 0,
        flagged: 0,
        mines,
        gameOver: false,
        gameWon: false,
        startTime: null
    };
    
    minesLeftDisplay.textContent = mines;
    gameStatus.textContent = '点击格子开始游戏';
    gameStatus.className = 'mt-4 text-xl font-bold text-center';
    
    renderBoard();
    updateLeaderboard();
}

// 创建游戏板
function createBoard(rows, cols, mines) {
    const board = Array(rows).fill().map(() => Array(cols).fill(0));
    
    // 随机放置地雷
    let minesPlaced = 0;
    while (minesPlaced < mines) {
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);
        
        if (board[row][col] !== -1) {
            board[row][col] = -1; // -1 表示地雷
            minesPlaced++;
            
            // 更新周围格子的数字
            for (let r = Math.max(0, row-1); r <= Math.min(rows-1, row+1); r++) {
                for (let c = Math.max(0, col-1); c <= Math.min(cols-1, col+1); c++) {
                    if (board[r][c] !== -1) {
                        board[r][c]++;
                    }
                }
            }
        }
    }
    
    return board;
}

// 渲染游戏板
function renderBoard() {
    gameBoard.innerHTML = '';
    const { rows, cols } = DIFFICULTY_SETTINGS[gameState.difficulty];
    
    // 设置网格布局
    gameBoard.className = `grid gap-1 bg-gray-300 p-2 rounded-lg`;
    gameBoard.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-gray-300 border border-gray-400 rounded cursor-pointer font-bold text-center shadow-sm';
            cell.dataset.row = r;
            cell.dataset.col = c;
            
            // 添加触摸和点击事件
            cell.addEventListener('click', () => revealCell(r, c));
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                flagCell(r, c);
            });
            
            // 移动端触摸事件
            cell.addEventListener('touchstart', handleTouchStart, { passive: false });
            cell.addEventListener('touchmove', handleTouchMove, { passive: false });
            cell.addEventListener('touchend', handleTouchEnd, { passive: false });
            
            gameBoard.appendChild(cell);
        }
    }
}

// 触摸事件处理
function handleTouchStart(e) {
    e.preventDefault();
    const cell = e.target;
    touchStartCell = {
        row: parseInt(cell.dataset.row),
        col: parseInt(cell.dataset.col),
        element: cell
    };
    
    // 显示触摸菜单
    showTouchMenu(e.touches[0].clientX, e.touches[0].clientY);
}

function handleTouchMove(e) {
    if (!touchMenu || touchMenu.classList.contains('hidden')) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const menuRect = touchMenu.getBoundingClientRect();
    
    // 检测触摸点是否在菜单选项上
    const options = touchMenu.querySelectorAll('.option');
    selectedAction = null;
    
    options.forEach(option => {
        option.classList.remove('bg-blue-100');
        const optionRect = option.getBoundingClientRect();
        
        if (touch.clientY >= optionRect.top && touch.clientY <= optionRect.bottom) {
            option.classList.add('bg-blue-100');
            selectedAction = option.dataset.action;
        }
    });
}

// 修改触摸结束函数，确保菜单能正确显示
function handleTouchEnd(e) {
    e.preventDefault();
    
    if (touchStartCell && selectedAction) {
        // 执行选中的操作
        if (selectedAction === 'reveal') {
            revealCell(touchStartCell.row, touchStartCell.col);
        } else if (selectedAction === 'flag') {
            flagCell(touchStartCell.row, touchStartCell.col);
        }
        
        // 震动反馈
        if (navigator.vibrate) navigator.vibrate(30);
    } else if (touchStartCell) {
        // 如果没有选择操作，但已经开始触摸，则显示菜单
        showTouchMenu(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }
    
    // 重置状态
    hideTouchMenu();
    touchStartCell = null;
    selectedAction = null;
}

// 修改触摸菜单显示函数
function showTouchMenu(x, y) {
    // 确保菜单在视口范围内
    const menuWidth = 120;
    const menuHeight = 96; // 两个选项的高度
    
    let adjustedX = x;
    let adjustedY = y;
    
    // 防止菜单超出屏幕右侧
    if (x + menuWidth > window.innerWidth) {
        adjustedX = window.innerWidth - menuWidth - 10;
    }
    
    // 防止菜单超出屏幕底部
    if (y + menuHeight > window.innerHeight) {
        adjustedY = window.innerHeight - menuHeight - 10;
    }
    
    touchMenu.style.left = `${adjustedX}px`;
    touchMenu.style.top = `${adjustedY}px`;
    touchMenu.classList.remove('hidden');
    
    // 添加动画效果
    touchMenu.style.transform = 'scale(0.8)';
    touchMenu.style.opacity = '0';
    
    setTimeout(() => {
        touchMenu.style.transition = 'all 0.2s ease';
        touchMenu.style.transform = 'scale(1)';
        touchMenu.style.opacity = '1';
    }, 10);
}

// 隐藏触摸菜单
function hideTouchMenu() {
    touchMenu.style.transition = 'all 0.2s ease';
    touchMenu.style.transform = 'scale(0.8)';
    touchMenu.style.opacity = '0';
    
    setTimeout(() => {
        touchMenu.classList.add('hidden');
        // 移除高亮
        const options = touchMenu.querySelectorAll('.option');
        options.forEach(option => option.classList.remove('bg-blue-100'));
    }, 200);
}

// 翻开格子
function revealCell(row, col) {
    if (gameState.gameOver || gameState.gameWon) return;
    
    // 开始计时
    if (!gameState.startTime) {
        gameState.startTime = new Date();
        gameState.timerInterval = setInterval(updateTimer, 1000);
    }
    
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    
    // 已标记或已翻开的格子不处理
    if (cell.classList.contains('revealed') || cell.classList.contains('flagged')) return;
    
    // 播放音效
    clickSound.currentTime = 0;
    clickSound.play().catch(e => console.log("Audio play failed:", e));
    
    cell.classList.add('revealed');
    
    if (gameState.board[row][col] === -1) { // 踩到地雷
        cell.innerHTML = '💣';
        cell.classList.add('bg-red-500');
        gameOver(false);
    } else if (gameState.board[row][col] > 0) { // 数字格子
        cell.textContent = gameState.board[row][col];
        cell.classList.add(`text-blue-${700 + gameState.board[row][col]*100}`, 'bg-blue-50'); // 改为浅蓝色背景
        gameState.revealed++;
    } else { // 空白格子
        cell.classList.add('bg-white'); // 改为纯白色背景
        gameState.revealed++;
        
        // 递归翻开周围的空白格子
        for (let r = Math.max(0, row-1); r <= Math.min(gameState.board.length-1, row+1); r++) {
            for (let c = Math.max(0, col-1); c <= Math.min(gameState.board[0].length-1, col+1); c++) {
                if (!document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`).classList.contains('revealed')) {
                    revealCell(r, c);
                }
            }
        }
    }
    
    // 检查是否获胜
    const totalCells = gameState.board.length * gameState.board[0].length;
    if (gameState.revealed === totalCells - gameState.mines) {
        gameOver(true);
    }
}

// 标记格子
function flagCell(row, col) {
    if (gameState.gameOver || gameState.gameWon) return;
    
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    
    if (cell.classList.contains('revealed')) return;
    
    if (cell.classList.contains('flagged')) {
        cell.innerHTML = '';
        cell.classList.remove('flagged', 'bg-yellow-300');
        gameState.flagged--;
    } else {
        cell.innerHTML = '🚩';
        cell.classList.add('flagged', 'bg-yellow-300');
        gameState.flagged++;
    }
    
    minesLeftDisplay.textContent = gameState.mines - gameState.flagged;
    
    // 震动反馈
    if (navigator.vibrate) navigator.vibrate(30);
}

// 更新计时器
function updateTimer() {
    if (!gameState.startTime) return;
    
    const now = new Date();
    const diff = Math.floor((now - gameState.startTime) / 1000);
    const minutes = Math.floor(diff / 60).toString().padStart(2, '0');
    const seconds = (diff % 60).toString().padStart(2, '0');
    
    timerDisplay.textContent = `${minutes}:${seconds}`;
}

// 游戏结束
function gameOver(isWin) {
    clearInterval(gameState.timerInterval);
    gameState.gameOver = true;
    
    if (isWin) {
        gameState.gameWon = true;
        gameStatus.textContent = '恭喜你赢了！🎉';
        gameStatus.classList.add('text-green-600');
        winSound.play().catch(e => console.log("Audio play failed:", e));
        
        // 保存到排行榜
        saveToLeaderboard();
    } else {
        gameStatus.textContent = '游戏结束！💥';
        gameStatus.classList.add('text-red-600');
        explosionSound.play().catch(e => console.log("Audio play failed:", e));
        
        // 显示所有地雷
        for (let r = 0; r < gameState.board.length; r++) {
            for (let c = 0; c < gameState.board[0].length; c++) {
                if (gameState.board[r][c] === -1) {
                    const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
                    if (!cell.classList.contains('flagged')) {
                        cell.innerHTML = '💣';
                        cell.classList.add('revealed', 'bg-red-200');
                    }
                }
            }
        }
    }
}

// 保存到排行榜
function saveToLeaderboard() {
    if (!gameState.gameWon) return;
    
    const time = timerDisplay.textContent;
    const difficulty = gameState.difficulty;
    const now = new Date().toLocaleDateString('zh-CN');
    
    const entry = {
        difficulty,
        time,
        date: now
    };
    
    // 获取现有排行榜
    const leaderboardData = JSON.parse(localStorage.getItem('minesweeperLeaderboard') || '[]');
    
    // 添加新记录
    leaderboardData.push(entry);
    
    // 按时间排序（升序）
    leaderboardData.sort((a, b) => {
        const [aMin, aSec] = a.time.split(':').map(Number);
        const [bMin, bSec] = b.time.split(':').map(Number);
        return (aMin * 60 + aSec) - (bMin * 60 + bSec);
    });
    
    // 只保留前10名
    if (leaderboardData.length > 10) {
        leaderboardData.splice(10);
    }
    
    // 保存回localStorage
    localStorage.setItem('minesweeperLeaderboard', JSON.stringify(leaderboardData));
    
    // 更新排行榜显示
    updateLeaderboard();
}

// 更新排行榜显示
function updateLeaderboard() {
    const leaderboardData = JSON.parse(localStorage.getItem('minesweeperLeaderboard') || '[]');
    
    // 按难度分组
    const byDifficulty = {
        easy: leaderboardData.filter(e => e.difficulty === 'easy'),
        medium: leaderboardData.filter(e => e.difficulty === 'medium'),
        hard: leaderboardData.filter(e => e.difficulty === 'hard')
    };
    
    leaderboard.innerHTML = '';
    
    // 为每个难度创建排行榜
    for (const [diff, entries] of Object.entries(byDifficulty)) {
        const diffName = {
            easy: '简单',
            medium: '中等',
            hard: '困难'
        }[diff];
        
        const diffColor = {
            easy: 'green',
            medium: 'yellow',
            hard: 'red'
        }[diff];
        
        const section = document.createElement('div');
        section.className = 'bg-white rounded-lg shadow p-3';
        section.innerHTML = `
            <h3 class="text-lg font-bold mb-2 text-${diffColor}-600">${diffName}难度</h3>
            <ul class="space-y-1">
                ${entries.length > 0 
                    ? entries.map((e, i) => 
                        `<li class="flex justify-between">
                            <span>${i+1}. ${e.time}</span>
                            <span class="text-gray-500 text-sm">${e.date}</span>
                        </li>`
                      ).join('')
                    : '<li class="text-gray-500 text-center">暂无记录</li>'
                }
            </ul>
        `;
        
        leaderboard.appendChild(section);
    }
}

// 事件监听
restartBtn.addEventListener('click', initGame);

difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        gameState.difficulty = btn.dataset.difficulty;
        difficultyBtns.forEach(b => b.classList.remove('ring-2', 'ring-offset-2', 'ring-black'));
        btn.classList.add('ring-2', 'ring-offset-2', 'ring-black');
        initGame();
    });
});

// 初始化游戏
initGame();
updateLeaderboard();

// 设置默认难度按钮高亮
document.querySelector(`.difficulty-btn[data-difficulty="easy"]`).classList.add('ring-2', 'ring-offset-2', 'ring-black');

// 在文件末尾添加z-index提升