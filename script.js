const boardEl = document.querySelector("#board");
const autoPlayButton = document.querySelector("#autoPlayButton");

let board;
let gameOver;
let resetButton;

let isAutoPlaying = false;
let autoPlayFrameId = null;

const snakeCache = new Map();

//动画增加
let boardSize = 4;
let isAnimating = false;
let renderedSize = 0;

const moveDuration = 105;
const settleDuration = 55;
const mergeDuration = 120;
const spawnDuration = 120;
//分割符

const weights = {
  empty: 1200,
  corner: 1000,
  snake: 0.2,
  merge: 100,
  smooth: 300,
  mono: 800,
};//ai权重

function render(currentBoard, animation = null){
  const gridLayer = boardEl.querySelector(".grid-layer");
  const tileLayer = boardEl.querySelector(".tile-layer");
  if (!gridLayer || !tileLayer) return;

  const size = currentBoard.length;
  const overshootRatio = 0.16;
  const settleDuration = 65;

  boardEl.style.setProperty("--size", size);

  if (renderedSize !== size || gridLayer.children.length !== size * size){
    gridLayer.innerHTML = "";

    for (let i = 0; i < size * size; i++){
      const gridCell = document.createElement("div");
      gridCell.className = "grid-cell";
      gridLayer.appendChild(gridCell);
    }

    renderedSize = size;
  }

  const gap =
    parseFloat(getComputedStyle(boardEl).getPropertyValue("--gap")) || 0;

  const cellPercent = 100 / size;
  const cellGap = gap * (size - 1) / size;
  const stepGap = gap / size;

  function setCellPosition(cell, row, col){
    cell.style.width = `calc(${cellPercent}% - ${cellGap}px)`;
    cell.style.height = `calc(${cellPercent}% - ${cellGap}px)`;
    cell.style.left = `calc(${col * cellPercent}% + ${col * stepGap}px)`;
    cell.style.top = `calc(${row * cellPercent}% + ${row * stepGap}px)`;
  }

  function createCell(value, row, col, className = ""){
    const cell = document.createElement("div");

    cell.className = className
      ? `cell ${className}`
      : "cell";

    cell.textContent = value;
    cell.dataset.value = value;
    cell.dataset.row = row;
    cell.dataset.col = col;

    setCellPosition(cell, row, col);
    tileLayer.appendChild(cell);

    return cell;
  }

  function renderTiles(currentBoard){
    tileLayer.innerHTML = "";

    for (let row = 0; row < currentBoard.length; row++){
      for (let col = 0; col < currentBoard[row].length; col++){
        const value = currentBoard[row][col];
        if (!value) continue;

        createCell(value, row, col);
      }
    }
  }

  if (!animation){
    isAnimating = false;
    renderTiles(currentBoard);
    return;
  }

  isAnimating = true;

  const {
    oldBoard,
    moves = [],
    merges = [],
    spawned = null
  } = animation;

  const oldCells = new Map();

  tileLayer.innerHTML = "";

  for (let row = 0; row < oldBoard.length; row++){
    for (let col = 0; col < oldBoard[row].length; col++){
      const value = oldBoard[row][col];
      if (!value) continue;

      const cell = createCell(value, row, col);
      cell.style.zIndex = "1";

      oldCells.set(`${row},${col}`, cell);
    }
  }

  tileLayer.offsetWidth;

  // 数字开始移动时，新随机数字同时出现。
  if (spawned){
    const spawnCell = createCell(
      spawned.value,
      spawned.row,
      spawned.col,
      "spawning"
    );

    // 防止新数字盖住正从这个位置离开的旧数字。
    spawnCell.style.zIndex = "0";
  }

  for (const move of moves){
    const cell = oldCells.get(
      `${move.from[0]},${move.from[1]}`
    );

    if (!cell) continue;

    const [fromRow, fromCol] = move.from;
    const [toRow, toCol] = move.to;

    cell.classList.add("moving");

    // 参与合并的数字直接到合并位置，不做过冲。
    if (move.merged){
      setCellPosition(cell, toRow, toCol);
      continue;
    }

    // 普通移动数字越过最终位置 16%。(实际依照overshootRatio)
    const overshootRow =
      toRow + Math.sign(toRow - fromRow) * overshootRatio;

    const overshootCol =
      toCol + Math.sign(toCol - fromCol) * overshootRatio;

    setCellPosition(cell, overshootRow, overshootCol);
  }

  setTimeout(() => {
    if (board !== currentBoard) return;

    // 到达目标后，立即处理合并。
    for (const move of moves){
      if (!move.merged) continue;

      const cell = oldCells.get(
        `${move.from[0]},${move.from[1]}`
      );

      if (cell) cell.remove();
    }

    for (const merge of merges){
      const [row, col] = merge.position;
      const mergedCell = createCell(
        merge.value,
        row,
        col,
        "merging"
      );

      mergedCell.style.zIndex = "2";
    }

    // 只有未合并数字从过冲位置回到最终位置。
    for (const move of moves){
      if (move.merged) continue;

      const cell = oldCells.get(
        `${move.from[0]},${move.from[1]}`
      );

      if (!cell) continue;

      const [toRow, toCol] = move.to;

      cell.style.transitionDuration = `${settleDuration}ms`;
      cell.style.transitionTimingFunction =
        "cubic-bezier(.2, .8, .3, 1)";

      setCellPosition(cell, toRow, toCol);
    }

    setTimeout(() => {
      if (board !== currentBoard) return;

      renderTiles(currentBoard);
      isAnimating = false;
    }, Math.max(
      settleDuration,
      mergeDuration,
      spawnDuration - moveDuration
    ));
  }, moveDuration);
}//负责普通渲染与移动、碰撞、合并、生成动画
//render()是ai写的

