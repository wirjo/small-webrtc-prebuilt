import argparse
import uvicorn
from fastapi import FastAPI
from small_webrtc_prebuilt.frontend import small_webrtc_prebuilt_ui

app = FastAPI()

# Mount the frontend at /client
app.mount("/client", small_webrtc_prebuilt_ui, name="small-webrtc-ui")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WebRTC demo")
    parser.add_argument(
        "--host", default="localhost", help="Host for HTTP server (default: localhost)"
    )
    parser.add_argument(
        "--port", type=int, default=7860, help="Port for HTTP server (default: 7860)"
    )
    parser.add_argument("--verbose", "-v", action="count")
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port)