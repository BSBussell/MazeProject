var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var camera = new Camera(ctx);
var coords = camera.worldToScreen(0, 0);
camera.moveTo(coords.x, coords.y);
//camera.zoomTo(Math.floor(3000))
ctx.fillStyle = "black";
ctx.fillRect(0, 0, canvas.width, canvas.height);

var startDate = new Date();
var Wait = 30 //Math.floor(Math.random() * 5) + 15;
console.log(Wait);
var begin = true;
var anim = 1875;
var CountDown = 3.9;
var beginCount = false;
var lose = false;
var win = false;
var dispText = "None"
var textTimer = 0;
var waitClick = true;

function genMaze(width, height, startX, startY) {
  var maze = [];
  var row = new Array(height);
  row.fill(2);
  maze.push(row);
  for (i = 0; i <= width; i++) {
    var row = []
    row.push(2)
    for (j = 0; j <= height - 3; j++) {
      row.push(1)
    }
    row.push(2)
    maze.push(row);
  }
  var row = new Array(height);
  row.fill(2);
  maze.push(row);


  var posX = startX;
  var posY = startY;
  maze[posY][posX] = 0;
  console.log("X:" + posY)
  console.log("Y:" + posX)
  var count = 1;
  var color = "#FFFFFF"
  var prevDir = -9

  var listOfSteps = [];
  var Directions = ["Left", "Right", "Up", "Down"]
  var direction = Directions[Math.floor(Math.random() * Directions.length)];
  //listOfSteps.push(direction)
  while (maze[startY][startX] > -10) {

    //console.log(maze[posY][posX+2])
    color = "#FFFFFF"
    //console.log("Log: "+listOfSteps)
    if (direction == "Right" && (posX + 2 < width && maze[posY][posX + 2] >= 1) && prevDir != "Left") {
      posX += 2;
      maze[posY][posX - 1] -= 1;
      count = 1;
      prevDir = direction;
      listOfSteps.push(direction);
      //Directions.push("Right");
    } else if (direction == "Left" && (posX - 2 > 0 && maze[posY][posX - 2] >= 1) && prevDir != "Right") {
      posX -= 2;
      maze[posY][posX + 1] -= 1;
      count = 1;
      prevDir = direction;
      listOfSteps.push(direction);

      //Directions.push("Left");
    } else if (direction == "Down" && (posY + 2 < height && maze[posY + 2][posX] >= 1 && prevDir != "Up")) {
      posY += 2;
      maze[posY - 1][posX] -= 1;
      count = 1;
      prevDir = direction;
      listOfSteps.push(direction);

      //Directions.push("Down");
    } else if (direction == "Up" && (posY - 2 > 0 && maze[posY - 2][posX] >= 1) && prevDir != "Down") {
      posY -= 2;
      maze[posY + 1][posX] -= 1;
      count = 1;
      prevDir = direction;
      listOfSteps.push(direction);

      //Directions.push("Up");
    } else if (listOfSteps[listOfSteps.length - 1] == "Down" && count > 8) {
      posY -= 2;
      maze[posY + 1][posX] -= 1;
      count = 1;
      prevDir = direction;
      listOfSteps.pop(); //listOfSteps.push("Up");

      //console.log("Right");
    } else if (listOfSteps[listOfSteps.length - 1] == "Up" && count > 8) {
      posY += 2;
      maze[posY - 1][posX] -= 1;
      count = 1;
      prevDir = direction;
      listOfSteps.pop(); //listOfSteps.push("Down");

      //console.log("Left");
    } else if (listOfSteps[listOfSteps.length - 1] == "Right" && count > 8) {
      posX -= 2;
      maze[posY][posX + 1] -= 1;
      count = 1;
      prevDir = direction;
      listOfSteps.pop(); //listOfSteps.push("Left");

      //console.log("Up");
    } else if (listOfSteps[listOfSteps.length - 1] == "Left" && count > 8) {
      posX += 2;
      maze[posY][posX - 1] -= 1;
      count = 1;
      prevDir = direction;
      listOfSteps.pop(); //listOfSteps.push("Right");

      //console.log("Down");
    }
    //if (listOfSteps.length <= 2) {listOfSteps.pop()}
    var direction = Directions[Math.floor(Math.random() * Directions.length)];

    maze[posY][posX] -= 1;
    //console.log("X:"+posY)
    //console.log("Y:"+posX)
    //console.log(maze[posY][posX])
    count++;
    //if (count>15 && (posX ==1 && posY ==1)) {break}
  }

  return maze;
}


var maze = genMaze(75, 75, 1, 1);
console.log(maze)

var x = 25,
  y = 25,
  velY = 0,
  velX = 0,
  speed = 2,
  friction = 0.88,
  keys = [];

