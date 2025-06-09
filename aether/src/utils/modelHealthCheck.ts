import { ModelDefinition, getAvailableModels } from './models';
import logger from './logger';

export interface HealthCheckResult {
  modelId: string;
  modelName: string;
  status: 'success' | 'error' | 'timeout' | 'not_tested';
  error?: string;
  responseTime?: number;
  testedCapabilities: string[];
  workingCapabilities: string[];
  failedCapabilities: string[];
  details?: {
    textResponse?: boolean;
    audioResponse?: boolean;
    imageGeneration?: boolean;
    thinking?: boolean;
    grounding?: boolean;
  };
}

export interface HealthCheckReport {
  timestamp: string;
  totalModels: number;
  successfulModels: number;
  failedModels: number;
  results: HealthCheckResult[];
  summary: {
    workingModels: string[];
    failedModels: string[];
    partiallyWorkingModels: string[];
  };
}

const TEST_PROMPTS = {
  simple: "Hello! Please respond with just 'Health check successful'",
  thinking: "Think about why the sky is blue and explain it briefly. Use thinking if available.",
  imageGeneration: "Generate a simple image of a red circle on a white background.",
  tts: "Convert this text to speech: Hello world",
  grounding: "Search for the current weather and tell me what you find."
};

const TIMEOUT_MS = 30000; // 30 seconds timeout

async function createTestImage(): Promise<string> {
  // Create a simple test image as base64
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Draw a simple test pattern
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 50, 50);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(50, 0, 50, 50);
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(0, 50, 50, 50);
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(50, 50, 50, 50);
  }
  
  return canvas.toDataURL('image/png');
}

async function testModelWithTimeout(
  modelId: string,
  prompt: string,
  options: any = {}
): Promise<{ success: boolean; response?: any; error?: string; responseTime: number }> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    // Get API key from localStorage
    const savedSettings = localStorage.getItem('aether-settings');
    if (!savedSettings) {
      return {
        success: false,
        error: 'API key not found in settings',
        responseTime: Date.now() - startTime
      };
    }
    
    const settings = JSON.parse(savedSettings);
    const apiKey = settings.apiKey;
    if (!apiKey) {
      return {
        success: false,
        error: 'API key is empty in settings',
        responseTime: Date.now() - startTime
      };
    }
    
    // Prepare request payload in the correct format for our API
    const requestPayload: any = {
      apiKey,
      modelId,
      history: [], // Empty history for health check
      prompt,
      attachments: options.attachments || [],
      ...options
    };
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
        responseTime
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      response: data,
      responseTime
    };
    
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timeout',
        responseTime
      };
    }
    
    return {
      success: false,
      error: error.message || 'Unknown error',
      responseTime
    };
  }
}

