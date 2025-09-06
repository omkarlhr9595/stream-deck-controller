export interface OBSScene {
  sceneName: string;
  sceneIndex: number;
}

export interface OBSConnectionConfig {
  address: string;
  port: number;
  password?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  error?: string;
  obsVersion?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SceneData {
  scenes: OBSScene[];
  currentScene: string | null;
}

export interface ControlStatus {
  recording: boolean;
  streaming: boolean;
  micMuted: boolean;
  cameraMuted: boolean;
}
