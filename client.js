var playerSymbol = "X";
var computerSymbol = "O";
var playerTurn = true;
var gameOn = true;

let con = io.connect();

con.on("updateBoard", (data) => {
  document.getElementById(data[0]).innerHTML = computerSymbol;
  playerTurn = true;
});
con.on("gameOver", (data) => {
  gameOn = false;
  document.getElementById(data[1][0]).style.color = "red";
  document.getElementById(data[1][1]).style.color = "green";
  document.getElementById(data[1][2]).style.color = "blue";
  document.getElementById("winner").innerHTML = data[0];
});
con.on("tie", () => {
  document.getElementById("winner").innerHTML = "It's a tie!";
});

document.getElementById("restart").addEventListener("click", (e) => {
  for (let i = 0; i < 9; i++) {
    document.getElementById(i.toString()).innerHTML = "";
    document.getElementById(i.toString()).style.color = "black";
  }

  document.getElementById("winner").innerHTML = "";
  playerTurn = true;
  gameOn = true;
  con.emit("restart");
});

document.getElementById("X").addEventListener("click", (e) => {
  playerSymbol = "X";
  computerSymbol = "O";
  con.emit("playAsX");
});
document.getElementById("O").addEventListener("click", (e) => {
  playerSymbol = "O";
  computerSymbol = "X";
  con.emit("playAsO");
});

for (let i = 0; i < 9; i++) {
  document.getElementById(i.toString()).addEventListener("click", (e) => {
    if (
      playerTurn &&
      gameOn &&
      document.getElementById(i.toString()).innerHTML == ""
    ) {
      playerTurn = false;
      document.getElementById(i.toString()).innerHTML = playerSymbol;
      con.emit("move", i);
    }
  });
}
