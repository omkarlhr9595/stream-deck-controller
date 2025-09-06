import { OBSScene, OBSConnectionConfig, ConnectionStatus } from "./types";

export class UI {
  private app: HTMLElement;
  private obsClient: any; // Will be injected
  private audioSources: string[] = [];
  private videoSources: string[] = [];
  private selectedAudioSource: string | null = null;
  private selectedVideoSource: string | null = null;

  constructor(app: HTMLElement) {
    this.app = app;
    this.loadSavedConnection();
  }

  setOBSClient(client: any) {
    this.obsClient = client;
  }

  private loadSavedConnection(): void {
    try {
      const saved = localStorage.getItem('obs-connection');
      if (saved) {
        const connectionData = JSON.parse(saved);
        
        // Check if saved data is not too old (24 hours)
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        if (Date.now() - connectionData.timestamp < maxAge) {
          // Populate form fields
          const addressInput = document.getElementById("obs-address") as HTMLInputElement;
          const portInput = document.getElementById("obs-port") as HTMLInputElement;
          const passwordInput = document.getElementById("obs-password") as HTMLInputElement;
          
          if (addressInput) addressInput.value = connectionData.address || '';
          if (portInput) portInput.value = connectionData.port?.toString() || '4455';
          if (passwordInput) passwordInput.value = connectionData.password || '';
          
          console.log("Loaded saved connection details");
          
          // Auto-connect if we have valid saved data
          if (connectionData.address) {
            console.log("Attempting auto-connect with saved credentials...");
            setTimeout(() => this.autoConnect(connectionData), 1000);
          }
        } else {
          // Remove expired data
          localStorage.removeItem('obs-connection');
        }
      }
    } catch (error) {
      console.error("Failed to load saved connection:", error);
      // Remove corrupted data
      localStorage.removeItem('obs-connection');
    }
  }

  private async autoConnect(connectionData: any): Promise<void> {
    try {
      this.showLoading(true);
      const config: OBSConnectionConfig = { 
        address: connectionData.address, 
        port: connectionData.port, 
        password: connectionData.password 
      };
      
      const status = await this.obsClient.connect(config);

      if (status.connected) {
        this.updateConnectionStatus(status);
        this.showScenesPanel();
        await this.loadScenes();
        console.log("Auto-connect successful!");
      } else {
        console.log("Auto-connect failed:", status.error);
        // Don't show error for auto-connect failures, just log them
      }
    } catch (error) {
      console.log("Auto-connect error:", error);
      // Don't show error for auto-connect failures, just log them
    } finally {
      this.showLoading(false);
    }
  }

