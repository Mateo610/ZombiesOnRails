from pathlib import Path
import zipfile
import sys
import os

#!/usr/bin/env python3

def main():
    cwd = Path(".")
    zip_files = sorted(cwd.glob("*.zip"))

    if not zip_files:
        print("No .zip files found in the current directory.")
        return 1

    for zip_path in zip_files:
        print(f"Extracting: {zip_path.name}")
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(cwd)
        print(f"Extracted contents of {zip_path.name}")

        # Delete the zip file after extraction
        zip_path.unlink()
        print(f"Deleted: {zip_path.name}")

    print(f"Finished extracting {len(zip_files)} file(s).")
    return 0

if __name__ == "__main__":
    sys.exit(main())