function moveLeft(currentBoard, useAnimation = false){
  if (!useAnimation){
    const newBoard = [];
    for (let row = 0; row < currentBoard.length; row++){
      let nonZero = currentBoard[row].filter(i => i!==0);

      for(let i = 0; i < nonZero.length - 1; i++){
        if (nonZero[i] === nonZero[i + 1]){
          nonZero[i] *= 2 ;
          nonZero[i + 1] = 0;
          i++
        }
      }

      let merged = nonZero.filter(i => i !== 0);
      while(merged.length < currentBoard[row].length) merged.push(0);

      newBoard.push(merged);
    }
    return { board: newBoard, moved: !boardEqual(newBoard, currentBoard), };
  }//如果不需要动画,使用最快逻辑返回

  const newBoard = [];
  const moves = [];
  const merges = [];

  for (let row = 0; row < currentBoard.length; row++){
    const cells = [];

    for (let col = 0; col < currentBoard[row].length; col++){
      const value = currentBoard[row][col];
      if (value) cells.push({value, col});
    }

    const merged = [];
    let targetCol = 0;

    for (let i = 0; i < cells.length;){
      const current = cells[i];
      const next = cells[i + 1];

      if (next && current.value === next.value){
        const value = current.value * 2;

        merged.push(value);

        moves.push({
          from: [row, current.col],
          to: [row, targetCol],
          value: current.value,
          merged: true
        });

        moves.push({
          from: [row, next.col],
          to: [row, targetCol],
          value: next.value,
          merged: true
        });

        merges.push({
          position: [row, targetCol],
          value
        });

        i += 2;
      } else {
        merged.push(current.value);

        if (current.col !== targetCol){
          moves.push({
            from: [row, current.col],
            to: [row, targetCol],
            value: current.value,
            merged: false
          });
        }

        i++;
      }

      targetCol++;
    }
    
    while (merged.length < currentBoard[row].length) merged.push(0);
    newBoard.push(merged);
  }

  return {
    board: newBoard,
    moved: !boardEqual(newBoard, currentBoard),
    track: {
      moves,
      merges
    }
  };
} ///左 增加了track跟踪

function flipHorizontal(currentBoard){
  const newBoard = [];
  for (let row = 0; row < currentBoard.length; row++) {
    let newRow = [];

    for (let col = currentBoard[row].length - 1; col >= 0; col--){
      newRow.push(currentBoard[row][col]);
    }

    newBoard.push(newRow);
  }
  return newBoard;
}//将board左右翻转

function transpose(currentBoard){
  if (currentBoard.length === 0 || currentBoard.length !== currentBoard[0].length) return; //防御性代码
  let newBoard = [];

  for (let row = 0; row < currentBoard.length; row++){
    let newRow = [];

    for(let col = 0; col < currentBoard[row].length; col++){
      newRow.push(currentBoard[col][row]);
    }
    
    newBoard.push(newRow);
  }
  return newBoard;
}//将board转置,行列对换

