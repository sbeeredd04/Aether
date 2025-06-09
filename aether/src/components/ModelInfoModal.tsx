'use client';

import { useState } from 'react';
import { FaTimes, FaStar, FaImage, FaMicrophone, FaVideo, FaSearch, FaBrain, FaCode } from 'react-icons/fa';
import { models, ModelDefinition } from '@/utils/models';

interface ModelInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModelInfoModal({ isOpen, onClose }: ModelInfoModalProps) {
  const [selectedModel, setSelectedModel] = useState<ModelDefinition | null>(null);

  if (!isOpen) return null;

  const getCapabilityIcon = (capability: string) => {
    switch (capability) {
      case 'thinking': return <FaBrain className="text-purple-400" />;
      case 'imageGeneration': return <FaImage className="text-green-400" />;
      case 'tts': return <FaMicrophone className="text-blue-400" />;
      case 'realtime': return <FaVideo className="text-red-400" />;
      default: return <FaCode className="text-orange-400" />;
    }
  };

  const getInputIcon = (input: string) => {
    switch (input) {
      case 'audio': return <FaMicrophone className="text-blue-400" />;
      case 'image': return <FaImage className="text-green-400" />;
      case 'video': return <FaVideo className="text-red-400" />;
      case 'text': return <FaCode className="text-white" />;
      default: return <FaCode className="text-white" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative z-10 bg-neutral-900/95 backdrop-blur-lg rounded-2xl border border-white/10 p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden"
           onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FaStar className="text-purple-400" size={24} />
            <h2 className="text-2xl font-bold text-white">AI Models Information</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="flex gap-6 h-full">
          {/* Model List */}
          <div className="w-1/3 space-y-2 overflow-y-auto max-h-[60vh]">
            <h3 className="text-lg font-semibold text-white/90 mb-3">Available Models</h3>
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model)}
                className={`w-full p-3 rounded-lg text-left transition-all ${
                  selectedModel?.id === model.id
                    ? 'bg-purple-600/30 border border-purple-400/50'
                    : 'bg-white/5 hover:bg-white/10 border border-white/10'
                }`}
              >
                <div className="font-medium text-white/90">{model.name}</div>
                <div className="text-xs text-white/60 mt-1">
                  {model.optimizedFor}
                </div>
                <div className="flex gap-1 mt-2">
                  {model.capabilities && Object.keys(model.capabilities).map((cap) => (
                    <div key={cap} className="text-xs">
                      {getCapabilityIcon(cap)}
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Model Details */}
          <div className="flex-1 overflow-y-auto max-h-[60vh]">
            {selectedModel ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{selectedModel.name}</h3>
                  <p className="text-white/70">{selectedModel.optimizedFor}</p>
                </div>

                {/* Capabilities */}
                {selectedModel.capabilities && Object.keys(selectedModel.capabilities).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-white/90 mb-2">Special Capabilities</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(selectedModel.capabilities).map(([cap, enabled]) => 
                        enabled && (
                          <div key={cap} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1">
                            {getCapabilityIcon(cap)}
                            <span className="text-sm text-white/80 capitalize">{cap}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Input Types */}
                <div>
                  <h4 className="font-semibold text-white/90 mb-2">Supported Inputs</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedModel.supportedInputs.map((input) => (
                      <div key={input} className="flex items-center gap-2 bg-blue-500/20 rounded-lg px-3 py-1">
                        {getInputIcon(input)}
                        <span className="text-sm text-white/80 capitalize">{input}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Output Types */}
                <div>
                  <h4 className="font-semibold text-white/90 mb-2">Supported Outputs</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedModel.supportedOutputs.map((output) => (
                      <div key={output} className="flex items-center gap-2 bg-green-500/20 rounded-lg px-3 py-1">
                        {getInputIcon(output)}
                        <span className="text-sm text-white/80 capitalize">{output}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Features */}
                <div className="space-y-2">
                  {selectedModel.supportsGrounding && (
                    <div className="flex items-center gap-2 text-white/70">
                      <FaSearch className="text-yellow-400" />
                      <span className="text-sm">Supports web grounding and search</span>
                    </div>
                  )}
                  {selectedModel.supportsCitations && (
                    <div className="flex items-center gap-2 text-white/70">
                      <FaCode className="text-orange-400" />
                      <span className="text-sm">Provides citations and references</span>
                    </div>
                  )}
                  {selectedModel.isThinking && (
                    <div className="flex items-center gap-2 text-white/70">
                      <FaBrain className="text-purple-400" />
                      <span className="text-sm">Uses adaptive thinking process</span>
                    </div>
                  )}
                  {selectedModel.useGroundingPipeline && (
                    <div className="flex items-center gap-2 text-white/70">
                      <FaSearch className="text-blue-400" />
                      <span className="text-sm">Enhanced with grounding pipeline</span>
                    </div>
                  )}
                </div>

                {/* Use Cases */}
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="font-semibold text-white/90 mb-2">Best Use Cases</h4>
                  <div className="text-sm text-white/70 space-y-1">
                    {selectedModel.id === 'gemini-2.5-flash-preview-05-20' && (
                      <ul className="list-disc list-inside space-y-1">
                        <li>Complex reasoning tasks requiring deep thinking</li>
                        <li>Cost-effective high-quality responses</li>
                        <li>Multi-modal content analysis</li>
                      </ul>
                    )}
                    {selectedModel.id === 'gemini-2.5-flash-web-thinking' && (
                      <ul className="list-disc list-inside space-y-1">
                        <li>Research tasks requiring current information</li>
                        <li>Fact-checking and verification</li>
                        <li>Questions about recent events or trends</li>
                      </ul>
                    )}
                    {selectedModel.id === 'gemini-2.0-flash' && (
                      <ul className="list-disc list-inside space-y-1">
                        <li>Real-time streaming conversations</li>
                        <li>Latest generation AI capabilities</li>
                        <li>Speed-critical applications</li>
                      </ul>
                    )}
                    {selectedModel.id === 'gemini-2.0-flash-preview-image-generation' && (
                      <ul className="list-disc list-inside space-y-1">
                        <li>Creative image generation and editing</li>
                        <li>Visual content creation</li>
                        <li>Artistic and design projects</li>
                      </ul>
                    )}
                    {selectedModel.id === 'gemini-2.0-flash-lite' && (
                      <ul className="list-disc list-inside space-y-1">
                        <li>High-volume processing tasks</li>
                        <li>Cost-sensitive applications</li>
                        <li>Low-latency requirements</li>
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-white/50">
                <div className="text-center">
                  <FaStar size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Select a model to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 