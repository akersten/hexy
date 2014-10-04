/* 
Project: Hexy
File: main.js
Author: Alex Kersten

Within this file are all the functions for Hexy. Call initEverything with the
size of the board you want to play to get started.

Changelog:

1.1 Corners are now 'universal', so a path from either side to an opposite
    corner constitutes a victory for either player. (Corners are no longer
    specific to one player.)

1.0 Initial release
 */

//Name of the canvas element in our HTML markup.
var canvasName = 'mainCanvas';

//Context for the main canvas, Should be safe to draw to since we call
//initCanvas right away.
var context;

//The width and height will be determined by reading their HTML attributes.
var canvasWidth, canvasHeight, centerX, centerY;

//How many hexagons tall is the center pillar of this board? Also the length
//of any one side of the board.
var gameSize = 8;

//How many pixels wide & tall is one hexagon picture?
var tileImageSize = 48;

//How many pixels are we shifting horizontally when we tessalate these hexagons?
//There's probably a better way to calculate this but I did it in Photoshop by
//just nudging the tile over until it tesselated and counting the pixels.
var tileHorizontalSeparation = 36;

//They're used in the calculation of tile position since we index them like we
//were indexing a square.
var tileVerticalSeparation = 24;

//Different hex PNG images we'll be using to represent the board.
var imgBorderNormal, imgBorderHighlight, imgBorderGoalA, imgBorderGoalB,
imgFillNormal, imgFillHighlight, imgFillA, imgFillB, imgBorderCorner;

//Local mouse positions within the canvas.
var mouseX = 0, mouseY = 0;

//False = A's turn, True = B's turn.
var turn = false;

//Check if we've finished creating the game yet.
var inited = false;

//If we've won and are waiting for a mouse click.
var gameOver = false;

//Scores for each player.
var scoreA = 0, scoreB = 0;

/*
 *
 * The game data will be stored in a square array with [0][0] representing the
 * leftmost hexagon on the board, The first coordinate specifies the column and
 * the second the row. Imagine a square tilted 45 degrees counterclockwise, and
 * that is the coordinate representation.
 * 
 * Technically, this isn't really a 2-d array, more like an array of arrays, but
 * in practice it will work the same way. It's created in the reset() function.
 * 
 * The way this data structure is going to work is, it'll be an array2 of 'int's
 * following the following rules:
 * 0 = Normal tiles (unoccupied)
 * 1 = Occupied by A
 * 2 = Occupied by B
 * 3 = Unoccupied highlighted tile
 * 
 * Whether a tile is a goal tile or not (aka, what border to draw) will be
 * determined by the repaint method.
 */
var tiles;

/**
 * Creates the canvas context and assigns it to the 'global' variable context.
 * Call once only once per page load please.
 * 
 * Also loads our images into memory.
 */
function initEverything(size) {
    gameSize = size;
    
    var element = document.getElementById(canvasName);

    if (element.getContext) {
        context = element.getContext('2d');
        
        //Determine width and height for local use.
        canvasWidth = element.getAttribute('width');
        canvasHeight = element.getAttribute('height');
        
        centerX = canvasWidth / 2;
        centerY = canvasHeight / 2;
        
        //Load the images.
        imgBorderNormal = new Image();
        imgBorderNormal.src = "res/border_normal.png";
        
        imgBorderHighlight = new Image();
        imgBorderHighlight.src = "res/border_highlight.png";
        
        imgBorderA = new Image();
        imgBorderA.src = "res/border_a.png";
        
        imgBorderB = new Image();
        imgBorderB.src = "res/border_b.png";
        
        imgFillNormal = new Image();
        imgFillNormal.src = "res/fill_normal.png";
        
        imgFillHighlight = new Image();
        imgFillHighlight.src = "res/fill_highlight.png";
        
        imgFillA = new Image();
        imgFillA.src = "res/fill_a.png";
        
        imgFillB = new Image();
        imgFillB.src = "res/fill_b.png";
        
        imgBorderCorner = new Image();
        imgBorderCorner.src = "res/border_both.png";
        
        resetGame();
        repaint();
        inited = true;
    } else {
        alert('This browser doesn\'t support HTML5, sorry!');
    }
}

/**
 * Fills the background considering current circumstances.
 */
