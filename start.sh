#!/bin/bash
screen -t "gameserver" bash -c "cd /home/ubuntu/2048-as-a-service; node ."

for x in $(cat /proc/cpuinfo | grep processor | cut -d' ' -f2 | tr -d ' '); do
	screen -t "client-${x}" bash -c "cd /home/ubuntu/cpsc481_2048 ; ./loop.sh"
done
