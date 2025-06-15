import { generateContent, AttachmentData } from './gemini';
import serverLogger from './serverLogger';

export interface GroundingResult {
  text: string;
  citations?: Citation[];
  searchQueries?: string[];
  searchEntryPoint?: string;
}

export interface Citation {
  title: string;
  uri: string;
  snippet?: string;
  confidenceScore?: number;
}

export interface GroundingMetadata {
  searchEntryPoint?: {
    renderedContent: string;
  };
  groundingChunks?: Array<{
    web?: {
      uri: string;
      title: string;
    };
  }>;
  groundingSupports?: Array<{
    segment: {
      startIndex?: number;
      endIndex?: number;
      text: string;
    };
    groundingChunkIndices: number[];
    confidenceScores: number[];
  }>;
  webSearchQueries?: string[];
}

export async function executeGroundingPipeline(
  apiKey: string,
  history: { role: "user" | "model"; parts: any[] }[],
  prompt: string,
  attachments?: AttachmentData[],
  enableThinking: boolean = true
): Promise<GroundingResult> {
  const requestId = Math.random().toString(36).substring(7);
  
  serverLogger.info("GroundingPipeline: Starting grounding pipeline", {
    requestId,
    promptLength: prompt.length,
    historyLength: history.length,
    enableThinking
  });

  try {
    // Step 1: Analyze query and generate search terms using gemini-2.0-flash
    serverLogger.info("GroundingPipeline: Step 1 - Analyzing query for search terms", { requestId });
    
    const queryAnalysisPrompt = `Analyze this user query and generate 1-3 specific search queries that would help provide accurate, up-to-date information. Return only the search queries, one per line, no additional text:

User Query: ${prompt}`;

    const searchTermsResponse = await generateContent(
      apiKey,
      [],
      queryAnalysisPrompt,
      "gemini-2.0-flash",
      undefined,
      undefined,
      undefined,
      false // No thinking for search term generation
    );

    if (!('text' in searchTermsResponse)) {
      throw new Error('Failed to generate search terms');
    }

    const searchTerms = searchTermsResponse.text
      .split('\n')
      .map(term => term.trim())
      .filter(term => term.length > 0)
      .slice(0, 3); // Limit to 3 search terms

    serverLogger.info("GroundingPipeline: Generated search terms", { 
      requestId, 
      searchTerms,
      searchTermsCount: searchTerms.length 
    });

    // Step 2: Perform grounding search using gemini-2.0-flash
    serverLogger.info("GroundingPipeline: Step 2 - Performing grounding search", { requestId });
    
    console.log(`🔍 PIPELINE DEBUG: Starting grounding with Gemini 2.0 Flash`, {
      requestId,
      prompt: prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''),
      historyLength: history.length,
      attachmentsCount: attachments?.length || 0,
      groundingConfig: { enabled: true, dynamicThreshold: 0.3 }
    });
    
    const groundingResponse = await generateContent(
      apiKey,
      history,
      prompt,
      "gemini-2.0-flash",
      attachments,
      undefined,
      { enabled: true, dynamicThreshold: 0.3 },
      false // No thinking for grounding
    );

    console.log(`🔍 PIPELINE DEBUG: Grounding response received`, {
      requestId,
      responseType: 'text' in groundingResponse ? 'text' : 'other',
      hasGroundingMetadata: 'groundingMetadata' in groundingResponse && !!groundingResponse.groundingMetadata,
      responseLength: 'text' in groundingResponse ? groundingResponse.text.length : 0
    });

    if (!('text' in groundingResponse)) {
      throw new Error('Failed to get grounding response');
    }

    // Extract grounding metadata from response
    const groundedContent = groundingResponse.text;
    let citations: Citation[] = [];
    let searchEntryPoint: string | undefined;
    let actualSearchQueries: string[] = searchTerms;

    // Check if response has grounding metadata
    if ('groundingMetadata' in groundingResponse && groundingResponse.groundingMetadata) {
      const metadata = groundingResponse.groundingMetadata;
      
      console.log(`🔍 PIPELINE DEBUG: Raw grounding metadata from Gemini 2.0 Flash`, {
        requestId,
        metadata,
        keys: Object.keys(metadata),
        hasSearchEntryPoint: !!metadata.searchEntryPoint,
        hasGroundingChunks: !!metadata.groundingChunks,
        hasGroundingSupports: !!metadata.groundingSupports,
        hasWebSearchQueries: !!metadata.webSearchQueries,
        hasCitations: !!metadata.citations,
        groundingChunksLength: metadata.groundingChunks?.length || 0,
        groundingSupportsLength: metadata.groundingSupports?.length || 0,
        webSearchQueriesLength: metadata.webSearchQueries?.length || 0,
        citationsLength: metadata.citations?.length || 0
      });
      
      // Extract citations from grounding metadata
      citations = extractCitationsFromGrounding(metadata);
      
      console.log(`🔍 PIPELINE DEBUG: Extracted citations`, {
        requestId,
        extractedCitationsCount: citations.length,
        citations: citations.map(c => ({
          title: c.title?.substring(0, 50) + (c.title?.length > 50 ? '...' : ''),
          uri: c.uri,
          confidenceScore: c.confidenceScore,
          snippetLength: c.snippet?.length || 0
        }))
      });
      
      // Extract search entry point
      if (metadata.searchEntryPoint?.renderedContent) {
        searchEntryPoint = metadata.searchEntryPoint.renderedContent;
        console.log(`🔍 PIPELINE DEBUG: Search entry point found`, {
          requestId,
          searchEntryPointLength: searchEntryPoint.length
        });
      }
      
      // Use actual search queries from metadata if available
      if (metadata.webSearchQueries && metadata.webSearchQueries.length > 0) {
        actualSearchQueries = metadata.webSearchQueries;
        console.log(`🔍 PIPELINE DEBUG: Using actual search queries from metadata`, {
          requestId,
          actualSearchQueries
        });
      }
      
      serverLogger.info("GroundingPipeline: Extracted metadata", {
        requestId,
        citationsCount: citations.length,
        hasSearchEntryPoint: !!searchEntryPoint,
        actualSearchQueriesCount: actualSearchQueries.length
      });
    } else {
      console.log(`🔍 PIPELINE DEBUG: No grounding metadata in response`, {
        requestId,
        hasGroundingMetadata: 'groundingMetadata' in groundingResponse,
        groundingMetadata: 'groundingMetadata' in groundingResponse ? groundingResponse.groundingMetadata : null
      });
    }
    
    serverLogger.info("GroundingPipeline: Grounding search completed", { 
      requestId,
      groundedContentLength: groundedContent.length
    });

    // Step 3: Process with thinking model if enabled
    if (enableThinking) {
      serverLogger.info("GroundingPipeline: Step 3 - Processing with thinking model", { requestId });
      
      const contextPrompt = `Based on the following grounded information from web search, please provide a comprehensive answer to the user's question. Include your thinking process.

Grounded Information:
${groundedContent}

Original User Question: ${prompt}

Please provide a thoughtful response that incorporates the grounded information while showing your reasoning process. Make sure to reference the sources where relevant, but don't include URLs in your response as they will be provided separately as citations.`;

      const thinkingResponse = await generateContent(
        apiKey,
        history, // Include conversation history for better context
        contextPrompt,
        "gemini-2.5-flash-preview-05-20",
        attachments,
        undefined,
        undefined,
        true // Enable thinking
      );

      if (!('text' in thinkingResponse)) {
        throw new Error('Failed to get thinking response');
      }

      serverLogger.info("GroundingPipeline: Thinking processing completed", { 
        requestId,
        thinkingResponseLength: thinkingResponse.text.length
      });

      return {
        text: thinkingResponse.text,
        searchQueries: actualSearchQueries,
        citations: citations,
        searchEntryPoint: searchEntryPoint
      };
    } else {
      // Return grounded response without additional processing
      // Add a brief note about web search being used
      const enhancedContent = `${groundedContent}

*This response is based on current web search results and may contain the most up-to-date information available.*`;

      return {
        text: enhancedContent,
        searchQueries: actualSearchQueries,
        citations: citations,
        searchEntryPoint: searchEntryPoint
      };
    }

  } catch (error) {
    serverLogger.error("GroundingPipeline: Pipeline failed", { 
      requestId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    });
    
    throw new Error(`Grounding pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function extractCitationsFromGrounding(metadata: GroundingMetadata): Citation[] {
  if (!metadata.groundingChunks || !metadata.groundingSupports) {
    return [];
  }

  const citations: Citation[] = [];
  const chunkMap = new Map<number, Citation>();

  // Build chunk map
  metadata.groundingChunks.forEach((chunk, index) => {
    if (chunk.web) {
      chunkMap.set(index, {
        title: chunk.web.title,
        uri: chunk.web.uri
      });
    }
  });

  // Extract citations with confidence scores
  metadata.groundingSupports.forEach(support => {
    support.groundingChunkIndices.forEach((chunkIndex, idx) => {
      const citation = chunkMap.get(chunkIndex);
      if (citation) {
        const confidenceScore = support.confidenceScores[idx];
        const existingCitation = citations.find(c => c.uri === citation.uri);
        
        if (!existingCitation) {
          citations.push({
            ...citation,
            snippet: support.segment.text,
            confidenceScore
          });
        }
      }
    });
  });

  return citations.sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0));
}

export function formatSearchSuggestions(searchQueries: string[], renderedContent?: string): string {
  if (renderedContent) {
    return renderedContent;
  }

  // Fallback formatting if renderedContent is not available
  const suggestions = searchQueries.map(query => 
    `<a href="https://www.google.com/search?q=${encodeURIComponent(query)}" target="_blank" rel="noopener noreferrer" class="search-suggestion">${query}</a>`
  ).join(' ');

  return `
    <div class="search-suggestions">
      <div class="search-label">Related searches:</div>
      ${suggestions}
    </div>
  `;
} 