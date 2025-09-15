#!/usr/bin/env python3
import os
import signal
import sys
import time

terminate = False

signals_received = []


def handler(signum, frame):
    signals_received.append(signum)
    print(f"[signal_probe] Received signal {signum}")
    if signum in (signal.SIGTERM, signal.SIGINT, getattr(signal, "SIGKILL", 9)):
        global terminate
        terminate = True


for sig_name in dir(signal):
    if sig_name.startswith("SIG") and not sig_name.startswith("SIG_"):
        try:
            sig = getattr(signal, sig_name)
            # Skip uncatchable signals
            if sig in (signal.SIGKILL, signal.SIGSTOP):
                continue
            signal.signal(sig, handler)
        except Exception:
            pass

print(f"[signal_probe] PID {os.getpid()} starting. Waiting for signals.\n")
start = time.time()

try:
    while not terminate and time.time() - start < 120:
        time.sleep(2)
        if signals_received:
            print(f"[signal_probe] Signals so far: {signals_received}")
    print(
        "[signal_probe] Exiting loop. terminate=",
        terminate,
        " uptime=",
        time.time() - start,
    )
except Exception as e:
    print("[signal_probe] Exception:", e, file=sys.stderr)
    raise