  render(): void {
    this.app.innerHTML = `
      <div class="min-h-screen bg-gray-900">
        <!-- Header -->
        <header class="bg-gray-800 border-b border-gray-700 px-4 py-3">
          <div class="flex items-center justify-between">
            <h1 class="text-xl font-bold text-white">OBS Controller</h1>
            <div id="connection-status" class="flex items-center space-x-2">
              <div class="w-3 h-3 rounded-full bg-red-500"></div>
              <span class="text-sm text-gray-300">Disconnected</span>
            </div>
          </div>
        </header>

        <!-- Connection Panel -->
        <div id="connection-panel" class="p-4 border-b border-gray-700">
          <div class="max-w-md mx-auto">
            <h2 class="text-lg font-semibold mb-4 text-white">Connect to OBS</h2>
            <form id="connection-form" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">OBS IP Address</label>
                <input 
                  type="text" 
                  id="obs-address" 
                  placeholder="192.168.1.100" 
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value="localhost"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Port</label>
                <input 
                  type="number" 
                  id="obs-port" 
                  placeholder="4455" 
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value="4455"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Password (optional)</label>
                <input 
                  type="password" 
                  id="obs-password" 
                  placeholder="Enter password" 
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
              </div>
              <div class="space-y-2">
                <button 
                  type="submit" 
                  id="connect-btn"
                  class="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Connect
                </button>
                <button 
                  type="button" 
                  id="clear-saved-btn"
                  class="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                >
                  Clear Saved Connection
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Scenes Panel -->
        <div id="scenes-panel" class="p-4 hidden">
          <div class="max-w-4xl mx-auto">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-white">OBS Controls</h2>
              <div class="flex items-center space-x-3">
                <button 
                  id="refresh-btn"
                  class="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Refresh
                </button>
                <button 
                  id="disconnect-btn"
                  class="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>


            <!-- Quick Controls -->
            <div class="mb-6">
              <h3 class="text-md font-medium text-white mb-3">Quick Controls</h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <!-- Recording -->
                <button 
                  id="recording-btn"
                  class="p-3 bg-red-600 hover:bg-red-700 border-2 border-red-500 rounded-lg transition-all duration-200 text-center"
                >
                  <div class="text-sm font-medium text-white">🔴 Recording</div>
                  <div id="recording-status" class="text-xs text-red-200 mt-1">Stopped</div>
                </button>

                <!-- Streaming -->
                <button 
                  id="streaming-btn"
                  class="p-3 bg-purple-600 hover:bg-purple-700 border-2 border-purple-500 rounded-lg transition-all duration-200 text-center"
                >
                  <div class="text-sm font-medium text-white">📺 Streaming</div>
                  <div id="streaming-status" class="text-xs text-purple-200 mt-1">Offline</div>
                </button>

                <!-- Microphone -->
                <button 
                  id="mic-btn"
                  class="p-3 bg-blue-600 hover:bg-blue-700 border-2 border-blue-500 rounded-lg transition-all duration-200 text-center"
                >
                  <div class="text-sm font-medium text-white">🎤 Microphone</div>
                  <div id="mic-status" class="text-xs text-blue-200 mt-1">Unmuted</div>
                  <div id="mic-source" class="text-xs text-blue-300 mt-1 truncate">Loading...</div>
                </button>

                <!-- Camera -->
                <button 
                  id="camera-btn"
                  class="p-3 bg-green-600 hover:bg-green-700 border-2 border-green-500 rounded-lg transition-all duration-200 text-center"
                >
                  <div class="text-sm font-medium text-white">📹 Camera</div>
                  <div id="camera-status" class="text-xs text-green-200 mt-1">On</div>
                  <div id="camera-source" class="text-xs text-green-300 mt-1 truncate">Loading...</div>
                </button>
              </div>
            </div>

            <!-- Scenes -->
            <div class="mb-4">
              <h3 class="text-md font-medium text-white mb-3">Scenes</h3>
              <div id="scenes-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <!-- Scenes will be populated here -->
              </div>
            </div>
          </div>
        </div>

        <!-- Loading Spinner -->
        <div id="loading" class="hidden fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
          <div class="bg-gray-800 rounded-lg p-6 flex items-center space-x-3">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
            <span class="text-white">Loading...</span>
          </div>
        </div>

        <!-- Error Toast -->
        <div id="error-toast" class="hidden fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          <span id="error-message"></span>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const connectionForm = document.getElementById(
      "connection-form"
    ) as HTMLFormElement;
    const connectBtn = document.getElementById(
      "connect-btn"
    ) as HTMLButtonElement;
    const disconnectBtn = document.getElementById(
      "disconnect-btn"
    ) as HTMLButtonElement;
    const refreshBtn = document.getElementById(
      "refresh-btn"
    ) as HTMLButtonElement;

    // Control buttons
    const recordingBtn = document.getElementById("recording-btn") as HTMLButtonElement;
    const streamingBtn = document.getElementById("streaming-btn") as HTMLButtonElement;
    const micBtn = document.getElementById("mic-btn") as HTMLButtonElement;
    const cameraBtn = document.getElementById("camera-btn") as HTMLButtonElement;
    const clearSavedBtn = document.getElementById("clear-saved-btn") as HTMLButtonElement;
    

    connectionForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.handleConnect();
    });

    disconnectBtn?.addEventListener("click", async () => {
      await this.handleDisconnect();
    });

    refreshBtn?.addEventListener("click", async () => {
      await this.handleRefresh();
    });

    // Control button event listeners
    recordingBtn?.addEventListener("click", async () => {
      await this.handleRecordingToggle();
    });

    streamingBtn?.addEventListener("click", async () => {
      await this.handleStreamingToggle();
    });

    micBtn?.addEventListener("click", async () => {
      await this.handleMicToggle();
    });

    cameraBtn?.addEventListener("click", async () => {
      await this.handleCameraToggle();
    });

    clearSavedBtn?.addEventListener("click", () => {
      localStorage.removeItem('obs-connection');
      // Clear form fields
      const addressInput = document.getElementById("obs-address") as HTMLInputElement;
      const portInput = document.getElementById("obs-port") as HTMLInputElement;
      const passwordInput = document.getElementById("obs-password") as HTMLInputElement;
      
      if (addressInput) addressInput.value = '';
      if (portInput) portInput.value = '4455';
      if (passwordInput) passwordInput.value = '';
      
      console.log("Cleared saved connection details");
    });

  }

  private async handleConnect(): Promise<void> {
    const address = (document.getElementById("obs-address") as HTMLInputElement)
      ?.value;
    const port = parseInt(
      (document.getElementById("obs-port") as HTMLInputElement)?.value || "4455"
    );
    const password = (
      document.getElementById("obs-password") as HTMLInputElement
    )?.value;

    if (!address) {
      this.showError("Please enter OBS IP address");
      return;
    }

    // Save connection details to localStorage
    const connectionData = {
      address,
      port,
      password: password || undefined,
      timestamp: Date.now()
    };
    localStorage.setItem('obs-connection', JSON.stringify(connectionData));

    this.showLoading(true);
    this.setConnectButtonLoading(true);

    try {
      const config: OBSConnectionConfig = { address, port, password };
      const status = await this.obsClient.connect(config);

      if (status.connected) {
        this.updateConnectionStatus(status);
        this.showScenesPanel();
        await this.loadScenes();
      } else {
        this.showError(status.error || "Connection failed");
      }
    } catch (error) {
      this.showError(
        error instanceof Error ? error.message : "Connection failed"
      );
    } finally {
      this.showLoading(false);
      this.setConnectButtonLoading(false);
    }
  }

  private async handleDisconnect(): Promise<void> {
    try {
      await this.obsClient.disconnect();
      this.updateConnectionStatus({ connected: false });
      this.showConnectionPanel();
      
      // Clear saved connection on manual disconnect
      localStorage.removeItem('obs-connection');
      console.log("Cleared saved connection details");
    } catch (error) {
      this.showError("Failed to disconnect");
    }
  }

  private async handleRefresh(): Promise<void> {
    try {
      this.showLoading(true);
      await this.refreshScenes();
    } catch (error) {
      this.showError("Failed to refresh scenes");
    } finally {
      this.showLoading(false);
    }
  }

  public async loadScenes(): Promise<void> {
    try {
      const sceneData = await this.obsClient.getScenes();
      this.renderScenes(sceneData.scenes, sceneData.currentScene);
      
      // Also load available sources
      await this.loadSources();
    } catch (error) {
      this.showError("Failed to load scenes");
    }
  }

  private async loadSources(): Promise<void> {
    // Use fixed source names as specified by user
    this.selectedAudioSource = "MIC";
    this.selectedVideoSource = "Cam";
    
    // Update UI with source names
    this.updateSourceNames();
    
    console.log("Using fixed source names - Audio: MIC, Video: Cam");
  }

  private updateSourceNames(): void {
    const micSourceEl = document.getElementById("mic-source");
    const cameraSourceEl = document.getElementById("camera-source");
    
    if (micSourceEl) {
      micSourceEl.textContent = this.selectedAudioSource || "No audio source";
    }
    
    if (cameraSourceEl) {
      cameraSourceEl.textContent = this.selectedVideoSource || "No video source";
    }
  }


  private async refreshScenes(): Promise<void> {
    try {
      const sceneData = await this.obsClient.refreshScenes();
      this.renderScenes(sceneData.scenes, sceneData.currentScene);
    } catch (error) {
      this.showError("Failed to refresh scenes");
    }
  }

  private renderScenes(scenes: OBSScene[], currentScene: string | null): void {
    const scenesGrid = document.getElementById("scenes-grid");
    if (!scenesGrid) return;

    scenesGrid.innerHTML = scenes
      .map(
        (scene) => `
      <button 
        class="scene-btn p-4 bg-gray-800 hover:bg-gray-700 border-2 rounded-lg transition-all duration-200 text-left ${
          scene.sceneName === currentScene
            ? "border-primary-500 bg-primary-900"
            : "border-gray-600 hover:border-gray-500"
        }"
        data-scene="${scene.sceneName}"
      >
        <div class="text-sm font-medium text-white truncate">${
          scene.sceneName
        }</div>
        ${
          scene.sceneName === currentScene
            ? '<div class="text-xs text-primary-300 mt-1">Current</div>'
            : ""
        }
      </button>
    `
      )
      .join("");

    // Add click listeners to scene buttons
    scenesGrid.querySelectorAll(".scene-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const sceneName = (e.currentTarget as HTMLElement).dataset.scene;
        if (sceneName) {
          await this.switchScene(sceneName);
        }
      });
    });
  }

  private async switchScene(sceneName: string): Promise<void> {
    try {
      await this.obsClient.switchScene(sceneName);
      // Update UI to show current scene
      await this.loadScenes();
    } catch (error) {
      this.showError("Failed to switch scene");
    }
  }

  public updateConnectionStatus(status: ConnectionStatus): void {
    const statusElement = document.getElementById("connection-status");
    if (!statusElement) return;

    const dot = statusElement.querySelector("div");
    const text = statusElement.querySelector("span");

    if (status.connected) {
      dot?.classList.remove("bg-red-500");
      dot?.classList.add("bg-green-500");
      text!.textContent = "Connected";
    } else {
      dot?.classList.remove("bg-green-500");
      dot?.classList.add("bg-red-500");
      text!.textContent = "Disconnected";
    }
  }

  private showConnectionPanel(): void {
    document.getElementById("connection-panel")?.classList.remove("hidden");
    document.getElementById("scenes-panel")?.classList.add("hidden");
  }

  public showScenesPanel(): void {
    document.getElementById("connection-panel")?.classList.add("hidden");
    document.getElementById("scenes-panel")?.classList.remove("hidden");
  }

  private showLoading(show: boolean): void {
    const loading = document.getElementById("loading");
    if (show) {
      loading?.classList.remove("hidden");
    } else {
      loading?.classList.add("hidden");
    }
  }

  private setConnectButtonLoading(loading: boolean): void {
    const btn = document.getElementById("connect-btn") as HTMLButtonElement;
    if (loading) {
      btn.disabled = true;
      btn.textContent = "Connecting...";
    } else {
      btn.disabled = false;
      btn.textContent = "Connect";
    }
  }

  private showError(message: string): void {
    const toast = document.getElementById("error-toast");
    const messageEl = document.getElementById("error-message");

    if (toast && messageEl) {
      messageEl.textContent = message;
      toast.classList.remove("hidden");

      setTimeout(() => {
        toast.classList.add("hidden");
      }, 5000);
    }
  }

  // Control handlers
  private async handleRecordingToggle(): Promise<void> {
    try {
      const recording = await this.obsClient.toggleRecording();
      this.updateRecordingStatus(recording);
    } catch (error) {
      this.showError("Failed to toggle recording");
    }
  }

  private async handleStreamingToggle(): Promise<void> {
    try {
      const streaming = await this.obsClient.toggleStreaming();
      this.updateStreamingStatus(streaming);
    } catch (error) {
      this.showError("Failed to toggle streaming");
    }
  }

  private async handleMicToggle(): Promise<void> {
    try {
      if (!this.selectedAudioSource) {
        this.showError("No audio source available");
        return;
      }
      
      const muted = await this.obsClient.toggleMute(this.selectedAudioSource);
      this.updateMicStatus(muted);
    } catch (error) {
      this.showError(`Failed to toggle microphone: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleCameraToggle(): Promise<void> {
    try {
      if (!this.selectedVideoSource) {
        this.showError("No video source available");
        return;
      }
      
      const enabled = await this.obsClient.toggleCamera(this.selectedVideoSource);
      this.updateCameraStatus(enabled);
    } catch (error) {
      this.showError(`Failed to toggle camera: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Status update methods
  private updateRecordingStatus(recording: boolean): void {
    const statusEl = document.getElementById("recording-status");
    const btn = document.getElementById("recording-btn");
    
    if (statusEl) {
      statusEl.textContent = recording ? "Recording" : "Stopped";
    }
    
    if (btn) {
      if (recording) {
        btn.classList.remove("bg-red-600", "hover:bg-red-700");
        btn.classList.add("bg-red-800", "hover:bg-red-900");
      } else {
        btn.classList.remove("bg-red-800", "hover:bg-red-900");
        btn.classList.add("bg-red-600", "hover:bg-red-700");
      }
    }
  }

  private updateStreamingStatus(streaming: boolean): void {
    const statusEl = document.getElementById("streaming-status");
    const btn = document.getElementById("streaming-btn");
    
    if (statusEl) {
      statusEl.textContent = streaming ? "Live" : "Offline";
    }
    
    if (btn) {
      if (streaming) {
        btn.classList.remove("bg-purple-600", "hover:bg-purple-700");
        btn.classList.add("bg-purple-800", "hover:bg-purple-900");
      } else {
        btn.classList.remove("bg-purple-800", "hover:bg-purple-900");
        btn.classList.add("bg-purple-600", "hover:bg-purple-700");
      }
    }
  }

  private updateMicStatus(muted: boolean): void {
    const statusEl = document.getElementById("mic-status");
    const btn = document.getElementById("mic-btn");
    
    if (statusEl) {
      statusEl.textContent = muted ? "Muted" : "Unmuted";
    }
    
    if (btn) {
      if (muted) {
        btn.classList.remove("bg-blue-600", "hover:bg-blue-700");
        btn.classList.add("bg-blue-800", "hover:bg-blue-900");
      } else {
        btn.classList.remove("bg-blue-800", "hover:bg-blue-900");
        btn.classList.add("bg-blue-600", "hover:bg-blue-700");
      }
    }
  }

  private updateCameraStatus(enabled: boolean): void {
    const statusEl = document.getElementById("camera-status");
    const btn = document.getElementById("camera-btn");
    
    if (statusEl) {
      statusEl.textContent = enabled ? "On" : "Off";
    }
    
    if (btn) {
      if (enabled) {
        btn.classList.remove("bg-green-800", "hover:bg-green-900");
        btn.classList.add("bg-green-600", "hover:bg-green-700");
      } else {
        btn.classList.remove("bg-green-600", "hover:bg-green-700");
        btn.classList.add("bg-green-800", "hover:bg-green-900");
      }
    }
  }
}
