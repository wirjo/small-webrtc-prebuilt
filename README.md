# SmallWebRTC Prebuilt

A simple, ready-to-use client for testing the SmallWebRTCTransport.

This prebuilt client provides basic WebRTC functionality and serves as a lightweight tool 
to quickly verify transport behavior without needing a custom implementation. 

Ideal for development, debugging, and quick prototyping.

## 🚀 Development Quick Start

#### 🔧 Set Up the Environment
1. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
   
## Publishing

- Prepare to dist:
```shell
./scripts/prepare_dist.sh
```

- Test the build using TestPyPI with Twine:

Upload to TestPyPI using twine
```shell
twine upload --repository testpypi dist/*
```

Test using pip to download packages from TestPyPI instead of PyPI
```shell
pip install --index-url https://test.pypi.org/simple/ --extra-index-url https://pypi.org/simple/ pipecat-ai-small-webrtc-prebuilt
```

Once you are happy, publish it to production.
```shell
twine upload dist/*
```