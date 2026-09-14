#!/bin/bash
set -e
DEST="data/raw"
mkdir -p "$DEST"
git clone --depth 1 https://github.com/afrith/crime-stats.git "$DEST/_clone"
cd "$DEST/_clone"
git lfs pull
cd ../../..
HASH=$(sha256sum "$DEST/_clone/crime-stats.csv" | cut -d' ' -f1)
if [ "$HASH" != "5bae2fa9842064167eb07831e3356a1cdbf0ede55f58cb89e855d52e28199377" ]; then
  echo "HASH MISMATCH: $HASH"
  exit 1
fi
cp "$DEST/_clone/crime-stats.csv" "$DEST/crime-stats.csv"
cp "$DEST/_clone/police_stations.csv" "$DEST/police_stations.csv"
cp "$DEST/_clone/police_stations.gpkg" "$DEST/police_stations.gpkg"
echo "DATA FETCH COMPLETE"