async function testModelCapabilities(model: ModelDefinition): Promise<HealthCheckResult> {
  logger.info(`HealthCheck: Testing model ${model.id}`, { modelName: model.name });
  
  const result: HealthCheckResult = {
    modelId: model.id,
    modelName: model.name,
    status: 'not_tested',
    testedCapabilities: [],
    workingCapabilities: [],
    failedCapabilities: [],
    details: {}
  };
  
  const testImage = await createTestImage();
  
  // Test basic text functionality
  logger.debug(`HealthCheck: Testing basic text for ${model.id}`);
  result.testedCapabilities.push('text');
  
  const basicTest = await testModelWithTimeout(model.id, TEST_PROMPTS.simple);
  if (basicTest.success) {
    result.workingCapabilities.push('text');
    result.details!.textResponse = true;
    result.responseTime = basicTest.responseTime;
  } else {
    result.failedCapabilities.push('text');
    result.details!.textResponse = false;
    result.error = basicTest.error;
    result.responseTime = basicTest.responseTime;
    result.status = 'error';
    return result;
  }
  
  // Test thinking capability
  if (model.capabilities?.thinking) {
    logger.debug(`HealthCheck: Testing thinking for ${model.id}`);
    result.testedCapabilities.push('thinking');
    
    const thinkingTest = await testModelWithTimeout(model.id, TEST_PROMPTS.thinking, {
      enableThinking: true
    });
    
    if (thinkingTest.success) {
      result.workingCapabilities.push('thinking');
      result.details!.thinking = true;
    } else {
      result.failedCapabilities.push('thinking');
      result.details!.thinking = false;
    }
  }
  
  // Test TTS capability
  if (model.capabilities?.tts) {
    logger.debug(`HealthCheck: Testing TTS for ${model.id}`);
    result.testedCapabilities.push('tts');
    
    const ttsTest = await testModelWithTimeout(model.id, TEST_PROMPTS.tts, {
      ttsOptions: {
        voice: 'Puck',
        speedMultiplier: 1.0
      }
    });
    
    if (ttsTest.success && ttsTest.response?.audioData) {
      result.workingCapabilities.push('tts');
      result.details!.audioResponse = true;
    } else {
      result.failedCapabilities.push('tts');
      result.details!.audioResponse = false;
    }
  }
  
  // Test image generation capability
  if (model.capabilities?.imageGeneration) {
    logger.debug(`HealthCheck: Testing image generation for ${model.id}`);
    result.testedCapabilities.push('imageGeneration');
    
    const imageTest = await testModelWithTimeout(model.id, TEST_PROMPTS.imageGeneration);
    
    if (imageTest.success && imageTest.response?.images?.length > 0) {
      result.workingCapabilities.push('imageGeneration');
      result.details!.imageGeneration = true;
    } else {
      result.failedCapabilities.push('imageGeneration');
      result.details!.imageGeneration = false;
    }
  }
  
  // Test grounding capability
  if (model.supportsGrounding) {
    logger.debug(`HealthCheck: Testing grounding for ${model.id}`);
    result.testedCapabilities.push('grounding');
    
    const groundingTest = await testModelWithTimeout(model.id, TEST_PROMPTS.grounding, {
      grounding: {
        enabled: true,
        dynamicThreshold: 0.7
      }
    });
    
    if (groundingTest.success) {
      result.workingCapabilities.push('grounding');
      result.details!.grounding = true;
    } else {
      result.failedCapabilities.push('grounding');
      result.details!.grounding = false;
    }
  }
  
  // Test with image input if supported
  if (model.supportedInputs.includes('image')) {
    logger.debug(`HealthCheck: Testing image input for ${model.id}`);
    result.testedCapabilities.push('imageInput');
    
    const imageInputTest = await testModelWithTimeout(
      model.id, 
      "Describe what you see in this test image.",
      {
        attachments: [{
          name: 'test-image.png',
          type: 'image/png',
          data: testImage
        }]
      }
    );
    
    if (imageInputTest.success) {
      result.workingCapabilities.push('imageInput');
    } else {
      result.failedCapabilities.push('imageInput');
    }
  }
  
  // Determine final status
  if (result.failedCapabilities.length === 0) {
    result.status = 'success';
  } else if (result.workingCapabilities.length > 0) {
    result.status = 'success'; // Partially working is still success if basic text works
  } else {
    result.status = 'error';
  }
  
  logger.info(`HealthCheck: Completed testing ${model.id}`, {
    status: result.status,
    workingCapabilities: result.workingCapabilities.length,
    failedCapabilities: result.failedCapabilities.length,
    responseTime: result.responseTime
  });
  
  return result;
}

export async function runHealthCheck(): Promise<HealthCheckReport> {
  const startTime = Date.now();
  logger.info('HealthCheck: Starting comprehensive model health check');
  
  const models = getAvailableModels();
  const results: HealthCheckResult[] = [];
  
  // Test models one by one with 30-second delays
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    logger.debug(`HealthCheck: Testing model ${i + 1}/${models.length}`, {
      modelId: model.id,
      modelName: model.name
    });
    
    const result = await testModelCapabilities(model);
    results.push(result);
    
    // Add 30-second delay between requests (except for the last one)
    if (i < models.length - 1) {
      logger.debug(`HealthCheck: Waiting 30 seconds before next model test`);
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
  
  // Generate summary
  const successfulModels = results.filter(r => r.status === 'success').map(r => r.modelId);
  const failedModels = results.filter(r => r.status === 'error').map(r => r.modelId);
  const partiallyWorkingModels = results.filter(r => 
    r.status === 'success' && r.failedCapabilities.length > 0
  ).map(r => r.modelId);
  
  const report: HealthCheckReport = {
    timestamp: new Date().toISOString(),
    totalModels: models.length,
    successfulModels: successfulModels.length,
    failedModels: failedModels.length,
    results,
    summary: {
      workingModels: successfulModels,
      failedModels,
      partiallyWorkingModels
    }
  };
  
  const totalTime = Date.now() - startTime;
  logger.info('HealthCheck: Completed health check', {
    totalTime: `${totalTime}ms`,
    totalModels: report.totalModels,
    successfulModels: report.successfulModels,
    failedModels: report.failedModels,
    partiallyWorkingModels: partiallyWorkingModels.length
  });
  
  return report;
}

export async function saveHealthCheckReport(report: HealthCheckReport): Promise<string> {
  const fileName = `health-check-${Date.now()}.json`;
  const filePath = `/tmp/${fileName}`;
  
  try {
    // Save to localStorage for browser access
    localStorage.setItem('lastHealthCheckReport', JSON.stringify(report));
    logger.info('HealthCheck: Report saved to localStorage');
    
    return fileName;
  } catch (error) {
    logger.error('HealthCheck: Failed to save report', { error });
    throw error;
  }
}

export function getLastHealthCheckReport(): HealthCheckReport | null {
  try {
    const saved = localStorage.getItem('lastHealthCheckReport');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    logger.error('HealthCheck: Failed to load last report', { error });
    return null;
  }
} 