/**
 * Created by eric on 4/11/16.
 */
var _ = require('lodash');
var Table = require('cli-table');
var colors = require('colors');

function Grid(startGrid) {
  this.data = startGrid;
}

Object.defineProperty(Grid.prototype, 'length', {
  get: function () {
    return this.data.length;
  }
});

Grid.prototype.render = function (newTile) {
  var gameGrid = new Table();
  var tempGrid = JSON.parse(JSON.stringify(this.data));
  if (newTile) {
    for (var i = 0; i < tempGrid.length; i++) {
      if (_.uniq(_.values(newTile[i])).length !== 1) {
        for (var j = 0; j < tempGrid[i].length; j++) {
          if (newTile[i][j] !== -1) {
            tempGrid[i][j] = tempGrid[i][j].toString().yellow;
          }
        }
      }
    }
  }
  for (var i = 0; i < this.data.length; i++) {
    if (tempGrid) {
      gameGrid.push(tempGrid[i]);
    } else {
      gameGrid.push(this.data[i]);
    }
  }
  return "\n" + gameGrid.toString();
};

Grid.prototype.predict = function (direction) {
  var futureGrid = new Grid(JSON.parse(JSON.stringify(this.data)));
  switch (direction) {
    case 'up':
      futureGrid = new Grid(futureGrid.rotate('left'));
      break;
    case 'down':
      futureGrid = new Grid(futureGrid.rotate('right'));
      break;
    case 'left':
      // Already goes left
      break;
    case 'right':
      futureGrid = new Grid(futureGrid.rotate('down'));
      break;
  }
  for (var i = 0; i < futureGrid.length; i++) {
    for (var j = 0; j < futureGrid.data[i].length; j++) {
      if (futureGrid.getRight(i, j) !== -1) {
        if (futureGrid.getRight(i, j) === futureGrid.data[i][j]) {
          futureGrid.data[i][j] = futureGrid.data[i][j] * 2;
          futureGrid.data[i][j + 1] = 0;
        } else {
          for (k = j + 1; k < futureGrid.data[i].length; k++) {
            if (futureGrid.data[i][j] === futureGrid.data[i][k]) {
              futureGrid.data[i][j] = futureGrid.data[i][j] * 2;
              futureGrid.data[i][k] = 0;
              break;
            } else if (futureGrid.data[i][k] !== 0) {
              break;
            }
          }
        }
      }
    }
  }
  for (var i = 0; i < futureGrid.length; i++) {
    futureGrid.data[i] = _.filter(futureGrid.data[i], function (tile) {
      return tile !== 0;
    });
    for (var j = futureGrid.data[i].length; j < futureGrid.data.length; j++) {
      futureGrid.data[i][j] = 0;
    }
  }
  switch (direction) {
    case 'up':
      futureGrid = new Grid(futureGrid.rotate('right'));
      break;
    case 'down':
      futureGrid = new Grid(futureGrid.rotate('left'));
      break;
    case 'left':
      // Already goes left
      break;
    case 'right':
      futureGrid = new Grid(futureGrid.rotate('down'));
      break;
  }
  return futureGrid;
};

Grid.prototype.rotate = function (direction) {
  var rotatedGrid = [];
  for (var i = 0; i < this.data.length; i++) {
    rotatedGrid.push([]);
    for (var j = 0; j < this.data[i].length; j++) {
      switch (direction) {
        case 'left':
          rotatedGrid[i].push(this.data[j][this.data[i].length - i - 1]);
          break;
        case 'right':
          rotatedGrid[i].push(this.data[this.data[i].length - j - 1][i]);
          break;
        case 'down':
          rotatedGrid[i].push(this.data[this.data.length - 1 - i][this.data[i].length - 1 - j]);
          break;
        case 'up':
          rotatedGrid[i].push(this.data[i][j]);
          break;
      }
    }
  }
  return rotatedGrid;
};

