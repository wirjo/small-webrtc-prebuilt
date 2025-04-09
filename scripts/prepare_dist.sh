#!/bin/bash

# Clear all the old files to avoid any conflict
sh ./scripts/clear.sh

# Build the client library
(cd client; npm i; npm run build;)

# Build the dist
python setup.py sdist
