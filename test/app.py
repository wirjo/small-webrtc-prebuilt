#
# Copyright (c) 2024–2025, Daily
#
# SPDX-License-Identifier: BSD 2-Clause License
#

import asyncio
import importlib.util
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from loguru import logger
from pipecat.transports.network.webrtc_connection import SmallWebRTCConnection

# Import your prebuilt UI
from small_webrtc_prebuilt.frontend import small_webrtc_prebuilt_ui

# Load environment variables
load_dotenv(override=True)

# Create a FastAPI app instead of FastHTML
app = FastAPI()

# Track active connection
bot_connection = None
bot_task = None
bot_module = None  # Store the imported bot module


@asynccontextmanager
async def lifespan(app):
    """Manage application lifecycle."""
    yield
    # Close bot connection on shutdown
    global bot_connection
    if bot_connection:
        await bot_connection.close()


app.router.lifespan = lifespan


# API endpoint for WebRTC offer - DEFINE THIS BEFORE MOUNTING THE UI
@app.post("/api/offer")
async def webrtc_offer_post(request: Request):
    """Handle WebRTC offers and create/manage connections."""
    global bot_connection, bot_task, bot_module

    # Extract JSON data
    data = await request.json()

    # Get the bot file path from the environment
    bot_path = os.getenv("BOT_FILE_PATH", "")
    if not bot_path:
        logger.error("No bot file specified. Run with python run.py <bot_file>")
        return {"error": "No bot file specified"}

    # Check if the bot file exists
    bot_file = Path(bot_path)
    if not bot_file.exists():
        logger.error(f"Bot file not found: {bot_file}")
        return {"error": f"Bot file not found: {bot_file}"}

    # Handle reconnection case
    pc_id = data.get("pc_id")
    if pc_id and bot_connection and pc_id == bot_connection.pc_id:
        await bot_connection.renegotiate(sdp=data["sdp"], type=data["type"])
    else:
        # Close existing connection if any
        if bot_connection:
            await bot_connection.close()

        # Create new connection
        bot_connection = SmallWebRTCConnection()
        await bot_connection.initialize(sdp=data["sdp"], type=data["type"])

        @bot_connection.event_handler("closed")
        async def handle_disconnected(webrtc_connection: SmallWebRTCConnection):
            """Handle WebRTC connection closure."""
            global bot_connection
            if bot_connection and bot_connection.pc_id == webrtc_connection.pc_id:
                bot_connection = None

        # Cancel previous bot task if exists
        if bot_task and not bot_task.done():
            bot_task.cancel()

        # Import the bot module if not already imported
        if not bot_module:
            try:
                # Import the bot module directly from file
                logger.info(f"Loading bot from {bot_file}")

                # Handle possible logger issues
                try:
                    spec = importlib.util.spec_from_file_location("bot_module", bot_file)
                    if spec is None:
                        logger.error(f"Could not load module from file: {bot_file}")
                        return {"error": f"Could not load module from file: {bot_file}"}

                    bot_module = importlib.util.module_from_spec(spec)
                    sys.modules["bot_module"] = bot_module
                    spec.loader.exec_module(bot_module)
                except ValueError as e:
                    if "There is no existing handler with id" in str(e):
                        # This is the loguru error - patch the logger temporarily
                        logger.warning("Handling loguru configuration issue")

                        # Save original logger state
                        original_remove = logger.remove

                        # Replace with a safer version
                        def safe_remove(handler_id=None):
                            try:
                                return original_remove(handler_id)
                            except ValueError:
                                return None

                        # Apply the patch
                        logger.remove = safe_remove

                        # Try again
                        spec = importlib.util.spec_from_file_location("bot_module", bot_file)
                        if spec is None:
                            logger.error(f"Could not load module from file: {bot_file}")
                            return {"error": f"Could not load module from file: {bot_file}"}

                        bot_module = importlib.util.module_from_spec(spec)
                        sys.modules["bot_module"] = bot_module
                        spec.loader.exec_module(bot_module)

                        # Restore original logger
                        logger.remove = original_remove
                    else:
                        raise
            except Exception as e:
                logger.exception(f"Error importing bot module: {e}")
                return {"error": f"Failed to import bot: {str(e)}"}

        # Start the bot task
        try:
            if hasattr(bot_module, "run_bot"):
                # Check if run_bot requires a room_name parameter
                import inspect

                sig = inspect.signature(bot_module.run_bot)
                if len(sig.parameters) >= 2:
                    bot_task = asyncio.create_task(bot_module.run_bot(bot_connection))
                else:
                    bot_task = asyncio.create_task(bot_module.run_bot(bot_connection))
            else:
                logger.error("Bot module does not have a run_bot function")
                return {"error": "Bot module does not have a run_bot function"}
        except Exception as e:
            logger.exception(f"Error starting bot: {e}")
            return {"error": f"Failed to start bot: {str(e)}"}

    # Return the WebRTC answer
    return bot_connection.get_answer()


# Mount your prebuilt UI *AFTER* defining API endpoints
app.mount("/", small_webrtc_prebuilt_ui)


@app.get("/", include_in_schema=False)
async def root_redirect():
    return RedirectResponse(url="/client/")
