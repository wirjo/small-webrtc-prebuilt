from setuptools import setup, find_packages

setup(
    name="small-webrtc-prebuilt",
    version="0.1.0",
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        "fastapi",
        "uvicorn[standard]"
    ],
    description="Prebuilt Vite frontend for small-webrtc",
    license="BSD 2-Clause License"
)