Grid.prototype.directionMergeCounts = function () {
  var dir = this.validMoves();
  var moveScores = _.zipObject(this.validMoves(), [0, 0, 0, 0]);
  //console.log({moveScores:moveScores});
  for (var x = 0; x < this.data.length; x++) {
    for (var y = 0; y < this.data[x].length; y++) {
      if (this.data[x][y] !== 0) {
        var positions = {
          up: this.getUp(x, y),
          down: this.getDown(x, y),
          left: this.getLeft(x, y),
          right: this.getRight(x, y),
        };
        //console.log({positions: positions});
        for (var pos in dir) {
          if ((positions[dir[pos]] > 0) && (positions[dir[pos]] === this.data[x][y])) {
            moveScores[dir[pos]]++;
          }
        }
      }
    }
  }
  //console.log({weight:moveScores});
  return moveScores;
};

Grid.prototype.validMoves = function () {
  var moves = [];
  var dir = ['up', 'down', 'left', 'right'];
  for (var x = 0; x < this.data.length; x++) {
    for (var y = 0; y < this.data[x].length; y++) {
      if (this.data[x][y] !== 0) {
        var positions = {
          up: this.getUp(x, y),
          down: this.getDown(x, y),
          left: this.getLeft(x, y),
          right: this.getRight(x, y),
        };
        for (var pos in dir) {
          if ((positions[dir[pos]] !== -1) && (positions[dir[pos]] === this.data[x][y] || positions[dir[pos]] === 0)) {
            moves.push(dir[pos]);
          }
        }
      }
    }
  }
  return _.sortBy(_.uniq(moves));
};

Grid.prototype.diff = function (otherGrid) {
  var diffGrid = [];
  for (var i = 0; i < this.data.length; i++) {
    diffGrid.push([]);
    for (var j = 0; j < this.data[i].length; j++) {
      if (this.data[i][j] !== otherGrid[i][j]) {
        diffGrid[i].push(this.data[i][j]);
      } else {
        diffGrid[i].push(-1);
      }
    }
  }
  return diffGrid;
};

Grid.prototype.find = function (value) {
  var diffGrid = [];
  for (var i = 0; i < this.data.length; i++) {
    diffGrid.push([]);
    for (var j = 0; j < this.data[i].length; j++) {
      if (this.data[i][j] === value) {
        diffGrid[i].push(this.data[i][j]);
      } else {
        diffGrid[i].push(-1);
      }
    }
  }
  return diffGrid;
};

/* Get some generic data */
Grid.prototype.tileCount = function () {
  var counts = _.countBy(_.flattenDeep(this.data));
  delete counts[0];
  return counts;
};

Grid.prototype.maxTile = function () {
  return _.findLastKey(this.tileCount());
};

/* Get relative positions */
Grid.prototype.getUp = function (x, y) {
  if ((x - 1 >= 0 && y >= 0) && typeof this.data[x - 1] !== 'undefined') {
    return this.data[x - 1][y];
  }
  return -1;
};

Grid.prototype.getDown = function (x, y) {
  if ((x + 1 < this.data.length && y < this.data[x].length) && typeof this.data[x + 1] !== 'undefined') {
    return this.data[x + 1][y];
  }
  return -1;
};
Grid.prototype.getLeft = function (x, y) {
  if ((x >= 0 && y - 1 >= 0) && typeof this.data[x][y - 1] !== 'undefined') {
    return this.data[x][y - 1];
  }
  return -1;
};
Grid.prototype.getRight = function (x, y) {
  if ((x < this.data.length && y + 1 < this.data[x].length) && typeof this.data[x][y + 1] !== 'undefined') {
    return this.data[x][y + 1];
  }
  return -1;
};

/* Get board positions */
Grid.prototype.getTopLeft = function () {
  return this.data[0][0];
};
Grid.prototype.getTopRight = function () {
  return this.data[0][this.data[0].length - 1];
};
Grid.prototype.getBottomLeft = function () {
  return this.data[this.data.length - 1][0];
};
Grid.prototype.getBottomRight = function () {
  return this.data[this.data.length - 1][this.data[0].length - 1];
};

