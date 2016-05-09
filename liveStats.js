"use strict";
require('rootpath')();
var fs = require('fs');
var Promise = require("bluebird");
var clear = require('clear');
var _ = require('lodash');

/* DB Stuff */
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
//mongoose.connect('mongodb://localhost/cpsc481_2048');
mongoose.connect('mongodb://localhost/cpsc481_2048_2');
var Log = require('db/log.js');
var Tree = require('db/tree.js');
var StatTurn = require('db/statTurn.js');

function router(request, response) {
  var uriPattern = new RegExp(/\/(.*)/);
  var uriMatch = request.url.match(uriPattern);
  console.log(uriMatch);
  if (uriMatch !== null && uriMatch[1] === 'data.json') {
    Promise
      .all([
        new Date(),
        Log.count(),
        Tree.count(),
        Log.distinct('session_id'),
        StatTurn.findOne({}).sort({maxTile: -1}).select({maxTile: 1, _id: 0}),
        StatTurn.aggregate([
          {
            $group: {
              _id: null,
              algSum: {$sum: '$originAlgorithm'},
              dbSum: {$sum: '$originDatabase'},
              hits: {$sum: '$hits'}
            }
          }
        ]).exec(),
        StatTurn.findOne({}).sort({turn: -1}).select({turn: 1, _id: 0}),
        StatTurn.find({}).sort({turn: 1, algorithm: 1}).select({_id: 0, __v: 0}),
      ])
      .then(function (results) {
        var new7 = {};
        var new8 = {
          minBoardScore: [],
          maxBoardScore: [],
          aveBoardScore: []
        };
        var new9 = {
          db: [],
          alg: []
        };
        _.forEach(results[7], function (value) {
          if(!new7[value.algorithm]){
            new7[value.algorithm] = [];
          }
          new7[value.algorithm].push({y: value.maxTile, x: value.turn});

          if(value.algorithm === "all"){
            new8.minBoardScore.push({y: value.minBoardScore, x: value.turn});
            new8.maxBoardScore.push({y: value.maxBoardScore, x: value.turn});
            new8.aveBoardScore.push({y: (value.sumBoardScore/value.hits), x: value.turn});

            new9.db.push({y: value.originDatabase, x: value.turn});
            new9.alg.push({y: value.originAlgorithm, x: value.turn});
          }
        });
        results[7] = new7;
        results[8] = new8;
        results[9] = new9;
        return results;
      })
      .then(function (results) {
        response.writeHead(200, {"Content-Type": "text/plain"});
        response.end(JSON.stringify({
          time: results[0],
          logs: results[1],
          trees: results[2],
          games: results[3].length,
          maxTile: (results[4]) ? results[4].maxTile : 0,
          hits: (results[5] && results[5][0]) ? results[5][0].hits : 0,
          dbHits: (results[5] && results[5][0]) ? results[5][0].dbSum : 0,
          algHits: (results[5] && results[5][0]) ? results[5][0].algSum : 0,
          longestSession: (results[6]) ? results[6].turn : 0,
          progress: results[7] || {},
          scoreProgress: results[8] || {},
          decisionRatios: results[9] || {}
        }));
      });
  } else {
    response.writeHead(200, {"Content-Type": "text/html"});
    fs.readFile('./statsDisplay.html', 'utf8', function (err, data) {
      response.end(data);
    });
    //response.end();
    //response.end(
    //  '<html>' +
    //    //'<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.1.2/Chart.bundle.min.js"></script>' +
    //  '<script type="text/javascript"></script>' +
    //  '<script type="text/javascript" src="http://canvasjs.com/assets/script/canvasjs.min.js"></script>' +
    //  '<body> <div id="chartContainer" style="height: 300px; width:100%;"> </div> </body>' +
    //  '</html>'
    //);
  }
}


var http = require('http');

var server = http.createServer(router);

server.listen(8000);