function paintBackground() {
    //Default. Paint the background black.
    context.fillStyle = "#010101";
    
    //Well, if the game's over, paint the BG the color of the victor. Victor is
    //whoevers turn it still is since the turn switch doesn't happen until after
    //victory conditions are checked.
    if (gameOver) {
        if (!turn) {
            //Player A won
            context.fillStyle = "#020";
        } else {
            //Player B won
            context.fillStyle = "#220";
        }
    }
    
    context.beginPath();
    context.rect(0, 0, canvasWidth, canvasHeight);
    context.closePath();
    context.fill();
}

/**
 * Resets the entire game. Also used to "create" the initial game state (one and
 * the same, really).
 */
function resetGame() {
    if (gameSize < 3) {
        alert("Fail: gameSize must be >= 3.");
        return;
    }
    
    gameOver = false;
    turn = false;
    
    //Reset any game variables here.
    tiles = new Array(gameSize);
    for (var i = 0; i < gameSize; i++) {
        tiles[i] = new Array(gameSize);
        for (var j = 0; j < gameSize; j++) {
            //Set it to a blank tile.
            tiles[i][j] = 0;
        }
    }
}


/**
 * What we'll probably be calling every update when we click on the board. Looks
 * at the information stored in the array and paints the board accordingly.
 * 
 */
function repaint() {
    //Clear the background first, don't want any remnants left in places we
    //forgot to repaint.
    paintBackground();
    
    //Draw the tiles and tile borders. Most of this is positioning code for the
    //tiles.

    
    for (var i = 0; i < gameSize; i++) {
        for (var j = 0; j < gameSize; j++) {
            //Decide which image to put here.
            var currentBorderToPaint, currentFillToPaint;
            
            //If we don't get hit by a special case, it's a normal tile.
            currentBorderToPaint = imgBorderNormal;
            
            //As far as the corners go, we'll just paint everything normally
            //pretending they don't exist, until we get to the last lines
            //which willl do the additional check. Cleaner code that way.
            
            if (j == 0 || j == gameSize - 1) {
                //Most of these are A's goal.
                currentBorderToPaint = imgBorderA;
            }
            
            if (i == 0 || i == gameSize - 1) {
                //Most of these are B's goal.
                currentBorderToPaint = imgBorderB;   
            }
            
            //Check if it's a corner piece and quickly swap the image pointer to
            //represent that before we paint it.
            if ((j == 0 && i == 0) || (j== 0 && i==gameSize - 1) ||
                (j == gameSize - 1 && i == 0) ||
                (j == gameSize -1 && i == gameSize -1)){
                currentBorderToPaint = imgBorderCorner;
            }
                
            
            //Decide who owns the tile...
            switch (tiles[j][i]) {
                case 1:
                    currentFillToPaint = imgFillA;
                    break;
                case 2:
                    currentFillToPaint = imgFillB;
                    break;
                case 3:
                    currentFillToPaint = imgFillHighlight;
                    break;
                default:
                    currentFillToPaint = imgFillNormal;
            }
            
            //Figure out where to paint this tile. Should be fairly easy, Use
            //the calculated center of the board and go from there. The middle
            //tile needs to go in the center, so we'll normalize around that.
            
            //Draw the border.
            context.drawImage(currentBorderToPaint,
                centerX +  tileHorizontalSeparation - tileImageSize / 2 - (gameSize * tileHorizontalSeparation) 
                + (j * tileHorizontalSeparation)
                + (i * tileHorizontalSeparation),
            
                centerY - tileVerticalSeparation
                - (j * tileVerticalSeparation)
                + (i * tileVerticalSeparation)
    
                );
                    
            //And the fill...
            context.drawImage(currentFillToPaint,
                centerX + tileHorizontalSeparation - tileImageSize / 2 - (gameSize * tileHorizontalSeparation) 
                + (j * tileHorizontalSeparation)
                + (i * tileHorizontalSeparation),
            
                centerY - tileVerticalSeparation
                - (j * tileVerticalSeparation)
                + (i * tileVerticalSeparation)
    
                );
        }
    }
    
    //Draw the current turn tile in the upper left.
    context.drawImage(imgBorderHighlight, 0, (turn ? tileImageSize : 0));
    context.drawImage(imgFillA, 0, 0);
    context.drawImage(imgFillB, 0, tileImageSize);
}


