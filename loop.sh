#!/bin/bash
GO=1

## why am I doing this instead of any nodejs-based solutions?
## I don't want to risk any memory leaks, and am not used to coding CLi-style applications that constantly run. Usually they're web based and not generating data.
while [[ "${GO}" == "1" ]]; do
	if [[ "$(hostname)" != "thinkpad" ]]; then
		server="10.0.0.94" ## Mongo for 3x3 grids
		#server="10.0.0.177" ## Mongo for 4x4
		sed -i 's/localhost/'${server}'/g' app.js
#		sed -i 's/127\.0\.0\.1/'${server}'/g' lib/GameClient.js
	fi
	node .
done
