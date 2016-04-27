/**
 * Created by eric on 4/11/16.
 */

var mongoose = require('mongoose');
//mongoose.set('debug', true);
var _ = require('lodash');
var Grid = require('lib/Grid.js');
var Tree = require('db/tree.js');
var crypto = require('crypto');

var log = mongoose.Schema({
  created_at: {type: Date, index: true},
  updated_at: {type: Date},

  session_id: {type: String, index: true},
  grid: {type: Array},
  progress: {type: Number},
  predict_this: {type: Array, index: true},
  predict_next: {type: Array, index: true},

  validMoves: [{type: String}],
  predictions: {type: Object},
  directionMergeCounts: {type: Object},
  nextProgress: {type: Object},

  newTile: {type: Array, index: true},

  score: {type: Number, index: true},
  points: {type: Number, index: true},
  moved: {type: Boolean},
  over: {type: Boolean, index: true},
  won: {type: Boolean, index: true},
  turn: {type: Number, index: true},
  algorithm: {type: String, index: true},
  desiredMove: {type: String},
  origin: {type: String},
  maxTile: {type: Number, index: true},
  tileCount: {type: Object, index: true},
  uniqTiles: [{type: Number, index: true}],

  isSorted: {type: Boolean, index: true},
  sortedPercent: {type: Number, index: true},

  //tree: [{type: mongoose.Schema.Types.ObjectId, ref: 'Tree'}]
  tree: {type: mongoose.Schema.Types.ObjectId, ref: 'Tree'}
});

//log.index({ccvm:1,cloud:1,internal_name:1},{unique: true});

log.pre('save', function (next) {
  var eventTime = Date.now();
  var self = this;
  if (!self.created_at) {
    self.created_at = eventTime;
  }
  self.updated_at = eventTime;

  var curNormalize = new Grid(self.predict_this);
  var nextNormalize = new Grid(self.predict_next);

  //Tree.findOne({grid: curNormalize.normalize()}).exec(function (err, curTreeData) {
  Tree.findOne({gridHash: crypto.createHash('sha256').update(JSON.stringify(curNormalize.normalize())).digest("hex")}).exec(function (err, curTreeData) {
    if (err) {
      throw err;
    }
    if (!curTreeData) {
      curTreeData = new Tree({
        grid: curNormalize.normalize(),
        gridHash: crypto.createHash('sha256').update(JSON.stringify(curNormalize.normalize())).digest("hex"),
        tileCount: curNormalize.tileCount(),
        uniqTiles: curNormalize.summary().uniqTiles,
        maxTile: curNormalize.maxTile()
      });
      curTreeData.save();
    } else {
      //curTreeData.save();
    }
    //self.tree.push(curTreeData._id);
    //self.tree = _.uniq(self.tree.sort());
    self.tree = curTreeData._id;
    //Tree.findOne({grid: nextNormalize.normalize()}).exec(function (err, nextTreeData) {
    Tree.findOne({gridHash: crypto.createHash('sha256').update(JSON.stringify(nextNormalize.normalize())).digest("hex")}).exec(function (err, nextTreeData) {
      if (err) {
        throw err;
      }
      if (!nextTreeData) {
        nextTreeData = new Tree({
          grid: nextNormalize.normalize(),
          gridHash: crypto.createHash('sha256').update(JSON.stringify(nextNormalize.normalize())).digest("hex"),
          tileCount: nextNormalize.tileCount(),
          uniqTiles: nextNormalize.summary().uniqTiles,
          maxTile: nextNormalize.maxTile()
        });
        nextTreeData.save();
      } else {
        //nextTreeData.save();
      }
      Tree.update({_id: curTreeData._id}, {
        $addToSet: {next: nextTreeData._id, turns: self.turn},
        $max: {maxScore: self.score},
        $min: {minScore: self.score},
        $inc: {sumScore: self.score},
        $set: {nearEnd: new Grid(curNormalize.normalize()).nearEnd()}
      }, function () {
        next();
      });
    });
  });

  //next();
});

module.exports = mongoose.model('Log', log);
