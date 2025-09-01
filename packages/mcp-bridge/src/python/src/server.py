import os
from http.server import BaseHTTPRequestHandler, HTTPServer

from executor import run_code

SESSION = []


class S(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/eval":
            self.send_error(404)
            return

        ln = int(self.headers.get("content-length", "0"))
        b = self.rfile.read(ln)
        cell = b.decode("utf-8")

        # Run in subprocess with timeout and restricted builtins
        rc, stdout, stderr = run_code(cell, timeout=3)
        ok = rc == 0

        SESSION.append(cell)

        sp: str | None = None
        if os.environ.get("PYREPL_EXPORT", "1") == "1" and ok:
            sp = "/srv/session.py"
            with open(sp, "w") as f:
                f.write("\n\n".join(SESSION))

        body = (
            '{{"ok":{},"stdout":{!r},"stderr":{!r},"script_path":{!r}}}'.format(
                str(ok).lower(), stdout, stderr or "", sp
            )
        ).encode()

        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.end_headers()
        self.wfile.write(body)


HTTPServer(("0.0.0.0", 8081), S).serve_forever()
