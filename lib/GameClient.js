/**
 * Created by eric on 4/11/16.
 */
"use strict";
var Promise = require("bluebird");
var _ = require('lodash');
var request = require('request-promise');
var Grid = require('lib/Grid.js');
var Table = require('cli-table');
var Log = require('db/log.js');
var StatTurn = require('db/statTurn.js');

/* Gameserver stuff */
var config = {
  server: "http://127.0.0.1:8080",
  size: 3, // 3x3 grid, 4x4 grid, etc
  tiles: 2,
  victory: 11, // 4x4 victory=11
  rand: 2,
};

var GameClient = {};

GameClient.start = function (size) {
  if (!size) {
    size = config.size;
  }
  var options = {
    uri: config.server + '/hi/start/size/' + size + '/tiles/' + config.tiles + '/victory/' + config.victory + '/rand/' + config.rand + '/json',
    json: true
  };
  return request(options).then(function (data) {
    var tempGrid = new Grid(data.grid);
    data.turn = 0;
    data.maxTile = tempGrid.maxTile();
    data.progress = tempGrid.progress();
    //console.log(data);
    return data;
  });
};

GameClient.move = function (gamestate, direction) {
  var turn = gamestate.turn;
  var algorithm = gamestate.algorithm;
  var map = {'up': 0, 'right': 1, 'down': 2, 'left': 3};
  var options = {
    uri: config.server + '/hi/state/' + gamestate.session_id + '/move/' + map[direction] + '/json',
    json: true
  };
  new Log(gamestate).save();
  var boardValue = _.sum(_.flattenDeep(gamestate.grid));
  return Promise.resolve().then(function () {
    return StatTurn.findOneAndUpdate({algorithm: gamestate.algorithm, turn: gamestate.turn}, {
      $max: {maxBoardScore: gamestate.score || 0, maxBoardValue: boardValue, maxTile: _.max(gamestate.uniqTiles) || 0},
      $min: {minBoardScore: gamestate.score || 0, minBoardValue: boardValue, minTile: _.min(gamestate.uniqTiles) || 0},
      $inc: {
        hits: 1,
        sumBoardValue: boardValue,
        sumBoardScore: gamestate.score,
        originDatabase: (gamestate.origin === "database" ? 1 : 0),
        originAlgorithm: (gamestate.origin === "algorithm" ? 1 : 0)
      }
    }, {upsert: true}).then(function () {
      return StatTurn
        .findOneAndUpdate({turn: gamestate.turn, algorithm: 'all'}, {
          $max: {
            maxBoardScore: gamestate.score || 0,
            maxBoardValue: boardValue,
            maxTile: _.max(gamestate.uniqTiles) || 0
          },
          $min: {
            minBoardScore: gamestate.score || 0,
            minBoardValue: boardValue,
            minTile: _.min(gamestate.uniqTiles) || 0
          },
          $inc: {
            hits: 1,
            sumBoardValue: boardValue,
            sumBoardScore: gamestate.score,
            originDatabase: (gamestate.origin === "database" ? 1 : 0),
            originAlgorithm: (gamestate.origin === "algorithm" ? 1 : 0)
          }
        }, {upsert: true}).exec();
    });
  }).then(function () {
    //console.log({gamestate: gamestate});
    return request(options)
      .then(function (data) {
        data.turn = ++turn;
        data.algorithm = algorithm;
        data.predict_this = gamestate.predict_next;
        var tempGrid = new Grid(data.grid);
        var summary = tempGrid.summary();
        data.newTile = tempGrid.diff(gamestate.predict_next);

        for (var element in summary) {
          data[element] = summary[element];
        }
        //console.log({data:data});
        return data;
      });
  });
};

GameClient.render = function (gamestate) {
  var gameStats = new Table();
  //console.log({gamestate:gamestate});
  //gameStats.push({Session:gamestate.session_id});
  gameStats.push({Algorithm: gamestate.algorithm});
  gameStats.push({Turn: gamestate.turn});
  gameStats.push({Score: gamestate.score});
  gameStats.push({Over: gamestate.over});
  if (gamestate.desiredMove) {
    gameStats.push({"Desired Move": gamestate.desiredMove});
  }
  gameStats.push({Grid: new Grid(gamestate.grid).render()});
  return "\n" + gameStats.toString();
};

GameClient.renderMulti = function (gamestates) {
  var gameStats = new Table();
  var grids = [];
  var predicts = [];
  var maxTiles = [];
  var desired = [];
  var origin = [];

  _.each(gamestates, function (val, key) {
    if (val.grid) {
      var tempGrid = new Grid(val.grid);
      tempGrid.normalize();
      grids.push(tempGrid.render(val.newTile));
      //grids.push(tempGrid.render());
      maxTiles.push(tempGrid.maxTile());
    }
    if (val.desiredMove) {
      desired.push(val.desiredMove);
    } else {
      desired.push('');
    }
    if (val.predict_next) {
      predicts.push(new Grid(val.predict_next).render());
    } else {
      predicts.push('');
    }
  });

  //gameStats.push({Session: _.map(gamestates, 'session_id')});
  gameStats.push({Algorithm: _.map(gamestates, 'algorithm')});
  gameStats.push({Turn: _.map(gamestates, 'turn')});
  gameStats.push({Score: _.map(gamestates, 'score')});
  gameStats.push({"Max Tile": maxTiles});

  //console.log({gamestates:gamestates});
  gameStats.push({Progress: _.map(gamestates, 'progress')});

  gameStats.push({Grid: grids});
  gameStats.push({"Desired Move": desired});
  if (gamestates && gamestates[0] && gamestates[0].origin) {
    gameStats.push({Decision: _.map(gamestates, 'origin')});
  }
  gameStats.push({Predictions: predicts});
  //console.log(gamestates);
  return "\n" + gameStats.toString();
};

module.exports = GameClient;
