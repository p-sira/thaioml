import os
import subprocess
import sys
import tempfile
import urllib.request
from urllib.error import URLError, HTTPError

from backend.core.config import settings


def main():
    if not settings.snomed_db_download_url:
        print("Error: SNOMED_DB_DOWNLOAD_URL is not set in your .env or environment.")
        print("Please configure it to point to your Cloudflare hosted database dump.")
        sys.exit(1)

    url = settings.snomed_db_download_url
    print(f"Downloading SNOMED database dump from {url}...")

    req = urllib.request.Request(url)
    if settings.snomed_db_auth_token:
        # If you set up Cloudflare Access or a simple bearer token worker
        req.add_header("Authorization", f"Bearer {settings.snomed_db_auth_token}")
        
    try:
        # Create a temporary file to hold the downloaded dump
        fd, temp_path = tempfile.mkstemp(suffix=".dump")
        with os.fdopen(fd, 'wb') as f_out, urllib.request.urlopen(req) as response:
            total_size = response.length
            downloaded = 0
            chunk_size = 1024 * 1024  # 1MB chunks
            
            while True:
                chunk = response.read(chunk_size)
                if not chunk:
                    break
                f_out.write(chunk)
                downloaded += len(chunk)
                
                # Basic progress indicator
                if total_size:
                    percent = (downloaded / total_size) * 100
                    sys.stdout.write(f"\rProgress: {percent:.1f}% ({downloaded / (1024*1024):.1f} MB)")
                else:
                    sys.stdout.write(f"\rProgress: {downloaded / (1024*1024):.1f} MB downloaded")
                sys.stdout.flush()
        
        print("\nDownload complete. Restoring database...")

        # Parse the SQLAlchemy database URL into a format pg_restore understands
        # SQLAlchemy format: postgresql+psycopg://user:pass@host:port/dbname
        # pg_restore can accept standard postgresql:// URIs
        db_url = settings.database_url.replace("postgresql+psycopg://", "postgresql://")
        
        # We use pg_restore assuming the user created a custom-format dump (`pg_dump -Fc`)
        # The --clean flag drops existing objects before recreating them
        # The --if-exists flag prevents errors if the objects don't exist yet
        # The --no-owner flag ensures we don't hit permission errors assigning original owners
        restore_cmd = [
            "pg_restore",
            "--clean",
            "--if-exists",
            "--no-owner",
            "-d", db_url,
            temp_path
        ]
        
        print("Running pg_restore. This may take a few minutes...")
        result = subprocess.run(restore_cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print("Database restoration failed!")
            print("Error output:")
            print(result.stderr)
            sys.exit(result.returncode)
            
        print("Database restored successfully!")

    except HTTPError as e:
        print(f"\nHTTP Error downloading file: {e.code} {e.reason}")
        sys.exit(1)
    except URLError as e:
        print(f"\nURL Error: {e.reason}")
        sys.exit(1)
    except Exception as e:
        print(f"\nAn unexpected error occurred: {e}")
        sys.exit(1)
    finally:
        # Always clean up the temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == "__main__":
    main()
