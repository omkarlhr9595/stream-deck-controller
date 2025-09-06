import {
  OBSConnectionConfig,
  ConnectionStatus,
  SceneData,
  ApiResponse,
} from "./types";

// Get the current hostname and use port 3001 for backend
const API_BASE_URL = `http://${window.location.hostname}:3001/api`;

export class OBSClient {
  private isConnected = false;

  async connect(config: OBSConnectionConfig): Promise<ConnectionStatus> {
    try {
      const response = await fetch(`${API_BASE_URL}/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      const result: ApiResponse<ConnectionStatus> = await response.json();

      if (result.success && result.data) {
        this.isConnected = result.data.connected;
        return result.data;
      } else {
        throw new Error(result.error || "Connection failed");
      }
    } catch (error) {
      console.error("Connection error:", error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  async disconnect(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/disconnect`, {
        method: "POST",
      });
      this.isConnected = false;
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  }

  async getScenes(): Promise<SceneData> {
    try {
      const response = await fetch(`${API_BASE_URL}/scenes`);
      const result: ApiResponse<SceneData> = await response.json();

      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || "Failed to fetch scenes");
      }
    } catch (error) {
      console.error("Get scenes error:", error);
      throw error;
    }
  }

  async refreshScenes(): Promise<SceneData> {
    try {
      const response = await fetch(`${API_BASE_URL}/scenes/refresh`, {
        method: "POST",
      });
      const result: ApiResponse<SceneData> = await response.json();

      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || "Failed to refresh scenes");
      }
    } catch (error) {
      console.error("Refresh scenes error:", error);
      throw error;
    }
  }

  async switchScene(sceneName: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/scenes/switch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sceneName }),
      });

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to switch scene");
      }
    } catch (error) {
      console.error("Switch scene error:", error);
      throw error;
    }
  }

  async getStatus(): Promise<ConnectionStatus> {
    try {
      const response = await fetch(`${API_BASE_URL}/status`);
      const result: ApiResponse<ConnectionStatus> = await response.json();

      if (result.success && result.data) {
        this.isConnected = result.data.connected;
        return result.data;
      } else {
        throw new Error(result.error || "Failed to get status");
      }
    } catch (error) {
      console.error("Get status error:", error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Status check failed",
      };
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
