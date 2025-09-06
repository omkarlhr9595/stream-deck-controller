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

  async setMute(sourceName: string, muted: boolean): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/mic/set`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sourceName, muted }),
      });

      const result: ApiResponse = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to set mute");
      }
    } catch (error) {
      console.error("Set mute error:", error);
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

  async startRecording(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/recording/start`, {
        method: "POST",
      });

      const result: ApiResponse = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to start recording");
      }
    } catch (error) {
      console.error("Start recording error:", error);
      throw error;
    }
  }

  async stopRecording(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/recording/stop`, {
        method: "POST",
      });

      const result: ApiResponse = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to stop recording");
      }
    } catch (error) {
      console.error("Stop recording error:", error);
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

  async startStreaming(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/streaming/start`, {
        method: "POST",
      });

      const result: ApiResponse = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to start streaming");
      }
    } catch (error) {
      console.error("Start streaming error:", error);
      throw error;
    }
  }

  async stopStreaming(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/streaming/stop`, {
        method: "POST",
      });

      const result: ApiResponse = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to stop streaming");
      }
    } catch (error) {
      console.error("Stop streaming error:", error);
      throw error;
    }
  }

  // Status checks
  async getRecordingStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/status/recording`);
      const result: ApiResponse<{ recording: boolean }> = await response.json();
      if (result.success && result.data) {
        return result.data.recording;
      } else {
        throw new Error(result.error || "Failed to get recording status");
      }
    } catch (error) {
      console.error("Get recording status error:", error);
      throw error;
    }
  }

  async getStreamingStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/status/streaming`);
      const result: ApiResponse<{ streaming: boolean }> = await response.json();
      if (result.success && result.data) {
        return result.data.streaming;
      } else {
        throw new Error(result.error || "Failed to get streaming status");
      }
    } catch (error) {
      console.error("Get streaming status error:", error);
      throw error;
    }
  }

  // Get available sources
  async getAudioSources(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/sources/audio`);
      const result: ApiResponse<{ sources: string[] }> = await response.json();
      if (result.success && result.data) {
        return result.data.sources;
      } else {
        throw new Error(result.error || "Failed to get audio sources");
      }
    } catch (error) {
      console.error("Get audio sources error:", error);
      throw error;
    }
  }

  async getVideoSources(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/sources/video`);
      const result: ApiResponse<{ sources: string[] }> = await response.json();
      if (result.success && result.data) {
        return result.data.sources;
      } else {
        throw new Error(result.error || "Failed to get video sources");
      }
    } catch (error) {
      console.error("Get video sources error:", error);
      throw error;
    }
  }
}
