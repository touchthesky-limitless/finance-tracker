""" How to use:
Run: python scripts/upload_cards.py
copy the `UPDATE` statements that the script printed to your terminal and ran them in your Supabase SQL Editor.
"""

import os
from supabase import create_client
import mimetypes

# 1. Configuration
BUCKET_NAME = "card-images"
FOLDER_PATH = "./card-images"

# 2. Initialize Client using Environment Variables
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SECRET_KEY")

if not url or not key:
    print("❌ ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.")
    exit(1)

supabase = create_client(url, key)

def upload_and_generate_sql():
    files = [f for f in os.listdir(FOLDER_PATH) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
    
    print(f"🚀 Starting upload of {len(files)} images to bucket '{BUCKET_NAME}'...")

    for file_name in files:
        # Extract card ID from filename (e.g., 'chase-cfu.png' -> 'chase-cfu')
        card_id = os.path.splitext(file_name)[0]
        full_file_path = os.path.join(FOLDER_PATH, file_name)
        
        # 3. Upload to Supabase Storage
        with open(full_file_path, "rb") as file_data:
            content_type, _ = mimetypes.guess_type(full_file_path)
            if not content_type:
                content_type = 'image/png' # Fallback
            try:
                supabase.storage.from_(BUCKET_NAME).upload(
                    path=file_name,
                    file=file_data,
                    file_options={"content-type": content_type}
                )
            except Exception as e:
                # If file exists, this might error, but we can continue to get the URL
                print(f"ℹ️ Note for {file_name}: {e}")

        # 4. Generate Public URL and SQL
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_name)
        
        sql = f"UPDATE credit_cards SET image_url = '{public_url}' WHERE id = '{card_id}';"
        print(sql)

    print("\n✅ Done! Copy the SQL statements above into your Supabase SQL Editor.")

if __name__ == "__main__":
    upload_and_generate_sql()

"""
Complexity Analysis:
- Time Complexity: O(N * M), where N is the number of card images and M is the average file size for I/O operations.
- Space Complexity: O(M), as the script buffers one image file at a time into memory during the transfer.
"""