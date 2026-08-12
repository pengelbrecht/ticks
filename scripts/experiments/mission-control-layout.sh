#!/usr/bin/env bash
# Demo: layout export/scramble/restore with process relaunch, in an ISOLATED
# herdr session. Safe to run: never touches your main herdr session.
#   1. herdr --session tkexp server &        (or reuse a running one)
#   2. HERDR_SOCKET_PATH=~/.config/herdr/sessions/tkexp/herdr.sock bash "$0"
set -euo pipefail
SOCK="${HERDR_SOCKET_PATH:?set HERDR_SOCKET_PATH to the isolated session socket}"
call() { python3 - "$1" "$2" <<'PY'
import socket, json, sys, os
s=socket.socket(socket.AF_UNIX); s.connect(os.environ["HERDR_SOCKET_PATH"])
s.sendall((json.dumps({"id":"demo","method":sys.argv[1],"params":json.loads(sys.argv[2])})+"\n").encode())
buf=b""
while not buf.endswith(b"\n"):
    c=s.recv(65536)
    if not c: break
    buf+=c
print(buf.decode())
PY
}
echo "== create a mission-control shaped workspace"
WS=$(call workspace.create '{"label":"demo-mission-control"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['result']['workspace']['workspace_id'])")
P1="$WS:p1"
call pane.split "{\"pane_id\":\"$P1\",\"direction\":\"right\",\"focus\":false}" >/dev/null
echo "== export the layout"
LAYOUT=$(call layout.export '{}' | python3 -c "import json,sys;print(json.dumps(json.load(sys.stdin)['result']['layout']))")
echo "$LAYOUT" | python3 -m json.tool
TAB=$(echo "$LAYOUT" | python3 -c "import json,sys;print(json.load(sys.stdin)['tab_id'])")
echo "== scramble: close the second pane"
P2=$(echo "$LAYOUT" | python3 -c "import json,sys;print(json.load(sys.stdin)['root']['second']['pane_id'])")
call pane.close "{\"pane_id\":\"$P2\"}" >/dev/null
echo "== restore, relaunching a process in the recreated pane"
ROOT=$(echo "$LAYOUT" | python3 -c "
import json,sys
l=json.load(sys.stdin)['root']
l['second']={'type':'pane','label':'dashboard','command':['bash','-lc','echo RESTORED; sleep 300']}
print(json.dumps(l))")
call layout.apply "{\"root\":$ROOT,\"tab_id\":\"$TAB\"}" | python3 -m json.tool | head -20
echo "== proof: process_info of the recreated pane shows the relaunched command"
