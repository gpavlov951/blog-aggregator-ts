import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

type RawConfig = {
  db_url: string;
  current_user_name?: string;
};

type Config = {
  dbUrl: string;
  currentUserName?: string;
};

function getConfigFilePath(): string {
  return join(homedir(), ".gatorconfig.json");
}

function rawToConfig(raw: RawConfig): Config {
  return {
    dbUrl: raw.db_url,
    currentUserName: raw.current_user_name,
  };
}

function configToRaw(config: Config): RawConfig {
  return {
    db_url: config.dbUrl,
    current_user_name: config.currentUserName,
  };
}

function validateConfig(rawConfig: any): RawConfig {
  if (!rawConfig || typeof rawConfig !== "object") {
    throw new Error("Config must be an object");
  }

  if (typeof rawConfig.db_url !== "string") {
    throw new Error("Config must have a db_url string property");
  }

  if (
    rawConfig.current_user_name !== undefined &&
    typeof rawConfig.current_user_name !== "string"
  ) {
    throw new Error("current_user_name must be a string if present");
  }

  return rawConfig as RawConfig;
}

function writeConfig(cfg: Config): void {
  try {
    const configPath = getConfigFilePath();
    const rawConfig = configToRaw(cfg);
    const configContent = JSON.stringify(rawConfig, null, 2);
    writeFileSync(configPath, configContent, "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to write config file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export function setUser(user: string) {
  try {
    const config = readConfig();
    config.currentUserName = user;
    writeConfig(config);
  } catch (error) {
    throw new Error(
      `Failed to set user: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export function readConfig(): Config {
  try {
    const configPath = getConfigFilePath();
    const configContent = readFileSync(configPath, "utf-8");
    const rawConfig = validateConfig(JSON.parse(configContent));
    return rawToConfig(rawConfig);
  } catch (error) {
    throw new Error(
      `Failed to read config file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
