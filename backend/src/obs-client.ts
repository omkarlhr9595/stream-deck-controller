import OBSWebSocket from "obs-websocket-js";
import { OBSScene, OBSConnectionConfig, ConnectionStatus } from "./types";

export class OBSClient {
  private obs: OBSWebSocket;
  private config: OBSConnectionConfig | null = null;
  private isConnected = false;
  private scenes: OBSScene[] = [];
  private currentScene: string | null = null;

  constructor() {
    this.obs = new OBSWebSocket();
    this.setupEventHandlers();
    console.log("OBS Client initialized - no auto-connection");
  }

  private setupEventHandlers(): void {
    this.obs.on("ConnectionOpened", async () => {
      console.log("Connected to OBS WebSocket");
      this.isConnected = true;
      // Wait a bit for OBS to be ready before loading scenes
      setTimeout(() => {
        this.loadScenes();
      }, 1000);
    });

    this.obs.on("ConnectionClosed", () => {
      console.log("Disconnected from OBS WebSocket");
      this.isConnected = false;
    });

    this.obs.on("ConnectionError", (error) => {
      console.error("OBS WebSocket error:", error);
      this.isConnected = false;
      // Don't auto-reconnect on error, let user reconnect manually
    });

    this.obs.on("CurrentProgramSceneChanged", (data) => {
      this.currentScene = data.sceneName;
      console.log("Current scene changed to:", data.sceneName);
    });

    this.obs.on("SceneListChanged", () => {
      this.loadScenes();
    });
  }

  async connect(config: OBSConnectionConfig): Promise<ConnectionStatus> {
    console.log("🔌 OBSClient.connect() called with config:", {
      address: config.address,
      port: config.port,
      hasPassword: !!config.password,
    });

    try {
      this.config = config;
      const address = `ws://${config.address}:${config.port}`;
      console.log("🔗 Attempting to connect to:", address);

      // Disconnect first if already connected
      if (this.isConnected) {
        console.log("⚠️ Already connected, disconnecting first");
        await this.obs.disconnect();
      }

      // Connect with proper authentication
      console.log(
        "🔐 Connecting with password:",
        config.password ? "***" : "none"
      );

      // Set up event listeners BEFORE connecting
      const connectionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log("❌ Connection timeout after 5 seconds");
          reject(new Error("Connection timeout"));
        }, 5000);

        this.obs.once("ConnectionOpened", () => {
          console.log("✅ Connection opened event received");
          clearTimeout(timeout);
          resolve(true);
        });

        this.obs.once("ConnectionError", (error) => {
          console.log("❌ Connection error event received:", error);
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Now connect
      await this.obs.connect(address, config.password);

      // Wait for connection to be established
      console.log("⏳ Waiting for connection to be established...");
      await connectionPromise;

      // Get version after connection is established
      console.log("📋 Getting OBS version...");
      const version = await this.obs.call("GetVersion");
      console.log("✅ OBS version:", version.obsVersion);

      return {
        connected: true,
        obsVersion: version.obsVersion,
      };
    } catch (error) {
      console.error("❌ Failed to connect to OBS:", error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.obs.disconnect();
    }
  }

  async getScenes(): Promise<OBSScene[]> {
    if (!this.isConnected) {
      throw new Error("Not connected to OBS");
    }
    return this.scenes;
  }

  async refreshScenes(): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Not connected to OBS");
    }
    await this.loadScenes();
  }

  async getCurrentScene(): Promise<string | null> {
    if (!this.isConnected) {
      throw new Error("Not connected to OBS");
    }
    return this.currentScene;
  }

  async switchScene(sceneName: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Not connected to OBS");
    }

    try {
      await this.obs.call("SetCurrentProgramScene", { sceneName });
      console.log(`Switched to scene: ${sceneName}`);
    } catch (error) {
      console.error("Failed to switch scene:", error);
      throw error;
    }
  }

  getConnectionStatus(): ConnectionStatus {
    return {
      connected: this.isConnected,
      error: this.isConnected ? undefined : "Not connected",
    };
  }

  private async loadScenes(): Promise<void> {
    try {
      // Wait a bit more to ensure OBS is ready
      await new Promise((resolve) => setTimeout(resolve, 500));

      const response = await this.obs.call("GetSceneList");
      this.scenes = response.scenes.map((scene: any) => ({
        sceneName: scene.sceneName,
        sceneIndex: scene.sceneIndex,
      }));

      // Get current scene
      const currentSceneResponse = await this.obs.call(
        "GetCurrentProgramScene"
      );
      this.currentScene = currentSceneResponse.currentProgramSceneName;

      console.log(
        `Loaded ${this.scenes.length} scenes:`,
        this.scenes.map((s) => s.sceneName)
      );
    } catch (error) {
      console.error("Failed to load scenes:", error);
      // Retry after a delay if it's a socket not identified error
      if (
        error instanceof Error &&
        error.message.includes("Socket not identified")
      ) {
        console.log("Retrying scene load in 2 seconds...");
        setTimeout(() => this.loadScenes(), 2000);
      }
    }
  }
}
