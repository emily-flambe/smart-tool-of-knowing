import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface EnvValues {
  LINEAR_API_KEY?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  CODA_API_KEY?: string;
  GITHUB_TOKEN?: string;
  DEFAULT_AI_PROVIDER?: string;
  DEFAULT_CODA_DOC_ID?: string;
  DEFAULT_CODA_DOC_NAME?: string;
  DEFAULT_SUMMARY_TYPE?: string;
  OPENAI_MODEL?: string;
  ANTHROPIC_MODEL?: string;
  GITHUB_REPOSITORIES?: string;
  CODA_DATA_DIRECTORY?: string;
}

export class EnvManager {
  private envPath: string;

  constructor(projectRoot: string = process.cwd()) {
    this.envPath = join(projectRoot, '.env');
  }

  /**
   * Read existing .env file and parse values
   */
  readEnvFile(): EnvValues {
    if (!existsSync(this.envPath)) {
      return {};
    }

    try {
      const content = readFileSync(this.envPath, 'utf8');
      const values: EnvValues = {};

      // Parse each line
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            // Remove quotes if present
            const cleanValue = value.replace(/^["']|["']$/g, '');
            
            switch (key.trim()) {
              case 'LINEAR_API_KEY':
                values.LINEAR_API_KEY = cleanValue;
                break;
              case 'OPENAI_API_KEY':
                values.OPENAI_API_KEY = cleanValue;
                break;
              case 'ANTHROPIC_API_KEY':
                values.ANTHROPIC_API_KEY = cleanValue;
                break;
              case 'CODA_API_KEY':
                values.CODA_API_KEY = cleanValue;
                break;
              case 'GITHUB_TOKEN':
                values.GITHUB_TOKEN = cleanValue;
                break;
              case 'DEFAULT_AI_PROVIDER':
                values.DEFAULT_AI_PROVIDER = cleanValue;
                break;
              case 'DEFAULT_CODA_DOC_ID':
                values.DEFAULT_CODA_DOC_ID = cleanValue;
                break;
              case 'DEFAULT_CODA_DOC_NAME':
                values.DEFAULT_CODA_DOC_NAME = cleanValue;
                break;
              case 'DEFAULT_SUMMARY_TYPE':
                values.DEFAULT_SUMMARY_TYPE = cleanValue;
                break;
              case 'OPENAI_MODEL':
                values.OPENAI_MODEL = cleanValue;
                break;
              case 'ANTHROPIC_MODEL':
                values.ANTHROPIC_MODEL = cleanValue;
                break;
              case 'GITHUB_REPOSITORIES':
                values.GITHUB_REPOSITORIES = cleanValue;
                break;
              case 'CODA_DATA_DIRECTORY':
                values.CODA_DATA_DIRECTORY = cleanValue;
                break;
            }
          }
        }
      });

