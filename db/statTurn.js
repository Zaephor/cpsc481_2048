/**
 * Created by eric on 4/24/16.
 */
var mongoose = require('mongoose');
//mongoose.set('debug', true);
var _ = require('lodash');
var Grid = require('lib/Grid.js');
var crypto = require('crypto');

var statTurn = mongoose.Schema({
  created_at: {type: Date, index: true},
  updated_at: {type: Date, index: true},

  algorithm: {type: String, index: true},
  turn: {type: Number, index: true},

  minBoardValue: {type: Number, index: true},
  maxBoardValue: {type: Number, index: true, default: 0},

  sumBoardValue: {type: Number, index: true, default: 0},
  aveBoardValue: {type: Number, index: true, default: 0},

  minBoardScore: {type: Number, index: true},
  maxBoardScore: {type: Number, index: true, default: 0},
  sumBoardScore: {type: Number, index: true, default: 0},
  aveBoardScore: {type: Number, index: true, default: 0},

  maxTile: {type: Number, index: true},
  minTile: {type: Number, index: true},

  originDatabase: {type: Number, index: true},
  originAlgorithm: {type: Number, index: true},

  hits: {type: Number, index: true, default: 0},
});

statTurn.index({algorithm: 1, turn: 1}, {unique: true});

statTurn.pre('update', function (next) {
  var eventTime = Date.now();
  this.update({}, {$set: {updated_at: eventTime}});

  next();
});
statTurn.pre('save', function (next) {
  var eventTime = Date.now();
  var self = this;
  if (!self.created_at) {
    self.created_at = eventTime;
  }
  self.updated_at = eventTime;
  if (!self.minBoardValue) {
    self.minBoardValue = self.turn * 2;
  }
  if (!self.maxBoardValue) {
    self.maxBoardValue = self.turn * 4;
  }
  if (self.logs) {
    self.logs = _.uniq(self.logs.sort());
  }

  next();
});

module.exports = mongoose.model('StatTurn', statTurn);