function transformTrack(track, transform){
  if (!track) return;

  const moves = track.moves.map(move => ({
    ...move,
    from: transform(...move.from),
    to: transform(...move.to)
  }));

  const merges = track.merges.map(merge => ({
    ...merge,
    position: transform(...merge.position)
  }));

  return {moves, merges};
}//转换移动与合并轨迹坐标

function moveRight(currentBoard, useAnimation = false){
  const size = currentBoard.length;
  const flipped = flipHorizontal(currentBoard);
  const result = moveLeft(flipped, useAnimation);
  const newBoard = flipHorizontal(result.board);

  const output = {
    board: newBoard,
    moved: result.moved
  };

  if (result.track)
    output.track = transformTrack(result.track, (row, col) => [row, size - 1 - col]);

  return output;
}//右,将翻转后的轨迹转换回原棋盘

function moveUp(currentBoard, useAnimation = false){
  const transposed = transpose(currentBoard);
  const result = moveLeft(transposed, useAnimation);
  const newBoard = transpose(result.board);

  const output = {
    board: newBoard,
    moved: result.moved
  };

  if (result.track)
    output.track = transformTrack(result.track, (row, col) => [col, row]);

  return output;
}//上,将转置后的轨迹转换回原棋盘

function moveDown(currentBoard, useAnimation = false){
  const size = currentBoard.length;
  const movedBoard = flipHorizontal(transpose(currentBoard));
  const result = moveLeft(movedBoard, useAnimation);
  const newBoard = transpose(flipHorizontal(result.board));

  const output = {
    board: newBoard,
    moved: result.moved
  };

  if (result.track)
    output.track = transformTrack(result.track, (row, col) => [size - 1 - col, row]);

  return output;
}//下,将翻转转置后的轨迹转换回原棋盘

function hasEmptyCells(currentBoard){
  return currentBoard.some(row => row.some(cell => cell ===0));
}//是否有空位

function getEmptyCells(currentBoard){
  let empty = [];
  for (let row = 0; row < currentBoard.length; row++){
    for (let col = 0; col < currentBoard[row].length; col++){
      if (currentBoard[row][col] === 0) empty.push([row,col]);
    }
  }
  return empty;
}//获取空位数组位置

function copyBoard(currentBoard){
  return currentBoard.map(row => [...row]);
}//棋盘复制,速度慢谨慎使用

function spawnNumber(currentBoard, useAnimation = false){
  let emptyCells = getEmptyCells(currentBoard);
  if (emptyCells.length === 0) {//保护作用,防止emptyCells不合法
    if (useAnimation) return {board: currentBoard, spawned: null};
    return currentBoard;
    }
  let newBoard = copyBoard(currentBoard);
  let index = Math.floor(Math.random() * emptyCells.length);
  const [row, col] = emptyCells[index];
  if (Math.random() < 0.9) newBoard[row][col] = 2;
  else newBoard[row][col] = 4;
  if (useAnimation) return {board: newBoard, spawned: {row, col, value:newBoard[row][col]}}
  return newBoard;
}//生成随机数字

function boardEqual(a, b){
  return a.every((row, rowIndex) => row.every((cell, colIndex) => cell === b[rowIndex][colIndex]));
}//检测棋盘是否相等

function createBoard(size) {
  let newBoard = [];

  for (let row = 0; row < size; row++){
    let newRow = [];
    for (let col = 0; col < size; col++){
      newRow.push(0);
    }
    newBoard.push(newRow);
  }
  
  return newBoard;
}//创建棋盘,为了以后扩展性

function createNewBoard(size){
  let currentBoard = createBoard(size);
  currentBoard = spawnNumber(currentBoard);
  currentBoard = spawnNumber(currentBoard);
  return currentBoard;
}//创建新棋盘

function canMove(currentBoard){
  if (hasEmptyCells(currentBoard)) return true;
  
  for (let row = 0; row < currentBoard.length; row++){
    for (let col = 0; col < currentBoard[row].length; col++){
      let current = currentBoard[row][col];
      if (row + 1 < currentBoard.length && current === currentBoard[row + 1][col]) return true;
      if (col + 1 < currentBoard[row].length && current === currentBoard[row][col + 1]) return true;
    }
  }
  return false;
}//检测是否能移动

