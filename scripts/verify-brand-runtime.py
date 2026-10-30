#!/usr/bin/env python3
"""
Runtime verification for the MTAA Fix favicon/metadata wiring.

Starts each Next.js app with `next start`, then checks the *served* HTML for the
icon <link> tags, fetches every referenced URL, and confirms the bytes match the
files on disk (so the browser really receives the transparent assets).
"""

import hashlib
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
APPS = [
    ("citizen-frontend", 3100),
    ("government-frontend", 3102),
    ("admin-dashboard", 3101),
]

failures = []


def check(label, ok, detail=""):
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}{(' - ' + detail) if detail else ''}")
    if not ok:
        failures.append(label)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


_no_redirect_opener = urllib.request.build_opener(NoRedirect)
_follow_opener = urllib.request.build_opener()


def fetch(url, timeout=20, follow=True):
    """fetch(url) -> (status, headers, body). Redirects are reported, not hidden."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 MTAA-Fix-Verify"})
    opener = _follow_opener if follow else _no_redirect_opener
    try:
        with opener.open(req, timeout=timeout) as resp:
            return resp.status, dict(resp.headers), resp.read()
    except urllib.error.HTTPError as e:
        body = b""
        try:
            body = e.read()
        except Exception:
            pass
        return e.code, dict(e.headers or {}), body


def wait_for(url, proc, timeout=90):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if proc.poll() is not None:
            raise RuntimeError(f"server exited early with code {proc.returncode}")
        try:
            return fetch(url, timeout=5)
        except Exception:
            time.sleep(1)
    raise TimeoutError(f"server did not become ready: {url}")


LINK_RE = re.compile(r"<link\b[^>]*>", re.I)


def icon_links(html):
    out = []
    for tag in LINK_RE.findall(html):
        rel = re.search(r'rel="([^"]+)"', tag)
        href = re.search(r'href="([^"]+)"', tag)
        if not rel or not href:
            continue
        if any(k in rel.group(1).lower() for k in ("icon", "manifest")):
            out.append((rel.group(1), href.group(1), tag))
    return out


for app, port in APPS:
    print(f"\n== {app} (port {port}) ==")
    proc = subprocess.Popen(
        ["npm.cmd", "--prefix", app, "run", "start", "--", "--port", str(port)],
        cwd=REPO,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        base = f"http://127.0.0.1:{port}"
        status, headers, body = wait_for(base + "/", proc)
        html = body.decode("utf-8", "replace")
        check("app serves HTML", status == 200, f"status={status}")

        links = icon_links(html)
        rels = [r for r, _, _ in links]
        check('head contains rel="icon"', any(r == "icon" for r in rels), f"rels={rels}")
        check('head contains rel="apple-touch-icon"', any(r == "apple-touch-icon" for r in rels),
              f"rels={rels}")
        check('head contains rel="manifest"', any(r == "manifest" for r in rels), f"rels={rels}")

        for rel, href, tag in links:
            url = base + href if href.startswith("/") else href
            s, h, data = fetch(url, follow=False)
            ok = s == 200
            disk = None
            for cand in (REPO / app / "public" / href.lstrip("/"),
                         REPO / app / "app" / Path(href.split("?")[0]).name):
                if cand.exists():
                    disk = cand
                    break
            same = disk is not None and hashlib.sha256(data).hexdigest() == hashlib.sha256(disk.read_bytes()).hexdigest()
            check(f"{rel} -> {href} serves the generated file",
                  ok and same,
                  f"status={s} type={h.get('Content-Type')} bytes={len(data)} on-disk-match={same}"
                  + (f" location={h.get('Location')}" if s in (301, 302, 303, 307, 308) else ""))
            print(f"        {tag}")

        # The transparent UI logo must be served too.
        s, h, data = fetch(base + "/brand/mtaa-fix-logo.png", follow=False)
        check("transparent UI logo is served", s == 200 and h.get("Content-Type") == "image/png",
              f"status={s} type={h.get('Content-Type')} bytes={len(data)}")
        check("served UI logo carries an alpha channel", data[25] == 6, "PNG colour type 6 = RGBA")

    except Exception as e:
        check(f"{app} runtime verification", False, str(e))
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            proc.kill()

print()
if failures:
    print(f"{len(failures)} CHECK(S) FAILED:")
    for f in failures:
        print("  -", f)
    sys.exit(1)
print("ALL RUNTIME CHECKS PASSED")