Grid.prototype.perfectBoard = function () {
  var response = {};
  response.tileCount = {};
  response.uniqTiles = [];
  for (var x = 1; x <= (this.data.length * this.data.length); x++) {
    response.uniqTiles.push(Math.pow(2, x));
    response.tileCount[Math.pow(2, x)] = 1;
  }
  response.maxTile = _.max(response.uniqTiles);
  return response;
};

Grid.prototype.isSorted = function (altGrid) {
  if (!altGrid) {
    altGrid = this;
  }
  var rotations = ['down', 'left', 'right', 'up'];
  var isSorted = false;
  _.each(rotations, function (move) {
    var originalGrid = _.flattenDeep(altGrid.rotate(move));
    var sortedGrid = JSON.parse(JSON.stringify(originalGrid));
    sortedGrid.sort();
    var reverseGrid = _.reverse(sortedGrid);
    if ((originalGrid.toString() === sortedGrid.toString()) || (originalGrid.toString() === reverseGrid.toString())) {
      isSorted = true;
    }
  });
  return isSorted;
};

Grid.prototype.sortedPercent = function (altGrid) {
  if (!altGrid) {
    altGrid = this;
  }
  var rotations = ['down', 'left', 'right', 'up'];
  var count = 0;
  _.each(rotations, function (move) {
    var directionA = altGrid.rotate(move);
    var directionB = altGrid.rotate(move);
    for (var i = 0; i < directionA.length; i++) {
      if (i % 2 === 1) {
        directionA[i] = _.reverse(directionA[i]);
      } else if (i % 2 === 0) {
        directionB[i] = _.reverse(directionB[i]);
      }

    }
    var flatA = _.flattenDeep(directionA);
    var flatB = _.flattenDeep(directionB);
    var sortedSet = JSON.parse(JSON.stringify(flatA));
    sortedSet.sort();
    var reverseGrid = _.reverse(sortedSet);
    var sortedACount = 0;
    var reverseACount = 0;
    var sortedBCount = 0;
    var reverseBCount = 0;
    for (var i = 0; i < flatA.length; i++) {
      if (sortedSet[i] !== 0) {
        if (flatA[i] === sortedSet[i]) {
          sortedACount++;
        }
        if (flatB[i] === sortedSet[i]) {
          sortedBCount++;
        }
      }
      if (reverseGrid[i] !== 0) {
        if (flatA[i] === reverseGrid[i]) {
          reverseACount++;
        }
        if (flatB[i] === reverseGrid[i]) {
          reverseBCount++;
        }
      }
    }
    count = count < sortedACount ? sortedACount : count;
    count = count < sortedBCount ? sortedBCount : count;
    count = count < reverseACount ? reverseACount : count;
    count = count < reverseBCount ? reverseBCount : count;
  });
  return (count / _.flattenDeep(altGrid.data).length);
};

Grid.prototype.progress = function () {
  var thisGrid = this;
  var perfect = this.perfectBoard();
  if (thisGrid.tileCount() == perfect.tileCount) { // Doesn't matter how the board looks, but we have all the right pieces
    return 100;
  }
  var boardPercent = (_.sum(_.flattenDeep(thisGrid.data)) / _.sum(perfect.uniqTiles) * 100);
  var boardUniq = _.max(_.values(thisGrid.tileCount()));
  var boardCount = (1 / _.values(thisGrid.tileCount()).length);
  var maxTile = 1 - (1 / thisGrid.maxTile());
  var sortedPercent = thisGrid.sortedPercent();
  var score = (boardPercent * .1) + (boardCount * .2) + (maxTile * .3) + (sortedPercent * .5);
  //var score = boardCount;
  //console.log(JSON.stringify({boardPercent:boardPercent,boardUniq:boardUniq,max:_.max(_.values(thisGrid.tileCount())),count:_.values(thisGrid.tileCount()).length,score:(boardPercent * .9) + (boardUniq * .1)}));
  if (false) {
    console.log(JSON.stringify({
      max: _.max(_.values(thisGrid.tileCount())),
      count: _.values(thisGrid.tileCount()).length,
      boardPercent: boardPercent,
      boardUniq: boardUniq,
      boardCount: boardCount,
      score: score
    }));
  }
  return score;
};

