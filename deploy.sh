#!/bin/bash

set -e

echo "Using current directory: $(pwd)"
git pull
npm install
npm run build
pm2 restart api.tasker

