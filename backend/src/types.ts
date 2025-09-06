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

export interface SceneSwitchRequest {
  sceneName: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
