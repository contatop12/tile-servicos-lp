#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

ZONE_NAME = "tileservicos.com.br"
MAIL_IP = "187.108.198.17"
MAIL_CNAME_TARGETS = {"imap", "pop", "smtp"}


def load_env() -> str:
    env_path = pathlib.Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        sys.exit(".env não encontrado")
    token = ""
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("CLOUDFLARE_API_TOKEN="):
            token = line.split("=", 1)[1].strip()
    if not token:
        sys.exit("CLOUDFLARE_API_TOKEN ausente no .env")
    return token


def api(token: str, method: str, url: str, data: dict | None = None) -> dict:
    req = urllib.request.Request(
        url,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        data=json.dumps(data).encode() if data is not None else None,
    )
    try:
        with urllib.request.urlopen(req) as resp:
            payload = json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        body = exc.read().decode()
        raise SystemExit(f"HTTP {exc.code} {method} {url}\n{body}") from exc
    if not payload.get("success", True):
        raise SystemExit(f"API error: {payload}")
    return payload


def main() -> None:
    token = load_env()
    zone_id = api(
        token,
        "GET",
        f"https://api.cloudflare.com/client/v4/zones?name={ZONE_NAME}",
    )["result"][0]["id"]
    print(f"Zona: {ZONE_NAME}")

    records = api(
        token,
        "GET",
        f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records?per_page=200",
    )["result"]

    mail_a = next(
        (r for r in records if r["type"] == "A" and r["name"] == f"mail.{ZONE_NAME}"),
        None,
    )

    if mail_a:
        if mail_a["content"] != MAIL_IP or mail_a.get("proxied"):
            api(
                token,
                "PATCH",
                f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records/{mail_a['id']}",
                {"content": MAIL_IP, "proxied": False, "ttl": 1},
            )
            print("Atualizado A mail ->", MAIL_IP, "(DNS only)")
        else:
            print("OK A mail ->", MAIL_IP, "(DNS only)")
    else:
        api(
            token,
            "POST",
            f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records",
            {
                "type": "A",
                "name": "mail",
                "content": MAIL_IP,
                "ttl": 1,
                "proxied": False,
            },
        )
        print("Criado A mail ->", MAIL_IP, "(DNS only)")

    for record in records:
        short = record["name"].removesuffix(f".{ZONE_NAME}")
        if record["type"] == "CNAME" and short in MAIL_CNAME_TARGETS:
            if record.get("proxied"):
                api(
                    token,
                    "PATCH",
                    f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records/{record['id']}",
                    {"proxied": False, "ttl": 1},
                )
                print(f"Proxy desativado: {record['name']}")
            else:
                print(f"OK (DNS only): {record['name']}")

    mx = next((r for r in records if r["type"] == "MX"), None)
    if mx:
        print(f"OK MX -> {mx['content']} (prio {mx.get('priority')})")
    else:
        print("AVISO: registro MX não encontrado")

    print("Concluído.")


if __name__ == "__main__":
    main()