/**
 *Resolves the given canvas position to the hex tile it corresponds to. Returns
 * j * gameSize + i if such a tile exists, otherwise -1.
 */
function resolveCanvasPositionToArrayIndex(x, y) {
    //We'll kind of reverse engineer the position algorithms to determine which
    //tile index *should* be here, and if it's out of range then reject it.
    
    //I treated the position-determining algorithm from the repaint method as
    //the x and y position given i and j, so we basically find the inverse of
    //that by solving the two systems for i and j. It's not pretty, but it
    //should work.
    var foundI = Math.floor((-centerY * tileHorizontalSeparation -
        centerX * tileVerticalSeparation +
        gameSize * tileHorizontalSeparation * tileVerticalSeparation +
        tileVerticalSeparation * x + tileHorizontalSeparation * y) / 
    (2 * tileHorizontalSeparation * tileVerticalSeparation));
    
    var foundJ = Math.ceil((centerY * tileHorizontalSeparation -
        centerX * tileVerticalSeparation +
        gameSize * tileHorizontalSeparation * tileVerticalSeparation +
        tileVerticalSeparation * x - tileHorizontalSeparation * y -
        2 * tileHorizontalSeparation * tileVerticalSeparation) /
    (2 * tileHorizontalSeparation * tileVerticalSeparation));
            
    if (foundJ < 0 || foundI < 0 || foundI >= gameSize || foundJ >= gameSize) {
        return -1;
    } else {
        return gameSize * foundJ + foundI;
    }
}

/**
 * Called by the onmousemove attribute of the canvas - keeps the local mouse
 * position up to date, and then repaints the screen to reflect any changes.
 */
function updateMousePosition(event) {
    //Don't do anything until we've been completely inited, or the game is done
    if (!inited || gameOver) {
        return;
    }
    
    //From stackoverflow.com/questions/1114465/getting-mouse-location-in-canvas
    if (event.offsetX) {
        mouseX = event.offsetX;
        mouseY = event.offsetY;
    } else if(event.layerX) {
        mouseX = event.layerX;
        mouseY = event.layerY;
    }
    //End from ----------------------------------------------------------------
    
    //Check if it's on a tile and set that tile highlighted...
    var tileIdx = resolveCanvasPositionToArrayIndex(mouseX, mouseY);
    
    //Find and reset any highlights...
    for (var i = 0; i < gameSize; i++) {
        for (var j = 0; j < gameSize; j++) {
            if (tiles[j][i] == 3) {
                tiles[j][i] = 0;
            }
        }
    }
        
    //If the current tile is unowned, highlighht it to indicate we could move
    //there.
    if (tileIdx != -1) {
        if (tiles[Math.floor(tileIdx/gameSize)][tileIdx%gameSize] == 0) {
            tiles[Math.floor(tileIdx / gameSize)][tileIdx % gameSize] = 3;
        }
    }
    
    repaint();
    
}

/**
 * The mouse was clicked in our canvas - check to see if mouseX and mouseY are
 * a tile, and then update that tile for the player.
 * After that, check for victory conditions.
 * And then repaint.
 */
function mouseClicked() {
    //If the round is over, reset the game.
    if (gameOver) {
        resetGame();
        repaint();

        return;
    }
    
    //Find if we're on a tile that we can change.
    var changed = false;
    
    var tileIdx = resolveCanvasPositionToArrayIndex(mouseX, mouseY);
    if (tileIdx != -1) {
        //The type will either be 3 (likely, since we're hovering over it) or
        //1 on the off-chance we've gone somewhere without hovering first (but
        //could happen if we're on a mobile device or something).
        var tileType = tiles[Math.floor(tileIdx/gameSize)][tileIdx%gameSize];
        
        if (tileType == 0 || tileType == 3) {
            tiles[Math.floor(tileIdx / gameSize)][tileIdx % gameSize] = (turn 
                ? 2 : 1);
            
            changed = true;
        }
    }
    
    if (changed) {
        checkForVictory();
        
        if (gameOver) {
            return;
        }
        //Switch the turn.
        turn = !turn;
        
        //Update the turn display and show our new tile.
        repaint();
    }
}

var visitedForVictoryCheck;

