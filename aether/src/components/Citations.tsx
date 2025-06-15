import React from 'react';
import { FiExternalLink, FiSearch } from 'react-icons/fi';

export interface Citation {
  title: string;
  uri: string;
  snippet?: string;
  confidenceScore?: number;
}

interface CitationsProps {
  citations?: Citation[];
  searchQueries?: string[];
  searchEntryPoint?: string;
  className?: string;
}

export default function Citations({ citations, searchQueries, searchEntryPoint, className = '' }: CitationsProps) {
  if (!citations?.length && !searchQueries?.length && !searchEntryPoint) {
    return null;
  }

  return (
    <div className={`citations-container ${className}`}>
      {/* Google Search Suggestions - Required when grounding is used */}
      {searchEntryPoint && (
        <div 
          className="search-suggestions mb-4"
          dangerouslySetInnerHTML={{ __html: searchEntryPoint }}
        />
      )}

      {/* Fallback search suggestions if renderedContent is not available */}
      {!searchEntryPoint && searchQueries && searchQueries.length > 0 && (
        <div className="search-suggestions mb-4 p-3 bg-neutral-800/50 rounded-lg border border-neutral-600">
          <div className="flex items-center gap-2 text-sm text-neutral-300 mb-2">
            <FiSearch size={14} />
            <span className="font-medium">Related searches:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchQueries.map((query, index) => (
              <a
                key={index}
                href={`https://www.google.com/search?q=${encodeURIComponent(query)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="search-suggestion-chip px-3 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-sm rounded-full border border-neutral-600 transition-colors flex items-center gap-1"
              >
                {query}
                <FiExternalLink size={12} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Citations from grounding */}
      {citations && citations.length > 0 && (
        <div className="citations mb-4">
          <div className="flex items-center gap-2 text-sm text-neutral-300 mb-3 font-medium">
            <FiExternalLink size={14} />
            <span>Sources ({citations.length}):</span>
          </div>
          <div className="space-y-2">
            {citations.map((citation, index) => (
              <div key={index} className="citation-item p-3 bg-neutral-800/30 rounded-lg border border-neutral-700/50 hover:border-neutral-600/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <a
                      href={citation.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="citation-link text-blue-300 hover:text-blue-200 font-medium text-sm flex items-center gap-1 group"
                    >
                      <span className="truncate">{citation.title}</span>
                      <FiExternalLink size={12} className="flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <div className="text-xs text-neutral-500 mt-1 truncate">
                      {new URL(citation.uri).hostname}
                    </div>
                    {citation.snippet && (
                      <p className="text-neutral-400 text-xs mt-1 line-clamp-2 leading-relaxed">
                        {citation.snippet}
                      </p>
                    )}
                  </div>
                  {citation.confidenceScore && citation.confidenceScore > 0 && (
                    <div className="flex-shrink-0 flex flex-col items-end">
                      <div className="text-xs text-neutral-500 font-medium">
                        {Math.round(citation.confidenceScore * 100)}%
                      </div>
                      <div className="w-8 h-1 bg-neutral-700 rounded-full mt-1">
                        <div 
                          className="h-full bg-blue-400 rounded-full transition-all"
                          style={{ width: `${citation.confidenceScore * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Add CSS to globals.css for Google Search Suggestions styling
export const searchSuggestionsCSS = `
/* Google Search Suggestions Styling - Required by Google's guidelines */
.search-suggestions .container {
  align-items: center;
  border-radius: 8px;
  display: flex;
  font-family: 'Google Sans', Roboto, sans-serif;
  font-size: 14px;
  line-height: 20px;
  padding: 8px 12px;
  background-color: #1f1f1f;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.15);
}

.search-suggestions .chip {
  display: inline-block;
  border: solid 1px #3c4043;
  border-radius: 16px;
  min-width: 14px;
  padding: 5px 16px;
  text-align: center;
  user-select: none;
  margin: 0 8px;
  background-color: #2c2c2c;
  color: #fff;
  text-decoration: none;
  transition: background-color 0.2s ease;
}

.search-suggestions .chip:hover {
  background-color: #353536;
}

.search-suggestions .chip:focus {
  background-color: #353536;
}

.search-suggestions .chip:active {
  background-color: #464849;
  border-color: #53575b;
}

.search-suggestions .carousel {
  overflow: auto;
  scrollbar-width: none;
  white-space: nowrap;
  margin-right: -12px;
}

.search-suggestions .headline {
  display: flex;
  margin-right: 4px;
}

.search-suggestions .headline-label {
  color: #fff;
}

.search-suggestions .gradient-container {
  position: relative;
}

.search-suggestions .gradient {
  position: absolute;
  transform: translate(3px, -9px);
  height: 36px;
  width: 9px;
  background: linear-gradient(90deg, #1f1f1f 15%, rgba(31, 31, 31, 0) 100%);
}

/* Citation styling */
.citation-item .line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
`; 