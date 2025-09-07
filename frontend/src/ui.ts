import { OBSClient } from "./obs-client";
import { OBSScene } from "./types";

export class UI {
  private app: HTMLElement;
  private obsClient!: OBSClient;
  private selectedAudioSource: string | null = null;
  private selectedVideoSource: string | null = null;

  constructor(app: HTMLElement) {
    this.app = app;
  }

  setOBSClient(client: OBSClient) {
    this.obsClient = client;
  }

  render(): void {
    this.app.innerHTML = `
      <div class="min-h-screen bg-black">
        <!-- Loading State -->
        <div id="loading" class="text-center py-8 hidden">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p class="text-gray-300 mt-2">Loading...</p>
        </div>

        <!-- Error Message -->
        <div id="error-message" class="hidden bg-red-600 text-white p-4 m-4 rounded-lg">
          <p id="error-text"></p>
        </div>

        <!-- Stream Deck Interface -->
        <div id="streamdeck-interface" class="min-h-screen">
          <!-- Page 1: Controls -->
          <div id="controls-page" class="min-h-screen flex flex-col items-center justify-center p-4">
            <div class="text-center mb-8">
              <h1 class="text-3xl font-bold text-white mb-2">Quick Controls</h1>
              <div class="text-sm text-gray-400">Page 1 of 2</div>
            </div>
            
            <!-- Controls Grid 2x2 -->
            <div class="grid grid-cols-2 gap-6 w-full max-w-lg">
              <!-- Recording -->
              <button 
                id="recording-btn"
                class="streamdeck-btn bg-red-600 hover:bg-red-700 active:bg-red-800 border-2 border-red-500 rounded-xl transition-all duration-150 text-center min-h-[140px] flex flex-col justify-center"
              >
                <div class="text-5xl mb-3">⏺️</div>
                <div class="text-white font-bold text-xl">REC</div>
                <div id="recording-status" class="text-lg text-red-200">OFF</div>
              </button>

              <!-- Streaming -->
              <button 
                id="streaming-btn"
                class="streamdeck-btn bg-purple-600 hover:bg-purple-700 active:bg-purple-800 border-2 border-purple-500 rounded-xl transition-all duration-150 text-center min-h-[140px] flex flex-col justify-center"
              >
                <div class="text-5xl mb-3">📡</div>
                <div class="text-white font-bold text-xl">LIVE</div>
                <div id="streaming-status" class="text-lg text-purple-200">OFF</div>
              </button>

              <!-- Microphone -->
              <button 
                id="mic-btn"
                class="streamdeck-btn bg-blue-600 hover:bg-blue-700 active:bg-blue-800 border-2 border-blue-500 rounded-xl transition-all duration-150 text-center min-h-[140px] flex flex-col justify-center"
              >
                <div class="text-5xl mb-3">🎤</div>
                <div class="text-white font-bold text-xl">MIC</div>
                <div id="mic-status" class="text-lg text-blue-200">ON</div>
              </button>

              <!-- Camera -->
              <button 
                id="camera-btn"
                class="streamdeck-btn bg-green-600 hover:bg-green-700 active:bg-green-800 border-2 border-green-500 rounded-xl transition-all duration-150 text-center min-h-[140px] flex flex-col justify-center"
              >
                <div class="text-5xl mb-3">📹</div>
                <div class="text-white font-bold text-xl">CAM</div>
                <div id="camera-status" class="text-lg text-green-200">ON</div>
              </button>
            </div>
          </div>

          <!-- Page 2: Scenes -->
          <div id="scenes-page" class="min-h-screen hidden">
            <div class="p-4">
              <div class="text-center mb-6">
                <h1 class="text-3xl font-bold text-white mb-4">Scenes</h1>
                <div class="flex items-center justify-center space-x-4">
                  <button
                    id="refresh-btn"
                    class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-150"
                  >
                    🔄 Refresh
                  </button>
                  <div class="text-sm text-gray-400">Page 2 of 2</div>
                </div>
              </div>
              
              <!-- Scenes Grid 4x4 -->
              <div id="scenes-list" class="grid grid-cols-4 gap-3">
                <!-- Scenes will be populated here -->
              </div>
            </div>
          </div>

          <!-- Navigation -->
          <div class="fixed top-4 left-4 right-4 flex justify-between z-50">
            <button id="prev-page-btn" class="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-all duration-200">
              ‹ Controls
            </button>
            <button id="next-page-btn" class="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-all duration-200">
              Scenes ›
            </button>
          </div>

          <!-- Fullscreen Button -->
          <button id="fullscreen-btn" class="fixed bottom-4 right-4 bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-full transition-all duration-200 z-50">
            <div class="text-xl">⛶</div>
          </button>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Refresh button
    const refreshBtn = document.getElementById(
      "refresh-btn"
    ) as HTMLButtonElement;

    // Control buttons
    const recordingBtn = document.getElementById("recording-btn") as HTMLButtonElement;
    const streamingBtn = document.getElementById("streaming-btn") as HTMLButtonElement;
    const micBtn = document.getElementById("mic-btn") as HTMLButtonElement;
    const cameraBtn = document.getElementById("camera-btn") as HTMLButtonElement;

    refreshBtn?.addEventListener("click", async () => {
      await this.handleRefresh();
    });

    recordingBtn?.addEventListener("click", async () => {
      this.addButtonPressEffect(recordingBtn);
      await this.handleRecordingToggle();
    });

    streamingBtn?.addEventListener("click", async () => {
      this.addButtonPressEffect(streamingBtn);
      await this.handleStreamingToggle();
    });

    micBtn?.addEventListener("click", async () => {
      this.addButtonPressEffect(micBtn);
      await this.handleMicToggle();
    });

    cameraBtn?.addEventListener("click", async () => {
      this.addButtonPressEffect(cameraBtn);
      await this.handleCameraToggle();
    });

    // Navigation buttons
    const prevPageBtn = document.getElementById("prev-page-btn");
    const nextPageBtn = document.getElementById("next-page-btn");
    const fullscreenBtn = document.getElementById("fullscreen-btn");

    prevPageBtn?.addEventListener("click", () => {
      this.showControlsPage();
    });

    nextPageBtn?.addEventListener("click", () => {
      this.showScenesPage();
    });

    fullscreenBtn?.addEventListener("click", () => {
      this.toggleFullscreen();
    });
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

  private async handleRecordingToggle(): Promise<void> {
    try {
      const recording = await this.obsClient.toggleRecording();
      this.updateRecordingStatus(recording);
    } catch (error) {
      this.showError(`Failed to toggle recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleStreamingToggle(): Promise<void> {
    try {
      const streaming = await this.obsClient.toggleStreaming();
      this.updateStreamingStatus(streaming);
    } catch (error) {
      this.showError(`Failed to toggle streaming: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      statusEl.textContent = recording ? "ON" : "OFF";
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
      statusEl.textContent = streaming ? "ON" : "OFF";
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
      statusEl.textContent = muted ? "MUTE" : "ON";
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
      statusEl.textContent = enabled ? "ON" : "OFF";
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

  public async loadScenes(): Promise<void> {
    try {
      const sceneData = await this.obsClient.getScenes();
      const currentScene = await this.obsClient.getCurrentScene();
      this.renderScenes(sceneData, currentScene);
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
    const scenesList = document.getElementById("scenes-list");
    if (!scenesList) return;

    scenesList.innerHTML = scenes
      .map((scene) => {
        const isActive = scene.sceneName === currentScene;
        const sceneIcon = this.getSceneIcon(scene.sceneName);
        return `
          <button
            class="streamdeck-btn p-3 rounded-xl border-2 transition-all duration-150 text-center min-h-[100px] flex flex-col justify-center ${
              isActive
                ? "bg-blue-600 border-blue-500 text-white shadow-lg"
                : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600 active:bg-gray-600"
            }"
            data-scene-name="${scene.sceneName}"
          >
            <div class="text-2xl mb-1">${sceneIcon}</div>
            <div class="font-bold text-xs leading-tight mb-1">${scene.sceneName}</div>
            ${isActive ? '<div class="text-xs text-blue-200">CURRENT</div>' : ""}
          </button>
        `;
      })
      .join("");

    // Add click event listeners to scene buttons
    scenesList.querySelectorAll(".streamdeck-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const sceneName = target.dataset.sceneName;
        if (sceneName) {
          await this.switchScene(sceneName);
        }
      });
    });
  }

  private getSceneIcon(sceneName: string): string {
    const name = sceneName.toLowerCase();
    if (name.includes('talking') || name.includes('talking')) return '💬';
    if (name.includes('overlay')) return '📋';
    if (name.includes('brb')) return '⏸️';
    if (name.includes('ending')) return '🏁';
    if (name.includes('starting')) return '🚀';
    if (name.includes('ps5') || name.includes('gaming')) return '🎮';
    if (name.includes('pure')) return '✨';
    if (name.includes('camera')) return '📹';
    if (name.includes('desktop')) return '🖥️';
    if (name.includes('browser')) return '🌐';
    return '📺'; // Default scene icon
  }


  private addButtonPressEffect(button: HTMLButtonElement): void {
    button.classList.add('pressed');
    setTimeout(() => {
      button.classList.remove('pressed');
    }, 100);
  }

  private async switchScene(sceneName: string): Promise<void> {
    try {
      await this.obsClient.switchScene(sceneName);
      // Update the UI to reflect the new current scene
      const scenes = await this.obsClient.getScenes();
      const currentScene = await this.obsClient.getCurrentScene();
      this.renderScenes(scenes, currentScene);
    } catch (error) {
      this.showError(`Failed to switch scene: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public updateConnectionStatus(status: any): void {
    const statusEl = document.getElementById("connection-status");
    if (!statusEl) return;

    if (status.connected) {
      statusEl.innerHTML = `
        <div class="w-3 h-3 rounded-full bg-green-500"></div>
        <span class="text-sm text-gray-300">Connected</span>
      `;
      this.showScenesPanel();
    } else {
      statusEl.innerHTML = `
        <div class="w-3 h-3 rounded-full bg-red-500"></div>
        <span class="text-sm text-gray-300">Disconnected</span>
      `;
    }
  }

  public showScenesPanel(): void {
    const streamdeckInterface = document.getElementById("streamdeck-interface");
    if (streamdeckInterface) {
      streamdeckInterface.classList.remove("hidden");
    }
    this.showControlsPage();
  }

  private showControlsPage(): void {
    const controlsPage = document.getElementById("controls-page");
    const scenesPage = document.getElementById("scenes-page");
    
    if (controlsPage) controlsPage.classList.remove("hidden");
    if (scenesPage) scenesPage.classList.add("hidden");
  }

  private showScenesPage(): void {
    const controlsPage = document.getElementById("controls-page");
    const scenesPage = document.getElementById("scenes-page");
    
    if (controlsPage) controlsPage.classList.add("hidden");
    if (scenesPage) scenesPage.classList.remove("hidden");
  }

  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  }

  private showLoading(show: boolean): void {
    const loadingEl = document.getElementById("loading");
    if (loadingEl) {
      if (show) {
        loadingEl.classList.remove("hidden");
      } else {
        loadingEl.classList.add("hidden");
      }
    }
  }

  private showError(message: string): void {
    const errorEl = document.getElementById("error-message");
    const errorTextEl = document.getElementById("error-text");
    
    if (errorEl && errorTextEl) {
      errorTextEl.textContent = message;
      errorEl.classList.remove("hidden");
      
      // Auto-hide error after 5 seconds
      setTimeout(() => {
        errorEl.classList.add("hidden");
      }, 5000);
    }
  }
}


