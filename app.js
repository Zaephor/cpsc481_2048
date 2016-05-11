"use strict";
require('rootpath')();
var Promise = require("bluebird");
var clear = require('clear');
var _ = require('lodash');

var client = require('lib/GameClient.js');
var decisionMaker = require('lib/DecisionMaker.js');
var Grid = require('lib/Grid.js');

/* DB Stuff */
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
//mongoose.connect('mongodb://localhost/cpsc481_2048');
mongoose.connect('mongodb://localhost/cpsc481_2048_2');
var Log = require('db/log.js');
var Tree = require('db/tree.js');
var StatTurn = require('db/statTurn.js');

/* Configurable */

//var algorithms = ["first", "last", "random"];
//var algorithms = ["first", "last", "random", "treeDb_followProgress", "treeDb_first", "treeDb_last", "treeDb_random", "treeDb_firstlastprogress"];
//var algorithms = ["first", "last", "random", "followProgress", "treeDb_followProgress", "treeDb_first", "treeDb_last", "treeDb_random", "treeDb_firstlastprogress"];
//var algorithms = ["treeDb_followProgress", "treeDb_first", "treeDb_last", "treeDb_random", "treeDb_firstlastprogress"];
//var algorithms = ["treeDb_followProgress", "treeDb_followMaxTile", "treeDb_firstlastprogress", "treeDb_firstlastmaxtile"];
var algorithms = ["treeDb_followProgress", "treeDb_firstlastprogress", "treeDb_followMaxTile", "treeDb_firstlastmaxtile", "treeDb_first", "treeDb_last",];
var turnSpeed = 1;
var rerun = 1;

var summary = [];
var games = [];
var count = 0;

(function repeat() {
  if (count < rerun) {
    count++;
    var random = Math.floor(Math.random() * (algorithms.length));
    var random2 = (random+1) % algorithms.length;
    var random3 = (random+2) % algorithms.length;
    return Promise
      .each([algorithms[random]], function (item) {
      //.each([algorithms[random],algorithms[random2],algorithms[random3]], function (item) {

        return client
          .start()
          .then(function (gamestate) {
            gamestate.algorithm = item;
            gamestate.maxTile = new Grid(item.grid).maxTile();
            games.push(gamestate);
            return gamestate;
          });
      })
      .then(function () {

        return (function loop() {
          if (games.length > 0) {

            return Promise
              .each(games, function (game, gameIndex) {
                //games[gameIndex].desiredMove = decisionMaker(game, game.algorithm);
                //games[gameIndex].predict_next = new Grid(game.grid).predict(game.desiredMove).data;
                return decisionMaker(game, game.algorithm).then(function (decision) {
                  games[gameIndex].desiredMove = decision.move;
                  games[gameIndex].origin = decision.origin;
                  games[gameIndex].predict_next = new Grid(game.grid).predict(decision.move).data;
                });
                //return Promise.resolve(games[gameIndex].desiredMove);
              })
              .then(function () {
                //console.log(client.renderMulti(games));
                return '';
              })
              .then(function () {
                clear(); // TOOD: DISABLE THIS FOR DEBUGGING
                console.log(client.renderMulti(games));
                return Promise
                  .each(games, function (game, gameIndex) {
                    return client
                      .move(game, game.desiredMove)
                      .then(function (gamestate) {
                        games[gameIndex] = gamestate;
                      });
                  })
                  .then(function () {
                    //console.log(JSON.stringify({games:games}));
                    _.forEachRight(games, function (value, gameIndex) {
                      if (games[gameIndex].over) {
                        summary.push(games.splice(gameIndex, 1)[0]);
                      }
                    });
                  });

              })
              .delay(turnSpeed)
              .then(loop);
            //return Promise.delay(turnSpeed).then(loop);
          }
          return Promise.resolve();
        })()
          .then(function () {
            return Promise.each(summary, function (game, gameIndex) {
              return Log
                .find({session_id: game.session_id})
                .exec(function (err, logData) {
                  //console.log({map: _.map(logData,'_id')});
                  var treeEntries = _.map(logData, function (o) {
                    return mongoose.Types.ObjectId(o.tree);
                  });
                  //console.log(temp);
                  return Tree.update({_id: {$in: treeEntries}}, {
                    $max: {maxChainScore: game.score, maxChainTile: game.maxTile},
                    $min: {minChainScore: game.score, minChainTile: game.maxTile},
                    $inc: {sumChainScore: game.score, sumChainTile: game.maxTile, updates: 1}
                  }, {multi: true}).exec(function (err, results) {
                    return Tree.find({_id: {$in: treeEntries}}).then(function (treeData) {
                      return Promise.each(treeData, function (treeEntry) {
                        return Tree.update({_id: treeEntry._id}, {
                          $set: {
                            aveChainScore: (treeEntry.sumChainScore / treeEntry.updates),
                            aveChainTile: (treeEntry.sumChainTile / treeEntry.updates),
                            aveScore: (treeEntry.sumScore / treeEntry.updates)
                          }
                        }).exec();
                      });
                    });
                  });
                })
            })
          })
          .then(function () {
            clear(); // TOOD: DISABLE THIS FOR DEBUGGING
            console.log(client.renderMulti(summary));
            console.log("Completed " + Object.keys(summary).length + " sessions.");
            summary = [];
            games = [];
          });

      }).delay(turnSpeed).then(repeat);
  }
  return Promise.resolve();
})().then(function () {
  console.log('Repeated process ' + count + ' times.');
  process.exit();
});
