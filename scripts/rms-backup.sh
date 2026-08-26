#!/usr/bin/env bash
set -euo pipefail
umask 077

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
: "${BACKUP_ENCRYPTION_PASSPHRASE:?BACKUP_ENCRYPTION_PASSPHRASE is required}"
: "${GOOGLE_DRIVE_CLIENT_ID:?GOOGLE_DRIVE_CLIENT_ID is required}"
: "${GOOGLE_DRIVE_CLIENT_SECRET:?GOOGLE_DRIVE_CLIENT_SECRET is required}"
: "${GOOGLE_DRIVE_REFRESH_TOKEN:?GOOGLE_DRIVE_REFRESH_TOKEN is required}"
: "${GOOGLE_DRIVE_BACKUP_FOLDER_ID:?GOOGLE_DRIVE_BACKUP_FOLDER_ID is required}"

root="${RUNNER_TEMP:-/tmp}/rms-backup-${GITHUB_RUN_ID:-manual}"
date_tag="$(TZ=Asia/Baku date +%F)"
work="${root}/work"
out="${root}/out"
mkdir -p "${work}/full/storage" "${out}"
cleanup() { rm -rf "${root}"; }
trap cleanup EXIT

pg_dump --format=custom --no-owner --no-privileges --data-only "${SUPABASE_DB_URL}" > "${work}/data.dump"
pg_dump --format=custom --no-owner --no-privileges "${SUPABASE_DB_URL}" > "${work}/full/database-schema-and-data.dump"

export BACKUP_STORAGE_DIR="${work}/full/storage"
"$(dirname "$0")/export-supabase-storage.sh"

mkdir -p "${work}/full/source"
tar --exclude=.git --exclude=node_modules --exclude=dist -czf "${work}/full/source/rms-source.tar.gz" -C "${GITHUB_WORKSPACE}" .
cp "${work}/data.dump" "${work}/full/data-only.dump"
(
  cd "${work}/full"
  sha256sum database-schema-and-data.dump data-only.dump source/rms-source.tar.gz > SHA256SUMS.txt
  printf 'Created (Asia/Baku): %s\nRetention: 90 days\nEncryption: AES-256 (GPG symmetric)\n' "$(TZ=Asia/Baku date --iso-8601=seconds)" > MANIFEST.txt
  find storage -type f -print0 | sort -z | xargs -0 -r sha256sum >> SHA256SUMS.txt
)
tar -C "${work}" -czf "${work}/RMS_DATA_${date_tag}.tar.gz" data.dump
tar -C "${work}" -czf "${work}/RMS_FULL_${date_tag}.tar.gz" full

encrypt() {
  local input="$1" output="$2"
  printf '%s' "${BACKUP_ENCRYPTION_PASSPHRASE}" | gpg --batch --yes --symmetric --cipher-algo AES256 --pinentry-mode loopback --passphrase-fd 0 --output "${output}" "${input}"
}
encrypt "${work}/RMS_DATA_${date_tag}.tar.gz" "${out}/RMS_DATA_${date_tag}.tar.gz.gpg"
encrypt "${work}/RMS_FULL_${date_tag}.tar.gz" "${out}/RMS_FULL_${date_tag}.tar.gz.gpg"
(cd "${out}" && sha256sum *.gpg > "SHA256SUMS_${date_tag}.txt")

config="${root}/rclone.conf"
cat > "${config}" <<EOF
[rms_drive]
type = drive
scope = drive.file
client_id = ${GOOGLE_DRIVE_CLIENT_ID}
client_secret = ${GOOGLE_DRIVE_CLIENT_SECRET}
root_folder_id = ${GOOGLE_DRIVE_BACKUP_FOLDER_ID}
token = {"access_token":"","token_type":"Bearer","refresh_token":"${GOOGLE_DRIVE_REFRESH_TOKEN}","expiry":"1970-01-01T00:00:00Z"}
EOF
rclone --config "${config}" copy "${out}" rms_drive: --include 'RMS_*' --checkers 4 --transfers 2
rclone --config "${config}" delete rms_drive: --min-age 90d --include 'RMS_*'
rclone --config "${config}" lsf rms_drive: --include "RMS_DATA_${date_tag}.tar.gz.gpg" --files-only | grep -qx "RMS_DATA_${date_tag}.tar.gz.gpg"
rclone --config "${config}" lsf rms_drive: --include "RMS_FULL_${date_tag}.tar.gz.gpg" --files-only | grep -qx "RMS_FULL_${date_tag}.tar.gz.gpg"
