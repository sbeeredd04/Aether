'use client';

import Link from 'next/link';
import { FaGithub, FaStar, FaArrowRight, FaBrain, FaNetworkWired, FaImage, FaMicrophone, FaSearch, FaCode } from 'react-icons/fa';
import { useState } from 'react';
import Silk from '@/components/ui/Silk';
import CardSwap, { Card } from '@/components/ui/CardSwap';
import Magnet from '@/components/ui/Magnet';

export default function LandingPage() {
  const [isStarred, setIsStarred] = useState(false);

  const handleGitHubStar = async () => {
    // Open GitHub repo in new tab
    window.open('https://github.com/sbeeredd04/Mutec', '_blank');
    setIsStarred(true);
  };

  const features = [
    {
      icon: <FaNetworkWired className="text-purple-400" />,
      title: "Visual Conversation Trees",
      description: "Transform linear chats into explorable graphs. Every conversation becomes a visual journey you can navigate and explore.",
      gradient: "from-purple-500/20 to-blue-500/20"
    },
    {
      icon: <FaBrain className="text-green-400" />,
      title: "Multiple AI Models",
      description: "Access Gemini 2.0 Flash, thinking models, image generation, and more. Each optimized for different use cases.",
      gradient: "from-green-500/20 to-teal-500/20"
    },
    {
      icon: <FaArrowRight className="text-blue-400" />,
      title: "Infinite Branching",
      description: "Create unlimited conversation branches from any point. Explore different answers without losing your original thread.",
      gradient: "from-blue-500/20 to-cyan-500/20"
    },
    {
      icon: <FaImage className="text-pink-400" />,
      title: "Rich Media Support",
      description: "Upload images, audio, and files. Generate images directly in conversations. Full multimedia AI interactions.",
      gradient: "from-pink-500/20 to-rose-500/20"
    },
    {
      icon: <FaSearch className="text-yellow-400" />,
      title: "Web-Grounded Responses",
      description: "Get answers backed by real-time web search. Perfect for research, fact-checking, and current events.",
      gradient: "from-yellow-500/20 to-orange-500/20"
    },
    {
      icon: <FaCode className="text-indigo-400" />,
      title: "Developer Friendly",
      description: "Full markdown support, code syntax highlighting, copy functionality, and session persistence.",
      gradient: "from-indigo-500/20 to-purple-500/20"
    }
  ];

  const useCases = [
    "📚 Research multiple perspectives on the same topic",
    "✍️ Explore different story endings without losing your original",
    "🧠 Compare answers from different AI models side-by-side",
    "🎨 Generate variations of creative content",
    "💼 Brainstorm solutions while keeping all ideas organized",
    "🔍 Deep-dive into topics with branching follow-up questions"
  ];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Silk Background */}
      <div className="absolute inset-0 z-0">
        <Silk 
          speed={3}
          scale={2}
          color="#4c1d95"
          noiseIntensity={1.2}
          rotation={0.1}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/vercel.svg" alt="Mutec" className="w-8 h-8 invert" />
            <span className="text-2xl font-bold text-white">Mutec</span>
          </div>
          
          <Magnet magnetStrength={3}>
            <button
              onClick={handleGitHubStar}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-white hover:bg-white/20 transition-all duration-300"
            >
              <FaGithub size={18} />
              <span className="text-sm font-medium">Star on GitHub</span>
              {isStarred && <FaStar className="text-yellow-400" size={16} />}
            </button>
          </Magnet>
        </header>

        {/* Hero Section */}
        <main className="flex-1 container mx-auto px-6 py-12 max-w-6xl">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Visual AI{' '}
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Conversations
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-3xl mx-auto leading-relaxed">
              Transform your AI conversations into explorable trees of thought. 
              Create, branch, and navigate multi-threaded discussions like never before.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Magnet magnetStrength={2}>
                <Link
                  href="/workspace"
                  className="group bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3"
                >
                  Start Creating
                  <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </Magnet>
              
              <Magnet magnetStrength={2}>
                <button
                  onClick={handleGitHubStar}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold px-8 py-4 rounded-full hover:bg-white/20 transition-all duration-300 flex items-center gap-3"
                >
                  <FaGithub size={20} />
                  View Source
                </button>
              </Magnet>
            </div>

            {/* Use Cases */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-16">
              <h3 className="text-2xl font-bold text-white mb-4">Perfect For</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                {useCases.map((useCase, index) => (
                  <div key={index} className="text-white/80 text-lg">
                    {useCase}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="mb-16">
            <h2 className="text-4xl font-bold text-white text-center mb-12">
              Why Choose Mutec?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`bg-gradient-to-br ${feature.gradient} backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:scale-105 transition-all duration-300`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-2xl">{feature.icon}</div>
                    <h3 className="text-xl font-semibold text-white">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-white/80 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-gradient-to-r from-purple-900/30 to-blue-900/30 backdrop-blur-sm rounded-3xl border border-white/10 p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Transform Your AI Conversations?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join thousands of users who are already exploring new dimensions of AI interaction.
            </p>
            
            <Magnet magnetStrength={3}>
              <Link
                href="/workspace"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xl px-10 py-5 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                Start Your Journey
                <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </Magnet>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center border-t border-white/10">
          <div className="flex justify-center items-center gap-6 text-white/60">
            <a
              href="https://github.com/sbeeredd04/Mutec"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-2"
            >
              <FaGithub size={20} />
              GitHub
            </a>
            <span>•</span>
            <span>© 2025 Mutec</span>
            <span>•</span>
            <span>Open Source</span>
          </div>
        </footer>
      </div>

      {/* Floating Feature Cards */}
      <CardSwap
        width={300}
        height={200}
        cardDistance={40}
        verticalDistance={30}
        delay={4000}
        pauseOnHover={true}
        easing="elastic"
      >
        <Card className="bg-gradient-to-br from-purple-600/90 to-blue-600/90 backdrop-blur-sm border-white/20 p-6">
          <div className="text-white">
            <FaBrain className="text-3xl mb-3" />
            <h3 className="font-bold text-lg mb-2">Thinking Models</h3>
            <p className="text-sm text-white/90">Advanced reasoning with visible thought processes</p>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-600/90 to-teal-600/90 backdrop-blur-sm border-white/20 p-6">
          <div className="text-white">
            <FaImage className="text-3xl mb-3" />
            <h3 className="font-bold text-lg mb-2">Image Generation</h3>
            <p className="text-sm text-white/90">Create stunning visuals directly in chat</p>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-pink-600/90 to-rose-600/90 backdrop-blur-sm border-white/20 p-6">
          <div className="text-white">
            <FaNetworkWired className="text-3xl mb-3" />
            <h3 className="font-bold text-lg mb-2">Visual Navigation</h3>
            <p className="text-sm text-white/90">Explore conversations as interactive graphs</p>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-600/90 to-orange-600/90 backdrop-blur-sm border-white/20 p-6">
          <div className="text-white">
            <FaSearch className="text-3xl mb-3" />
            <h3 className="font-bold text-lg mb-2">Web Grounding</h3>
            <p className="text-sm text-white/90">Real-time information from the web</p>
          </div>
        </Card>
      </CardSwap>
    </div>
  );
}
