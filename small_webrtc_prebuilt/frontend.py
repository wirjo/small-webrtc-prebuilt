from fastapi.staticfiles import StaticFiles
import os

# Path to your compiled Vite app
dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "client", "dist"))

if not os.path.isdir(dist_dir):
    raise RuntimeError(f"Static frontend build not found at: {dist_dir}. Please run `npm run build` in the client directory.")

small_webrtc_prebuilt_ui = StaticFiles(directory=dist_dir, html=True)