/**
 * Created by eric on 4/24/16.
 */
"use strict";
require('rootpath')();
var Promise = require("bluebird");
var clear = require('clear');
var _ = require('lodash');

//var client = require('lib/GameClient.js');
//var decisionMaker = require('lib/DecisionMaker.js');
//var Grid = require('lib/Grid.js');

/* DB Stuff */
var mongoose = require('mongoose');
mongoose.set('debug', true);
mongoose.Promise = require('bluebird');
//mongoose.connect('mongodb://localhost/cpsc481_2048');
mongoose.connect('mongodb://10.0.0.94/cpsc481_2048_2');
var Log = require('db/log.js');
//var Tree = require('db/tree.js');
var StatTurn = require('db/statTurn.js');

(function () {
  return Promise
    .resolve()
    .then(function () {
      return Log
        .distinct('algorithm')
        .then(function (knownAlgs) {
          knownAlgs.push('all');
          return Promise
            .each(_.range(150, 0), function (turnNumber) {
              return Promise
                .each(knownAlgs, function (algorithm) {
                  console.log('Generating: ' + algorithm + ':' + turnNumber);
                  return StatTurn
                    .findOne({turn: turnNumber, algorithm: algorithm})
                    .then(function (turnEntry) {
                      if (!turnEntry) {
                        turnEntry = new StatTurn({
                          algorithm: algorithm,
                          turn: turnNumber
                        });
                        return turnEntry.save();
                      } else {
                        return '';
                      }
                    });
                });
            });
        })
    })
    .then(function () {
      return Log
        .distinct('algorithm')
        .then(function (knownAlgs) {
          knownAlgs.push('all');
          return Promise
            //.each(_.range(150, 0), function (turnNumber) {
            .each(_.range(58, 0), function (turnNumber) {
              return Promise
                .each(knownAlgs, function (algorithm) {
                  console.log("Analyzing: " + turnNumber + " and " + algorithm);
                  return Log
                    .find({turn: turnNumber, algorithm: algorithm})
                    .then(function (logData) {
                      if (logData.length > 0) {
                        return Promise
                          .map(logData, function (logEntry) {
                            //console.log({turn: logEntry.turn});
                            var boardValue = _.sum(_.flattenDeep(logEntry.grid));
                            return StatTurn
                              .update({turn: logEntry.turn, algorithm: logEntry.algorithm}, {
                                $max: {
                                  maxBoardScore: logEntry.score,
                                  maxBoardValue: boardValue,
                                  maxTile: _.max(logEntry.uniqTiles)
                                },
                                $min: {
                                  minBoardScore: logEntry.score,
                                  minBoardValue: boardValue,
                                  minTile: _.min(logEntry.uniqTiles)
                                },
                                $inc: {
                                  hits: 1,
                                  sumBoardValue: boardValue,
                                  sumBoardScore: logEntry.score,
                                  originDatabase: (logEntry.origin === "database" ? 1 : 0),
                                  originAlgorithm: (logEntry.origin === "algorithm" ? 1 : 0)
                                }

                              })
                              .then(function () {
                                return StatTurn
                                  .update({turn: logEntry.turn, algorithm: 'all'}, {
                                    $max: {
                                      maxBoardScore: logEntry.score,
                                      maxBoardValue: boardValue,
                                      maxTile: _.max(logEntry.uniqTiles)
                                    },
                                    $min: {
                                      minBoardScore: logEntry.score,
                                      minBoardValue: boardValue,
                                      minTile: _.min(logEntry.uniqTiles)
                                    },
                                    $inc: {
                                      hits: 1,
                                      sumBoardValue: boardValue,
                                      sumBoardScore: logEntry.score,
                                      originDatabase: (logEntry.origin === "database" ? 1 : 0),
                                      originAlgorithm: (logEntry.origin === "algorithm" ? 1 : 0)
                                    }
                                  })
                                  .exec();
                              });
                          });
                      } else {
                        return '';
                      }
                    });
                });
            });
        });
    });
})
();