function update() {
  requestAnimationFrame(update);

  if (keys[38]) {
    if (velY > -speed) {
      velY--;
    }
  }

  if (keys[40]) {
    if (velY < speed) {
      velY++;
    }
  }
  if (keys[39]) {
    if (velX < speed) {
      velX++;
    }
  }
  if (keys[37]) {
    if (velX > -speed) {
      velX--;
    }
  }

  velY *= friction;
  velX *= friction;

  if (maze[Math.round(y / 25)][Math.round((x + velX) / 25)] > 0 || maze[Math.floor(y / 25)][Math.floor((x + velX) / 25)] > 0) {

    velX = 0

  } else {


  }
  if (maze[Math.round((y + velY) / 25)][Math.round(x / 25)] > 0 || maze[Math.floor((y + velY) / 25)][Math.floor(x / 25)] > 0) {
    velY = 0
  } else {

  }
  if (Math.floor(x / 25) == 73 && Math.floor(y / 25) == 73 || Math.round(x / 25) == 73 && Math.round(y / 25) == 73) {
    win = true;
  }
  if (begin != true && lose != true && win != true) {
    y += velY;
    x += velX;
    var coords = camera.worldToScreen(x, y);
    camera.moveTo(Math.floor(x), Math.floor(y));
  }

  if (x >= 1875 - 13) {
    x = 1250 - 13;
  }

  if (y > 1875 + 13) {
    y = 1875;
  }

  ctx.fillStyle = "000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  camera.begin();
  var endTime = new Date();
  var timeDiff = endTime - startDate; //in ms
  // strip the ms
  timeDiff /= 1000;

  // get seconds
  var seconds = Math.round(timeDiff % 60);
  //console.log(Wait + " sec");
  if (seconds >= Wait && begin == false && win == false) {
    startDate = new Date();
    Wait -= 5 //(Math.floor(Math.random() * 5)) + 15;
    maze = genMaze(75, 75, 1, 1)
    while (maze[Math.round(y / 25)][Math.round((x) / 25)] > 0 || maze[Math.floor(y / 25)][Math.floor((x) / 25)] > 0) {
      maze = genMaze(75, 75, 1, 1)
    }
  }
  //ctx.fillRect(0, 0, 300, 300);
  for (var i = 0; i < maze.length; i++) {
    var row = maze[i];
    for (var j = 0; j < row.length; j++) {
      if (row[j] <= 0) {
        var c = document.getElementById("canvas");
        //  var ctx = c.getContext("2d");
        if (i == 73 && j == 73) {
          ctx.fillStyle = "#FF0000"
        } else if (i == 1 && j == 1) {
          ctx.fillStyle = "#00FF00"
        } else {
          ctx.fillStyle = "#CFCFCF";
        }
        ctx.fillRect(25 * j, 25 * i, 27, 27);
        ctx.stroke();
        //console.log("Maze[" +i+"][" +j+ "] = " + maze[i][j])
      }

    }
  }
  if (begin == true) {



    if (anim >= 0 && beginCount != true) {
      camera.moveTo(anim, anim);
      anim = anim - 5;
      if (anim <= 0) {

      }
    } else {
      //waitClick = true;
      //beginCount = true
      /*begin = false;
      startDate = new Date();*/
    }

  }
  ctx.beginPath();
  ctx.fillStyle = "#0000FF"
  ctx.fillRect(x, y, 13, 13)
  ctx.fill();
  camera.end();
  if (begin == true && beginCount != true) {
    ctx.font = "60px Arial";
    ctx.fillStyle = "#000000";
    //ctx.fillRect(185,250,600,200)
    ctx.fillText("Agility and Adaptability", 195, 310);
    ctx.fillStyle = "#2424cc";
    ctx.fillText("Agility and Adaptability", 185, 300);
  }
  if (waitClick == true) {
    ctx.font = "20px Arial";

    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("Click to Start", 485, 500);
  }
  console.log(waitClick)
  if (begin != true && lose == false && win == false) {
    ctx.font = "30px Arial";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(String(Wait - seconds), 300, 50);
  }
  if (Wait < 0) {
    ctx.font = "60px Arial";
    ctx.fillStyle = "#FF0000";
    ctx.fillText("You Lose", 500, 300);
    //ctx.fillText("Guess you couldn't adapt agile Enough...",750,250)
  }
  if (win == true) {
    ctx.font = "60px Arial";
    ctx.fillStyle = "#00FFFF";
    ctx.fillText("You Win", 300, 300);
  }
  if (dispText != "None") {

  }
  if (beginCount == true) {
    ctx.font = "60px Arial";
    ctx.fillStyle = "#FF0000";
    if (CountDown >= 1) {
      ctx.fillText(Math.floor(CountDown), 500, 300);
    } else if (CountDown <= 0 || CountDown > -1) {
      ctx.fillText("GO!", 500, 300);
      Wait = 30;
      begin = false
    }
    if (CountDown < -2) {
      startDate = new Date();
      beginCount = false;
    }
    CountDown -= .020
  }

}
function doMouseDown(event) {
  waitClick = false;
  beginCount = true;
  camera.moveTo(x,y);
}

update();

document.body.addEventListener("keydown", function(e) {
  keys[e.keyCode] = true;
});
document.body.addEventListener("keyup", function(e) {
  keys[e.keyCode] = false;
});
document.body.addEventListener("click", doMouseDown);
