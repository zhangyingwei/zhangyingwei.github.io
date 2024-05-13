#!/bin/bash
path=$(dirname $0)
echo "Starting hugo server in $path"
cd $path
echo "Starting hugo server"
/opt/homebrew/bin/hugo serve -w --buildDrafts