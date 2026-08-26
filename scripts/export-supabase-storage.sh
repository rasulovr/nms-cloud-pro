#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_URL:?SUPABASE_URL is required}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required}"
: "${BACKUP_STORAGE_DIR:?BACKUP_STORAGE_DIR is required}"

api="${SUPABASE_URL%/}/storage/v1"
auth=( -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" )
mkdir -p "${BACKUP_STORAGE_DIR}"

buckets="$(curl --fail --silent --show-error "${auth[@]}" "${api}/bucket")"
printf '%s' "${buckets}" | jq -r '.[].id' | while IFS= read -r bucket; do
  [ -n "${bucket}" ] || continue
  root="${BACKUP_STORAGE_DIR}/${bucket}"
  mkdir -p "${root}"
  export bucket root api SUPABASE_SERVICE_ROLE_KEY
  python3 - <<'PY'
import json, os, pathlib, subprocess, urllib.parse

api=os.environ["api"]
bucket=os.environ["bucket"]
root=pathlib.Path(os.environ["root"])
key=os.environ["SUPABASE_SERVICE_ROLE_KEY"]
headers=["-H", f"Authorization: Bearer {key}", "-H", f"apikey: {key}", "-H", "Content-Type: application/json"]

def request_list(prefix, offset):
    body=json.dumps({"prefix":prefix,"limit":1000,"offset":offset,"sortBy":{"column":"name","order":"asc"}})
    out=subprocess.check_output(["curl","--fail","--silent","--show-error",*headers,"-X","POST",f"{api}/object/list/{urllib.parse.quote(bucket,safe='')}", "--data",body])
    return json.loads(out)

def walk(prefix=""):
    offset=0
    while True:
        rows=request_list(prefix,offset)
        if not rows: break
        for item in rows:
            name=item.get("name","")
            if not name: continue
            path=f"{prefix}/{name}".strip("/")
            # Supabase list returns entries with null id for virtual folders.
            if item.get("id") is None:
                walk(path)
                continue
            target=root / path
            target.parent.mkdir(parents=True,exist_ok=True)
            url=f"{api}/object/{urllib.parse.quote(bucket,safe='')}/{urllib.parse.quote(path,safe='/')}"
            subprocess.run(["curl","--fail","--silent","--show-error",*headers,"-L",url,"--output",str(target)],check=True)
        if len(rows)<1000: break
        offset+=len(rows)

walk()
PY
done
