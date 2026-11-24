"""Loopback-only synthetic GoTrue and PostgREST responses for browser regression tests."""
import base64
import json
import os
import shutil
import subprocess
import tempfile
import time
import uuid
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Event
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[2]


def encode(value):
    return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip("=")


class Service(ThreadingHTTPServer):
    def __init__(self):
        super().__init__(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.server_port}"
        self.assets = tempfile.TemporaryDirectory()
        build = Path(self.assets.name)
        shutil.copytree(ROOT / "dist", build / "dist")
        shutil.copytree(ROOT / "scripts", build / "scripts")
        (build / "node_modules").symlink_to(ROOT / "node_modules", target_is_directory=True)
        subprocess.run(["node", "scripts/build-account.mjs"], cwd=build, check=True,
                       env={**os.environ, "SUPABASE_URL": self.url, "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_fixture"})
        self.users, self.passwords, self.rows, self.tokens, self.links = {}, {}, {}, {}, {}
        self.confirmed = set()
        self.refresh_tokens = {}
        self.refreshes = 0
        self.reject_session = False
        self.lifetime = 3600
        self.fail_read = self.fail_write = self.fail_logout = False
        self.hold = None
        self.started, self.release = Event(), Event()
        self.writes = 0

    def signup(self, email, password):
        user = {"id": str(uuid.uuid4()), "email": email, "aud": "authenticated",
                "role": "authenticated", "app_metadata": {}, "user_metadata": {},
                "created_at": "2026-01-01T00:00:00Z", "identities": []}
        self.users[email], self.passwords[email] = user, password
        return user

    def token(self, email):
        user = self.users[email]
        expiry = int(time.time()) + self.lifetime
        jwt = ".".join([encode({"alg": "HS256", "typ": "JWT"}),
                        encode({"sub": user["id"], "exp": expiry, "iat": int(time.time()),
                                "session_id": str(uuid.uuid4()), "role": "authenticated"}), "Zml4dHVyZQ"])
        self.tokens[jwt] = email
        refresh = str(uuid.uuid4())
        self.refresh_tokens[refresh] = email
        return {"access_token": jwt, "token_type": "bearer", "refresh_token": refresh,
                "expires_in": self.lifetime, "expires_at": expiry, "user": user}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, request, client_address, server):
        super().__init__(request, client_address, server, directory=str(Path(server.assets.name) / "dist"))

    def log_message(self, *_):
        pass  # Keep tokens, link hashes and synthetic passwords out of test logs.

    def reply(self, code, value, mime="application/json"):
        body = json.dumps(value).encode() if mime == "application/json" else value
        self.send_response(code)
        self.send_header("Content-Type", mime)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if body:
            try:
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass

    def dispatch(self):
        service = self.server
        path = urlsplit(self.path).path
        query = parse_qs(urlsplit(self.path).query)
        method = self.command
        body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
        email = body.get("email")
        who = service.tokens.get(self.headers.get("Authorization", "").removeprefix("Bearer "))
        if path == "/auth/v1/signup":
            if email not in service.users:
                service.signup(email, body["password"])
            service.links["email"] = (email, str(uuid.uuid4()))
            return self.reply(200, service.users[email])
        if path == "/auth/v1/recover":
            if email in service.users:
                service.links["recovery"] = (email, str(uuid.uuid4()))
            return self.reply(200, {})
        if path == "/auth/v1/verify":
            kind = body["type"]
            target = service.links.get(kind)
            if target and target[1] == body.get("token_hash"):
                service.links.pop(kind)
                service.confirmed.add(target[0])
                return self.reply(200, service.token(target[0]))
            return self.reply(403, {"message": "Invalid link"})
        if path == "/auth/v1/token":
            if query.get("grant_type") == ["refresh_token"]:
                owner = service.refresh_tokens.pop(body.get("refresh_token"), None)
                if owner and service.lifetime > 10:
                    service.refreshes += 1
                    return self.reply(200, service.token(owner))
            if (email in service.confirmed and body.get("password") == service.passwords.get(email)
                    and query.get("grant_type") == ["password"]):
                return self.reply(200, service.token(email))
            return self.reply(400, {"error": "invalid_grant", "message": "Invalid credentials"})
        if path == "/auth/v1/logout":
            return self.reply(422 if service.fail_logout else 200, {"message": "synthetic"})
        if path == "/auth/v1/user" and who:
            if method == "PUT":
                service.passwords[who] = body["password"]
            return self.reply(200, service.users[who])
        if path == "/rest/v1/customer_workspaces":
            if not who or service.reject_session:
                return self.reply(401, {"message": "Authentication required"})
            owner = service.users[who]["id"]
            if "owner_id" in body:
                return self.reply(403, {"message": "Owner column is private"})
            matched = query.get("owner_id", ["eq." + owner]) == ["eq." + owner]
            row = service.rows.get(owner)
            if method == "GET":
                if service.fail_read:
                    return self.reply(400, {"message": "Synthetic read failure"})
                result = [row.copy()] if matched and row else []
            else:
                service.writes += 1
                if service.fail_write:
                    return self.reply(400, {"message": "Synthetic write failure"})
                if method == "POST" and row:
                    return self.reply(409, {"message": "Row exists"})
                if method == "PATCH" and (not matched or not row or query.get("revision") != ["eq." + row["revision"]]):
                    result = []
                else:
                    row = dict(body, revision=str(uuid.uuid4()))
                    service.rows[owner] = row
                    result = [{"revision": row["revision"]}]
            if service.hold == method:
                service.hold = None
                service.started.set()
                service.release.wait(15)
            # maybeSingle requests JSON arrays for GET, singular objects for mutations
            if method != "GET" and "vnd.pgrst.object" in self.headers.get("Accept", ""):
                if not result:
                    return self.reply(406, {"code": "PGRST116", "details": "The result contains 0 rows"})
                result = result[0]
            return self.reply(201 if method == "POST" else 200, result)
        if method == "GET" and not path.startswith(("/auth/", "/rest/")):
            return super().do_GET()
        return self.reply(404, {"message": "Unknown fixture endpoint"})

    do_GET = do_POST = do_PATCH = do_PUT = dispatch
