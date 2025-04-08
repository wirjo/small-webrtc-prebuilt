"use strict";
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
class WebRTCApp {
    constructor() {
        this.debugLog = null;
        this.statusSpan = null;
        this.setupDOMElements();
        this.setupDOMEventListeners();
        this.initializeRTVIClient();
        void this.populateDevices();
    }
    initializeRTVIClient() {
        const transport = new small_webrtc_transport_1.SmallWebRTCTransport();
        const RTVIConfig = {
            // need to understand why it is complaining
            // @ts-ignore
            transport,
            params: {
                baseUrl: "/api/offer"
            },
            enableMic: true,
            enableCam: true,
            callbacks: {
                onTransportStateChanged: (state) => {
                    this.log(`Transport state: ${state}`);
                },
                onConnected: () => {
                    this.onConnectedHandler();
                },
                onBotReady: () => {
                    this.log("Bot is ready.");
                },
                onDisconnected: () => {
                    this.onDisconnectedHandler();
                },
                onUserStartedSpeaking: () => {
                    this.log("User started speaking.");
                },
                onUserStoppedSpeaking: () => {
                    this.log("User stopped speaking.");
                },
                onBotStartedSpeaking: () => {
                    this.log("Bot started speaking.");
                },
                onBotStoppedSpeaking: () => {
                    this.log("Bot stopped speaking.");
                },
                onUserTranscript: (transcript) => {
                    if (transcript.final) {
                        this.log(`User transcript: ${transcript.text}`);
                    }
                },
                onBotTranscript: (transcript) => {
                    this.log(`Bot transcript: ${transcript.text}`);
                },
                onTrackStarted: (track, participant) => {
                    if (participant === null || participant === void 0 ? void 0 : participant.local) {
                        return;
                    }
                    this.onBotTrackStarted(track);
                },
                onServerMessage: (msg) => {
                    this.log(`Server message: ${msg}`);
                }
            },
        };
        RTVIConfig.customConnectHandler = () => Promise.resolve();
        this.rtviClient = new client_js_1.RTVIClient(RTVIConfig);
        this.smallWebRTCTransport = transport;
    }
    setupDOMElements() {
        this.connectBtn = document.getElementById('connect-btn');
        this.disconnectBtn = document.getElementById('disconnect-btn');
        this.muteBtn = document.getElementById('mute-btn');
        this.audioInput = document.getElementById('audio-input');
        this.videoInput = document.getElementById('video-input');
        this.audioCodec = document.getElementById('audio-codec');
        this.videoCodec = document.getElementById('video-codec');
        this.videoElement = document.getElementById('bot-video');
        this.audioElement = document.getElementById('bot-audio');
        this.debugLog = document.getElementById('debug-log');
        this.statusSpan = document.getElementById('connection-status');
    }
    setupDOMEventListeners() {
        this.connectBtn.addEventListener("click", () => this.start());
        this.disconnectBtn.addEventListener("click", () => this.stop());
        this.audioInput.addEventListener("change", (e) => {
            var _a;
            // @ts-ignore
            let audioDevice = (_a = e.target) === null || _a === void 0 ? void 0 : _a.value;
            this.rtviClient.updateMic(audioDevice);
        });
        this.videoInput.addEventListener("change", (e) => {
            var _a;
            // @ts-ignore
            let videoDevice = (_a = e.target) === null || _a === void 0 ? void 0 : _a.value;
            this.rtviClient.updateCam(videoDevice);
        });
        this.muteBtn.addEventListener('click', () => {
            let isCamEnabled = this.rtviClient.isCamEnabled;
            this.rtviClient.enableCam(!isCamEnabled);
            this.muteBtn.textContent = isCamEnabled ? '📵' : '📷';
        });
    }
    log(message) {
        if (!this.debugLog)
            return;
        const entry = document.createElement('div');
        entry.textContent = `${new Date().toISOString()} - ${message}`;
        if (message.startsWith('User: ')) {
            entry.style.color = '#2196F3';
        }
        else if (message.startsWith('Bot: ')) {
            entry.style.color = '#4CAF50';
        }
        this.debugLog.appendChild(entry);
        this.debugLog.scrollTop = this.debugLog.scrollHeight;
    }
    clearAllLogs() {
        this.debugLog.innerText = '';
    }
    updateStatus(status) {
        if (this.statusSpan) {
            this.statusSpan.textContent = status;
        }
        this.log(`Status: ${status}`);
    }
    onConnectedHandler() {
        this.updateStatus('Connected');
        if (this.connectBtn)
            this.connectBtn.disabled = true;
        if (this.disconnectBtn)
            this.disconnectBtn.disabled = false;
    }
    onDisconnectedHandler() {
        this.updateStatus('Disconnected');
        if (this.connectBtn)
            this.connectBtn.disabled = false;
        if (this.disconnectBtn)
            this.disconnectBtn.disabled = true;
    }
    onBotTrackStarted(track) {
        if (track.kind === 'video') {
            this.videoElement.srcObject = new MediaStream([track]);
        }
        else {
            this.audioElement.srcObject = new MediaStream([track]);
        }
    }
    populateDevices() {
        return __awaiter(this, void 0, void 0, function* () {
            const populateSelect = (select, devices) => {
                let counter = 1;
                devices.forEach((device) => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.text = device.label || ('Device #' + counter);
                    select.appendChild(option);
                    counter += 1;
                });
            };
            try {
                const audioDevices = yield this.rtviClient.getAllMics();
                populateSelect(this.audioInput, audioDevices);
                const videoDevices = yield this.rtviClient.getAllCams();
                populateSelect(this.videoInput, videoDevices);
            }
            catch (e) {
                alert(e);
            }
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            this.clearAllLogs();
            this.connectBtn.disabled = true;
            this.updateStatus("Connecting");
            this.smallWebRTCTransport.setAudioCodec(this.audioCodec.value);
            this.smallWebRTCTransport.setVideoCodec(this.videoCodec.value);
            try {
                yield this.rtviClient.connect();
            }
            catch (e) {
                console.log(`Failed to connect ${e}`);
                this.stop();
            }
        });
    }
    stop() {
        void this.rtviClient.disconnect();
    }
}
// Create the WebRTCConnection instance
const webRTCConnection = new WebRTCApp();
