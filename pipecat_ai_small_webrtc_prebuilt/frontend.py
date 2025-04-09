import logging
import os

from fastapi.staticfiles import StaticFiles

# Path to your compiled Vite app
dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "client", "dist"))

print(f"Looking for dist directory at: {dist_dir}")
logging.info(f"Dist directory path: {dist_dir}")

if not os.path.isdir(dist_dir):
    print(f"Directory not found: {dist_dir}")
    logging.error(f"Static frontend build not found at: {dist_dir}")
    raise RuntimeError(
        f"Static frontend build not found at: {dist_dir}. Please run `npm run build` in the client directory."
    )

SmallWebRTCPrebuiltUI = StaticFiles(directory=dist_dir, html=True)
