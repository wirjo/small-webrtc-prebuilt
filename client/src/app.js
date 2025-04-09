"use strict";
/**
 * Copyright (c) 2024–2025, Daily
 *
 * SPDX-License-Identifier: BSD 2-Clause License
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const small_webrtc_transport_1 = require("@pipecat-ai/small-webrtc-transport");
const client_js_1 = require("@pipecat-ai/client-js");
require("./style.css");
class WebRTCApp {
    constructor() {
        // State
        this.connected = false;
        this.connecting = false;
        this.micMuted = false;
        this.cameraMuted = true;
        this.setupDOMElements();
        this.setupDOMEventListeners();
        this.initializeRTVIClient();
        // Get bot name from URL query if available
        const urlParams = new URLSearchParams(window.location.search);
        const botNameParam = urlParams.get('bot');
        if (botNameParam && this.botName) {
            this.botName.textContent = botNameParam;
        }
        // Initialize the devices
        void this.populateDevices();
    }
    initializeRTVIClient() {
        const transport = new small_webrtc_transport_1.SmallWebRTCTransport();
        // Configure the transport with any codec preferences
        if (this.audioCodec) {
            transport.setAudioCodec(this.audioCodec.value);
        }
        if (this.videoCodec) {
            transport.setVideoCodec(this.videoCodec.value);
        }
        const RTVIConfig = {
            // need to understand why it is complaining
            // @ts-ignore
            transport,
            params: {
                baseUrl: '/api/offer',
            },
            enableMic: true, // We'll control actual muting with enableMic() later
            enableCam: !this.cameraMuted, // Start with camera off by default
            callbacks: {
                // Transport state changes
                onTransportStateChanged: (state) => {
                    this.log(`Transport state: ${state}`);
                },
                // Connection events
                onConnected: () => {
                    this.onConnectedHandler();
                },
                onDisconnected: () => {
                    this.onDisconnectedHandler();
                },
                onBotReady: () => {
                    this.log('Bot is ready.');
                },
                // Speech events
                onUserStartedSpeaking: () => {
                    this.log('User started speaking.');
                },
                onUserStoppedSpeaking: () => {
                    this.log('User stopped speaking.');
                },
                onBotStartedSpeaking: () => {
                    this.log('Bot started speaking.');
                },
                onBotStoppedSpeaking: () => {
                    this.log('Bot stopped speaking.');
                },
                // Transcript events
                onUserTranscript: (transcript) => {
                    if (transcript.final) {
                        this.log(`User transcript: ${transcript.text}`);
                    }
                },
                onBotTranscript: (transcript) => {
                    this.log(`Bot transcript: ${transcript.text}`);
                },
                // Media tracks
                onTrackStarted: (track, participant) => {
                    if (participant === null || participant === void 0 ? void 0 : participant.local) {
                        // Handle local tracks (e.g., self-view)
                        if (track.kind === 'video') {
                            if (this.selfViewVideo && !this.selfViewVideo.srcObject) {
                                this.selfViewVideo.srcObject = new MediaStream([track]);
                            }
                            else if (this.selfViewVideo && this.selfViewVideo.srcObject) {
                                const stream = this.selfViewVideo.srcObject;
                                const videoTracks = stream.getVideoTracks();
                                if (videoTracks.length === 0) {
                                    stream.addTrack(track);
                                }
                            }
                            this.updateSelfViewVisibility();
                        }
                        return;
                    }
                    // Handle remote tracks (the bot)
                    this.onBotTrackStarted(track);
                },
                // Other events
                onServerMessage: (msg) => {
                    this.log(`Server message: ${msg}`);
                },
            },
        };
        // This is required for SmallWebRTCTransport
        RTVIConfig.customConnectHandler = () => Promise.resolve();
        this.rtviClient = new client_js_1.RTVIClient(RTVIConfig);
        this.smallWebRTCTransport = transport;
    }
    setupDOMElements() {
        // Get all the UI elements
        this.connectBtn = document.getElementById('connect-btn');
        this.connectBtnText = this.connectBtn.querySelector('.btn-text');
        this.disconnectBtn = document.getElementById('disconnect-btn');
        this.audioInput = document.getElementById('audio-input');
        this.videoInput = document.getElementById('video-input');
        this.audioCodec = document.getElementById('audio-codec');
        this.videoCodec = document.getElementById('video-codec');
        this.videoElement = document.getElementById('bot-video');
        this.audioElement = document.getElementById('bot-audio');
        this.debugLog = document.getElementById('debug-log');
        this.micToggleBtn = document.getElementById('mic-toggle');
        this.cameraToggleBtn = document.getElementById('camera-toggle');
        this.micChevronBtn = document.getElementById('mic-chevron');
        this.cameraChevronBtn = document.getElementById('camera-chevron');
        this.micPopover = document.getElementById('mic-popover');
        this.cameraPopover = document.getElementById('camera-popover');
        this.currentAudioDevice = document.getElementById('current-audio-device');
        this.currentVideoDevice = document.getElementById('current-video-device');
        this.selfViewContainer = document.getElementById('self-view-container');
        this.selfViewVideo = document.getElementById('self-view');
        this.videoContainer = document.getElementById('bot-video-container');
        this.botName = document.getElementById('bot-name');
    }
    setupDOMEventListeners() {
        // Connect/disconnect button
        this.connectBtn.addEventListener('click', () => {
            const state = this.connectBtn.getAttribute('data-state');
            if (state === 'disconnected') {
                void this.start();
            }
            else if (state === 'connected') {
                void this.stop();
            }
            // Do nothing if connecting - button should be disabled
        });
        if (this.disconnectBtn) {
            this.disconnectBtn.addEventListener('click', () => void this.stop());
        }
        // Media toggle buttons
        this.micToggleBtn.addEventListener('click', () => {
            this.toggleMicrophone();
        });
        this.cameraToggleBtn.addEventListener('click', () => {
            this.toggleCamera();
        });
        // Chevron buttons to show/hide device popovers
        this.micChevronBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.togglePopover(this.micPopover, this.micChevronBtn);
            // Hide camera popover if it's open
            if (this.cameraPopover.classList.contains('show')) {
                this.togglePopover(this.cameraPopover, this.cameraChevronBtn);
            }
        });
        this.cameraChevronBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.togglePopover(this.cameraPopover, this.cameraChevronBtn);
            // Hide mic popover if it's open
            if (this.micPopover.classList.contains('show')) {
                this.togglePopover(this.micPopover, this.micChevronBtn);
            }
        });
        // Device selection changes
        this.audioInput.addEventListener('change', (e) => {
            const target = e.target;
            const audioDevice = target.value;
            void this.rtviClient.updateMic(audioDevice);
            this.updateCurrentDeviceDisplay();
            if (this.connected) {
                this.log('Reconnecting to apply device change...');
                void this.stop();
                setTimeout(() => void this.start(), 500);
            }
        });
        this.videoInput.addEventListener('change', (e) => {
            const target = e.target;
            const videoDevice = target.value;
            void this.rtviClient.updateCam(videoDevice);
            this.updateCurrentDeviceDisplay();
            if (this.connected) {
                this.log('Reconnecting to apply device change...');
                void this.stop();
                setTimeout(() => void this.start(), 500);
            }
        });
        // Close popovers when clicking outside
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (!target.closest('.media-control') &&
                !target.closest('.device-popover')) {
                this.micPopover.classList.remove('show');
                this.micChevronBtn.classList.remove('active');
                this.cameraPopover.classList.remove('show');
                this.cameraChevronBtn.classList.remove('active');
            }
        });
    }
    togglePopover(popover, chevronBtn) {
        popover.classList.toggle('show');
        chevronBtn.classList.toggle('active');
    }
    toggleMicrophone() {
        if (!this.connected) {
            this.log('Cannot toggle microphone when not connected', 'error');
            return;
        }
        this.micMuted = !this.micMuted;
        // Use RTVI client to enable/disable the microphone
        this.rtviClient.enableMic(!this.micMuted);
        // Update UI
        if (this.micMuted) {
            this.micToggleBtn.setAttribute('data-state', 'muted');
            this.log('Microphone muted');
        }
        else {
            this.micToggleBtn.setAttribute('data-state', 'unmuted');
            this.log('Microphone unmuted');
        }
    }
    toggleCamera() {
        if (!this.connected) {
            this.log('Cannot toggle camera when not connected', 'error');
            return;
        }
        this.cameraMuted = !this.cameraMuted;
        // Use RTVI client to enable/disable the camera
        this.rtviClient.enableCam(!this.cameraMuted);
        // Update UI
        if (this.cameraMuted) {
            this.cameraToggleBtn.setAttribute('data-state', 'muted');
            this.log('Camera turned off');
        }
        else {
            this.cameraToggleBtn.setAttribute('data-state', 'unmuted');
            this.log('Camera turned on');
        }
        // Update self view visibility
        this.updateSelfViewVisibility();
    }
    updateCurrentDeviceDisplay() {
        // Update displayed device names in the dropdowns
        if (this.audioInput.selectedIndex > 0) {
            this.currentAudioDevice.textContent =
                this.audioInput.options[this.audioInput.selectedIndex].text;
        }
        else {
            this.currentAudioDevice.textContent = 'Default device';
        }
        if (this.videoInput.selectedIndex > 0) {
            this.currentVideoDevice.textContent =
                this.videoInput.options[this.videoInput.selectedIndex].text;
        }
        else {
            this.currentVideoDevice.textContent = 'Default device';
        }
    }
    updateSelfViewVisibility() {
        // Show self-view when connected and camera is not muted
        if (this.connected && !this.cameraMuted) {
            this.selfViewContainer.classList.add('active');
        }
        else {
            this.selfViewContainer.classList.remove('active');
        }
    }
    updateVideoVisibility(track, enabled) {
        this.log(`Video track ${enabled ? 'enabled' : 'disabled'}`);
        // Only update visibility if we're connected
        if (this.connected) {
            if (enabled) {
                // Show video, hide visualizer
                this.videoContainer.classList.remove('video-hidden');
                this.videoContainer.classList.add('video-visible');
            }
            else {
                // Hide video, show visualizer
                this.videoContainer.classList.remove('video-visible');
                this.videoContainer.classList.add('video-hidden');
            }
        }
        else {
            // If not connected, hide both
            this.videoContainer.classList.remove('video-hidden');
            this.videoContainer.classList.remove('video-visible');
        }
    }
    log(message, type = 'normal') {
        if (!this.debugLog)
            return;
        const now = new Date();
        const timeString = now.toISOString().replace('T', ' ').substring(0, 19);
        const entry = document.createElement('div');
        entry.textContent = `${timeString} - ${message}`;
        // Apply styling based on message type
        if (type === 'status' || message.includes('Status:')) {
            entry.classList.add('status-message');
        }
        else if (message.includes('User transcript:')) {
            entry.classList.add('user-message');
        }
        else if (message.includes('Bot transcript:')) {
            entry.classList.add('bot-message');
        }
        else if (type === 'error') {
            entry.classList.add('error-message');
        }
        this.debugLog.appendChild(entry);
        this.debugLog.scrollTop = this.debugLog.scrollHeight;
    }
    clearAllLogs() {
        if (this.debugLog) {
            this.debugLog.innerHTML = '';
            this.log('Log cleared', 'status');
        }
    }
    onConnectedHandler() {
        this.connected = true;
        this.connecting = false;
        // Update UI for connected state
        this.connectBtn.setAttribute('data-state', 'connected');
        this.connectBtnText.textContent = 'Disconnect';
        // Enable media control buttons
        this.micToggleBtn.disabled = false;
        this.cameraToggleBtn.disabled = false;
        this.micChevronBtn.disabled = false;
        this.cameraChevronBtn.disabled = false;
        // Set initial UI state for media controls based on mute states
        this.micToggleBtn.setAttribute('data-state', this.micMuted ? 'muted' : 'unmuted');
        this.cameraToggleBtn.setAttribute('data-state', this.cameraMuted ? 'muted' : 'unmuted');
        // Update self view visibility
        this.updateSelfViewVisibility();
        this.log(`Status: Connected`, 'status');
    }
    onDisconnectedHandler() {
        this.connected = false;
        this.connecting = false;
        // Update UI for disconnected state
        this.connectBtn.setAttribute('data-state', 'disconnected');
        this.connectBtnText.textContent = 'Connect';
        // Disable media control buttons
        this.micToggleBtn.disabled = false;
        this.cameraToggleBtn.disabled = false;
        this.micChevronBtn.disabled = false;
        this.cameraChevronBtn.disabled = false;
        // Hide self view
        this.selfViewContainer.classList.remove('active');
        // Reset video container state
        this.videoContainer.classList.remove('video-visible');
        this.videoContainer.classList.remove('video-hidden');
        // Disconnect the visualizer
        if (window.voiceVisualizer) {
            window.voiceVisualizer.disconnectAudio();
        }
        this.log(`Status: Disconnected`, 'status');
    }
    onBotTrackStarted(track) {
        if (track.kind === 'video') {
            // Set the video track to the video element
            this.videoElement.srcObject = new MediaStream([track]);
            // Update visibility based on track state
            this.updateVideoVisibility(track, !track.muted);
            // Set up track mute/unmute handling
            track.onmute = () => this.updateVideoVisibility(track, false);
            track.onunmute = () => this.updateVideoVisibility(track, true);
        }
        else if (track.kind === 'audio') {
            // Set the audio track to the audio element
            this.audioElement.srcObject = new MediaStream([track]);
            // Connect to visualizer
            if (window.voiceVisualizer) {
                window.voiceVisualizer.connectToAudioTrack(track);
            }
        }
    }
    populateDevices() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Initialize the media devices
                yield this.rtviClient.initDevices();
                // Get available devices
                const audioDevices = yield this.rtviClient.getAllMics();
                const videoDevices = yield this.rtviClient.getAllCams();
                // Clear existing options (except Default)
                while (this.audioInput.options.length > 1) {
                    this.audioInput.options.remove(1);
                }
                while (this.videoInput.options.length > 1) {
                    this.videoInput.options.remove(1);
                }
                // Add audio devices
                audioDevices.forEach((device, index) => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.text = device.label || `Microphone ${index + 1}`;
                    this.audioInput.appendChild(option);
                });
                // Add video devices
                videoDevices.forEach((device, index) => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.text = device.label || `Camera ${index + 1}`;
                    this.videoInput.appendChild(option);
                });
                // Update display
                this.updateCurrentDeviceDisplay();
                // Log detected devices
                if (audioDevices.length > 0) {
                    this.log(`Detected ${audioDevices.length} audio input devices`);
                }
                if (videoDevices.length > 0) {
                    this.log(`Detected ${videoDevices.length} video input devices`);
                }
            }
            catch (e) {
                const error = e;
                this.log(`Error getting devices: ${error.message}`, 'error');
                console.error('Device initialization error:', e);
            }
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.connecting) {
                return; // Prevent multiple connection attempts
            }
            this.connecting = true;
            this.clearAllLogs();
            // Update UI to show connecting state
            this.connectBtn.setAttribute('data-state', 'connecting');
            this.connectBtnText.textContent = 'Connect';
            this.log('Connecting...', 'status');
            try {
                // Set the audio and video codecs if needed
                if (this.audioCodec) {
                    this.smallWebRTCTransport.setAudioCodec(this.audioCodec.value);
                }
                if (this.videoCodec) {
                    this.smallWebRTCTransport.setVideoCodec(this.videoCodec.value);
                }
                // Enable or disable mic/camera based on current state
                this.rtviClient.enableMic(!this.micMuted);
                this.rtviClient.enableCam(!this.cameraMuted);
                // Connect to the bot
                yield this.rtviClient.connect();
                // Note: onConnectedHandler will be called via the callback when connection is fully established
            }
            catch (e) {
                const error = e;
                this.log(`Failed to connect: ${error.message}`, 'error');
                console.error('Connection error:', e);
                // Reset UI state on error
                this.connectBtn.setAttribute('data-state', 'disconnected');
                this.connectBtnText.textContent = 'Connect';
                this.connecting = false;
                void this.stop();
            }
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Disconnect from the bot
                yield this.rtviClient.disconnect();
                // Additional cleanup for the visualizer
                if (window.voiceVisualizer) {
                    window.voiceVisualizer.disconnectAudio();
                }
                // Clear video elements
                if (this.videoElement.srcObject) {
                    this.videoElement.srcObject = null;
                }
                if (this.audioElement.srcObject) {
                    this.audioElement.srcObject = null;
                }
                if (this.selfViewVideo.srcObject) {
                    this.selfViewVideo.srcObject = null;
                }
            }
            catch (e) {
                const error = e;
                this.log(`Error during disconnect: ${error.message}`, 'error');
                console.error('Disconnect error:', e);
            }
        });
    }
    // Public method for external access (e.g. from event handlers)
    shutdown() {
        void this.stop();
    }
}
// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // @ts-ignore - We know this is compatible
    window.webRTCApp = new WebRTCApp();
    // Cleanup when leaving the page
    window.addEventListener('beforeunload', () => {
        if (window.webRTCApp) {
            window.webRTCApp.shutdown();
        }
    });
});
