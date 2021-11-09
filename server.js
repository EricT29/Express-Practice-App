const express = require("express");
const app = express();
const { performance } = require("perf_hooks");

app.use(express.static(__dirname + "/"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => console.log(`Listening on port ${port}`));

const socket = require("socket.io")(server);

var playerTurn = true;
var playerIsX = true;
var playerSymbol = 0; // X
var computerSymbol = 1; // O
var board = [2, 3, 4, 5, 6, 7, 8, 9, 10]; // Neutral Symbols that aren't equal to the players or to each other
var computerMove;
var moveCount = 0;
var gameOn = true;

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function declareWinner(first, second, third) {
  gameOn = false;
  if (playerTurn) {
    if (playerIsX) {
      socket.emit("gameOver", [`${"X"} wins!`, [first, second, third]]);
    } else {
      socket.emit("gameOver", [`${"O"} wins!`, [first, second, third]]);
    }
  } else {
    if (playerIsX) {
      socket.emit("gameOver", [`${"O"} wins!`, [first, second, third]]);
    } else {
      socket.emit("gameOver", [`${"X"} wins!`, [first, second, third]]);
    }
  }
}

function shuffle(array) {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

function declareTie() {
  gameOn = false;
  socket.emit("tie");
}

function getBestMove(symbol, board) {
  let availableMoves = [];
  let bestMoves = [];
  let neutralMoves = [];
  let losingMoves = [];
  let newBoard = [];

  for (let i = 0; i < board.length; i++) {
    newBoard.push(board[i]);
    if (newBoard[i] > 1) {
      availableMoves.push(i);
    }
  }

  // evaluate the available moves in random order
  shuffle(availableMoves);

  for (let i = 0; i < availableMoves.length; i++) {
    let move = availableMoves[i];
    let brainBoard = [];
    for (let j = 0; j < newBoard.length; j++) {
      brainBoard[j] = newBoard[j];
    }
    brainBoard[move] = symbol;

    // check for winning move and return if found
    // check rows
    if (brainBoard[0] == brainBoard[1] && brainBoard[1] == brainBoard[2]) {
      if (brainBoard[0] == symbol) {
        return [move, 1];
      }
    }
    if (brainBoard[3] == brainBoard[4] && brainBoard[4] == brainBoard[5]) {
      if (brainBoard[3] == symbol) {
        return [move, 1];
      }
    }
    if (brainBoard[6] == brainBoard[7] && brainBoard[7] == brainBoard[8]) {
      if (brainBoard[6] == symbol) {
        return [move, 1];
      }
    }
    // check columns
    if (brainBoard[0] == brainBoard[3] && brainBoard[3] == brainBoard[6]) {
      if (brainBoard[0] == symbol) {
        return [move, 1];
      }
    }
    if (brainBoard[1] == brainBoard[4] && brainBoard[4] == brainBoard[7]) {
      if (brainBoard[1] == symbol) {
        return [move, 1];
      }
    }
    if (brainBoard[2] == brainBoard[5] && brainBoard[5] == brainBoard[8]) {
      if (brainBoard[2] == symbol) {
        return [move, 1];
      }
    }
    // check diagonals
    if (brainBoard[0] == brainBoard[4] && brainBoard[4] == brainBoard[8]) {
      if (brainBoard[0] == symbol) {
        return [move, 1];
      }
    }
    if (brainBoard[6] == brainBoard[4] && brainBoard[4] == brainBoard[2]) {
      if (brainBoard[6] == symbol) {
        return [move, 1];
      }
    }

    let otherSymbol;
    if (symbol == 0) {
      otherSymbol = 1;
    } else {
      otherSymbol = 0;
    }

    let otherScore = getBestMove(otherSymbol, brainBoard)[1];
    if (otherScore == -1) {
      bestMoves.push([move, 1]);
    } else if (otherScore == 0) {
      neutralMoves.push([move, 0]);
    } else if (otherScore == 1) {
      losingMoves.push([move, -1]);
    }
  }

  if (bestMoves.length > 0) {
    return bestMoves[getRandomInt(0, bestMoves.length-1)];
  } else if (neutralMoves.length > 0) {
    return neutralMoves[getRandomInt(0, neutralMoves.length-1)];
  } else if (losingMoves.length > 0) {
    return losingMoves[getRandomInt(0, losingMoves.length-1)];
  } else {
    return [0, 0];
  }
}

function checkBoard() {
  // check rows
  if (board[0] == board[1] && board[1] == board[2]) {
    declareWinner(0, 1, 2);
  }
  if (board[3] == board[4] && board[4] == board[5]) {
    declareWinner(3, 4, 5);
  }
  if (board[6] == board[7] && board[7] == board[8]) {
    declareWinner(6, 7, 8);
  }
  // check columns
  if (board[0] == board[3] && board[3] == board[6]) {
    declareWinner(0, 3, 6);
  }
  if (board[1] == board[4] && board[4] == board[7]) {
    declareWinner(1, 4, 7);
  }
  if (board[2] == board[5] && board[5] == board[8]) {
    declareWinner(2, 5, 8);
  }
  // check diagonals
  if (board[0] == board[4] && board[4] == board[8]) {
    declareWinner(0, 4, 8);
  }
  if (board[6] == board[4] && board[4] == board[2]) {
    declareWinner(6, 4, 2);
  }

  // if there are no legal moves left and the game is still on declare a tie
  if (gameOn && moveCount == 9) {
    declareTie();
  }
}

socket.on("connection", (client) => {
  client.on("move", (move) => {
    if (playerTurn && board[move] > 1) {
      moveCount++;
      board[move] = playerSymbol;
      checkBoard();
      if (gameOn) {
        // computer's turn
        playerTurn = false;
        let startTime = performance.now();
        computerMove = getBestMove(computerSymbol, board);
        let endTime = performance.now();
        board[computerMove[0]] = computerSymbol;
        moveCount++;
        checkBoard();
        console.log(endTime - startTime);
        console.log(board);
        playerTurn = true;
        client.emit("updateBoard", computerMove);
      }
    }
  });
  client.on("restart", () => {
    moveCount = 0;
    board = [2, 3, 4, 5, 6, 7, 8, 9, 10];
    playerTurn = true;
    gameOn = true;
  });
  client.on("playAsX", () => {
    playerSymbol = 0;
    computerSymbol = 1;
    playerIsX = true;
  });
  client.on("playAsO", () => {
    playerSymbol = 1;
    computerSymbol = 0;
    playerIsX = false;
  });
});
