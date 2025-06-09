'use client';

import Link from 'next/link';
import { FaGithub, FaStar, FaArrowRight, FaBrain, FaNetworkWired, FaImage, FaSearch, FaCode, FaExternalLinkAlt, FaPlay } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import Silk from '@/components/ui/Silk';
import CardSwap, { Card } from '@/components/ui/CardSwap';
import Magnet from '@/components/ui/Magnet';

export default function LandingPage() {
  const [isStarred, setIsStarred] = useState(false);
  const [starCount, setStarCount] = useState('0');

  // Fetch GitHub star count
  useEffect(() => {
    const fetchStarCount = async () => {
      try {
        const response = await fetch('https://api.github.com/repos/sbeeredd04/Mutec');
        const data = await response.json();
        setStarCount(data.stargazers_count || '0');
      } catch (error) {
        console.error('Failed to fetch star count:', error);
      }
    };
    fetchStarCount();
  }, []);

  const handleGitHubStar = async () => {
    window.open('https://github.com/sbeeredd04/Mutec', '_blank');
    setIsStarred(true);
  };

  const handleDirectStar = async () => {
    // GitHub's star API requires authentication, so we'll redirect to the star page
    window.open('https://github.com/sbeeredd04/Mutec/stargazers', '_blank');
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
    <div className="min-h-screen bg-black relative">
      {/* Static Silk Background */}
      <div className="fixed inset-0 z-0">
        <Silk 
          speed={2}
          scale={1.5}
          color="#4c1d95"
          noiseIntensity={0.8}
          rotation={0.05}
        />
      </div>

      {/* Main Content Container with Backdrop Blur */}
      <div className="relative z-10 bg-black/20 backdrop-blur-sm">
        {/* Scrollable Container */}
        <div className="h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          
          {/* Section 1: Hero */}
          <section className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="p-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <img src="/vercel.svg" alt="Mutec" className="w-8 h-8 invert" />
                <span className="text-2xl font-bold text-white">Mutec</span>
              </div>
              
              <div className="flex items-center gap-4">
                <Magnet magnetStrength={2}>
                  <button
                    onClick={handleDirectStar}
                    className="flex items-center gap-2 bg-yellow-600/20 backdrop-blur-sm border border-yellow-400/30 rounded-full px-4 py-2 text-yellow-300 hover:bg-yellow-600/30 transition-all duration-300"
                  >
                    <FaStar size={16} />
                    <span className="text-sm font-medium">Star ({starCount})</span>
                  </button>
                </Magnet>
                
                <Magnet magnetStrength={2}>
                  <button
                    onClick={handleGitHubStar}
                    className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-white hover:bg-white/20 transition-all duration-300"
                  >
                    <FaGithub size={16} />
                    <span className="text-sm font-medium">GitHub</span>
                    <FaExternalLinkAlt size={12} />
                  </button>
                </Magnet>
              </div>
            </header>

            {/* Hero Content */}
            <div className="flex-1 container mx-auto px-6 flex flex-col justify-center max-w-6xl">
              <div className="text-center mb-12">
                <h1 className="text-6xl md:text-8xl font-bold text-white mb-8 leading-tight">
                  Visual AI{' '}
                  <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                    Conversations
                  </span>
                </h1>
                
                <p className="text-2xl md:text-3xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed">
                  Transform your AI conversations into explorable trees of thought. 
                  Create, branch, and navigate multi-threaded discussions like never before.
                </p>

                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
                  <Magnet magnetStrength={3}>
                    <Link
                      href="/workspace"
                      className="group bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xl px-12 py-6 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-4"
                    >
                      <FaPlay className="group-hover:translate-x-1 transition-transform" />
                      Start Creating
                    </Link>
                  </Magnet>
                  
                  <Magnet magnetStrength={3}>
                    <a
                      href="https://github.com/sbeeredd04/Mutec"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold text-xl px-12 py-6 rounded-full hover:bg-white/20 transition-all duration-300 flex items-center gap-4"
                    >
                      <FaGithub size={24} />
                      View Source
                      <FaExternalLinkAlt size={16} />
                    </a>
                  </Magnet>
                </div>

                {/* Demo Preview */}
                <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-8 max-w-4xl mx-auto">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-white/60 text-sm ml-4">Mutec Interface Preview</span>
                  </div>
                  <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-2xl p-8 text-center">
                    <div className="text-white/80 mb-4">
                      <FaNetworkWired size={48} className="mx-auto mb-4 text-purple-400" />
                      <p className="text-lg">Interactive conversation graph visualization</p>
                      <p className="text-sm text-white/60 mt-2">See your conversations as connected nodes • Branch at any point • Never lose context</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Use Cases */}
          <section className="min-h-screen flex flex-col justify-center">
            <div className="container mx-auto px-6 max-w-6xl">
              <div className="text-center mb-16">
                <h2 className="text-5xl md:text-6xl font-bold text-white mb-8">
                  Perfect For
                </h2>
                <p className="text-xl text-white/80 mb-12 max-w-3xl mx-auto">
                  Discover the endless possibilities with Mutec's visual conversation approach
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {useCases.map((useCase, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-6 hover:scale-105 transition-all duration-300"
                  >
                    <div className="text-white/90 text-xl font-medium">
                      {useCase}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 3: Why Choose Mutec with CardSwap */}
          <section className="min-h-screen flex flex-col justify-center relative">
            <div className="container mx-auto px-6 max-w-6xl">
              <div className="text-center mb-16">
                <h2 className="text-5xl md:text-6xl font-bold text-white mb-8">
                  Why Choose Mutec?
                </h2>
                <p className="text-xl text-white/80 mb-12 max-w-3xl mx-auto">
                  Experience the next generation of AI interaction with powerful features designed for modern workflows
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className={`bg-gradient-to-br ${feature.gradient} backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:scale-105 transition-all duration-300`}
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="text-3xl">{feature.icon}</div>
                      <h3 className="text-xl font-bold text-white">
                        {feature.title}
                      </h3>
                    </div>
                    <p className="text-white/80 leading-relaxed text-lg">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* CardSwap positioned properly within the section */}
            <div className="absolute bottom-8 right-8 z-20">
              <CardSwap
                width={280}
                height={180}
                cardDistance={35}
                verticalDistance={25}
                delay={3500}
                pauseOnHover={true}
                easing="elastic"
              >
                <Card className="bg-gradient-to-br from-purple-600/90 to-blue-600/90 backdrop-blur-sm border-white/20 p-6">
                  <div className="text-white">
                    <FaBrain className="text-2xl mb-3" />
                    <h3 className="font-bold text-base mb-2">Thinking Models</h3>
                    <p className="text-xs text-white/90">Advanced reasoning with visible thought processes</p>
                  </div>
                </Card>
                
                <Card className="bg-gradient-to-br from-green-600/90 to-teal-600/90 backdrop-blur-sm border-white/20 p-6">
                  <div className="text-white">
                    <FaImage className="text-2xl mb-3" />
                    <h3 className="font-bold text-base mb-2">Image Generation</h3>
                    <p className="text-xs text-white/90">Create stunning visuals directly in chat</p>
                  </div>
                </Card>
                
                <Card className="bg-gradient-to-br from-pink-600/90 to-rose-600/90 backdrop-blur-sm border-white/20 p-6">
                  <div className="text-white">
                    <FaNetworkWired className="text-2xl mb-3" />
                    <h3 className="font-bold text-base mb-2">Visual Navigation</h3>
                    <p className="text-xs text-white/90">Explore conversations as interactive graphs</p>
                  </div>
                </Card>
                
                <Card className="bg-gradient-to-br from-yellow-600/90 to-orange-600/90 backdrop-blur-sm border-white/20 p-6">
                  <div className="text-white">
                    <FaSearch className="text-2xl mb-3" />
                    <h3 className="font-bold text-base mb-2">Web Grounding</h3>
                    <p className="text-xs text-white/90">Real-time information from the web</p>
                  </div>
                </Card>
              </CardSwap>
            </div>
          </section>

          {/* Section 4: CTA & GitHub */}
          <section className="min-h-screen flex flex-col justify-center">
            <div className="container mx-auto px-6 max-w-6xl">
              <div className="text-center">
                <h2 className="text-5xl md:text-6xl font-bold text-white mb-8">
                  Ready to Transform Your AI Conversations?
                </h2>
                <p className="text-2xl text-white/80 mb-16 max-w-4xl mx-auto leading-relaxed">
                  Join thousands of users who are already exploring new dimensions of AI interaction.
                  Start your journey today with Mutec's revolutionary visual approach.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-8 justify-center items-center mb-16">
                  <Magnet magnetStrength={4}>
                    <Link
                      href="/workspace"
                      className="group bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-2xl px-16 py-8 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center gap-4"
                    >
                      Start Your Journey
                      <FaArrowRight className="group-hover:translate-x-2 transition-transform" />
                    </Link>
                  </Magnet>
                </div>

                {/* GitHub Repository Info */}
                <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-3xl border border-white/10 p-12 max-w-4xl mx-auto">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-1 text-left">
                      <h3 className="text-3xl font-bold text-white mb-4">Open Source & Free</h3>
                      <p className="text-white/80 text-lg mb-6">
                        Mutec is completely open source. Contribute, customize, or simply explore the code. 
                        We believe in transparency and community-driven development.
                      </p>
                      <div className="flex flex-wrap gap-4">
                        <div className="bg-white/10 rounded-full px-4 py-2">
                          <span className="text-white/80">⭐ {starCount} stars</span>
                        </div>
                        <div className="bg-white/10 rounded-full px-4 py-2">
                          <span className="text-white/80">🔧 TypeScript</span>
                        </div>
                        <div className="bg-white/10 rounded-full px-4 py-2">
                          <span className="text-white/80">⚡ Next.js</span>
                        </div>
                        <div className="bg-white/10 rounded-full px-4 py-2">
                          <span className="text-white/80">🎨 Tailwind</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <Magnet magnetStrength={3}>
                        <button
                          onClick={handleDirectStar}
                          className="bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-400/30 text-yellow-300 font-bold px-8 py-4 rounded-full transition-all duration-300 flex items-center gap-3"
                        >
                          <FaStar size={20} />
                          Star Repository
                        </button>
                      </Magnet>
                      <Magnet magnetStrength={3}>
                        <a
                          href="https://github.com/sbeeredd04/Mutec"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-8 py-4 rounded-full transition-all duration-300 flex items-center gap-3"
                        >
                          <FaGithub size={20} />
                          View Code
                          <FaExternalLinkAlt size={16} />
                        </a>
                      </Magnet>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-12 border-t border-white/10">
            <div className="container mx-auto px-6 text-center">
              <div className="flex justify-center items-center gap-8 text-white/60 mb-6">
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
                <Link href="/workspace" className="hover:text-white transition-colors">
                  Get Started
                </Link>
                <span>•</span>
                <span>© 2025 Mutec</span>
                <span>•</span>
                <span>Open Source</span>
              </div>
              <p className="text-white/40 text-sm">
                Made with ❤️ for the AI community
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
