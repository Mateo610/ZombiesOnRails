#!/usr/bin/env python3
"""
Download models from Google Drive and replace the models folder
"""

import os
import shutil
import urllib.request
import urllib.parse
import http.cookiejar
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
    print(f"📥 Downloading from Google Drive...")
    print(f"   File ID: {file_id}")
    
    # First, try using gdown library (best for Google Drive)
    try:
        import gdown
        url = f"https://drive.google.com/uc?id={file_id}"
        print("   Using gdown library...")
        gdown.download(url, destination, quiet=False)
        
        # Verify the downloaded file is valid
        if os.path.exists(destination) and os.path.getsize(destination) > 0:
            # Check if it's a zip file by reading first bytes
            with open(destination, 'rb') as f:
                header = f.read(4)
                if header == b'PK\x03\x04' or header == b'PK\x05\x06':  # ZIP file magic bytes
                    print(f"✅ Downloaded using gdown to: {destination}")
                    return True
                else:
                    print(f"⚠️ Downloaded file doesn't appear to be a zip file")
        
        print(f"⚠️ gdown download may have failed, trying direct method...")
    except ImportError:
        print("   gdown not available, using direct download method...")
        print("   (Install gdown for better reliability: pip install gdown)")
    except Exception as e:
        print(f"⚠️ gdown download failed: {e}")
        print("   Trying direct download method...")
    
    # Fallback: Try direct download with virus scan warning handling
    download_url = f"https://drive.google.com/uc?export=download&id={file_id}"
    
    try:
        # Create a cookie jar to handle Google Drive's virus scan warning
        cookie_jar = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))
        urllib.request.install_opener(opener)
        
        # First request to get the confirmation page
        with opener.open(download_url) as response:
            html = response.read().decode('utf-8')
            
            # Check if we got a virus scan warning page
            if 'virus scan warning' in html.lower() or 'download anyway' in html.lower():
                # Extract the confirmation token
                match = re.search(r'confirm=([a-zA-Z0-9_-]+)', html)
                if match:
                    confirm_token = match.group(1)
                    # Download with confirmation
                    download_url = f"https://drive.google.com/uc?export=download&id={file_id}&confirm={confirm_token}"
                    print("   Handling virus scan warning...")
        
        # Download the file
        urllib.request.urlretrieve(download_url, destination)
        
        # Verify it's a valid zip file
        if os.path.exists(destination) and os.path.getsize(destination) > 0:
            with open(destination, 'rb') as f:
                header = f.read(4)
                if header == b'PK\x03\x04' or header == b'PK\x05\x06':
                    print(f"✅ Downloaded to: {destination}")
                    return True
                else:
                    print(f"❌ Downloaded file is not a valid zip file (got HTML error page?)")
                    print(f"   File size: {os.path.getsize(destination)} bytes")
                    # Show first 200 chars to help debug
                    with open(destination, 'rb') as f:
                        preview = f.read(200)
                        if b'<html' in preview.lower() or b'<!doctype' in preview.lower():
                            print(f"   This appears to be an HTML page, not a zip file")
                    return False
        
        print(f"❌ Downloaded file is empty")
        return False
        
    except Exception as e:
        print(f"❌ Direct download failed: {e}")
        print("\n💡 Suggestions:")
        print("   1. Install gdown for better Google Drive support:")
        print("      pip install gdown")
        print("   2. Or download the file manually from Google Drive")
        print("   3. Or check if the Google Drive link is publicly accessible")
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
        
        # Validate that it's actually a zip file before extracting
        print("   🔍 Validating zip file...")
        try:
            with zipfile.ZipFile(str(zip_file), 'r') as test_zip:
                test_zip.testzip()  # Test the integrity
                print("   ✅ Zip file is valid")
        except zipfile.BadZipFile:
            print("   ❌ Downloaded file is not a valid zip file")
            print("   💡 This might be an HTML error page from Google Drive")
            print("   💡 Try installing gdown: pip install gdown")
            print("   💡 Or download the file manually from Google Drive")
            return
        except Exception as e:
            print(f"   ❌ Error validating zip file: {e}")
            return
        
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

