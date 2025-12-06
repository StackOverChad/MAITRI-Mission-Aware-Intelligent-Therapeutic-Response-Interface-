import os
import sys
from dotenv import load_dotenv

# Load config from .env
load_dotenv()

target_dir = os.getenv("MODEL_STORAGE_PATH")
model_filename = os.getenv("MODEL_FILENAME")

if not target_dir:
    print("❌ Error: MODEL_STORAGE_PATH not found in .env")
    sys.exit(1)

# Ensure E: drive folder exists
if not os.path.exists(target_dir):
    try:
        os.makedirs(target_dir)
        print(f"📂 Created directory: {target_dir}")
    except Exception as e:
        print(f"❌ Error creating directory on E: drive: {e}")
        sys.exit(1)

try:
    from huggingface_hub import hf_hub_download, snapshot_download
except ImportError:
    print("Installing huggingface_hub...")
    os.system(f"{sys.executable} -m pip install huggingface_hub")
    from huggingface_hub import hf_hub_download, snapshot_download

def download_cognitive_core():
    print(f"\n🧠 DOWNLOADING BRAIN (Llama-3) to {target_dir}...")
    print("   Note: This is ~5.7GB. It may take time.")
    
    repo_id = "MaziyarPanahi/Meta-Llama-3-8B-Instruct-GGUF"
    source_filename = "Meta-Llama-3-8B-Instruct.Q4_K_M.gguf"
    
    try:
        file_path = hf_hub_download(
            repo_id=repo_id,
            filename=source_filename,
            local_dir=target_dir,
            local_dir_use_symlinks=False
        )
        
        # Rename to standard name defined in .env
        final_path = os.path.join(target_dir, model_filename)
        if os.path.exists(final_path):
            os.remove(final_path)
        os.rename(file_path, final_path)
        
        print(f"✅ Cognitive Core Ready: {final_path}")
    except Exception as e:
        print(f"❌ Download Failed: {e}")

def download_auditory_cortex():
    print(f"\n👂 DOWNLOADING EARS (Wav2Vec2) to {target_dir}...")
    
    repo_id = "ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition"
    
    try:
        path = snapshot_download(
            repo_id=repo_id,
            local_dir=os.path.join(target_dir, "audio_model"),
            local_dir_use_symlinks=False,
            ignore_patterns=["*.msgpack", "*.h5", "*.tflite"]
        )
        print(f"✅ Auditory Cortex Ready: {path}")
    except Exception as e:
        print(f"❌ Download Failed: {e}")

if __name__ == "__main__":
    print("🚀 STARTING MAITRI SETUP")
    download_cognitive_core()
    download_auditory_cortex()
    print("\n✨ SETUP COMPLETE.")