/**
 * How we'll check for victory is like this: For each player, we define a "low
 * side" and a "high side". We'll check each occupied tile by that own player
 * in their low side, and recursively try to make a path to the high side. Since
 * that is the only way to win, if we cannot make such a path from any tile the
 * player owns in his own low side, they have not won.
 */
function checkForVictory() {
    //Reset the visited array...
    visitedForVictoryCheck = new Array(gameSize);
    for (var x = 0; x < gameSize; x++) {
        visitedForVictoryCheck[x] = new Array(gameSize);
        for (var y = 0; y < gameSize; y++) {
            visitedForVictoryCheck[x][y] = 0;
        }
    }
    
    if (!turn) {
        //Check A's low side, which is where j = 0 and i = 0 to gameSize -2 (since that last one is yellow's high side).
        //1.0.1: Now checking up through that last tile, so up to gameSize (universal corners).
        for (var i = 0; i < gameSize /*- 1*/; i++) {
            if (tiles[0][i] == 1) {
                if (hasPathToHighGround(i)) {
                    gameOver = true;
                    break;
                }
            }
        }
    
    } else {
        //Check B's low side, where i = 0 and j = 1 to gameSize - 1.
        //1.0.1: Now checking through the last tile, because of universal corners.
        for (var j = 0 /*1*/; j < gameSize; j++) {
            if (tiles[j][0] == 2) {
                if (hasPathToHighGround(j * gameSize)) {
                    gameOver = true;
                    break;
                }
            }
        }
    }
    
    if (gameOver) {
        if (!turn) {
            scoreA++;
        } else {
            scoreB++;
        }
        
        //Update the scores
        document.getElementById('playerAScore').innerHTML = scoreA;
        document.getElementById('playerBScore').innerHTML = scoreB;
        
        repaint();
    }
}


/**
 * Checks to see if there exists a path between this tile through tiles colored
 * similarily to it, to A's high side.
 */
function hasPathToHighGround(tileIdx) {
    var jC = Math.floor(tileIdx / gameSize);
    var iC = tileIdx % gameSize;
    
    //If this tile is visited already, back up.
    if (visitedForVictoryCheck[jC][iC] == 1) {
        return false;
    }
    
    //If we're not the color of the current turn, return false.
    if (tiles[jC][iC] != (turn ? 2 : 1)) {
        return false;
    }
    
    //Base case - we either wind up in the high side, or we have no other
    //connections to follow except the one we came from.
    if (!turn) {
        //This is player A's victory condition:  Also, iC can't be zero
        //since that's B's low side.
        //1.0.1: It totally can be zero because corners are now universal.
        if (jC == gameSize - 1 /*&& iC != 0*/) {
            //We're in!
            return true;
        }        
    }else {
        //1.0.1: Also allowing corner victories for B.
        if (iC == gameSize - 1 /*&& jC != gameSize - 1*/) {
            return true;
        }    
    }
    
    //Mark visited.
    visitedForVictoryCheck[jC][iC] = 1;
    
    var everTrue = false;
    
    //Look at surrounding tiles. If any are eligible, run this on them too.
    //Tiles we need to check are:
    
    // j - 1
    // j - 1 and i + 1
    if (jC - 1 >= 0) {
        //Check j-1
        if (hasPathToHighGround((jC - 1) * gameSize + iC)) {
            everTrue = true;
        }
        
        //Check j-1, i+1
        if (iC + 1 < gameSize) {
            if (hasPathToHighGround((jC - 1) * gameSize + iC + 1)) {
                everTrue = true;
            }
        }
    }
        
    // i - 1
    // j + 1 and i - 1
    if (iC - 1 >= 0) {
        if (hasPathToHighGround((jC * gameSize + iC - 1))) {
            everTrue = true;
        }
        
        if (jC + 1 < gameSize) {
            if (hasPathToHighGround(((jC + 1) * gameSize + iC - 1))) {
                everTrue = true;
            }
        }
    }
    
    // i + 1
    // j + 1
    if (iC + 1 < gameSize) {
        if (hasPathToHighGround(jC * gameSize + iC + 1)) {
            everTrue = true;
        }
    }
        
    if (jC + 1 < gameSize) {
        if (hasPathToHighGround((jC + 1) * gameSize + iC)) {
            everTrue = true;
        }
    }
        
    return everTrue;
}