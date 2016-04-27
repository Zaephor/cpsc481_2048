print("turn,algorithm,hits,originDatabase,originAlgorithm,minTile,maxTile,minBoardValue,maxBoardValue,sumBoardValue,minBoardScore,maxBoardScore,sumBoardScore");
db.statturns.find().forEach(function (turn) {
  print(turn.turn + "," + turn.algorithm + "," + turn.hits + "," + turn.originDatabase + "," + turn.originAlgorithm + "," + turn.minTile + "," + turn.maxTile + "," + turn.minBoardValue + "," + turn.maxBoardValue + "," + turn.sumBoardValue + "," + turn.minBoardScore + "," + turn.maxBoardScore + "," + turn.sumBoardScore);
});
