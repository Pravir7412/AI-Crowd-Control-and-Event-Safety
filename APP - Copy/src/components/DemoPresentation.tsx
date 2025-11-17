import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, Zap, Users, AlertTriangle, MapPin, Clock, Bot } from 'lucide-react';

const DemoPresentation: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const slides = [
    {
      title: "🚀 AWS Crowd Safety Chatbot",
      subtitle: "AI-Powered Event Management System",
      content: "Revolutionary crowd control solution for Malaysia's events",
      features: ["Real-time Monitoring", "AI Predictions", "WhatsApp-style Alerts", "AWS Cloud Native"]
    },
    {
      title: "🎯 Problem Solved",
      subtitle: "Traditional vs AI-Powered",
      content: "Eliminates chaos, bottlenecks, and safety risks",
      features: ["No Hardware Required", "Predictive Analytics", "Real-time Alerts", "Cost Effective"]
    },
    {
      title: "💡 Smart Input Orchestrator",
      subtitle: "Multiple Data Input Methods",
      content: "Flexible event setup with intelligent validation",
      features: ["File Upload", "Manual Entry", "Map Selection", "Auto-suggestions"]
    },
    {
      title: "🤖 AI Safety Bot",
      subtitle: "ChatGPT-Level Event Management Intelligence",
      content: "Advanced AI with predictive analytics, optimization, and voice capabilities",
      features: ["Predictive Analytics", "AI Optimization", "Voice Intelligence", "Real-time Analysis"]
    },
    {
      title: "📊 Real-time Dashboard",
      subtitle: "Live Event Monitoring",
      content: "Comprehensive monitoring with visual analytics",
      features: ["Crowd Density", "Weather Updates", "Gate Status", "Transport Monitoring"]
    },
    {
      title: "🎮 Scenario Simulation",
      subtitle: "Test Emergency Responses",
      content: "Practice makes perfect - simulate any scenario",
      features: ["Entry Rush", "Weather Emergency", "Evacuation", "Transport Disruption"]
    },
    {
      title: "🎤 Voice Features",
      subtitle: "Hands-Free Operation",
      content: "Speak naturally with the AI Safety Bot",
      features: ["Speech Recognition", "Text-to-Speech", "Voice Commands", "Accessibility"]
    },
    {
      title: "🏆 Hackathon Ready",
      subtitle: "Impressive Visual Effects",
      content: "Stunning UI with animations and effects",
      features: ["Glassmorphism", "Neon Glows", "Particle Effects", "Smooth Animations"]
    }
  ];

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center z-50">
      {/* Animated Background */}
      <div className="absolute inset-0 cyber-grid opacity-20"></div>
      <div className="absolute inset-0 animated-bg opacity-10"></div>
      
      {/* Presentation Container */}
      <div className="relative z-10 max-w-4xl mx-auto px-8">
        <div className="glass rounded-2xl p-8 text-center">
          {/* Slide Content */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold gradient-text mb-4 slide-in-up">
              {slides[currentSlide].title}
            </h1>
            <h2 className="text-2xl text-cyan-400 mb-6 slide-in-up" style={{ animationDelay: '0.2s' }}>
              {slides[currentSlide].subtitle}
            </h2>
            <p className="text-xl text-white/80 mb-8 slide-in-up" style={{ animationDelay: '0.4s' }}>
              {slides[currentSlide].content}
            </p>
            
            {/* Features */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {slides[currentSlide].features.map((feature, index) => (
                <div 
                  key={index} 
                  className="glass rounded-lg p-4 hover-lift slide-in-up" 
                  style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                >
                  <div className="text-2xl mb-2">
                    {index === 0 && <Zap className="h-6 w-6 text-yellow-400 mx-auto" />}
                    {index === 1 && <Users className="h-6 w-6 text-blue-400 mx-auto" />}
                    {index === 2 && <AlertTriangle className="h-6 w-6 text-red-400 mx-auto" />}
                    {index === 3 && <MapPin className="h-6 w-6 text-green-400 mx-auto" />}
                  </div>
                  <p className="text-white text-sm font-medium">{feature}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={prevSlide}
              className="glass p-3 rounded-lg hover:bg-white/20 transition-all duration-300"
            >
              <SkipForward className="h-6 w-6 text-white rotate-180" />
            </button>
            
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="glass p-4 rounded-lg hover:bg-white/20 transition-all duration-300"
            >
              {isPlaying ? (
                <Pause className="h-8 w-8 text-white" />
              ) : (
                <Play className="h-8 w-8 text-white" />
              )}
            </button>
            
            <button
              onClick={nextSlide}
              className="glass p-3 rounded-lg hover:bg-white/20 transition-all duration-300"
            >
              <SkipForward className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Slide Indicators */}
          <div className="flex justify-center space-x-2 mt-6">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'bg-cyan-400 neon-blue' 
                    : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>

          {/* Demo Button */}
          <div className="mt-8">
            <button
              onClick={() => window.location.href = '/'}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-4 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 hover-lift shadow-lg text-lg font-semibold"
            >
              🚀 Start Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoPresentation;
