#!/usr/bin/env bash
# Temporary mitigation for hostile termination of any process binding to TCP port 3004.
# Strategy: Avoid binding 3004 in userland. Instead run the service on an alternate backend
# port (default 33004) and use PF (packet filter) to transparently redirect inbound traffic
# destined for 127.0.0.1:3004 to 127.0.0.1:${BACKEND_PORT}.
#
# REQUIREMENTS:
#   - macOS (PF present)
#   - sudo privileges (pfctl requires root)
#
# USAGE:
#   ./scripts/mitigate_port3004.sh enable   # enable redirect (3004 -> backend port)
#   ./scripts/mitigate_port3004.sh disable  # disable redirect & restore previous rules snapshot
#   BACKEND_PORT=39004 ./scripts/mitigate_port3004.sh enable  # override backend port
#
# AFTER ENABLE:
#   Start your app on BACKEND_PORT (e.g. uvicorn --port $BACKEND_PORT) and clients can still connect
#   to 127.0.0.1:3004. No userland listener on 3004 exists, so the external killer cannot SIGTERM it.
#
# SAFETY:
#   - Captures current PF filter & NAT rules before modification (no /etc/pf.conf changes)
#   - Loads a minimal standalone ruleset (NOT merged). You can restore via 'disable'.
#   - If you already had a custom PF configuration actively in use, review the backup files before disable/restore.
#
# FILES:
#   /tmp/pf.port3004.backup.filter   (previous filter rules: pfctl -sr)
#   /tmp/pf.port3004.backup.nat      (previous nat/rdr rules: pfctl -sn)
#   /tmp/pf.port3004.active.conf     (current mitigation ruleset)
#
set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-33004}"
RULES_FILE="/tmp/pf_port3004.conf"
BACKUP_FILTER="/tmp/pf.port3004.backup.filter"
BACKUP_NAT="/tmp/pf.port3004.backup.nat"
ACTIVE_COPY="/tmp/pf.port3004.active.conf"

command=${1:-}

need_root() {
  if [[ $EUID -ne 0 ]]; then
    echo "[mitigate_port3004] Re-exec with sudo" >&2
    exec sudo BACKEND_PORT="$BACKEND_PORT" bash "$0" "$command"
  fi
}

snapshot_current() {
  echo "[mitigate_port3004] Snapshotting existing PF rules" >&2
  pfctl -sr > "$BACKUP_FILTER" || true
  pfctl -sn > "$BACKUP_NAT" || true
}

compose_rules() {
  cat > "$RULES_FILE" <<EOF
# Auto-generated redirect for port 3004 mitigation
# Redirect 127.0.0.1:3004 -> 127.0.0.1:${BACKEND_PORT}
# NAT/Redirection section
rdr pass on lo0 inet proto tcp from any to 127.0.0.1 port 3004 -> 127.0.0.1 port ${BACKEND_PORT}
# Allow loopback traffic
set skip on lo0
# Permissive pass for localhost (adjust if you add firewalling later)
pass quick on lo0 all
EOF
  cp "$RULES_FILE" "$ACTIVE_COPY"
}

enable_redirect() {
  need_root
  snapshot_current
  compose_rules
  echo "[mitigate_port3004] Loading mitigation ruleset (PF will be enabled if disabled)" >&2
  pfctl -f "$RULES_FILE"
  pfctl -E 2>/dev/null || true
  echo "[mitigate_port3004] Active NAT/rdr rules:" >&2
  pfctl -sn | grep 3004 || echo "(rule not visible? check pfctl -s info)" >&2
  echo "[mitigate_port3004] Test with: curl -v http://127.0.0.1:3004/ (backend must listen on ${BACKEND_PORT})" >&2
}

disable_redirect() {
  need_root
  if [[ -f "$BACKUP_FILTER" || -f "$BACKUP_NAT" ]]; then
    echo "[mitigate_port3004] Restoring previous PF rules snapshot" >&2
    # Reconstruct combined rules stream: NAT first, then filter
    if [[ -s "$BACKUP_FILTER" || -s "$BACKUP_NAT" ]]; then
      { cat "$BACKUP_NAT" 2>/dev/null || true; cat "$BACKUP_FILTER" 2>/dev/null || true; } | pfctl -f -
    fi
  else
    echo "[mitigate_port3004] No backup snapshots present; leaving current configuration unchanged" >&2
  fi
  echo "[mitigate_port3004] To fully disable PF (optional): sudo pfctl -d" >&2
}

case "$command" in
  enable)
    enable_redirect
    ;;
  disable)
    disable_redirect
    ;;
  *)
    echo "Usage: $0 {enable|disable}" >&2
    echo "Environment: BACKEND_PORT (default 33004)" >&2
    exit 1
    ;;
 esac
