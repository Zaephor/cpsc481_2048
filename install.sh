#!/bin/bash
apt-get -y update
apt-get -y upgrade
apt-get -y install build-essential htop
curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash -
apt-get install -y nodejs
npm install -g nodemon
