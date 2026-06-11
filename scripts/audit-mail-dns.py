#!/usr/bin/env python3
import json, pathlib, urllib.request
env = pathlib.Path(__file__).resolve().parents[1] / ".env"
token = [l.split("=", 1)[1].strip() for l in env.read_text(encoding="utf-8").splitlines() if l.startswith("CLOUDFLARE_API_TOKEN=")][0]
zone_id = json.loads(urllib.request.urlopen(urllib.request.Request("https://api.cloudflare.com/client/v4/zones?name=tileservicos.com.br", headers={"Authorization": "Bearer " + token})).read())["result"][0]["id"]
records = json.loads(urllib.request.urlopen(urllib.request.Request(f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records?per_page=200", headers={"Authorization": "Bearer " + token})).read())["result"]
keys = ("mail", "smtp", "imap", "pop", "mx", "spf", "dmarc", "domainkey", "_acme")
for r in sorted(records, key=lambda x: x["name"]):
    name = r["name"].lower()
    if r["type"] in ("MX", "A", "CNAME", "TXT", "SRV") and (any(k in name for k in keys) or r["name"] in ("tileservicos.com.br", "*.tileservicos.com.br")):
        print(f"{r['type']:5} {r['name']:42} {str(r.get('content',''))[:70]:70} proxied={r.get('proxied')}")
