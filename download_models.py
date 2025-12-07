#!/usr/bin/env python3
"""
Download models from Google Drive and replace the models folder
"""

import os
import shutil
import urllib.request
import zipfile
import re
from pathlib import Path

# Google Drive sharing link
GOOGLE_DRIVE_LINK = "https://drive.google.com/file/d/1aiTDKVFj8Kix0r1InepvRuoRlgpusLE9/view?usp=sharing"

# Extract file ID from Google Drive link
def extract_file_id(link):
    """Extract file ID from Google Drive sharing URL"""
    match = re.search(r'/file/d/([a-zA-Z0-9_-]+)', link)
    if match:
        return match.group(1)
    raise ValueError("Could not extract file ID from Google Drive link")

# Download file from Google Drive
def download_from_google_drive(file_id, destination):
    """Download a file from Google Drive using the file ID"""
    # Direct download URL format
    download_url = f"https://drive.google.com/uc?export=download&id={file_id}"
    
    print(f"📥 Downloading from Google Drive...")
    print(f"   File ID: {file_id}")
    
    # For large files, Google Drive may require confirmation
    # Try direct download first
    try:
        urllib.request.urlretrieve(download_url, destination)
        print(f"✅ Downloaded to: {destination}")
        return True
    except Exception as e:
        print(f"⚠️ Direct download failed: {e}")
        print("   Trying alternative method...")
        
        # Alternative: Use gdown library if available
        try:
            import gdown
            url = f"https://drive.google.com/uc?id={file_id}"
            gdown.download(url, destination, quiet=False)
            print(f"✅ Downloaded using gdown to: {destination}")
            return True
        except ImportError:
            print("❌ gdown not available. Install it with: pip install gdown")
            print("   Or try downloading manually and place zip file in project root")
            return False
        except Exception as e2:
            print(f"❌ Alternative download also failed: {e2}")
            return False

# Extract zip file
def extract_zip(zip_path, extract_to):
    """Extract zip file to specified directory"""
    print(f"📦 Extracting {zip_path}...")
    
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_to)
    
    print(f"✅ Extracted to: {extract_to}")

# Replace models folder
def replace_models_folder(new_models_path, target_path):
    """Replace the models folder with the new one"""
    target_path = Path(target_path)
    new_models_path = Path(new_models_path)
    
    # Check if new models folder exists
    if not new_models_path.exists():
        print(f"⚠️ New models folder not found at: {new_models_path}")
        # Check if it's inside the extracted folder
        extracted_dir = new_models_path.parent
        possible_paths = list(extracted_dir.rglob("models"))
        if possible_paths:
            new_models_path = possible_paths[0]
            print(f"   Found models folder at: {new_models_path}")
        else:
            print(f"❌ Could not find models folder in extracted files")
            return False
    
    # Backup old models folder if it exists
    if target_path.exists():
        backup_path = target_path.parent / f"{target_path.name}_backup"
        print(f"💾 Backing up existing models folder to: {backup_path}")
        if backup_path.exists():
            shutil.rmtree(backup_path)
        shutil.move(str(target_path), str(backup_path))
        print(f"✅ Backup created")
    
    # Copy new models folder
    print(f"🔄 Replacing models folder...")
    shutil.copytree(str(new_models_path), str(target_path))
    print(f"✅ Models folder replaced successfully!")
    
    return True

def main():
    """Main function"""
    print("=" * 60)
    print("📥 Google Drive Models Downloader")
    print("=" * 60)
    
    # Get project root (assuming script is in project root)
    script_dir = Path(__file__).parent
    project_root = script_dir
    models_folder = project_root / "models"
    zip_file = project_root / "models_download.zip"
    temp_extract = project_root / "temp_models_extract"
    
    try:
        # Step 1: Extract file ID
        print("\n1️⃣ Extracting file ID from Google Drive link...")
        file_id = extract_file_id(GOOGLE_DRIVE_LINK)
        print(f"   ✅ File ID: {file_id}")
        
        # Step 2: Download zip file
        print("\n2️⃣ Downloading zip file...")
        if not download_from_google_drive(file_id, str(zip_file)):
            print("❌ Failed to download file")
            return
        
        # Check if file was downloaded
        if not zip_file.exists() or zip_file.stat().st_size == 0:
            print("❌ Downloaded file is empty or doesn't exist")
            return
        
        file_size_mb = zip_file.stat().st_size / (1024 * 1024)
        print(f"   ✅ Downloaded: {file_size_mb:.2f} MB")
        
        # Step 3: Extract zip file
        print("\n3️⃣ Extracting zip file...")
        if temp_extract.exists():
            shutil.rmtree(temp_extract)
        temp_extract.mkdir()
        
        extract_zip(str(zip_file), str(temp_extract))
        
        # Step 4: Find and replace models folder
        print("\n4️⃣ Replacing models folder...")
        
        # Look for models folder in extracted files
        extracted_models = temp_extract / "models"
        if not extracted_models.exists():
            # Check if the zip contained a folder with models inside
            for item in temp_extract.iterdir():
                if item.is_dir():
                    possible_models = item / "models"
                    if possible_models.exists():
                        extracted_models = possible_models
                        break
        
        if not replace_models_folder(extracted_models, models_folder):
            print("❌ Failed to replace models folder")
            return
        
        # Step 5: Cleanup
        print("\n5️⃣ Cleaning up temporary files...")
        if zip_file.exists():
            zip_file.unlink()
            print(f"   ✅ Removed: {zip_file.name}")
        if temp_extract.exists():
            shutil.rmtree(temp_extract)
            print(f"   ✅ Removed: {temp_extract.name}")
        
        print("\n" + "=" * 60)
        print("✅ Successfully updated models folder!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        
        # Cleanup on error
        if zip_file.exists():
            print(f"\n🧹 Cleaning up: {zip_file.name}")
            zip_file.unlink()
        if temp_extract.exists():
            print(f"🧹 Cleaning up: {temp_extract.name}")
            shutil.rmtree(temp_extract)

if __name__ == "__main__":
    main()

