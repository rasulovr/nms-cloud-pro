# RMS Pro nightly Google Drive backup

This workflow runs daily at 03:00 Asia/Baku (23:00 UTC) and also supports a manual run.

It uploads only AES-256 encrypted archives to the designated Google Drive folder:

- `RMS_DATA_YYYY-MM-DD.tar.gz.gpg` — database data only;
- `RMS_FULL_YYYY-MM-DD.tar.gz.gpg` — application schema + data, all Supabase Storage files, source revision, and SHA-256 manifest.

Archives older than 90 days are removed only from the configured Drive backup folder. The workflow never changes production RMS or Supabase data.

## Required GitHub Actions secrets

Add these directly in **GitHub → rasulovr/nms-cloud-pro → Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `SUPABASE_DB_URL` | Production Supabase direct PostgreSQL connection URI |
| `SUPABASE_URL` | Production project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Production service-role key |
| `GOOGLE_DRIVE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_DRIVE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | OAuth refresh token for the backup Google account |
| `GOOGLE_DRIVE_BACKUP_FOLDER_ID` | ID of the `RMS Pro Backups` Drive folder |
| `BACKUP_ENCRYPTION_PASSPHRASE` | A new long random passphrase, stored offline as well |

Never commit any secret, JSON credential, dump, or decrypted archive to GitHub.
