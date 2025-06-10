'use client';

import Link from 'next/link';
import { FaGithub, FaStar, FaArrowRight, FaBrain, FaNetworkWired, FaImage, FaCode, FaPlay, FaBookOpen, FaPen, FaPalette, FaBriefcase, FaMagnifyingGlass, FaHeart, FaCodeBranch, FaUpRightFromSquare } from 'react-icons/fa6';
import { FiSettings, FiLayers, FiZap } from 'react-icons/fi';
import { SiTypescript, SiNextdotjs, SiTailwindcss } from 'react-icons/si';
import { useState, useEffect } from 'react';
import Silk from '@/components/ui/Silk';
import AetherDemo from '@/components/AetherDemo';

export default function LandingPage() {
  const [isStarred, setIsStarred] = useState(false);
  const [starCount, setStarCount] = useState('0');
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch GitHub star count
  useEffect(() => {
    const fetchStarCount = async () => {
      try {
        const response = await fetch('https://api.github.com/repos/sbeeredd04/Aether');
        const data = await response.json();
        setStarCount(data.stargazers_count || '0');
      } catch (error) {
        console.error('Failed to fetch star count:', error);
      }
    };
    fetchStarCount();
  }, []);

  const handleGitHubStar = async () => {
    window.open('https://github.com/sbeeredd04/Aether', '_blank');
    setIsStarred(true);
  };

  const handleDirectStar = async () => {
    // GitHub's star API requires authentication, so we'll redirect to the star page
    window.open('https://github.com/sbeeredd04/Aether/stargazers', '_blank');
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
      icon: <FaMagnifyingGlass className="text-yellow-400" />,
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
    {
      icon: <FaBookOpen className="text-blue-400" />,
      text: "Research multiple perspectives on the same topic"
    },
    {
      icon: <FaPen className="text-purple-400" />,
      text: "Explore different story endings without losing your original"
    },
    {
      icon: <FaCodeBranch className="text-green-400" />,
      text: "Compare answers from different AI models side-by-side"
    },
    {
      icon: <FaPalette className="text-pink-400" />,
      text: "Generate variations of creative content"
    },
    {
      icon: <FaBriefcase className="text-orange-400" />,
      text: "Brainstorm solutions while keeping all ideas organized"
    },
    {
      icon: <FaMagnifyingGlass className="text-yellow-400" />,
      text: "Deep-dive into topics with branching follow-up questions"
    }
  ];

  return (
    <div className="min-h-screen bg-black relative">
      {/* Static Silk Background */}
      <div className="fixed inset-0 z-0">
        <Silk 
          speed={2}
          scale={0.75}
          color="#7b7481"
          noiseIntensity={1.75}
          rotation={0.05}
        />
      </div>

      {/* Main Content Container with Black Transparent Background */}
      <div className="relative z-10">
        <div className="bg-black/60 backdrop-blur-sm">
          {/* Scrollable Container */}
          <div className="h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            
            {/* Section 1: Hero */}
            <section className="min-h-screen flex flex-col">
              {/* Header */}
              <header className={`${isMobile ? 'p-4' : 'p-6'} flex justify-between items-center`}>
                <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
                  <img src="/aether.svg" alt="Aether AI" className={`${isMobile ? 'w-8 h-8' : 'w-12 h-12'}`} />
                  <span className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-white font-major-mono`}>Aether</span>
                </div>
                
                <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-4'}`}>
                  <button
                    onClick={handleDirectStar}
                    className={`flex items-center gap-2 bg-yellow-600/20 backdrop-blur-sm border border-yellow-400/30 rounded-full ${
                      isMobile ? 'px-3 py-1.5' : 'px-4 py-2'
                    } text-yellow-300 hover:bg-yellow-600/30 transition-all duration-300`}
                  >
                    <FaStar size={isMobile ? 14 : 16} />
                    <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>Star ({starCount})</span>
                  </button>
                  
                  <button
                    onClick={handleGitHubStar}
                    className={`flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full ${
                      isMobile ? 'px-3 py-1.5' : 'px-4 py-2'
                    } text-white hover:bg-white/20 transition-all duration-300`}
                  >
                    <FaGithub size={isMobile ? 14 : 16} />
                    <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>GitHub</span>
                    <FaUpRightFromSquare size={isMobile ? 10 : 12} />
                  </button>
                </div>
              </header>

              {/* Hero Content */}
              <div className={`flex-1 container mx-auto ${isMobile ? 'px-4' : 'px-6'} flex flex-col justify-center max-w-6xl`}>
                <div className={`text-center ${isMobile ? 'mb-8' : 'mb-12'}`}>
                  <h1 className={`${isMobile ? 'text-4xl' : 'text-6xl md:text-8xl'} font-bold text-white ${
                    isMobile ? 'mb-4' : 'mb-8'
                  } leading-tight font-major-mono`}>
                  Chat{' '}
                    <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                      Multiverse
                    </span>
                  </h1>
                  
                  <p className={`${isMobile ? 'text-lg' : 'text-2xl md:text-3xl'} text-white/80 ${
                    isMobile ? 'mb-8' : 'mb-12'
                  } max-w-4xl mx-auto leading-relaxed font-space-grotesk`}>
                    Transform your AI conversations into explorable trees of thought. 
                    Create, branch, and navigate multi-threaded discussions like never before.
                  </p>

                  <div className={`flex flex-col sm:flex-row ${isMobile ? 'gap-4' : 'gap-6'} justify-center items-center ${
                    isMobile ? 'mb-8' : 'mb-16'
                  }`}>
                    <Link
                      href="/workspace"
                      className={`group bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold ${
                        isMobile ? 'text-lg px-8 py-4' : 'text-xl px-12 py-6'
                      } rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-4`}
                    >
                      <FaPlay className="group-hover:translate-x-1 transition-transform" />
                      Start Creating
                    </Link>
                    
                    <a
                      href="https://github.com/sbeeredd04/Aether"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold ${
                        isMobile ? 'text-lg px-8 py-4' : 'text-xl px-12 py-6'
                      } rounded-full hover:bg-white/20 transition-all duration-300 flex items-center gap-4`}
                    >
                      <FaGithub size={isMobile ? 20 : 24} />
                      View Source
                      <FaUpRightFromSquare size={isMobile ? 14 : 16} />
                    </a>
                  </div>

                  {/* Interactive Demo */}
                  <div className={`bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 ${
                    isMobile ? 'p-4' : 'p-8'
                  } max-w-6xl mx-auto`}>
                    <div className={`flex items-center ${isMobile ? 'gap-2 mb-4' : 'gap-3 mb-6'}`}>
                      <div className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} rounded-full bg-red-500`}></div>
                      <div className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} rounded-full bg-yellow-500`}></div>
                      <div className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} rounded-full bg-green-500`}></div>
                      <span className={`text-white/60 ${isMobile ? 'text-xs ml-2' : 'text-sm ml-4'}`}>Aether AI Interface Preview</span>
                    </div>
                    
                    {/* Demo Container */}
                    <div className={`${isMobile ? 'h-64' : 'h-96'} w-full`}>
                      <AetherDemo />
                    </div>
                    
                    {/* How it Works Explanation */}
                    <div className={`${isMobile ? 'mt-4' : 'mt-8'} grid grid-cols-1 ${
                      isMobile ? 'gap-3' : 'md:grid-cols-3 gap-6'
                    } text-left`}>
                      <div className={`bg-white/5 rounded-xl ${isMobile ? 'p-3' : 'p-4'}`}>
                        <div className={`flex items-center ${isMobile ? 'gap-2 mb-2' : 'gap-3 mb-3'}`}>
                          <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-purple-500/20 flex items-center justify-center`}>
                            <span className={`text-purple-400 font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>1</span>
                          </div>
                          <h4 className={`text-white font-semibold ${isMobile ? 'text-sm' : ''}`}>Start Conversation</h4>
                        </div>
                        <p className={`text-white/70 ${isMobile ? 'text-xs' : 'text-sm'}`}>Begin with any question or prompt. Each conversation starts from the root node.</p>
                      </div>
                      
                      <div className={`bg-white/5 rounded-xl ${isMobile ? 'p-3' : 'p-4'}`}>
                        <div className={`flex items-center ${isMobile ? 'gap-2 mb-2' : 'gap-3 mb-3'}`}>
                          <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-blue-500/20 flex items-center justify-center`}>
                            <span className={`text-blue-400 font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>2</span>
                          </div>
                          <h4 className={`text-white font-semibold ${isMobile ? 'text-sm' : ''}`}>Branch & Explore</h4>
                        </div>
                        <p className={`text-white/70 ${isMobile ? 'text-xs' : 'text-sm'}`}>Click the + button on any node to create branches. Explore different responses and ideas.</p>
                      </div>
                      
                      <div className={`bg-white/5 rounded-xl ${isMobile ? 'p-3' : 'p-4'}`}>
                        <div className={`flex items-center ${isMobile ? 'gap-2 mb-2' : 'gap-3 mb-3'}`}>
                          <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-green-500/20 flex items-center justify-center`}>
                            <span className={`text-green-400 font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>3</span>
                          </div>
                          <h4 className={`text-white font-semibold ${isMobile ? 'text-sm' : ''}`}>Navigate History</h4>
                        </div>
                        <p className={`text-white/70 ${isMobile ? 'text-xs' : 'text-sm'}`}>Use the sidebar to view full conversation context and navigate between branches.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Use Cases */}
            <section className="min-h-screen flex flex-col justify-center">
              <div className={`container mx-auto ${isMobile ? 'px-4' : 'px-6'} max-w-6xl`}>
                <div className={`text-center ${isMobile ? 'mb-8' : 'mb-16'}`}>
                  <h2 className={`${isMobile ? 'text-3xl' : 'text-5xl md:text-6xl'} font-bold text-white ${
                    isMobile ? 'mb-4' : 'mb-8'
                  } font-major-mono`}>
                    Perfect For
                  </h2>
                  <p className={`${isMobile ? 'text-lg' : 'text-xl'} text-white/80 ${
                    isMobile ? 'mb-8' : 'mb-12'
                  } max-w-3xl mx-auto font-space-grotesk`}>
                    Discover the endless possibilities with Aether AI's visual conversation approach
                  </p>
                </div>

                <div className={`grid grid-cols-1 ${isMobile ? 'gap-4' : 'md:grid-cols-2 gap-8'} max-w-4xl mx-auto`}>
                  {useCases.map((useCase, index) => (
                    <div
                      key={index}
                      className={`bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-2xl border border-white/10 ${
                        isMobile ? 'p-4' : 'p-6'
                      } hover:scale-105 transition-all duration-300`}
                    >
                      <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'}`}>
                        <div className={`${isMobile ? 'text-xl' : 'text-2xl'} flex-shrink-0`}>
                          {useCase.icon}
                        </div>
                        <div className={`text-white/90 ${isMobile ? 'text-lg' : 'text-xl'} font-medium font-space-grotesk`}>
                          {useCase.text}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Section 3: Why Choose Aether */}
            <section className="min-h-screen flex flex-col justify-center">
              <div className={`container mx-auto ${isMobile ? 'px-4' : 'px-6'} max-w-6xl`}>
                <div className={`text-center ${isMobile ? 'mb-8' : 'mb-16'}`}>
                  <h2 className={`${isMobile ? 'text-3xl' : 'text-5xl md:text-6xl'} font-bold text-white ${
                    isMobile ? 'mb-4' : 'mb-8'
                  } font-major-mono`}>
                    Why Choose Aether?
                  </h2>
                  <p className={`${isMobile ? 'text-lg' : 'text-xl'} text-white/80 ${
                    isMobile ? 'mb-8' : 'mb-12'
                  } max-w-3xl mx-auto font-space-grotesk`}>
                    Experience the next generation of AI interaction with powerful features designed for modern workflows
                  </p>
                </div>

                <div className={`grid grid-cols-1 ${isMobile ? 'gap-4' : 'md:grid-cols-2 lg:grid-cols-3 gap-8'}`}>
                  {features.map((feature, index) => (
                    <div
                      key={index}
                      className={`bg-gradient-to-br ${feature.gradient} backdrop-blur-md border border-white/10 rounded-3xl ${
                        isMobile ? 'p-4' : 'p-8'
                      } hover:scale-105 transition-all duration-300`}
                    >
                      <div className={`flex items-center ${isMobile ? 'gap-3 mb-3' : 'gap-4 mb-6'}`}>
                        <div className={`${isMobile ? 'text-2xl' : 'text-3xl'}`}>{feature.icon}</div>
                        <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white font-major-mono`}>
                          {feature.title}
                        </h3>
                      </div>
                      <p className={`text-white/80 leading-relaxed ${isMobile ? 'text-base' : 'text-lg'} font-space-grotesk`}>
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Section 4: CTA & GitHub */}
            <section className="min-h-screen flex flex-col justify-center">
              <div className={`container mx-auto ${isMobile ? 'px-4' : 'px-6'} max-w-6xl`}>
                <div className="text-center">
                  <h2 className={`${isMobile ? 'text-3xl' : 'text-5xl md:text-6xl'} font-bold text-white ${
                    isMobile ? 'mb-4' : 'mb-8'
                  } font-major-mono`}>
                    Ready to Transform Your AI Conversations?
                  </h2>
                  <p className={`${isMobile ? 'text-lg' : 'text-2xl'} text-white/80 ${
                    isMobile ? 'mb-8' : 'mb-16'
                  } max-w-4xl mx-auto leading-relaxed font-space-grotesk`}>
                    Join thousands of users who are already exploring new dimensions of AI interaction.
                    Start your journey today with Aether AI's revolutionary visual approach.
                  </p>
                  
                  <div className={`flex flex-col sm:flex-row ${isMobile ? 'gap-6' : 'gap-8'} justify-center items-center ${
                    isMobile ? 'mb-8' : 'mb-16'
                  }`}>
                    <Link
                      href="/workspace"
                      className={`group bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold ${
                        isMobile ? 'text-xl px-12 py-6' : 'text-2xl px-16 py-8'
                      } rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center gap-4`}
                    >
                      Start Your Journey
                      <FaArrowRight className="group-hover:translate-x-2 transition-transform" />
                    </Link>
                  </div>

                  {/* GitHub Repository Info */}
                  <div className={`bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-3xl border border-white/10 ${
                    isMobile ? 'p-6' : 'p-12'
                  } max-w-4xl mx-auto`}>
                    <div className={`flex flex-col ${isMobile ? 'gap-4' : 'md:flex-row items-center gap-8'}`}>
                      <div className="flex-1 text-left">
                        <h3 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white ${
                          isMobile ? 'mb-3' : 'mb-4'
                        } font-major-mono`}>Open Source & Free</h3>
                        <p className={`text-white/80 ${isMobile ? 'text-base mb-4' : 'text-lg mb-6'} font-space-grotesk`}>
                          Aether AI is completely open source. Contribute, customize, or simply explore the code. 
                          We believe in transparency and community-driven development.
                        </p>
                        <div className={`flex flex-wrap ${isMobile ? 'gap-2' : 'gap-4'}`}>
                          <div className={`bg-white/10 rounded-full ${isMobile ? 'px-3 py-1' : 'px-4 py-2'} flex items-center gap-2`}>
                            <FaStar className="text-yellow-400" size={isMobile ? 14 : 16} />
                            <span className={`text-white/80 ${isMobile ? 'text-sm' : ''}`}>{starCount} stars</span>
                          </div>
                          <div className={`bg-white/10 rounded-full ${isMobile ? 'px-3 py-1' : 'px-4 py-2'} flex items-center gap-2`}>
                            <SiTypescript className="text-blue-400" size={isMobile ? 14 : 16} />
                            <span className={`text-white/80 ${isMobile ? 'text-sm' : ''}`}>TypeScript</span>
                          </div>
                          <div className={`bg-white/10 rounded-full ${isMobile ? 'px-3 py-1' : 'px-4 py-2'} flex items-center gap-2`}>
                            <SiNextdotjs className="text-white" size={isMobile ? 14 : 16} />
                            <span className={`text-white/80 ${isMobile ? 'text-sm' : ''}`}>Next.js</span>
                          </div>
                          <div className={`bg-white/10 rounded-full ${isMobile ? 'px-3 py-1' : 'px-4 py-2'} flex items-center gap-2`}>
                            <SiTailwindcss className="text-cyan-400" size={isMobile ? 14 : 16} />
                            <span className={`text-white/80 ${isMobile ? 'text-sm' : ''}`}>Tailwind</span>
                          </div>
                        </div>
                      </div>
                      <div className={`flex flex-col ${isMobile ? 'gap-3 w-full' : 'gap-4'}`}>
                        <button
                          onClick={handleDirectStar}
                          className={`bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-400/30 text-yellow-300 font-bold ${
                            isMobile ? 'px-6 py-3' : 'px-8 py-4'
                          } rounded-full transition-all duration-300 flex items-center justify-center gap-3`}
                        >
                          <FaStar size={isMobile ? 18 : 20} />
                          Star Repository
                        </button>
                        <a
                          href="https://github.com/sbeeredd04/Aether"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold ${
                            isMobile ? 'px-6 py-3' : 'px-8 py-4'
                          } rounded-full transition-all duration-300 flex items-center justify-center gap-3`}
                        >
                          <FaGithub size={isMobile ? 18 : 20} />
                          View Code
                          <FaUpRightFromSquare size={isMobile ? 14 : 16} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className={`${isMobile ? 'py-8' : 'py-12'} border-t border-white/10`}>
              <div className={`container mx-auto ${isMobile ? 'px-4' : 'px-6'} text-center`}>
                <div className={`flex justify-center items-center ${isMobile ? 'gap-4 mb-4' : 'gap-6 text-white/60 mb-6'} flex-wrap`}>
                  <a
                    href="https://github.com/sbeeredd04/Aether"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors flex items-center gap-2"
                  >
                    <FaGithub size={isMobile ? 18 : 20} />
                    <span className={isMobile ? 'text-sm' : ''}>GitHub</span>
                  </a>
                  <span>•</span>
                  <Link href="/workspace" className={`hover:text-white transition-colors ${isMobile ? 'text-sm' : ''}`}>
                    Get Started
                  </Link>
                  <span>•</span>
                  <span className={isMobile ? 'text-sm' : ''}>© 2025 Aether AI</span>
                  <span>•</span>
                  <span className={isMobile ? 'text-sm' : ''}>Open Source</span>
                </div>
                <div className={`flex items-center justify-center ${isMobile ? 'gap-2' : 'gap-3'} text-white/70 ${
                  isMobile ? 'mb-3' : 'mb-4'
                }`}>
                  <span className={`font-space-grotesk ${isMobile ? 'text-sm' : ''}`}>Developed by</span>
                  <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
                    <span className={`font-space-grotesk font-medium text-white/90 ${isMobile ? 'text-sm' : ''}`}>Sri Ujjwal Reddy</span>
                    <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
                      <a
                        href="https://github.com/sbeeredd04"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/60 hover:text-white transition-colors"
                        aria-label="GitHub Profile"
                      >
                        <FaGithub size={isMobile ? 14 : 16} />
                      </a>
                      <a
                        href="https://sriujjwalreddy.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/60 hover:text-white transition-colors"
                        aria-label="Portfolio Website"
                      >
                        <FaUpRightFromSquare size={isMobile ? 12 : 14} />
                      </a>
                    </div>
                  </div>
                </div>
                <p className={`text-white/40 ${isMobile ? 'text-sm' : 'text-sm'} flex items-center justify-center gap-2 font-space-grotesk`}>
                  Made with <FaHeart className="text-red-400" size={isMobile ? 12 : 14} /> for the AI community
                </p>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
