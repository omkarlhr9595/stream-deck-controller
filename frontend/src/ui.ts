import { OBSScene, OBSConnectionConfig, ConnectionStatus } from "./types";

export class UI {
  private app: HTMLElement;
  private obsClient: any; // Will be injected

  constructor(app: HTMLElement) {
    this.app = app;
  }

  setOBSClient(client: any) {
    this.obsClient = client;
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
              <button 
                type="submit" 
                id="connect-btn"
                class="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Connect
              </button>
            </form>
          </div>
        </div>

        <!-- Scenes Panel -->
        <div id="scenes-panel" class="p-4 hidden">
          <div class="max-w-4xl mx-auto">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-white">Scenes</h2>
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
            <div id="scenes-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <!-- Scenes will be populated here -->
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
    } catch (error) {
      this.showError("Failed to load scenes");
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
}