function createResetButton(){
  if (resetButton) return;
  resetButton = document.createElement("button");
  resetButton.textContent = "restart";
  document.body.append(resetButton);
  resetButton.addEventListener("click", () => resetGame());
}//创建重置按钮

function setGameOver(){
  createResetButton();
  resetButton.focus();
  gameOver = true;
}//结束游戏

function resetGame(size = boardSize){
  boardSize = size;//应更新全局boardSize
  board = createNewBoard(size);

  if (resetButton){
    resetButton.remove();
    resetButton = null;
  }

  gameOver = false;
  render(board);
}//重置游戏

function move(direction, useAnimation = false){
  if (gameOver) return;

  const oldBoard = board;
  const result = moveBoard(board, direction, useAnimation);
  if (!result || !result.moved) return;

  if (!useAnimation){
    board = result.board;
    if (hasEmptyCells(board)) board = spawnNumber(board);
    if (!canMove(board)) setGameOver();
    render(board);
    return;
  }

  const spawnResult = spawnNumber(result.board, true);
  board = spawnResult.board;

  render(board, {
    oldBoard,
    ...result.track,
    spawned: spawnResult.spawned
  });

  if (!canMove(board)) setGameOver();
}//处理普通移动与动画移动

function moveBoard(currentBoard, direction, useAnimation = false){
  if (direction === "left") return moveLeft(currentBoard, useAnimation);
  else if (direction === "right") return moveRight(currentBoard, useAnimation);
  else if (direction === "up") return moveUp(currentBoard, useAnimation);
  else if (direction === "down") return moveDown(currentBoard, useAnimation);
  else return null;
}//抽离move中移动的逻辑

function update(event){

  const direction = {
  "ArrowLeft": "left",
  "ArrowRight": "right",
  "ArrowUp": "up",
  "ArrowDown": "down"
  }[event.key];

  if (direction){
    event.preventDefault();
    move(direction, true);
  }
}//刷新

function toggleAutoPlay(){
  isAutoPlaying = !isAutoPlaying;
  if (isAutoPlaying) {
    autoPlayButton.textContent = "stop";
    document.removeEventListener("keydown", update);
    if (gameOver) resetGame();
    autoPlay();
  } else {
    autoPlayButton.textContent = "auto Play";
    document.addEventListener("keydown", update);
    
    if(autoPlayFrameId){
      clearTimeout(autoPlayFrameId);
      autoPlayFrameId = null;
    }
  }
}//切换自动游玩状态

function autoPlay(){
  if (!isAutoPlaying) return;
  if (gameOver) {toggleAutoPlay(); return;}

  const result = autoStep(board);
  if (result) move(result.direction);

  autoPlayFrameId = setTimeout(autoPlay, 0);
}//自动游玩

function evaluateBoard(currentBoard, debug = false){
  const empty = getEmptyCells(currentBoard).length * weights.empty;
  const corner = cornerScore(currentBoard) * weights.corner;
  const snake = snakeScore(currentBoard) * weights.snake;
  const merge = mergeScore(currentBoard) * weights.merge;
  const smooth = smoothScore(currentBoard) * weights.smooth;
  const mono = monotonicity(currentBoard) * weights.mono;

  const total = empty + corner + snake + merge + smooth + mono;

  if(debug) console.log({empty, corner, snake, merge, smooth, mono, total});
  return total;
}//计算棋盘可得分数,调试版本

function logValue(n){
  return n === 0 ? 0 : Math.log2(n);
}//基础函数

function copyWeights(source){
  return {
    empty: source.empty,
    corner: source.corner,
    snake: source.snake,
    merge: source.merge,
    smooth: source.smooth,
    mono: source.mono
  };
}//复制权重,基础函数

function applyWeights(source){
  Object.assign(weights, source);
}//引入新权重,基础函数,依赖全局变量

function mutateWeights(source){
  const next = copyWeights(source);
  const keys = Object.keys(next);

  const key = keys[Math.floor(Math.random() * keys.length)];
  
  const ratio = 1 + (Math.random() - 0.5) * 0.4;
  next[key] *= ratio;

  return next;
}//返回扰动过的权重,随机扰动一个权重

