#!/bin/bash
OUT=/data/data/com.termux/files/home/Desktop/Github Clone/_flow_out.html
ERR=/data/data/com.termux/files/home/Desktop/Github Clone/_srv.log
chromium-browser --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --dump-dom "http://127.0.0.1:8765/_flow_test3.html" > "$OUT" 2> "$ERR"
echo "exit: $?"