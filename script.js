const cells = document.querySelectorAll('.cell');
const message = document.getElementById('message');
const restartBtn = document.getElementById('restart');
const modeSelect = document.getElementById('mode');
const difficultySelect = document.getElementById('difficulty');
const difficultyLabel = document.getElementById('difficulty-label');

let board = ["","","","","","","","",""];
let player = "X"; 
let computer = "O";
let currentPlayer = "X"; 
let gameOver = false;
let mode = '1p'; 
let difficulty = 'hard';

const winningCombinations = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

modeSelect.addEventListener('change', () => {
  mode = modeSelect.value;
  difficultyLabel.style.display = mode === '1p' ? 'inline' : 'none';
  restartGame();
});

difficultySelect.addEventListener('change', () => {
  difficulty = difficultySelect.value;
});

function checkWinner(b, p) {
  return winningCombinations.some(combo => combo.every(i => b[i] === p));
}

function checkDraw(b) {
  return b.every(cell => cell !== "");
}

function highlightWinner(p) {
  winningCombinations.forEach(combo => {
    if(combo.every(i => board[i] === p)){
      combo.forEach(i => cells[i].classList.add('winning-cell'));
    }
  });
}

function minimax(newBoard, isMaximizing) {
  if(checkWinner(newBoard, computer)) return {score: 1};
  if(checkWinner(newBoard, player)) return {score: -1};
  if(checkDraw(newBoard)) return {score: 0};

  let moves = [];
  newBoard.forEach((cell, i) => {
    if(cell === ""){
      let move = {};
      move.index = i;
      newBoard[i] = isMaximizing ? computer : player;
      let result = minimax(newBoard, !isMaximizing);
      move.score = result.score;
      newBoard[i] = "";
      moves.push(move);
    }
  });

  let bestMove;
  if(isMaximizing){
    let bestScore = -Infinity;
    moves.forEach(m => { if(m.score > bestScore){ bestScore = m.score; bestMove = m; }});
  } else {
    let bestScore = Infinity;
    moves.forEach(m => { if(m.score < bestScore){ bestScore = m.score; bestMove = m; }});
  }
  return bestMove;
}

function computerMoveAI() {
  let index;
  const available = board.map((v,i) => v === "" ? i : null).filter(v=>v!==null);
  
  if(difficulty === 'easy') {
    index = available[Math.floor(Math.random() * available.length)];
  } else if(difficulty === 'medium') {
    index = Math.random() < 0.5 ? 
      available[Math.floor(Math.random() * available.length)] : 
      minimax([...board], true).index;
  } else {
    index = minimax([...board], true).index;
  }

  board[index] = computer;
  cells[index].textContent = computer;

  if(checkWinner(board, computer)){
    message.textContent = "Computer Wins!";
    highlightWinner(computer);
    gameOver = true;
    return;
  }
  if(checkDraw(board)){
    message.textContent = "It's a Draw!";
    gameOver = true;
    return;
  }
  message.textContent = "Your turn: X";
}

cells.forEach(cell => {
  cell.addEventListener('click', () => {
    const index = cell.getAttribute('data-index');
    if(board[index] !== "" || gameOver) return;

    if(mode === '1p'){
      board[index] = player;
      cell.textContent = player;

      if(checkWinner(board, player)){
        message.textContent = "You Win!";
        highlightWinner(player);
        gameOver = true;
        return;
      }
      if(checkDraw(board)){
        message.textContent = "It's a Draw!";
        gameOver = true;
        return;
      }
      message.textContent = "Computer is thinking...";
      setTimeout(computerMoveAI, 500);

    } else {
      // 2-player mode
      board[index] = currentPlayer;
      cell.textContent = currentPlayer;

      if(checkWinner(board, currentPlayer)){
        message.textContent = `${currentPlayer} Wins!`;
        highlightWinner(currentPlayer);
        gameOver = true;
        return;
      }
      if(checkDraw(board)){
        message.textContent = "It's a Draw!";
        gameOver = true;
        return;
      }

      currentPlayer = currentPlayer === "X" ? "O" : "X";
      message.textContent = `${currentPlayer}'s turn`;
    }
  });
});

function restartGame() {
  board = ["","","","","","","","",""];
  cells.forEach(cell => {
    cell.textContent = "";
    cell.classList.remove('winning-cell');
  });
  gameOver = false;
  currentPlayer = "X";
  message.textContent = mode === '1p' ? "Your turn: X" : "X's turn";
}

restartBtn.addEventListener('click', restartGame);
