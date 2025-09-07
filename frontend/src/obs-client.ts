import {
  ConnectionStatus,
  SceneData,
  ApiResponse,
  OBSScene,
} from "./types";

// Get the current hostname and use port 3001 for backend
const API_BASE_URL = `http://${window.location.hostname}:3001/api`;

export class OBSClient {
  async getConnectionStatus(): Promise<ConnectionStatus> {
    try {
      const response = await fetch(`${API_BASE_URL}/status`);
      const result: ApiResponse<ConnectionStatus> = await response.json();
      
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || "Failed to get status");
      }
    } catch (error) {
      console.error("Status error:", error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Failed to get status",
      };
    }
  }

  async getScenes(): Promise<OBSScene[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/scenes`);
      const result: ApiResponse<SceneData> = await response.json();
      
      if (result.success && result.data) {
        return result.data.scenes;
      } else {
        throw new Error(result.error || "Failed to get scenes");
      }
    } catch (error) {
      console.error("Get scenes error:", error);
      throw error;
    }
  }

  async getCurrentScene(): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/scenes`);
      const result: ApiResponse<SceneData> = await response.json();
      
      if (result.success && result.data) {
        return result.data.currentScene;
      } else {
        throw new Error(result.error || "Failed to get current scene");
      }
    } catch (error) {
      console.error("Get current scene error:", error);
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

      const result: ApiResponse<void> = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to switch scene");
      }
    } catch (error) {
      console.error("Switch scene error:", error);
      throw error;
    }
  }

  // Microphone controls
  async toggleMute(sourceName: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/mic/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sourceName }),
      });

      const result: ApiResponse<{ muted: boolean }> = await response.json();
      if (result.success && result.data) {
        return result.data.muted;
      } else {
        throw new Error(result.error || "Failed to toggle mute");
      }
    } catch (error) {
      console.error("Toggle mute error:", error);
      throw error;
    }
  }

  // Camera controls
  async toggleCamera(sourceName: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/camera/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sourceName }),
      });

      const result: ApiResponse<{ enabled: boolean }> = await response.json();
      if (result.success && result.data) {
        return result.data.enabled;
      } else {
        throw new Error(result.error || "Failed to toggle camera");
      }
    } catch (error) {
      console.error("Toggle camera error:", error);
      throw error;
    }
  }

  async getCameraStatus(sourceName: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/camera/status/${encodeURIComponent(sourceName)}`);

      const result: ApiResponse<{ enabled: boolean }> = await response.json();
      if (result.success && result.data) {
        return result.data.enabled;
      } else {
        throw new Error(result.error || "Failed to get camera status");
      }
    } catch (error) {
      console.error("Get camera status error:", error);
      throw error;
    }
  }

  // Recording controls
  async toggleRecording(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/recording/toggle`, {
        method: "POST",
      });

      const result: ApiResponse<{ recording: boolean }> = await response.json();
      if (result.success && result.data) {
        return result.data.recording;
      } else {
        throw new Error(result.error || "Failed to toggle recording");
      }
    } catch (error) {
      console.error("Toggle recording error:", error);
      throw error;
    }
  }

  // Streaming controls
  async toggleStreaming(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/streaming/toggle`, {
        method: "POST",
      });

      const result: ApiResponse<{ streaming: boolean }> = await response.json();
      if (result.success && result.data) {
        return result.data.streaming;
      } else {
        throw new Error(result.error || "Failed to toggle streaming");
      }
    } catch (error) {
      console.error("Toggle streaming error:", error);
      throw error;
    }
  }
}