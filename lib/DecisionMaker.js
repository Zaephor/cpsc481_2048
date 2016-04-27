/**
 * Created by eric on 4/11/16.
 */
var Grid = require('lib/Grid.js');
var Promise = require("bluebird");
var crypto = require('crypto');
Promise.config({
  // Enable warnings
  warnings: true,
  // Enable long stack traces
  longStackTraces: true,
  // Enable cancellation
  cancellation: true,
  // Enable monitoring
  monitoring: true
});
var _ = require('lodash');
var Tree = require('db/tree.js');

var depthCap = 3;
var algorithms = {};

algorithms.first = function (gamestate) {
  var gridMoves = new Grid(gamestate.grid).validMoves();
  return Promise.resolve({move: gridMoves[0], origin: "algorithm"});
};

algorithms.last = function (gamestate) {
  var gridMoves = new Grid(gamestate.grid).validMoves();
  return Promise.resolve({move: gridMoves[gridMoves.length - 1], origin: "algorithm"});
};

algorithms.random = function (gamestate) {
  var gridMoves = new Grid(gamestate.grid).validMoves();
  return Promise.resolve({move: gridMoves[Math.floor(Math.random() * (gridMoves.length))], origin: "algorithm"});
};

algorithms.treeDb_random = function (gamestate) {
  return Promise.resolve(searchDbChainScore(gamestate)).then(function (outcome) {
    if (outcome === -1) {
      return Promise.resolve(algorithms.random(gamestate));
    } else {
      return Promise.resolve({move: outcome, origin: "database"});
    }
  });
};

algorithms.treeDb_first = function (gamestate) {
  return Promise.resolve(searchDbChainScore(gamestate)).then(function (outcome) {
    if (outcome === -1) {
      return Promise.resolve(algorithms.first(gamestate));
    } else {
      return Promise.resolve({move: outcome, origin: "database"});
    }
  });
};

algorithms.treeDb_last = function (gamestate) {
  return Promise.resolve(searchDbChainScore(gamestate)).then(function (outcome) {
    if (outcome === -1) {
      return Promise.resolve(algorithms.last(gamestate));
    } else {
      return Promise.resolve({move: outcome, origin: "database"});
    }
  });
};

algorithms.followProgress = function (gamestate) {
  var results = findProgress(new Grid(gamestate.grid), {score: gamestate.progress}, 0);
  //console.log({results: results});
  return Promise.resolve({move: results.direction, origin: "algorithm"});
};

algorithms.followMaxTile = function (gamestate) {
  var results = findMaxTile(new Grid(gamestate.grid), {maxTile: gamestate.maxTile}, 0);
  //console.log({results: results});
  return Promise.resolve({move: results.direction, origin: "algorithm"});
};

algorithms.treeDb_followProgress = function (gamestate) {
  return Promise.resolve(searchDbChainScore(gamestate)).then(function (outcome) {
    //console.log(JSON.stringify({outcome: outcome}));
    if (outcome === -1) {
      //return Promise.resolve(algorithms.random(gamestate));
      return Promise.resolve(algorithms.followProgress(gamestate));
    } else {
      return Promise.resolve({move: outcome, origin: "database"});
    }
  });
};

algorithms.treeDb_followMaxTile = function (gamestate) {
  return Promise.resolve(searchDbMaxTile(gamestate)).then(function (outcome) {
    //console.log(JSON.stringify({outcome: outcome}));
    if (outcome === -1) {
      //return Promise.resolve(algorithms.random(gamestate));
      return Promise.resolve(algorithms.followMaxTile(gamestate));
    } else {
      return Promise.resolve({move: outcome, origin: "database"});
    }
  });
};

algorithms.treeDb_firstlastprogress = function (gamestate) {
  return Promise.resolve(searchDbChainScore(gamestate)).then(function (outcome) {
    //console.log(JSON.stringify({outcome: outcome}));
    if (outcome === -1) {
      //return Promise.resolve(algorithms.last(gamestate));
      return Promise.resolve(firstlastprogress(gamestate));
    } else {
      return Promise.resolve({move: outcome, origin: "database"});
    }
  });
};

