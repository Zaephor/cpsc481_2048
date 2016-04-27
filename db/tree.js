/**
 * Created by eric on 4/16/16.
 */
var mongoose = require('mongoose');
//mongoose.set('debug', true);
var _ = require('lodash');
var Grid = require('lib/Grid.js');
var crypto = require('crypto');

var tree = mongoose.Schema({
  created_at: {type: Date, index: true},
  updated_at: {type: Date, index: true},
  hits: {type: Number, index: true},

  grid: {type: Array},
  gridHash: {type: String, index: {unique: true}},
  tileCount: {type: Object, index: true},
  uniqTiles: [{type: Number, index: true}],
  maxTile: {type: Number, index: true},
  updates: {type: Number, index: true},

  score: {type: Number, index: true}, // TODO: Use different scoring method here, don't forget to update log.js and app.js later

  maxScore: {type: Number, index: true}, // Max score for this specific board arrangement
  minScore: {type: Number, index: true}, // Min score for this specific board arrangement
  aveScore: {type: Number, index: true}, //
  sumScore: {type: Number, index: true}, //

  maxChainScore: {type: Number, index: true}, // Max score of the chain this board was used in
  minChainScore: {type: Number, index: true}, // Min score of the chain this board was used in
  aveChainScore: {type: Number, index: true}, // Average score of the chain this board was used in
  sumChainScore: {type: Number, index: true}, // Running sum of chain scores to derive average

  maxChainTile: {type: Number, index: true},
  minChainTile: {type: Number, index: true},
  aveChainTile: {type: Number, index: true},
  sumChainTile: {type: Number, index: true},

  nearEnd: {type: Boolean, index: true},

  next: [{type: mongoose.Schema.Types.ObjectId, ref: 'Tree'}],
  turns: [{type: Number, index: true}]
});


tree.pre('update', function (next) {
  var eventTime = Date.now();
  this.update({}, {$set: {updated_at: eventTime}, $inc: {hits: 1}});

  next();
});

tree.pre('save', function (next) {
  var eventTime = Date.now();
  var self = this;
  if (!self.created_at) {
    self.created_at = eventTime;
  }
  self.updated_at = eventTime;
  if (!self.gridHash) {
    self.gridHash = crypto.createHash('sha256').update(JSON.stringify(self.grid)).digest("hex");
  }
  if (!self.hits) {
    self.hits = 0;
  }
  self.hits++;

  if (!self.nearEnd) {
    self.nearEnd = new Grid(self.grid).nearEnd();
  }
  self.aveChainScore = Math.floor(self.sumChainScore / self.hits);
  self.aveScore = Math.floor(self.sumScore / self.hits);
  self.next = _.uniq(self.next.sort());

  if (self.turns) {
    self.turns = _.uniq(self.turns.sort());
    self.turns.sort(function (a, b) {
      if (a > b) {
        return 1;
      } else if (a < b) {
        return -1;
      }
      return 0;
    });
  }

  next();
});

module.exports = mongoose.model('Tree', tree);