async function trainWeights(rounds = 50, games = 50, size = 4, depth = 0){
  let bestWeights = copyWeights(weights);
  let bestScore = playManyTimes(games, size, depth).averageMaxTile;

  console.log("start", bestScore, bestWeights);

  for (let i = 0; i < rounds; i++){
    const candidate = mutateWeights(bestWeights);
    applyWeights(candidate);

    const result = playManyTimes(games, size, depth);
    const score = result.averageMaxTile;

    if (score > bestScore){
      bestScore = score;
      bestWeights = copyWeights(candidate);
      console.log("new best", i, bestScore, bestWeights);
      render(result.bestBoard);
    } else {
      applyWeights(bestWeights);
    }
    await new Promise(r => setTimeout(r, 0));
  }

  applyWeights(bestWeights);
  console.log("endding");
  return {
    bestScore,
    bestWeights
  };
}//训练evaluateBoard()的参数权重

function buildSnakeMatrix(size){//构建仅正方形

  const idealWeight = [];
  let counter = size * size - 1;

  for (let row = 0; row < size; row+=2){
    let newRow = [];
    for (let col = 0; col < size; col++){
      newRow.push(counter--);
    }
    idealWeight.push(newRow);
    if (row + 1 >= size) break;
    newRow = [];
    const start = counter - size + 1;
    for (let col = 0; col < size; col++){
      newRow.push(start + col);
    }
    counter -= size;
    idealWeight.push(newRow);
  }

  return idealWeight;
}//build蛇形Matrix

function matrixToPath(matrix){
  if (!matrix) return [];

  const size = matrix.length;
  const path = [];

  for (let row = 0; row < size; row++){
    for (let col = 0; col < size; col++){
      const order = matrix[row][col];
      path[order] = [row, col];
    }
  }

  return path.reverse();
}//根据从小到大拆成坐标path

function getSnakeData(size){
  if (!snakeCache.has(size)){
    const matrix = buildSnakeMatrix(size);
    const path = matrixToPath(matrix);

    snakeCache.set(size, {
      matrix,
      path
    });
  }

  return snakeCache.get(size);
}//缓存大人万岁😭

function smoothScore(currentBoard){
  if (!currentBoard) return 0;//总不能有人传给我零参数吧
  let score = 0; //平滑度
  for (const [row, rows] of currentBoard.entries()){
    for (const [col, current] of rows.entries()){
      if (!current) continue;

      if (row + 1 < currentBoard.length && currentBoard[row + 1][col]) {
        score -= Math.abs(logValue(current) - logValue(currentBoard[row + 1][col]));
      }

      if (col + 1 < currentBoard[row].length && currentBoard[row][col + 1]) {
        score -= Math.abs(logValue(current) - logValue(currentBoard[row][col + 1]));
      }
    }
  }
  return score;
}//平滑度分数计算

function cornerScore(currentBoard){
  if (!currentBoard) return 0;//总不能有人传给我零参数吧
  const maxTile = Math.max(...currentBoard.flat());
  if (maxTile === 0) return 0;
  const size = currentBoard.length;
  /*const corner = [[0, 0], [0, size - 1], [size - 1, size - 1] , [size - 1, 0]];*/
  const corner = [[0, 0]];
  for (const [row, col] of corner){
    if (currentBoard[row][col] === maxTile) return logValue(maxTile);
  }

  let maxTileIndex;
  outer: for (const [row, rows] of currentBoard.entries()){
    for (const [col, current] of rows.entries()){
      if (current === maxTile){maxTileIndex = [row, col]; break outer;}
    }
  }

  if (!maxTileIndex) return 0;

  const minDistance = maxTileIndex[0] + maxTileIndex[1];

  /*let minDistance = Infinity;
  *for (const [cr, cc] of corner) {
    const distance = Math.abs(maxTileIndex[0] - cr) + Math.abs(maxTileIndex[1] - cc);
    minDistance = Math.min(minDistance, distance);
  }*/

  return -logValue(maxTile) * minDistance;
} //奖励最大数字在角落分数

function snakeScore(currentBoard){
  if (!currentBoard) return 0;//总不能有人传给我零参数吧
  let size = currentBoard.length;
  const idealWeight = getSnakeData(size).matrix;
  let score = 0;

  for (let row = 0; row < size; row++){
    for (let col = 0; col < size; col++){
      score += logValue(currentBoard[row][col]) * idealWeight[row][col];
    }
  }

  return score;
}//蛇形得分奖励