algorithms.treeDb_firstlastmaxtile = function (gamestate) {
  return Promise.resolve(searchDbMaxTile(gamestate)).then(function (outcome) {
    //console.log(JSON.stringify({outcome: outcome}));
    if (outcome === -1) {
      //return Promise.resolve(algorithms.last(gamestate));
      return Promise.resolve(firstlastmaxtile(gamestate));
    } else {
      return Promise.resolve({move: outcome, origin: "database"});
    }
  });
};

//=========================
var decide = function (gamestate, decisionLogic) {
  if (algorithms[decisionLogic]) {
    //return algorithms[decisionLogic](gamestate);
    return Promise.resolve(algorithms[decisionLogic](gamestate));
  } else {
    //return algorithms.random(gamestate);
    return Promise.resolve(algorithms.random(gamestate));
  }
};

module.exports = decide;

//=========================================================
var findProgress = function (grid, currentProgress, depth) {
  var summary = grid.summary();
  var candidateProgress = {};
  candidateProgress.direction = Object.keys(summary.nextProgress).reduce(function (a, b) {
    var aNearEnd = new Grid(summary.predictions[a]).nearEnd();
    var bNearEnd = new Grid(summary.predictions[b]).nearEnd();
    if (true) { // toggle checking nearend
      if ((!aNearEnd && !bNearEnd) || (aNearEnd && bNearEnd)) {
        return summary.nextProgress[a] > summary.nextProgress[b] ? a : b;
      } else if (!aNearEnd && bNearEnd) {
        return a;
      } else if (aNearEnd && !bNearEnd) {
        return b;
      }
    }
    return summary.nextProgress[a] > summary.nextProgress[b] ? a : b;
  });
  candidateProgress.score = summary.nextProgress[candidateProgress.direction];
  //console.log({scores: _.uniq(_.values(summary.nextProgress)), depth: depth});
  //if ((_.max(_.values(summary.tileCount)) === 1) || (currentProgress.score < candidateProgress.score && (_.uniq(_.values(summary.nextProgress).sort()).length === 1) || depth > depthCap)) {
  if ((currentProgress.score < candidateProgress.score && (_.uniq(_.values(summary.nextProgress).sort()).length === 1) || depth > depthCap)) {
    //if (depth > depthCap) {
    return candidateProgress;
  } else {
    var newMove = {};
    newMove.direction = Object.keys(summary.nextProgress).reduce(function (a, b) {
      return findProgress(new Grid(summary.predictions[a]), currentProgress, depth + 1).score > findProgress(new Grid(summary.predictions[b]), currentProgress, depth + 1).score ? a : b;
    });
    //newMove.score = summary.nextProgress[newMove.direction];
    newMove.score = findProgress(new Grid(summary.predictions[newMove.direction]), currentProgress, depth + 1).score;
    return newMove;
  }
};

var findMaxTile = function (grid, currentProgress, depth) {
  var summary = grid.summary();
  var candidateProgress = {};
  candidateProgress.direction = Object.keys(summary.nextMaxTile).reduce(function (a, b) {
    var aNearEnd = new Grid(summary.predictions[a]).nearEnd();
    var bNearEnd = new Grid(summary.predictions[b]).nearEnd();
    if (true) { // toggle checking nearend
      if ((!aNearEnd && !bNearEnd) || (aNearEnd && bNearEnd)) {
        return summary.nextMaxTile[a] > summary.nextMaxTile[b] ? a : b;
      } else if (!aNearEnd && bNearEnd) {
        return a;
      } else if (aNearEnd && !bNearEnd) {
        return b;
      }
    }
    return summary.nextMaxTile[a] > summary.nextMaxTile[b] ? a : b;
  });
  candidateProgress.maxTile = summary.nextMaxTile[candidateProgress.direction];
  //if ((_.max(_.values(summary.tileCount)) === 1) || (currentProgress.maxTile < candidateProgress.maxTile && (_.uniq(_.values(summary.nextMaxTile).sort()).length === 1) || depth > depthCap)) {
  if ((currentProgress.maxTile < candidateProgress.maxTile && (_.uniq(_.values(summary.nextMaxTile).sort()).length === 1) || depth > depthCap)) {
    //if (depth > depthCap) {
    return candidateProgress;
  } else {
    var newMove = {};
    newMove.direction = Object.keys(summary.nextMaxTile).reduce(function (a, b) {
      return findProgress(new Grid(summary.predictions[a]), currentProgress, depth + 1).maxTile > findProgress(new Grid(summary.predictions[b]), currentProgress, depth + 1).maxTile ? a : b;
    });
    //newMove.score = summary.nextProgress[newMove.direction];
    newMove.maxTile = findProgress(new Grid(summary.predictions[newMove.direction]), currentProgress, depth + 1).maxTile;
    return newMove;
  }
};