      return values;
    } catch (error) {
      console.warn('Warning: Could not read .env file:', error);
      return {};
    }
  }

  /**
   * Write values to .env file, preserving comments and other content
   */
  writeEnvFile(values: EnvValues): void {
    let content = '';
    
    // If .env exists, read and preserve comments/other content
    if (existsSync(this.envPath)) {
      try {
        const existingContent = readFileSync(this.envPath, 'utf8');
        const lines = existingContent.split('\n');
        
        // Filter out lines that we'll be updating
        const keysToUpdate = Object.keys(values);
        content = lines
          .filter(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('#') || !trimmed) return true; // Keep comments and empty lines
            const [key] = trimmed.split('=');
            return !keysToUpdate.includes(key?.trim());
          })
          .join('\n');
        
        // Ensure we end with a newline if content exists
        if (content && !content.endsWith('\n')) {
          content += '\n';
        }
      } catch (error) {
        console.warn('Warning: Could not read existing .env file:', error);
      }
    } else {
      // Create header comment for new .env file
      content = `# Team Knowledge CLI Configuration
# Get your API keys from:
# - Linear: https://linear.app/settings/api
# - OpenAI: https://platform.openai.com/api-keys
# - Anthropic: https://console.anthropic.com/
# - Coda: https://coda.io/account

`;
    }

    // Add/update our values
    if (values.LINEAR_API_KEY) {
      content += `LINEAR_API_KEY=${values.LINEAR_API_KEY}\n`;
    }
    
    if (values.OPENAI_API_KEY) {
      content += `OPENAI_API_KEY=${values.OPENAI_API_KEY}\n`;
    }
    
    if (values.ANTHROPIC_API_KEY) {
      content += `ANTHROPIC_API_KEY=${values.ANTHROPIC_API_KEY}\n`;
    }
    
    if (values.CODA_API_KEY) {
      content += `CODA_API_KEY=${values.CODA_API_KEY}\n`;
    }
    
    if (values.GITHUB_TOKEN) {
      content += `GITHUB_TOKEN=${values.GITHUB_TOKEN}\n`;
    }
    
    if (values.DEFAULT_AI_PROVIDER) {
      content += `DEFAULT_AI_PROVIDER=${values.DEFAULT_AI_PROVIDER}\n`;
    }
    
    if (values.DEFAULT_CODA_DOC_ID) {
      content += `DEFAULT_CODA_DOC_ID=${values.DEFAULT_CODA_DOC_ID}\n`;
    }
    
    if (values.DEFAULT_CODA_DOC_NAME) {
      content += `DEFAULT_CODA_DOC_NAME=${values.DEFAULT_CODA_DOC_NAME}\n`;
    }
    
    if (values.DEFAULT_SUMMARY_TYPE) {
      content += `DEFAULT_SUMMARY_TYPE=${values.DEFAULT_SUMMARY_TYPE}\n`;
    }
    
    if (values.OPENAI_MODEL) {
      content += `OPENAI_MODEL=${values.OPENAI_MODEL}\n`;
    }
    
    if (values.ANTHROPIC_MODEL) {
      content += `ANTHROPIC_MODEL=${values.ANTHROPIC_MODEL}\n`;
    }
    
    if (values.GITHUB_REPOSITORIES) {
      content += `GITHUB_REPOSITORIES=${values.GITHUB_REPOSITORIES}\n`;
    }
    
    if (values.CODA_DATA_DIRECTORY) {
      content += `CODA_DATA_DIRECTORY=${values.CODA_DATA_DIRECTORY}\n`;
    }

    try {
      writeFileSync(this.envPath, content, 'utf8');
    } catch (error) {
      throw new Error(`Could not write .env file: ${error}`);
    }
  }

  /**
   * Update specific values in .env file
   */
  updateEnvFile(updates: Partial<EnvValues>): void {
    const existing = this.readEnvFile();
    const merged = { ...existing, ...updates };
    this.writeEnvFile(merged);
  }

  /**
   * Check if .env file exists
   */
  envFileExists(): boolean {
    return existsSync(this.envPath);
  }

  /**
   * Get the path to the .env file
   */
  getEnvPath(): string {
    return this.envPath;
  }

  /**
   * Mask sensitive values for display
   */
  maskValue(value?: string): string {
    if (!value) return 'Not set';
    if (value.length <= 8) return '***' + value.slice(-2);
    return '***' + value.slice(-4);
  }

  /**
   * Validate API key format
   */
  validateApiKey(key: string, type: 'linear' | 'openai' | 'anthropic' | 'coda'): boolean {
    if (!key || !key.trim()) return false;
    
    switch (type) {
      case 'linear':
        return key.startsWith('lin_api_') || key.startsWith('lin_oauth_');
      case 'openai':
        return key.startsWith('sk-');
      case 'anthropic':
        return key.startsWith('sk-ant-');
      case 'coda':
        return key.length > 10; // Coda keys don't have a specific prefix
      default:
        return false;
    }
  }

  /**
   * Clear the .env file (remove it)
   */
  clearEnvFile(): void {
    if (existsSync(this.envPath)) {
      try {
        writeFileSync(this.envPath, '', 'utf8');
      } catch (error) {
        throw new Error(`Could not clear .env file: ${error}`);
      }
    }
  }
}