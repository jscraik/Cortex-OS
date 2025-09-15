#!/usr/bin/env python3
"""Diagnostic bind loop for forensic analysis of forced termination on port 3004.

Purpose:
  * Bind a simple TCP socket to 0.0.0.0:3004
  * Install verbose signal handlers (SIGTERM, SIGINT, SIGHUP, SIGQUIT)
  * Emit heartbeat every 0.5s with monotonic + wall clock
  * Log any incoming connection attempts (non-blocking accept loop)
  * Flush stdout immediately for real-time correlation with `log stream`
  * On exit, record final timestamp and reason.

Usage:
  python scripts/port3004_bind_loop.py

Notes:
  Avoid external deps; keep extremely small to reduce confounders.
  If process is killed without signal handler logging, likely SIGKILL or external forced termination.
"""

from __future__ import annotations

import argparse
import errno
import os
import selectors
import signal
import socket
import sys
import time
from datetime import datetime, timezone

try:
    import psutil  # optional runtime enhancement only
except Exception:  # pragma: no cover
    psutil = None

PORT = 3004
ADDR = ("0.0.0.0", PORT)

shutdown_reason: list[str] = []
_term_ignored = 0  # count of ignored SIGTERMs
_term_ignore_limit = 0  # configured via CLI


def ts() -> str:
    return datetime.now(timezone.utc).isoformat()


def log(msg: str):
    ts = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime())
    print(f"[{ts}] {msg}", flush=True)


# Add helper to dump limited process tree for attribution
def dump_process_context(verbose: bool):
    if not verbose:
        return
    log("PROCESS CONTEXT (limited)")
    try:
        if psutil:
            try:
                p = psutil.Process(os.getpid())
                ancestors = []
                for ancestor in p.parents():
                    ancestors.append(
                        f"PID {ancestor.pid} : {ancestor.name()} ({ancestor.username()})"
                    )
                for entry in ancestors:
                    log("  ancestor -> " + entry)
            except Exception as e:  # pragma: no cover
                log(f"Failed to capture process context: {e}")
        else:
            log("psutil not available; skipping parent process tree")
    except Exception:
        pass


def handle_signal(signum, frame):  # type: ignore[no-untyped-def]
    global _term_ignored  # noqa: PLW0603
    name = signal.Signals(signum).name
    if (
        signum == signal.SIGTERM
        and _term_ignore_limit > 0
        and _term_ignored < _term_ignore_limit
    ):
        _term_ignored += 1
        log(
            f"RECEIVED {name} (signum={signum}) — IGNORING ({_term_ignored}/{_term_ignore_limit}) for escalation test"
        )
        return  # do not exit yet
    shutdown_reason.append(f"signal:{name}")
    log(f"RECEIVED {name} (signum={signum}) — initiating graceful shutdown")
    raise SystemExit(0)


def install_signal_handlers():
    for sig in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP, signal.SIGQUIT):
        try:
            signal.signal(sig, handle_signal)
        except Exception as e:  # pragma: no cover
            log(f"WARN: could not set handler for {sig}: {e}")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Port 3004 termination forensic diagnostic",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--ignore-n-term",
        type=int,
        default=0,
        help="Number of initial SIGTERM signals to ignore (for escalation observation)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=3004,
        help="Override port (control / comparative tests)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable extra forensic logging (process tree, runningboardd snapshot)",
    )
    return parser.parse_args()


def main():  # noqa: C901
    global _term_ignore_limit  # noqa: PLW0603
    args = parse_args()
    if args.port != PORT:
        # override global ADDR usage locally
        addr = ("0.0.0.0", args.port)
    else:
        addr = ADDR
    _term_ignore_limit = max(0, args.ignore_n_term)
    if _term_ignore_limit:
        log(f"Configured to ignore first {_term_ignore_limit} SIGTERM signal(s)")
    start_monotonic = time.monotonic()
    log("Starting port3004 bind loop diagnostic")
    install_signal_handlers()
    dump_process_context(args.verbose)

    # Create listening socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(addr)
        sock.listen(16)
        sock.setblocking(False)
    except OSError as e:
        log(f"FATAL: failed to bind/listen on {addr}: {e}")
        sys.exit(2)

    log(
        f"BOUND OK on {addr}; pid={os.getpid()} parent={os.getppid()} uid={os.getuid()} gid={os.getgid()}"
    )

    sel = selectors.DefaultSelector()
    sel.register(sock, selectors.EVENT_READ)

    hb_count = 0
    try:
        while True:
            # Heartbeat every 0.5s independent of selector activity
            events = sel.select(timeout=0.5)
            now_monotonic = time.monotonic() - start_monotonic
            hb_count += 1
            log(f"HEARTBEAT #{hb_count} uptime={now_monotonic:.3f}s")
            for key, _mask in events:
                if key.fileobj is sock:
                    try:
                        conn, addr = sock.accept()
                        conn.close()
                        log(f"ACCEPT from {addr}")
                    except OSError as accept_err:
                        if accept_err.errno in (errno.EAGAIN, errno.EWOULDBLOCK):
                            continue
                        log(f"ACCEPT ERROR: {accept_err}")
            # Minimal CPU burn; rely on selector timeout
    except SystemExit:
        pass
    except Exception as e:  # pragma: no cover
        shutdown_reason.append(f"exception:{type(e).__name__}:{e}")
        log(f"EXCEPTION main loop: {e}")
    finally:
        try:
            sel.unregister(sock)
        except Exception:
            pass
        try:
            sock.close()
        except Exception:
            pass
        reason = ",".join(shutdown_reason) if shutdown_reason else "unknown"
        log(f"EXITING diagnostic (reason={reason})")


if __name__ == "__main__":
    main()