var searchDbChainScore = function (gamestate) {
  var summary = new Grid(gamestate.grid).summary();
  var moves = Object.keys(summary.predictions);
  var future = {};
  return Promise
    .each(moves, function (direction) {
      var board = summary.predictions[direction];
      future[direction] = {};
      future[direction].normal = new Grid(board).normalize();
      future[direction].normalHash = crypto.createHash('sha256').update(JSON.stringify(future[direction].normal)).digest("hex");
      future[direction].subscore = [];
      future[direction].nearEnd = future[direction].normal.length === board.length ? new Grid(future[direction].normal).nearEnd() : false;
      //return Tree.findOne({grid: future[direction].normal}).populate('next').then(function (treeData) {
      return Tree.findOne({gridHash: future[direction].normalHash}).populate('next').then(function (treeData) {
        //console.log(JSON.stringify({treeData:treeData}));
        if (typeof treeData === 'object' && !_.isNull(treeData)) {
          //console.log({treeData:treeData});
          if (treeData.aveChainScore && ((board.length === future[direction].normal.length && !treeData.nearEnd) || (board.length >= future[direction].normal.length))) { // Was based on max chain score, going to use average now
            future[direction].score = treeData.aveChainScore || treeData.maxChainScore; // DB-based max-score
          } else {
            future[direction].score = 0;
          }

          if (treeData.next && treeData.next.length > 0) {
            _.each(treeData.next, function (val) {
              //if (val.maxTile && ((board.length === val.grid.length && !val.nearEnd) || (board.length >= val.grid.length))) {
              if (val.aveChainScore && ((board.length === val.grid.length && !val.nearEnd) || (board.length >= val.grid.length))) {
                future[direction].subscore.push(val.aveChainScore || val.maxChainScore);
              }
            });
          }
          return '';
        } else {
          future[direction].score = -1;
          return '';
        }
      });
    })
    .then(function () {
      //console.log(JSON.stringify({future: future}));
      //var maxScore = _.max(_.map(future, 'score'));
      //var maxScore = _.max(_.map(future, function (o) {
      //  if (!o.nearEnd) {
      //    return o.score;
      //  }
      //})); // Find max non-near-end next score
      var maxSubScore = _.max(_.flattenDeep(_.map(future, 'subscore')));
      var choices = _.filter(Object.keys(future), function (move) {
        return ((future[move].score !== -1) && (!future[move].nearEnd)); // Just avoid the end for now... Testing
        //return ((future[move].score !== -1) && (!future[move].nearEnd) && (future[move].score === maxScore)); // score === maxScore?
        //return ((future[move].score !== -1) && (future[move].score === maxScore)); // score === maxScore?
      });
      //console.log({choices: choices});
      if (choices.length > 1) { // Might be more effective if I ignore maxsubscore? We'll see
        choices = _.filter(choices, function (move) {
          return ((typeof future[move] !== 'undefined') && (future[move].subscore.indexOf(maxSubScore) !== -1));
        });
      }
      if (choices.length === 0) {
        return Promise.resolve(-1);
      } else if (choices.length === 1) {
        return Promise.resolve(choices[0]);
      } else {
        return Promise.resolve(choices[Math.floor(Math.random() * (choices.length))]);
      }
    });
  //return Promise.resolve(-1);
};