Grid.prototype.summary = function () {
  var thisGrid = this;
  var summaryData = {};
  summaryData.maxTile = thisGrid.maxTile();
  summaryData.tileCount = thisGrid.tileCount();
  summaryData.uniqTiles = Object.keys(summaryData.tileCount).sort();
  summaryData.validMoves = thisGrid.validMoves();
  summaryData.isSorted = thisGrid.isSorted();
  summaryData.sortedPercent = thisGrid.sortedPercent();
  summaryData.predictions = {};
  summaryData.nextProgress = {};
  summaryData.nextMaxTile = {};
  _.each(summaryData.validMoves, function (move) {
    summaryData.predictions[move] = thisGrid.predict(move).data;
    var tempGrid = new Grid(summaryData.predictions[move]);
    summaryData.nextProgress[move] = tempGrid.progress();
    summaryData.nextMaxTile[move] = tempGrid.maxTile();
  });
  summaryData.directionMergeCounts = thisGrid.directionMergeCounts();
  summaryData.progress = thisGrid.progress();

  return summaryData;
};

Grid.prototype.normalize = function () {
  var thisGrid = this;
  var rotations = ['down', 'left', 'right', 'up'];
  var candidate = JSON.parse(JSON.stringify(thisGrid.data));
  for (var direction in rotations) {
    direction = rotations[direction];
    var board = thisGrid.rotate(direction);
    for (var i = 0; i < board.length; i++) {
      if (_.sum(board[i]) > _.sum(candidate[i])) {
        candidate = JSON.parse(JSON.stringify(board));
        break;
      } else if (_.sum(board[i]) < _.sum(candidate[i])) {
        break;
      }
    }
  }
  var condensed = JSON.parse(JSON.stringify(candidate));
  var lastDeleted = candidate.length;
  for (var i = candidate.length - 1; i >= 0; i--) {
    var bottom = _.filter(candidate[i], function (x) {
      return x !== 0;
    });
    var right = _.filter(_.map(candidate, function (val, key) {
      return candidate[key][i]
    }), function (x) {
      return x !== 0;
    });
    if (bottom.length === 0 && right.length === 0 && (i + 1 === lastDeleted)) {
      for (var j = 0; j < condensed.length; j++) {
        condensed[j].splice(i, 1);
      }
      condensed.splice(i, 1);
      lastDeleted = i;
    }
    //console.log({bottom: bottom, right: right});
  }
  //console.log({condensed:condensed,lastDeleted:lastDeleted});
  if (condensed.length > 0 && condensed.length < candidate.length) {
    return condensed;
  } else {
    return candidate;
  }
};

Grid.prototype.nearEnd = function (thisGrid) {
  if (!thisGrid) {
    thisGrid = this;
  }
  /* Original version by counting 0's */
  var zeroes = _.filter(_.flattenDeep(thisGrid.data), function (item) {
    return item === 0;
  }).length;
  //console.log({zeroes:zeroes});
  if (zeroes === 0) {
    return true;
  }
  // New version by checking if a 2 and 4 are near the zeros
  var has2 = false;
  var has4 = false;
  for (var i = 0; i < thisGrid.data.length; i++) {
    for (var j = 0; j < thisGrid.data[i].length; j++) {
      if (thisGrid.data[i][j] === 0) {
        if (thisGrid.getUp(i, j) === 2 || thisGrid.getDown(i, j) === 2 || thisGrid.getLeft(i, j) === 2 || thisGrid.getRight(i, j) === 2) {
          has2 = true;
        }
        if (thisGrid.getUp(i, j) === 4 || thisGrid.getDown(i, j) === 4 || thisGrid.getLeft(i, j) === 4 || thisGrid.getRight(i, j) === 4) {
          has4 = true;
        }
      }
      if (has2 && has4 && zeroes >= 1) {
        return false;
      }
    }
  }
  return !(has2 && has4);
  //return true;
};

module.exports = Grid;
