const boardEl = document.querySelector("#board");
const autoPlayButton = document.querySelector("#autoPlayButton");

let board;
let gameOver;
let resetButton;

let isAutoPlaying = false;
let autoPlayTimer = null;

function render(){
  boardEl.innerHTML = "";
  for (let row = 0; row < board.length; row++){
    for (let col = 0; col < board[row].length; col++){
      const cell = document.createElement("div");
      cell.className = "cell";
      const value = board[row][col];
      cell.textContent = value !== 0 ? value : "";
      cell.dataset.value = value;

      boardEl.appendChild(cell);
    }
  }
}//负责显示到浏览器


function moveLeft(){
  for (let row = 0; row < board.length; row++){
    let nonZero = board[row].filter(i => i!==0);

    for(let i = 0; i < nonZero.length - 1; i++){
      if (nonZero[i] === nonZero[i + 1]){
        nonZero[i] *= 2 ;
        nonZero[i + 1] = 0;
        i++
      }
    }

    let merged = nonZero.filter(i => i !== 0);
    while(merged.length < board[row].length) merged.push(0);

    board[row] =  merged;
  }
} //2048左逻辑,可多次复用

function flipHorizontal(){
  for (let row = 0; row < board.length; row++) {
    let newRow = [];

    for (let col = board[row].length - 1; col >= 0; col--){
      newRow.push(board[row][col]);
    }

    board[row] = newRow;
  }
}//将board左右翻转

function transpose(){
  if (board.length === 0 || board.length !== board[0].length) return; //防御性编程这一块
  let newBoard = [];

  for (let row = 0; row < board.length; row++){
    let newRow = [];

    for(let col = 0; col < board[row].length; col++){
      newRow.push(board[col][row]);
    }
    
    newBoard.push(newRow);
  }
  
  board = newBoard;
}//将board转置,行列对换

function moveRight(){
  flipHorizontal();
  moveLeft();
  flipHorizontal();
}//右,偷懒这一块

function moveUp(){
  transpose();
  moveLeft();
  transpose();
}//上

function moveDown(){
  transpose();
  flipHorizontal();
  moveLeft();
  flipHorizontal();
  transpose();
}//下

function hasEmptyCells(){
  return board.some(row => row.some(cell => cell ===0));
}//是否有空位

function getEmptyCells(){
  let empty = [];
  for (let row = 0; row < board.length; row++){
    for (let col = 0; col < board[row].length; col++){
      if (board[row][col] ===0) empty.push([row,col]);
    }
  }
  return empty;
}//获取空位数组位置

function spawnNumber(){
  let emptyCells = getEmptyCells();
  if (emptyCells.length === 0) return;//保护作用,防止emptyCells不合法
  let index = Math.floor(Math.random() * emptyCells.length);
  let cell = emptyCells[index];
  let row = cell[0];
  let col = cell[1];//这么做的原因是emptyCells是二维数组
  if (Math.random() < 0.9) board[row][col] = 2;
  else board[row][col] = 4;
}//生成随机数字

function copyBoard(){
  return board.map(row => [...row]);
}//棋盘复制

function boardEqual(a, b){
  return a.every((row, rowIndex) => row.every((cell, colIndex) => cell === b[rowIndex][colIndex]));
}//检测棋盘是否相等

function createBoard() {
  let size = 4;//暂时硬编码
  let tempBoard = [];

  for (let row = 0; row < size; row++){
    let newRow = [];
    for (let col = 0; col < size; col++){
      newRow.push(0);
    }
    tempBoard.push(newRow);
  }
  
  return tempBoard;
}//创建棋盘,为了以后扩展性

function canMove(){
  if (hasEmptyCells()) return true;
  
  for (let row = 0; row < board.length; row++){
    for (let col = 0; col < board[row].length; col++){
      let current = board[row][col];
      if (row + 1 < board.length && current === board[row + 1][col]) return true;
      if (col + 1 < board[row].length && current === board[row][col + 1]) return true;
    }
  }
  return false;
}//检测是否能移动

function createResetButton(){
  if (resetButton) return;
  resetButton = document.createElement("button");
  resetButton.textContent = "restart";
  document.body.append(resetButton);
  resetButton.addEventListener("click", resetGame);
} //创建重置按钮

function setGameOver(){
  createResetButton();
  resetButton.focus();
  gameOver = true;
}//结束游戏

function resetGame(){
  board = createBoard();
  spawnNumber();
  spawnNumber();
  if (resetButton){
    resetButton.remove();
    resetButton = null;
  }
  gameOver = false;
  render();
}//重置游戏

function move(direction){
  if(gameOver) return;

  let oldBoard = copyBoard();

  if (direction === "left") moveLeft();
  else if (direction === "right") moveRight();
  else if (direction === "up") moveUp();
  else if (direction === "down") moveDown();
  else return;
  if(!boardEqual(oldBoard, board)){
    if (hasEmptyCells()) spawnNumber();
    if (!canMove()) setGameOver();
  }
  render();
}//处理移动并调用render()

function update(event){
  const direction = {
  "ArrowLeft": "left",
  "ArrowRight": "right",
  "ArrowUp": "up",
  "ArrowDown": "down"
  }[event.key];

  if (direction){
    event.preventDefault();
    move(direction);
  }
}//刷新

function toggleAutoPlay(){
  isAutoPlaying = !isAutoPlaying;
  if (isAutoPlaying) {
    autoPlayButton.textContent = "stop";
    document.removeEventListener("keydown", update);
    autoPlay()
  } else {
    autoPlayButton.textContent = "auto Play";
    document.addEventListener("keydown", update);
    
    if(autoPlayTimer){
      clearTimeout(autoPlayTimer);
      autoPlayTimer = null;
    }
  }
}//切换自动游玩状态

function autoPlay(){
  if (!isAutoPlaying) return;
  if (gameOver) {toggleAutoPlay(); return;}

  autoStep();

  autoPlayTimer = setTimeout(autoPlay, 20);
}//自动游玩

function autoStep(){
  const t = Math.floor(Math.random() * 4);
  const direction = ["left","right","up","down"];
  move(direction[t]);
}//傻子ai

document.addEventListener("keydown", update);
autoPlayButton.addEventListener("click", toggleAutoPlay);
resetGame();

//呜呜呜css好难
