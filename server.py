"""譚仔揼波拿 — a Cantonese bingo caller for a party.

Serves web/ and /api/tts, which synthesises Cantonese speech with edge-tts.
Each caller on the page is a character: one of Microsoft's three zh-HK voices
with its own rate and pitch, so a host and a helper (and a few guests) sound
like different people. Clips are cached on disk, so the second game of the
night says every number without going to Microsoft at all.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import mimetypes
import re
import threading
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Dict, Tuple
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
WEB_ROOT = ROOT / "web"
CACHE_DIR = ROOT / "data" / "tts"
TTS_MAX_CHARS = 300

# The cast. Ids are what the page sends; the voice settings never leave this file,
# so a stranger cannot make the box say anything in any voice it likes.
CHARACTERS: Dict[str, Tuple[str, str, str]] = {
    # id: (voice, rate, pitch)
    "lung": ("zh-HK-WanLungNeural", "+0%", "+0Hz"),       # 龍哥 — 主持
    "gaai": ("zh-HK-HiuGaaiNeural", "+0%", "+0Hz"),       # 曉佳 — 助手
    "maan": ("zh-HK-HiuMaanNeural", "+0%", "+0Hz"),       # 曉曼
    "ho": ("zh-HK-WanLungNeural", "+18%", "+12Hz"),       # 豪仔 — 好興奮
    "por": ("zh-HK-HiuMaanNeural", "-18%", "-14Hz"),      # 婆婆 — 慢慢講
    "mui": ("zh-HK-HiuGaaiNeural", "+10%", "+28Hz"),      # 細妹
}

_inflight: Dict[str, threading.Lock] = {}
_inflight_lock = threading.Lock()


def tts_available() -> bool:
    try:
        import edge_tts  # noqa: F401
    except ImportError:
        return False
    return True


def synthesise(text: str, voice: str, rate: str, pitch: str) -> bytes:
    import edge_tts

    async def run() -> bytes:
        buf = bytearray()
        async for chunk in edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).stream():
            if chunk["type"] == "audio":
                buf.extend(chunk["data"])
        return bytes(buf)

    return asyncio.run(run())


def speak(text: str, who: str) -> bytes:
    """The clip for `text` in `who`'s voice, from disk if it has been said before."""
    voice, rate, pitch = CHARACTERS[who]
    key = hashlib.sha1(f"{voice}|{rate}|{pitch}|{text}".encode("utf-8")).hexdigest()
    path = CACHE_DIR / f"{key}.mp3"
    if path.is_file():
        return path.read_bytes()
    # One synth per clip: the page warms the whole pool at once, and a draw can
    # ask for the same number while its warm-up is still in flight.
    with _inflight_lock:
        gate = _inflight.setdefault(key, threading.Lock())
    with gate:
        if path.is_file():
            return path.read_bytes()
        audio = synthesise(text, voice, rate, pitch)
        if not audio:
            raise RuntimeError("edge-tts returned no audio")
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".part")
        tmp.write_bytes(audio)
        tmp.replace(path)
    with _inflight_lock:
        _inflight.pop(key, None)
    return audio


class Handler(BaseHTTPRequestHandler):
    server_version = "tcbingo/1.0"
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt: str, *args) -> None:  # quieter than the default
        if not self.path.startswith("/api/tts"):
            super().log_message(fmt, *args)

    def do_GET(self) -> None:
        url = urlparse(self.path)
        if url.path == "/api/tts":
            return self._api_tts(parse_qs(url.query))
        if url.path == "/api/health":
            return self._send_json({"ok": True, "tts": tts_available(), "characters": list(CHARACTERS)})
        return self._static(url.path)

    def _api_tts(self, query: dict) -> None:
        text = (query.get("text") or [""])[0].strip()
        who = (query.get("who") or ["lung"])[0]
        if not text:
            return self._send_json({"error": "missing text"}, HTTPStatus.BAD_REQUEST)
        if len(text) > TTS_MAX_CHARS:
            return self._send_json({"error": "text too long"}, HTTPStatus.BAD_REQUEST)
        if who not in CHARACTERS:
            return self._send_json({"error": "unknown character"}, HTTPStatus.BAD_REQUEST)
        if not tts_available():
            return self._send_json({"error": "edge-tts not installed"}, HTTPStatus.SERVICE_UNAVAILABLE)
        try:
            audio = speak(text, who)
        except Exception as exc:  # network down, Microsoft said no: the page falls back
            return self._send_json({"error": f"tts failed: {exc}"}, HTTPStatus.BAD_GATEWAY)
        self._send_bytes(audio, "audio/mpeg", cache="public, max-age=604800")

    def _static(self, path: str) -> None:
        rel = "index.html" if path in ("", "/") else path.lstrip("/")
        target = (WEB_ROOT / rel).resolve()
        if not target.is_file() or WEB_ROOT not in target.parents:
            return self._send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)
        ctype = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype == "application/javascript":
            ctype += "; charset=utf-8"
        self._send_bytes(target.read_bytes(), ctype, cache="no-cache")

    def _send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self._send_bytes(body, "application/json; charset=utf-8", status, "no-store")

    def _send_bytes(self, body: bytes, ctype: str, status: HTTPStatus = HTTPStatus.OK, cache: str = "no-cache") -> None:
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", cache)
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    mimetypes.add_type("application/javascript", ".js")
    mimetypes.add_type("font/woff2", ".woff2")
    config = {}
    if (ROOT / "config.json").is_file():
        config = json.loads((ROOT / "config.json").read_text("utf-8"))
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--host", default=config.get("host", "0.0.0.0"))
    parser.add_argument("--port", type=int, default=config.get("port", 8090))
    args = parser.parse_args()
    if not tts_available():
        print("warning: edge-tts not installed — the page will fall back to the browser's own voice")
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"譚仔揼波拿 on http://{args.host}:{args.port}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
