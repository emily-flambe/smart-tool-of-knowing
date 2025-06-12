import Configstore from 'configstore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { EnvManager } from './env-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

interface Config {
  linearApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  codaApiKey?: string;
  defaultAiProvider?: 'openai' | 'anthropic';
  defaultSummaryType?: 'brief' | 'detailed' | 'action-items';
  openaiModel?: string;
  anthropicModel?: string;
}

class ConfigManager {
  private store: Configstore;
  private packageInfo: any;
  private envManager: EnvManager;

  constructor() {
    try {
      const packagePath = join(__dirname, '..', 'package.json');
      this.packageInfo = JSON.parse(readFileSync(packagePath, 'utf8'));
    } catch (error) {
      this.packageInfo = { name: 'linear-ai-cli' };
    }
    
    this.store = new Configstore(this.packageInfo.name);
    this.envManager = new EnvManager();
  }

  getConfig(): Config {
    return {
      linearApiKey: this.getLinearApiKey(),
      openaiApiKey: this.getOpenAIApiKey(),
      anthropicApiKey: this.getAnthropicApiKey(),
      codaApiKey: this.getCodaApiKey(),
      defaultAiProvider: this.getDefaultAiProvider(),
      defaultSummaryType: this.getDefaultSummaryType(),
      openaiModel: this.getOpenAIModel(),
      anthropicModel: this.getAnthropicModel(),
    };
  }

  getLinearApiKey(): string | undefined {
    // Priority: .env file > environment variables > configstore
    const envValues = this.envManager.readEnvFile();
    return envValues.LINEAR_API_KEY || process.env.LINEAR_API_KEY || this.store.get('linearApiKey');
  }

  setLinearApiKey(apiKey: string): void {
    this.envManager.updateEnvFile({ LINEAR_API_KEY: apiKey });
  }

  getOpenAIApiKey(): string | undefined {
    const envValues = this.envManager.readEnvFile();
    return envValues.OPENAI_API_KEY || process.env.OPENAI_API_KEY || this.store.get('openaiApiKey');
  }

  setOpenAIApiKey(apiKey: string): void {
    this.envManager.updateEnvFile({ OPENAI_API_KEY: apiKey });
  }

  getAnthropicApiKey(): string | undefined {
    const envValues = this.envManager.readEnvFile();
    return envValues.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || this.store.get('anthropicApiKey');
  }

  setAnthropicApiKey(apiKey: string): void {
    this.envManager.updateEnvFile({ ANTHROPIC_API_KEY: apiKey });
  }

  getCodaApiKey(): string | undefined {
    const envValues = this.envManager.readEnvFile();
    return envValues.CODA_API_KEY || process.env.CODA_API_KEY || this.store.get('codaApiKey');
  }

  setCodaApiKey(apiKey: string): void {
    this.envManager.updateEnvFile({ CODA_API_KEY: apiKey });
  }

  getDefaultAiProvider(): 'openai' | 'anthropic' {
    const envValues = this.envManager.readEnvFile();
    const envProvider = envValues.DEFAULT_AI_PROVIDER as 'openai' | 'anthropic';
    const processProvider = process.env.DEFAULT_AI_PROVIDER as 'openai' | 'anthropic';
    const storedProvider = this.store.get('defaultAiProvider') as 'openai' | 'anthropic';
    return envProvider || processProvider || storedProvider || 'openai';
  }

  setDefaultAiProvider(provider: 'openai' | 'anthropic'): void {
    this.envManager.updateEnvFile({ DEFAULT_AI_PROVIDER: provider });
  }

  getDefaultSummaryType(): 'brief' | 'detailed' | 'action-items' {
    const storedType = this.store.get('defaultSummaryType') as 'brief' | 'detailed' | 'action-items';
    return storedType || 'brief';
  }

  setDefaultSummaryType(type: 'brief' | 'detailed' | 'action-items'): void {
    this.store.set('defaultSummaryType', type);
  }

  getOpenAIModel(): string {
    return this.store.get('openaiModel') || 'gpt-4';
  }

  setOpenAIModel(model: string): void {
    this.store.set('openaiModel', model);
  }

  getAnthropicModel(): string {
    return this.store.get('anthropicModel') || 'claude-3-5-sonnet-20241022';
  }

  setAnthropicModel(model: string): void {
    this.store.set('anthropicModel', model);
  }

  hasRequiredConfig(): boolean {
    const linearKey = this.getLinearApiKey();
    const hasAiKey = this.getOpenAIApiKey() || this.getAnthropicApiKey();
    return !!(linearKey && hasAiKey);
  }

  validateConfig(): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    
    if (!this.getLinearApiKey()) {
      missing.push('Linear API Key');
    }
    
    if (!this.getOpenAIApiKey() && !this.getAnthropicApiKey()) {
      missing.push('At least one AI API Key (OpenAI or Anthropic)');
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  clearConfig(): void {
    this.store.clear();
  }

  showConfig(): Config {
    const config = this.getConfig();
    return {
      ...config,
      linearApiKey: this.envManager.maskValue(config.linearApiKey),
      openaiApiKey: this.envManager.maskValue(config.openaiApiKey),
      anthropicApiKey: this.envManager.maskValue(config.anthropicApiKey),
      codaApiKey: this.envManager.maskValue(config.codaApiKey),
    };
  }

  getEnvFilePath(): string {
    return this.envManager.getEnvPath();
  }

  envFileExists(): boolean {
    return this.envManager.envFileExists();
  }
}

export const configManager = new ConfigManager();
export { ConfigManager, Config };