function mergeScore(currentBoard){
  if (!currentBoard) return 0;

  const size = currentBoard.length;
  let score = 0;

  for (const [row, rows] of currentBoard.entries()){
    for (const [col, current] of rows.entries()){
      if (!current) continue;

      if (row + 1 < size && current === currentBoard[row + 1][col])
        score += logValue(current);

      if (col + 1 < size && current === currentBoard[row][col + 1])
        score += logValue(current);
    }
  }

  return score;
}//相邻数字可合并奖励

function monotonicity(currentBoard){
  if (!currentBoard) return 0;

  const size = currentBoard.length;
  const { path } = getSnakeData(size);

  let score = 0;

  for (let i = 0; i < path.length - 1; i++){
    const [r1, c1] = path[i];
    const [r2, c2] = path[i + 1];

    const a = logValue(currentBoard[r1][c1]);
    const b = logValue(currentBoard[r2][c2]);

    if (a >= b) score += a - b;
    else score -= (b - a) * 3;
  }

  return score;
}//单调性得分

function playOneTime(size, depth){
  let currentBoard = createNewBoard(size);
  let steps = 0;

  while(true){
    const result = autoStep(currentBoard, depth);
    if (!result || !result.direction) break;

    currentBoard = result.board;

    if (hasEmptyCells(currentBoard))
      currentBoard = spawnNumber(currentBoard);
    steps++;
  }

  evaluateBoard(currentBoard, true);

  return {
    board: currentBoard,
    maxTile:Math.max(...currentBoard.flat()),
    steps
  };
}//模拟游玩一次的情况

function playManyTimes(n, size, depth){
  if (!n || n <= 0) return 0;
  let allMaxTiles = 0;
  let allSteps = 0;
  let bestMaxTile = 0;
  let maxSteps = 0;
  let bestScore = -Infinity;
  let bestBoard = null;
  for (let i = 0; i < n; i++){
    let result = playOneTime(size, depth);
    allMaxTiles += result.maxTile;
    allSteps += result.steps;
    const currentScore = evaluateBoard(result.board);
    if(currentScore > bestScore){
      bestBoard = result.board;
      bestScore = currentScore;
    }
    if(result.maxTile > bestMaxTile) bestMaxTile = result.maxTile;
    if(result.steps > maxSteps) maxSteps = result.steps;
  }
  return {
    averageMaxTile: Math.floor(allMaxTiles / n),
    bestMaxTile,
    averageSteps: Math.floor(allSteps / n),
    maxSteps,
    bestBoard,
    bestScore
  };
}//模拟游玩n次的情况,定位1

function lookAheadScore(currentBoard, depth){
  if (depth <= 0) return evaluateBoard(currentBoard);

  const directions = ["left", "right", "up", "down"];
  let bestScore = -Infinity;

  for (const direction of directions){
    const result = moveBoard(currentBoard, direction);

    if (!result || !result.moved) continue;

    const score = expectAfterSpawn(
      result.board,
      depth - 1
    );

    if (score > bestScore) bestScore = score;
  }

  return bestScore === -Infinity
    ? evaluateBoard(currentBoard)
    : bestScore;
}//预测期盼值

function expectAfterSpawn(currentBoard, depth){
  const emptyCells = getEmptyCells(currentBoard);

  if (emptyCells.length === 0) return lookAheadScore(currentBoard, depth);

  let total = 0;

  for (const [row, col] of emptyCells){
    currentBoard[row][col] = 2;
    const score2 = lookAheadScore(currentBoard, depth);

    currentBoard[row][col] = 4;
    const score4 = lookAheadScore(currentBoard, depth);

    currentBoard[row][col] = 0;
    total += score2 * 0.9 + score4 * 0.1;
  }

  return total / emptyCells.length;
}//深度预测

function autoStep(currentBoard, depth = 1){
  const directions = ["left", "right", "up", "down"];

  let bestDirection = null;
  let bestScore = -Infinity;
  let bestBoard = null;

  for (const direction of directions){
    const result = moveBoard(currentBoard, direction);

    if (!result || !result.moved) continue;

    const score = expectAfterSpawn(result.board, depth);

    if (score > bestScore){
      bestScore = score;
      bestDirection = direction;
      bestBoard = result.board;
    }
  }

  return {
    board: bestBoard,
    direction: bestDirection,
    score: bestScore
  };
}//ai version 1.3

document.addEventListener("keydown", update);
autoPlayButton.addEventListener("click", toggleAutoPlay);
resetGame();

//呜呜呜css好难