var searchDbMaxTile = function (gamestate) {
  var summary = new Grid(gamestate.grid).summary();
  var moves = Object.keys(summary.predictions);
  var future = {};
  return Promise
    .each(moves, function (direction) {
      var board = summary.predictions[direction];
      future[direction] = {};
      future[direction].normal = new Grid(board).normalize();
      future[direction].normalHash = crypto.createHash('sha256').update(JSON.stringify(future[direction].normal)).digest("hex");
      future[direction].subscore = [];
      //future[direction].nearEnd = new Grid(future[direction].normal).nearEnd();
      future[direction].nearEnd = future[direction].normal.length === board.length ? new Grid(future[direction].normal).nearEnd() : false;
      //return Tree.findOne({grid: future[direction].normal}).populate('next').then(function (treeData) {
      return Tree.findOne({gridHash: future[direction].normalHash}).populate('next').then(function (treeData) {
        //console.log(JSON.stringify({treeData:treeData}));
        if (typeof treeData === 'object' && !_.isNull(treeData)) {
          //console.log({treeData:treeData});
          if (treeData.maxTile && ((board.length === future[direction].normal.length && !treeData.nearEnd) || (board.length >= future[direction].normal.length))) {
            future[direction].score = treeData.aveChainTile || treeData.maxTile; // DB-based max-score
          } else {
            future[direction].score = 0;
          }

          if (treeData.next && treeData.next.length > 0) {
            _.each(treeData.next, function (val) {
              if (val.maxTile && ((board.length === val.grid.length && !val.nearEnd) || (board.length >= val.grid.length))) {
                future[direction].subscore.push(val.aveChainTile || val.maxTile);
              }
            });
          }
          return '';
        } else {
          future[direction].score = -1;
          return '';
        }
      });
    })
    .then(function () {
      //console.log(JSON.stringify({future: future}));
      //var maxScore = _.max(_.map(future, 'score'));
      var maxScore = _.max(_.map(future, function (o) {
        if (!o.nearEnd) {
          return o.score;
        }
      })); // Find max non-near-end next score
      var maxSubScore = _.max(_.flattenDeep(_.map(future, 'subscore')));
      var choices = _.filter(Object.keys(future), function (move) {
        return ((future[move].score !== -1) && (!future[move].nearEnd)); // Disregard maxscore, juts avoid the end
        //return ((future[move].score !== -1) && (!future[move].nearEnd) && (future[move].score === maxScore)); // score === maxScore?
        //return ((future[move].score !== -1) && (future[move].score === maxScore)); // score === maxScore?
      });
      //console.log({choices: choices});
      if (choices.length > 1) { // Testing with disregard for max subscore
        choices = _.filter(choices, function (move) {
          return ((typeof future[move] !== 'undefined') && (future[move].subscore.indexOf(maxSubScore) !== -1));
        });
      }
      if (choices.length === 0) {
        return Promise.resolve(-1);
      } else if (choices.length === 1) {
        return Promise.resolve(choices[0]);
      } else {
        return Promise.resolve(choices[Math.floor(Math.random() * (choices.length))]);
      }
    });
  //return Promise.resolve(-1);
};

var firstlastprogress = function (gamestate) {
  var isCloserToLast = false;
  var isCloserToFirst = false;
  for (var i = 0; i < gamestate.grid.length; i++) {
    for (var j = 0; j < gamestate.grid[i].length; j++) {
      if (gamestate.grid[i][j] === gamestate.maxTile) {
        if (i < gamestate.grid.length / 2 || j > gamestate.grid[i].length / 2) { // up+right
          isCloserToLast = true;
        }
        if (i > gamestate.grid.length / 2 || j < gamestate.grid[i].length / 2) { // down+left
          isCloserToFirst = true;
        }
      }
    }
  }
  if (isCloserToLast && !isCloserToFirst) {
    return Promise.resolve(algorithms.last(gamestate));
  } else if (isCloserToFirst && !isCloserToLast) {
    return Promise.resolve(algorithms.first(gamestate));
  } else {
    //return Promise.resolve(algorithms.random(gamestate));
    return Promise.resolve(algorithms.followProgress(gamestate));
  }
};

var firstlastmaxtile = function (gamestate) {
  var isCloserToLast = false;
  var isCloserToFirst = false;
  for (var i = 0; i < gamestate.grid.length; i++) {
    for (var j = 0; j < gamestate.grid[i].length; j++) {
      if (gamestate.grid[i][j] === gamestate.maxTile) {
        if (i < gamestate.grid.length / 2 || j > gamestate.grid[i].length / 2) { // up+right
          isCloserToLast = true;
        }
        if (i > gamestate.grid.length / 2 || j < gamestate.grid[i].length / 2) { // down+left
          isCloserToFirst = true;
        }
      }
    }
  }
  if (isCloserToLast && !isCloserToFirst) {
    return Promise.resolve(algorithms.last(gamestate));
  } else if (isCloserToFirst && !isCloserToLast) {
    return Promise.resolve(algorithms.first(gamestate));
  } else {
    //return Promise.resolve(algorithms.random(gamestate));
    return Promise.resolve(algorithms.followMaxTile(gamestate));
  }
};
