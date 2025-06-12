import Configstore from 'configstore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

interface Config {
  linearApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  defaultAiProvider?: 'openai' | 'anthropic';
  defaultSummaryType?: 'brief' | 'detailed' | 'action-items';
  openaiModel?: string;
  anthropicModel?: string;
}

class ConfigManager {
  private store: Configstore;
  private packageInfo: any;

  constructor() {
    try {
      const packagePath = join(__dirname, '..', 'package.json');
      this.packageInfo = JSON.parse(readFileSync(packagePath, 'utf8'));
    } catch (error) {
      this.packageInfo = { name: 'linear-ai-cli' };
    }
    
    this.store = new Configstore(this.packageInfo.name);
  }

  getConfig(): Config {
    return {
      linearApiKey: this.getLinearApiKey(),
      openaiApiKey: this.getOpenAIApiKey(),
      anthropicApiKey: this.getAnthropicApiKey(),
      defaultAiProvider: this.getDefaultAiProvider(),
      defaultSummaryType: this.getDefaultSummaryType(),
      openaiModel: this.getOpenAIModel(),
      anthropicModel: this.getAnthropicModel(),
    };
  }

  getLinearApiKey(): string | undefined {
    return process.env.LINEAR_API_KEY || this.store.get('linearApiKey');
  }

  setLinearApiKey(apiKey: string): void {
    this.store.set('linearApiKey', apiKey);
  }

  getOpenAIApiKey(): string | undefined {
    return process.env.OPENAI_API_KEY || this.store.get('openaiApiKey');
  }

  setOpenAIApiKey(apiKey: string): void {
    this.store.set('openaiApiKey', apiKey);
  }

  getAnthropicApiKey(): string | undefined {
    return process.env.ANTHROPIC_API_KEY || this.store.get('anthropicApiKey');
  }

  setAnthropicApiKey(apiKey: string): void {
    this.store.set('anthropicApiKey', apiKey);
  }

  getDefaultAiProvider(): 'openai' | 'anthropic' {
    const envProvider = process.env.DEFAULT_AI_PROVIDER as 'openai' | 'anthropic';
    const storedProvider = this.store.get('defaultAiProvider') as 'openai' | 'anthropic';
    return envProvider || storedProvider || 'openai';
  }

  setDefaultAiProvider(provider: 'openai' | 'anthropic'): void {
    this.store.set('defaultAiProvider', provider);
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
      linearApiKey: config.linearApiKey ? '***' + config.linearApiKey.slice(-4) : undefined,
      openaiApiKey: config.openaiApiKey ? '***' + config.openaiApiKey.slice(-4) : undefined,
      anthropicApiKey: config.anthropicApiKey ? '***' + config.anthropicApiKey.slice(-4) : undefined,
    };
  }
}

export const configManager = new ConfigManager();
export { ConfigManager, Config };