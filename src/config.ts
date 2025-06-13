import dotenv from 'dotenv';
import { EnvManager } from './env-manager.js';

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
  defaultCodaDocId?: string;
  defaultCodaDocName?: string;
}

class ConfigManager {
  private envManager: EnvManager;

  constructor() {
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
      defaultCodaDocId: this.getDefaultCodaDocId(),
      defaultCodaDocName: this.getDefaultCodaDocName(),
    };
  }

  getLinearApiKey(): string | undefined {
    // Priority: .env file > environment variables
    const envValues = this.envManager.readEnvFile();
    return envValues.LINEAR_API_KEY || process.env.LINEAR_API_KEY;
  }

  setLinearApiKey(apiKey: string): void {
    this.envManager.updateEnvFile({ LINEAR_API_KEY: apiKey });
  }

  getOpenAIApiKey(): string | undefined {
    const envValues = this.envManager.readEnvFile();
    return envValues.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  }

  setOpenAIApiKey(apiKey: string): void {
    this.envManager.updateEnvFile({ OPENAI_API_KEY: apiKey });
  }

  getAnthropicApiKey(): string | undefined {
    const envValues = this.envManager.readEnvFile();
    return envValues.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  }

  setAnthropicApiKey(apiKey: string): void {
    this.envManager.updateEnvFile({ ANTHROPIC_API_KEY: apiKey });
  }

  getCodaApiKey(): string | undefined {
    const envValues = this.envManager.readEnvFile();
    return envValues.CODA_API_KEY || process.env.CODA_API_KEY;
  }

  setCodaApiKey(apiKey: string): void {
    this.envManager.updateEnvFile({ CODA_API_KEY: apiKey });
  }

  getDefaultCodaDocId(): string | undefined {
    const envValues = this.envManager.readEnvFile();
    return envValues.DEFAULT_CODA_DOC_ID || process.env.DEFAULT_CODA_DOC_ID;
  }

  setDefaultCodaDocId(docId: string): void {
    this.envManager.updateEnvFile({ DEFAULT_CODA_DOC_ID: docId });
  }

  getDefaultCodaDocName(): string | undefined {
    const envValues = this.envManager.readEnvFile();
    return envValues.DEFAULT_CODA_DOC_NAME || process.env.DEFAULT_CODA_DOC_NAME;
  }

  setDefaultCodaDocName(docName: string): void {
    this.envManager.updateEnvFile({ DEFAULT_CODA_DOC_NAME: docName });
  }

  getDefaultAiProvider(): 'openai' | 'anthropic' {
    const envValues = this.envManager.readEnvFile();
    const envProvider = envValues.DEFAULT_AI_PROVIDER as 'openai' | 'anthropic';
    const processProvider = process.env.DEFAULT_AI_PROVIDER as 'openai' | 'anthropic';
    return envProvider || processProvider || 'openai';
  }

  setDefaultAiProvider(provider: 'openai' | 'anthropic'): void {
    this.envManager.updateEnvFile({ DEFAULT_AI_PROVIDER: provider });
  }

  getDefaultSummaryType(): 'brief' | 'detailed' | 'action-items' {
    const envValues = this.envManager.readEnvFile();
    const envType = envValues.DEFAULT_SUMMARY_TYPE as 'brief' | 'detailed' | 'action-items';
    const processType = process.env.DEFAULT_SUMMARY_TYPE as 'brief' | 'detailed' | 'action-items';
    return envType || processType || 'brief';
  }

  setDefaultSummaryType(type: 'brief' | 'detailed' | 'action-items'): void {
    this.envManager.updateEnvFile({ DEFAULT_SUMMARY_TYPE: type });
  }

  getOpenAIModel(): string {
    const envValues = this.envManager.readEnvFile();
    return envValues.OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4';
  }

  setOpenAIModel(model: string): void {
    this.envManager.updateEnvFile({ OPENAI_MODEL: model });
  }

  getAnthropicModel(): string {
    const envValues = this.envManager.readEnvFile();
    return envValues.ANTHROPIC_MODEL || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
  }

  setAnthropicModel(model: string): void {
    this.envManager.updateEnvFile({ ANTHROPIC_MODEL: model });
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
    this.envManager.clearEnvFile();
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