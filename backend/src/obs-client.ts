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

  // Microphone controls
  async toggleMute(sourceName: string): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error("Not connected to OBS");
    }

    try {
      const response = await this.obs.call("ToggleInputMute", { inputName: sourceName });
      console.log(`Toggled mute for ${sourceName}:`, response.inputMuted);
      return response.inputMuted;
    } catch (error) {
      console.error(`Failed to toggle mute for ${sourceName}:`, error);
      throw error;
    }
  }

  async setMute(sourceName: string, muted: boolean): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Not connected to OBS");
    }

    try {
      await this.obs.call("SetInputMute", { inputName: sourceName, inputMuted: muted });
      console.log(`Set mute for ${sourceName} to:`, muted);
    } catch (error) {
      console.error(`Failed to set mute for ${sourceName}:`, error);
      throw error;
    }
  }

  // Camera controls
  async toggleCamera(sourceName: string): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error("Not connected to OBS");
    }

    try {
      // Get all scenes first
      const scenes = await this.obs.call("GetSceneList");
      const allScenes = scenes.scenes;
      
      console.log(`Searching for "${sourceName}" in ${allScenes.length} scenes...`);
      
      // Find the camera source in all scenes
      const cameraItems: Array<{sceneName: string, sceneItemId: number, enabled: boolean}> = [];
      
      for (const scene of allScenes) {
        try {
          const sceneItems = await this.obs.call("GetSceneItemList", { sceneName: scene.sceneName as string });
          const cameraItem = sceneItems.sceneItems.find((item: any) => 
            item.sourceName === sourceName
          );
          
          if (cameraItem) {
            cameraItems.push({
              sceneName: scene.sceneName as string,
              sceneItemId: cameraItem.sceneItemId as number,
              enabled: cameraItem.sceneItemEnabled as boolean
            });
            console.log(`Found "${sourceName}" in scene "${scene.sceneName}" (enabled: ${cameraItem.sceneItemEnabled})`);
          }
        } catch (error) {
          console.log(`Error checking scene "${scene.sceneName}":`, error);
        }
      }
      
      if (cameraItems.length === 0) {
        throw new Error(`Camera source "${sourceName}" not found in any scene`);
      }
      
      // Determine the new state based on the first found item
      const firstItem = cameraItems[0];
      const newEnabled = !firstItem.enabled;
      
      console.log(`Toggling "${sourceName}" from ${firstItem.enabled ? "enabled" : "disabled"} to ${newEnabled ? "enabled" : "disabled"} in ${cameraItems.length} scenes`);
      
      // Toggle the camera source in all scenes where it exists
      const results = [];
      for (const item of cameraItems) {
        try {
          const result = await this.obs.call("SetSceneItemEnabled", {
            sceneName: item.sceneName,
            sceneItemId: item.sceneItemId,
            sceneItemEnabled: newEnabled
          });
          results.push({ sceneName: item.sceneName, success: true });
          console.log(`✅ Toggled "${sourceName}" in scene "${item.sceneName}"`);
        } catch (error) {
          results.push({ sceneName: item.sceneName, success: false, error });
          console.error(`❌ Failed to toggle "${sourceName}" in scene "${item.sceneName}":`, error);
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      console.log(`Successfully toggled "${sourceName}" in ${successCount}/${cameraItems.length} scenes`);
      
      return newEnabled;
    } catch (error) {
      console.error(`Failed to toggle camera ${sourceName}:`, error);
      throw error;
    }
  }

  async getCameraStatus(sourceName: string): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error("Not connected to OBS");
    }

    try {
      // Get the current scene to find the camera source
      const currentScene = await this.obs.call("GetCurrentProgramScene");
      const sceneName = currentScene.currentProgramSceneName;
      
      // Get scene items to find the camera source
      const sceneItems = await this.obs.call("GetSceneItemList", { sceneName });
      const cameraItem = sceneItems.sceneItems.find((item: any) => 
        item.sourceName === sourceName
      );
      
      if (!cameraItem) {
        // If not found in current scene, check if it exists in any scene
        const scenes = await this.obs.call("GetSceneList");
        for (const scene of scenes.scenes) {
          const sceneItems = await this.obs.call("GetSceneItemList", { sceneName: scene.sceneName as string });
          const cameraItem = sceneItems.sceneItems.find((item: any) => 
            item.sourceName === sourceName
          );
          if (cameraItem) {
            return cameraItem.sceneItemEnabled as boolean;
          }
        }
        throw new Error(`Camera source "${sourceName}" not found in any scene`);
      }
      
      return cameraItem.sceneItemEnabled as boolean;
    } catch (error) {
      console.error(`Failed to get camera status for ${sourceName}:`, error);
      throw error;
    }
  }

  // Recording controls
  async toggleRecording(): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error("Not connected to OBS");
    }

    try {
      const response = await this.obs.call("ToggleRecord");
      console.log("Toggled recording:", response.outputActive);
      return response.outputActive;
    } catch (error) {
      console.error("Failed to toggle recording:", error);
      throw error;
    }
  }

  async startRecording(): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Not connected to OBS");
    }

    try {
      await this.obs.call("StartRecord");
      console.log("Started recording");
    } catch (error) {
      console.error("Failed to start recording:", error);
      throw error;
    }
  }

  async stopRecording(): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Not connected to OBS");
    }

    try {
      await this.obs.call("StopRecord");
      console.log("Stopped recording");
    } catch (error) {
      console.error("Failed to stop recording:", error);
      throw error;
    }
  }

  // Streaming controls
  async toggleStreaming(): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error("Not connected to OBS");
    }

    try {
      const response = await this.obs.call("ToggleStream");
      console.log("Toggled streaming:", response.outputActive);
      return response.outputActive;
    } catch (error) {
      console.error("Failed to toggle streaming:", error);
      throw error;
    }
  }

  async startStreaming(): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Not connected to OBS");
    }

    try {
      await this.obs.call("StartStream");
      console.log("Started streaming");
    } catch (error) {
      console.error("Failed to start streaming:", error);
      throw error;
    }
  }

  async stopStreaming(): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Not connected to OBS");
    }

    try {
      await this.obs.call("StopStream");
      console.log("Stopped streaming");
    } catch (error) {
      console.error("Failed to stop streaming:", error);
      throw error;
    }
  }

  // Get current status
  async getRecordingStatus(): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error("Not connected to OBS");
    }

    try {
      const response = await this.obs.call("GetRecordStatus");
      return response.outputActive;
    } catch (error) {
      console.error("Failed to get recording status:", error);
      throw error;
    }
  }

  async getStreamingStatus(): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error("Not connected to OBS");
    }

    try {
      const response = await this.obs.call("GetStreamStatus");
      return response.outputActive;
    } catch (error) {
      console.error("Failed to get streaming status:", error);
      throw error;
    }
  }

  // Get available sources
  async getAudioSources(): Promise<string[]> {
    if (!this.isConnected) {
      throw new Error("Not connected to OBS");
    }

    try {
      const response = await this.obs.call("GetInputList");
      const audioSources = response.inputs
        .filter((input: any) => input.inputKind && input.inputKind.includes("audio"))
        .map((input: any) => input.inputName);
      
      console.log("Available audio sources:", audioSources);
      return audioSources;
    } catch (error) {
      console.error("Failed to get audio sources:", error);
      throw error;
    }
  }

  async getVideoSources(): Promise<string[]> {
    if (!this.isConnected) {
      throw new Error("Not connected to OBS");
    }

    try {
      const response = await this.obs.call("GetInputList");
      const videoSources = response.inputs
        .filter((input: any) => input.inputKind && (
          input.inputKind.includes("camera") || 
          input.inputKind.includes("video") ||
          input.inputKind.includes("capture")
        ))
        .map((input: any) => input.inputName);
      
      console.log("Available video sources:", videoSources);
      return videoSources;
    } catch (error) {
      console.error("Failed to get video sources:", error);
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
