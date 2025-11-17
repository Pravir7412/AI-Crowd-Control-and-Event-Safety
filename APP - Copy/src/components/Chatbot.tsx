import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, MapPin, Clock, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useAlertContext } from '../context/AlertContext';
import { useEventContext } from '../context/EventContext';
import { useRealtimeContext } from '../context/RealtimeContext';

const Chatbot: React.FC = () => {
  const { alerts, addAlert } = useAlertContext();
  const { eventData } = useEventContext();
  const { realtimeData, status, refreshWeather } = useRealtimeContext();
  const [messages, setMessages] = useState<Array<{
    id: string;
    type: 'bot' | 'user' | 'alert';
    content: string;
    timestamp: Date;
    actions?: string[];
    mapLink?: string;
    severity?: string;
  }>>([
    {
      id: '1',
      type: 'bot',
      content: '📲 "🟢 Ops online. Action: Ask: Weather now / Gate A packed / Safest exit."',
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  
  // Voice features
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [recognition, setRecognition] = useState<any>(null);
  const [speechSynthesis, setSpeechSynthesis] = useState<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Add new alerts as chat messages
    alerts.forEach(alert => {
      const existingMessage = messages.find(msg => msg.id === `alert-${alert.id}`);
      if (!existingMessage) {
        const newMessage = {
          id: `alert-${alert.id}`,
          type: 'alert' as const,
          content: `${alert.message}`,
          timestamp: new Date(alert.timestamp),
          actions: alert.actions,
          mapLink: alert.mapLink,
          severity: alert.severity
        };
        setMessages(prev => [...prev, newMessage]);
        setUnreadCount(prev => prev + 1);
        
        // Send browser notification with WhatsApp-style styling
        if (Notification.permission === 'granted') {
          const notification = new Notification(`🚨 ${alert.title}`, {
            body: alert.message,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2300D4AA"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/></svg>',
            badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FF0000"><circle cx="12" cy="12" r="10"/></svg>',
            tag: alert.id,
            requireInteraction: alert.severity === 'critical',
            silent: alert.severity === 'info'
          });
          
          // Auto-close info notifications after 5 seconds
          if (alert.severity === 'info') {
            setTimeout(() => notification.close(), 5000);
          }
        }
      }
    });
  }, [alerts]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
        }
      });
    }

    // Initialize voice features
    initializeVoiceFeatures();
  }, []);

  const initializeVoiceFeatures = () => {
    // Initialize Speech Recognition (Web Speech API)
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onstart = () => {
        setIsListening(true);
      };
      
      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
      };
      
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }

    // Initialize Speech Synthesis
    if ('speechSynthesis' in window) {
      setSpeechSynthesis(window.speechSynthesis);
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
      if (!document.hidden) {
        setUnreadCount(0);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const sendMessage = async () => {
    const question = inputMessage.trim();
    if (!question) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    // Prefer strict local responder for operational intents; else call backend (AWS Bedrock via FastAPI)
    const lower = question.toLowerCase();
    const useLocal = (
      lower.includes('weather') || lower.includes('rain') || lower.includes('temperature') ||
      lower.includes('gate') || lower.includes('exit') || lower.includes('evac') ||
      lower.includes('next') || lower.includes("what's the next plan") || lower.includes('plan')
    );

    let rawResponse = '';
    try {
      if (useLocal) {
        // If this looks like a weather query (incl. "rain stopped"), force-refresh live weather first
        const isWeatherQuery = lower.includes('weather') || lower.includes('rain') || lower.includes('temperature') || lower.includes('temp') || lower.includes('clear');
        if (isWeatherQuery && typeof refreshWeather === 'function') {
          try { await refreshWeather(); } catch {}
        }
        rawResponse = generateBotResponse(question);
      } else {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: question, sender: 'user' })
        });
        if (res.ok) {
          const data = await res.json();
          rawResponse = typeof data.response === 'string' ? data.response : '';
        }
        if (!rawResponse) {
          // Fallback to local if backend not available
          rawResponse = generateBotResponse(question);
        }
      }
    } catch (_e) {
      rawResponse = generateBotResponse(question);
    }

    // Enforce strict WhatsApp-style format and LIVE/SIMULATED tag
    const formatted = formatWhatsAppReply(rawResponse, question);

    // Push plan update to simulation as an alert (so operations log reflects decisions)
    const actionMatchInline = formatted.match(/Action:\s*([^\[\"]+)/);
    const actionLine = actionMatchInline ? actionMatchInline[1].replace(/\s*\[(LIVE|SIMULATED|UPLOADED)\]\s*/i, '').trim() : null;
    if (actionLine) {
      addAlert({
        title: 'Plan Update',
        message: formatted.replace(/^📲\s*/, ''),
        severity: 'info',
        category: 'Operations',
        location: eventData?.location_name || 'Venue',
        actions: [actionLine],
        mapLink: '#'
      });
    }

    const botMessage = {
      id: (Date.now() + 1).toString(),
      type: 'bot' as const,
      content: formatted,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, botMessage]);

    if (voiceEnabled && speechSynthesis) {
      speakText(formatted);
    }
  };

  const startListening = () => {
    if (recognition && !isListening) {
      recognition.start();
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
    }
  };

  const speakText = (text: string) => {
    if (!speechSynthesis || !voiceEnabled) return;

    // Stop any current speech
    speechSynthesis.cancel();
    
    // Clean up the text for better speech
    const cleanText = text
      .replace(/[🚨👋🤖📊🌧️🚇🚪📍🚻]/g, '') // Remove emojis
      .replace(/\n/g, '. ') // Replace newlines with periods
      .replace(/\s+/g, ' ') // Clean up extra spaces
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Configure voice settings
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    // Try to use a more natural voice
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Google') || 
      voice.name.includes('Microsoft') ||
      voice.name.includes('Samantha')
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    speechSynthesis.speak(utterance);
  };

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (speechSynthesis && !voiceEnabled) {
      speechSynthesis.cancel();
    }
  };

  const generateBotResponse = (question: string): string => {
    return generateShortResponse(question);
  };

  // Compact WhatsApp-style responder
  const generateShortResponse = (question: string): string => {
    const q = question.toLowerCase();
    const tag = getDataTag();

    // Weather
    if (q.includes('weather') || q.includes('rain') || q.includes('temperature') || q.includes('temp') || q.includes('clear')) {
      const tempRaw = realtimeData?.weather?.temperature as unknown;
      const rainRaw = realtimeData?.weather?.rain_probability as unknown;
      const temp = typeof tempRaw === 'number' && Number.isFinite(tempRaw) ? tempRaw : undefined;
      const rain = typeof rainRaw === 'number' && Number.isFinite(rainRaw) ? rainRaw : undefined;
      const cond = (realtimeData?.weather?.condition || '').toLowerCase();
      const stopped = q.includes('stop') || q.includes('stopped') || q.includes('cleared') || cond === 'clear';
      const started = q.includes('start') || q.includes('started') || q.includes('raining');
      const highRain = typeof rain === 'number' && rain >= 60;
      const medRain = typeof rain === 'number' && rain >= 30;
      const tStr = typeof temp === 'number' ? `${temp}°C` : '';
      if (stopped) {
        return `📲 🌤️ Rain stopped. Action: Resume normal flow; keep ushers at Gates A & B 10m. ${tag}`;
      }
      if (started || highRain) {
        return `📲 🌧️ Noted — rain. Action: Open concourses; move 30% indoors; delay show 10m. ${tag}`;
      }
      const emoji = highRain ? '🌧️' : '🌤️';
      const action = highRain
        ? 'Open cover; delay 10m'
        : medRain
          ? 'Prep ponchos; open covered areas'
          : 'Proceed normal; brief ushers';
      const lead = tStr ? `Temp ${tStr}, ` : '';
      const rStr = typeof rain === 'number' ? `${rain}%` : 'unknown';
      return `📲 ${emoji} ${lead}Rain ${rStr}. Action: ${action}. ${tag}`;
    }

    // Gates
    if (q.includes('gate')) {
      const gateMatch = q.match(/gate\s*([a-d])/i);
      const gate = (gateMatch ? gateMatch[1] : 'A').toUpperCase();
      const alt = altGate(gate);
      const wait = getGateWait(gate);
      const waitStr = typeof wait === 'number' && Number.isFinite(wait) ? `~${wait}m ` : '';
      return `📲 🚨 Noted — Gate ${gate} packed. Action: Route 20% to Gate ${alt}; deploy ushers. ${waitStr}${tag}`;
    }

    // Safest exit
    if (q.includes('exit') || q.includes('evac')) {
      const best = getBestExit();
      const eta = getEvacEta(best);
      return `📲 ⚡ Exit ${best} best now. Action: Use ${best}+${altExit(best)}; ETA ${eta}m. ${tag}`;
    }

    // Next plan
    if (q.includes('next') || q.includes('plan') || q.includes('what\'s the next plan')) {
      const bestGate = getBestGate();
      const avgClear = getAvgClear(bestGate);
      return `📲 🕒 Next 30m plan. Action: Gate ${bestGate} best; avg clear ${avgClear}m. ${tag}`;
    }

    // Default short help
    return `📲 👋 Hi — online. Action: Ask weather / gate status / safest exit. ${tag}`;
  };

  const getDataTag = (): string => {
    if (status === 'LIVE') return '[LIVE]';
    if (status === 'UPLOADED') return '[UPLOADED]';
    return '[SIMULATED]';
  };

  // Enforce the 2–3 line format and data tag
  const formatWhatsAppReply = (raw: string, question: string): string => {
    const tag = getDataTag();
    const cleaned = (raw || '').trim();

    const stripDupTags = (s: string) => {
      let t = s.replace(/\s*\[(LIVE|SIMULATED|UPLOADED)\]\.?/gi, '');
      return `${t.replace(/\s+$/, '')} ${tag}`.replace(/\s+\./g, '.');
    };

    if (/Action:\s*/i.test(cleaned) && /(\[LIVE\]|\[SIMULATED\]|\[UPLOADED\])/i.test(cleaned) && cleaned.length < 200) {
      const prefixed = cleaned.startsWith('📲') ? cleaned : `📲 ${cleaned.replace(/^\"|\"$/g, '')}`;
      const deduped = stripDupTags(prefixed);
      return deduped.replace(/\s*\[(LIVE|SIMULATED|UPLOADED)\]\s*\[(LIVE|SIMULATED|UPLOADED)\]/i, ` ${tag}`);
    }

    const lower = question.toLowerCase();
    const emoji = lower.includes('rain') || lower.includes('weather') ? '🌧️'
      : lower.includes('evac') || lower.includes('exit') ? '⚡'
      : lower.includes('gate') ? '🚨'
      : lower.includes('train') || lower.includes('bus') || lower.includes('transport') ? '🚆'
      : '📲';

    const actionMatch = cleaned.match(/Action:\s*([^"\n]+)/i);
    let action = actionMatch ? actionMatch[1].trim() : suggestActionFallback(lower);
    action = action.replace(/\s*\[(LIVE|SIMULATED|UPLOADED)\]\s*/i, '').replace(/\s+\.$/, '');

    const reason = summarizeReason(lower);
    const finalText = `📲 ${emoji} ${reason}. Action: ${action}. ${tag}`;
    return finalText;
  };

  const summarizeReason = (lowerQ: string): string => {
    if (lowerQ.includes('rain') || lowerQ.includes('weather') || lowerQ.includes('temp')) return 'Weather update';
    if (lowerQ.includes('gate')) return `Gate ${lowerQ.match(/gate\s*([a-d])/i)?.[1]?.toUpperCase() || 'A'} status`;
    if (lowerQ.includes('exit') || lowerQ.includes('evac')) return 'Evac route check';
    if (lowerQ.includes('transport') || lowerQ.includes('train') || lowerQ.includes('bus')) return 'Transport delay check';
    if (lowerQ.includes('next') || lowerQ.includes('plan')) return 'Next 30min plan';
    return 'Ops update';
  };

  const suggestActionFallback = (lowerQ: string): string => {
    if (lowerQ.includes('rain') || lowerQ.includes('weather')) return 'Move to cover, delay 10m if heavy rain';
    if (lowerQ.includes('gate')) return 'Redirect 20% to alternate gate';
    if (lowerQ.includes('exit') || lowerQ.includes('evac')) return 'Use two clearest exits now';
    if (lowerQ.includes('transport') || lowerQ.includes('train') || lowerQ.includes('bus')) return 'Activate shuttles, extend parking 20%';
    if (lowerQ.includes('next') || lowerQ.includes('plan')) return 'Use best gate; brief staff';
    return 'Proceed per SOP, monitor';
  };

  const extractAction = (formatted: string): string | null => {
    const m = formatted.match(/Action:\s*([^\[\"]+)/);
    const a = m ? m[1].trim() : null;
    return a ? a.replace(/\s*\[(LIVE|SIMULATED)\]\s*/i, '').trim() : null;
  };

  const isLive = (): boolean => status === 'LIVE';

  const toNumber = (v: any): number => {
    const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
    return n;
  };

  const isFiniteNumber = (v: any): boolean => Number.isFinite(v);

  const altGate = (gate: string): string => {
    const gates = ['A','B','C','D'];
    const others = gates.filter(g => g !== gate);
    return others[0] || 'B';
  };

  const getGateWait = (gate: string): number | null => {
    const g = realtimeData?.gates?.find((x: any) => x.gate_id === gate);
    return typeof g?.wait_time === 'number' ? g.wait_time : null;
  };

  const getBestExit = (): string => {
    const exits = realtimeData?.exits;
    if (exits && exits.length) {
      const sorted = [...exits].sort((a,b) => (a.clearance_eta ?? 999) - (b.clearance_eta ?? 999));
      return (sorted[0]?.exit_id || 'D').toUpperCase();
    }
    return 'D';
  };

  const altExit = (exit: string): string => {
    const map: Record<string,string> = { A:'B', B:'C', C:'D', D:'E', E:'F' };
    return map[exit] || 'E';
  };

  const getEvacEta = (_exit: string): number => {
    const exits = realtimeData?.exits;
    if (exits && exits.length) {
      const best = [...exits].sort((a,b) => (a.clearance_eta ?? 999) - (b.clearance_eta ?? 999))[0];
      const eta = typeof best?.clearance_eta === 'number' ? best.clearance_eta : 9;
      return Math.max(1, Math.min(30, Math.round(eta)));
    }
    return 9;
  };

  const getBestGate = (): string => {
    const gates = realtimeData?.gates as any[] | undefined;
    if (gates && gates.length) {
      const best = [...gates].sort((a,b) => (a.wait_time ?? 999) - (b.wait_time ?? 999))[0];
      return (best?.gate_id || 'B').toUpperCase();
    }
    return 'B';
  };

  const getAvgClear = (gateId: string): number => {
    const gate = realtimeData?.gates?.find((g: any) => g.gate_id === gateId);
    const wt = gate?.wait_time;
    if (isFiniteNumber(wt)) return Math.max(3, Math.min(25, Math.round(wt)));
    return 12;
  };

  const generateAdvancedAIResponse = (question: string, lowerQuestion: string, currentTime: Date, eventStart: Date | null, eventEnd: Date | null): string => {
    // Event Phase Analysis
    const eventPhase = getEventPhase(currentTime, eventStart, eventEnd);
    const crowdDensity = calculateCrowdDensity();
    const riskLevel = assessRiskLevel();
    
    // Context-Aware Responses
    const context = {
      eventPhase,
      crowdDensity,
      riskLevel,
      currentTime,
      weatherCondition: realtimeData?.weather.condition || 'Unknown',
      temperature: realtimeData?.weather.temperature || 0,
      rainProbability: realtimeData?.weather.rain_probability || 0
    };

    // Handle complex queries with AI intelligence
    if (lowerQuestion.includes('gate') && (lowerQuestion.includes('full') || lowerQuestion.includes('crowded') || lowerQuestion.includes('congestion'))) {
      return handleGateIntelligence(question, lowerQuestion, context);
    }
    
    if (lowerQuestion.includes('weather') || lowerQuestion.includes('rain') || lowerQuestion.includes('storm')) {
      return handleWeatherIntelligence(question, lowerQuestion, context);
    }
    
    if (lowerQuestion.includes('crowd') || lowerQuestion.includes('capacity') || lowerQuestion.includes('attendance')) {
      return handleCrowdIntelligence(question, lowerQuestion, context);
    }
    
    if (lowerQuestion.includes('evacuate') || lowerQuestion.includes('emergency') || lowerQuestion.includes('evacuation')) {
      return handleEmergencyIntelligence(question, lowerQuestion, context);
    }
    
    if (lowerQuestion.includes('transport') || lowerQuestion.includes('train') || lowerQuestion.includes('bus')) {
      return handleTransportIntelligence(question, lowerQuestion, context);
    }
    
    if (lowerQuestion.includes('predict') || lowerQuestion.includes('forecast') || lowerQuestion.includes('what will happen')) {
      return handlePredictiveIntelligence(question, lowerQuestion, context);
    }
    
    if (lowerQuestion.includes('optimize') || lowerQuestion.includes('improve') || lowerQuestion.includes('recommend')) {
      return handleOptimizationIntelligence(question, lowerQuestion, context);
    }
    
    if (lowerQuestion.includes('analyze') || lowerQuestion.includes('report') || lowerQuestion.includes('summary')) {
      return handleAnalyticsIntelligence(question, lowerQuestion, context);
    }
    
    // Default intelligent response
    return generateIntelligentDefaultResponse(question, lowerQuestion, context);
  };

  const getEventPhase = (currentTime: Date, eventStart: Date | null, eventEnd: Date | null): string => {
    if (!eventStart || !eventEnd) return 'Unknown';
    
    const timeToStart = eventStart.getTime() - currentTime.getTime();
    const timeToEnd = eventEnd.getTime() - currentTime.getTime();
    
    if (timeToStart > 0) {
      const hoursToStart = timeToStart / (1000 * 60 * 60);
      if (hoursToStart > 24) return 'Pre-Event';
      if (hoursToStart > 2) return 'Pre-Event (2h)';
      if (hoursToStart > 0.5) return 'Pre-Event (30m)';
      return 'Event Starting';
    }
    
    if (timeToEnd > 0) {
      const hoursToEnd = timeToEnd / (1000 * 60 * 60);
      if (hoursToEnd > 2) return 'Event Active';
      if (hoursToEnd > 0.5) return 'Event Ending Soon';
      return 'Event Ending';
    }
    
    return 'Post-Event';
  };

  const calculateCrowdDensity = (): string => {
    const currentAttendance = realtimeData?.crowd.current_attendance || 0;
    const expectedAttendance = eventData?.expected_attendance || 1;
    const density = (currentAttendance / expectedAttendance) * 100;
    
    if (density < 30) return 'Low';
    if (density < 60) return 'Medium';
    if (density < 85) return 'High';
    return 'Critical';
  };

  const assessRiskLevel = (): string => {
    const crowdDensity = calculateCrowdDensity();
    const weatherRisk = realtimeData?.weather.rain_probability || 0;
    const transportDelays = realtimeData?.transport?.filter(t => t.status === 'delayed').length || 0;
    
    let riskScore = 0;
    if (crowdDensity === 'Critical') riskScore += 3;
    if (crowdDensity === 'High') riskScore += 2;
    if (weatherRisk > 70) riskScore += 2;
    if (transportDelays > 2) riskScore += 1;
    
    if (riskScore >= 4) return 'High';
    if (riskScore >= 2) return 'Medium';
    return 'Low';
  };

  const handleGateIntelligence = (_question: string, lowerQuestion: string, context: any): string => {
    const gateMatch = lowerQuestion.match(/gate\s+([a-d])/i);
    const gateId = gateMatch ? gateMatch[1].toUpperCase() : 'B';
    const gate = eventData?.gates.find(g => g.gate_id === gateId);
    const gateStatus = realtimeData?.gates.find(g => g.gate_id === gateId);
    
    if (!gate) {
      return `I don't have information about Gate ${gateId}. Available gates are: ${eventData?.gates.map(g => g.gate_id).join(', ')}.`;
    }
    
    // AI Analysis
    const waitTime = gateStatus?.wait_time || 0;
    const capacity = gate.capacity_per_hour;
    const efficiency = waitTime > 15 ? 'Poor' : waitTime > 8 ? 'Fair' : 'Good';
    
    // Predictive recommendations
    const recommendations = generateGateRecommendations(gateId, waitTime, capacity, context);
    
    // Create alert if needed
    if (waitTime > 15 || lowerQuestion.includes('full') || lowerQuestion.includes('crowded')) {
      addAlert({
        title: `Gate ${gateId} Intelligence Alert`,
        message: `🚨 Gate ${gateId} analysis: ${efficiency} efficiency, ${waitTime}min wait. AI recommendations applied.`,
        severity: waitTime > 20 ? 'critical' : 'warning',
        category: 'Crowd Management',
        location: `Gate ${gateId}`,
        actions: recommendations,
        mapLink: gate.gps ? `https://maps.google.com/?q=${gate.gps}` : '#'
      });
    }
    
    return `🤖 **AI Gate Analysis for Gate ${gateId}:**\n\n` +
           `📊 **Current Status:**\n` +
           `• Wait Time: ${waitTime} minutes\n` +
           `• Efficiency: ${efficiency}\n` +
           `• Capacity: ${capacity.toLocaleString()}/hour\n` +
           `• Event Phase: ${context.eventPhase}\n\n` +
           `🎯 **AI Recommendations:**\n${recommendations.map(r => `• ${r}`).join('\n')}\n\n` +
           `🔮 **Predictive Insights:**\n` +
           `• Peak time expected: ${getPeakTimePrediction(context.eventPhase)}\n` +
           `• Risk level: ${context.riskLevel}\n` +
           `• Weather impact: ${getWeatherImpact(context.weatherCondition)}\n\n` +
           `[View on Map] | [Detailed Report]`;
  };

  const generateGateRecommendations = (gateId: string, waitTime: number, _capacity: number, context: any): string[] => {
    const recommendations: string[] = [];
    
    if (waitTime > 20) {
      recommendations.push(`🚨 CRITICAL: Redirect 40% of crowd to alternative gates`);
      recommendations.push(`⚡ Open emergency lanes at Gate ${gateId}`);
      recommendations.push(`👥 Deploy 6 additional staff members`);
      recommendations.push(`📢 Announce delays via loudspeaker`);
    } else if (waitTime > 15) {
      recommendations.push(`⚠️ Redirect 25% of crowd to Gate ${getAlternativeGate(gateId)}`);
      recommendations.push(`🔧 Open additional screening lanes`);
      recommendations.push(`👥 Deploy 3 additional staff members`);
    } else if (waitTime > 8) {
      recommendations.push(`📈 Monitor closely - approaching capacity`);
      recommendations.push(`🔄 Prepare alternative gate routing`);
    } else {
      recommendations.push(`✅ Optimal performance - maintain current operations`);
    }
    
    // Weather-based recommendations
    if (context.rainProbability > 50) {
      recommendations.push(`🌧️ Weather alert: Prepare covered waiting areas`);
    }
    
    // Event phase recommendations
    if (context.eventPhase === 'Event Starting') {
      recommendations.push(`🎬 Pre-event rush expected - prepare for surge`);
    }
    
    return recommendations;
  };

  const getAlternativeGate = (currentGate: string): string => {
    const gates = ['A', 'B', 'C', 'D'];
    const alternatives = gates.filter(g => g !== currentGate);
    return alternatives[Math.floor(Math.random() * alternatives.length)];
  };

  const getPeakTimePrediction = (eventPhase: string): string => {
    const predictions = {
      'Pre-Event': 'Next 30 minutes',
      'Event Starting': 'Now - Next 15 minutes',
      'Event Active': 'Next 45 minutes',
      'Event Ending Soon': 'Next 20 minutes',
      'Event Ending': 'Now - Next 10 minutes'
    };
    return predictions[eventPhase as keyof typeof predictions] || 'Unknown';
  };

  const getWeatherImpact = (weatherCondition: string): string => {
    const impacts = {
      'Rain': 'High - expect indoor crowding',
      'Sunny': 'Low - normal operations',
      'Cloudy': 'Low - normal operations',
      'Storm': 'Critical - prepare for shelter'
    };
    return impacts[weatherCondition as keyof typeof impacts] || 'Unknown';
  };

  const handleWeatherIntelligence = (_question: string, _lowerQuestion: string, context: any): string => {
    const weatherCondition = context.weatherCondition;
    const temperature = context.temperature;
    const rainProbability = context.rainProbability;
    
    // AI Weather Analysis
    const weatherRisk = assessWeatherRisk(rainProbability, temperature, weatherCondition);
    const recommendations = generateWeatherRecommendations(weatherRisk, context);
    
    if (weatherRisk === 'High' || weatherRisk === 'Critical') {
      addAlert({
        title: 'AI Weather Intelligence Alert',
        message: `🌧️ Weather analysis: ${weatherRisk} risk detected. AI recommendations applied.`,
        severity: weatherRisk === 'Critical' ? 'critical' : 'warning',
        category: 'Weather',
        location: 'Stadium Grounds',
        actions: recommendations,
        mapLink: 'https://maps.google.com/?q=3.0480,101.6800'
      });
    }
    
    return `🌤️ **AI Weather Intelligence Report:**\n\n` +
           `📊 **Current Conditions:**\n` +
           `• Condition: ${weatherCondition}\n` +
           `• Temperature: ${temperature}°C\n` +
           `• Rain Probability: ${rainProbability}%\n` +
           `• Risk Level: ${weatherRisk}\n\n` +
           `🎯 **AI Recommendations:**\n${recommendations.map(r => `• ${r}`).join('\n')}\n\n` +
           `🔮 **Predictive Analysis:**\n` +
           `• Next 2 hours: ${getWeatherForecast(rainProbability)}\n` +
           `• Crowd impact: ${getCrowdWeatherImpact(weatherCondition)}\n` +
           `• Event phase: ${context.eventPhase}\n\n` +
           `📈 **Historical Data:**\n` +
           `• Similar events: 85% success rate in similar conditions\n` +
           `• Average delay: ${getAverageDelay(weatherCondition)} minutes`;
  };

  const assessWeatherRisk = (rainProbability: number, temperature: number, condition: string): string => {
    let riskScore = 0;
    
    if (rainProbability > 80) riskScore += 3;
    else if (rainProbability > 50) riskScore += 2;
    else if (rainProbability > 30) riskScore += 1;
    
    if (condition === 'Storm') riskScore += 3;
    else if (condition === 'Rain') riskScore += 2;
    
    if (temperature > 35 || temperature < 10) riskScore += 1;
    
    if (riskScore >= 5) return 'Critical';
    if (riskScore >= 3) return 'High';
    if (riskScore >= 1) return 'Medium';
    return 'Low';
  };

  const generateWeatherRecommendations = (weatherRisk: string, _context: any): string[] => {
    const recommendations: string[] = [];
    
    if (weatherRisk === 'Critical') {
      recommendations.push('🚨 EMERGENCY: Activate storm protocols immediately');
      recommendations.push('🏠 Move all crowd to covered areas');
      recommendations.push('📢 Announce shelter-in-place procedures');
      recommendations.push('🚑 Prepare emergency medical stations');
    } else if (weatherRisk === 'High') {
      recommendations.push('⚠️ Prepare for heavy rain - activate wet weather plan');
      recommendations.push('🌂 Deploy additional covered areas');
      recommendations.push('👥 Increase indoor capacity monitoring');
      recommendations.push('📱 Update attendees via mobile alerts');
    } else if (weatherRisk === 'Medium') {
      recommendations.push('📊 Monitor weather closely');
      recommendations.push('🔄 Prepare contingency plans');
      recommendations.push('📢 Brief staff on weather procedures');
    } else {
      recommendations.push('✅ Optimal weather conditions - normal operations');
    }
    
    return recommendations;
  };

  const getWeatherForecast = (rainProbability: number): string => {
    if (rainProbability > 70) return 'Heavy rain expected';
    if (rainProbability > 40) return 'Light rain possible';
    if (rainProbability > 20) return 'Cloudy with chance of rain';
    return 'Clear conditions expected';
  };

  const getCrowdWeatherImpact = (condition: string): string => {
    const impacts = {
      'Rain': 'High - expect 30% increase in indoor crowding',
      'Storm': 'Critical - expect 50% reduction in outdoor capacity',
      'Sunny': 'Low - normal outdoor operations',
      'Cloudy': 'Minimal - slight preference for covered areas'
    };
    return impacts[condition as keyof typeof impacts] || 'Unknown';
  };

  const getAverageDelay = (condition: string): string => {
    const delays = {
      'Rain': '15-25',
      'Storm': '30-45',
      'Sunny': '0-5',
      'Cloudy': '5-10'
    };
    return delays[condition as keyof typeof delays] || '10-15';
  };

  const handleCrowdIntelligence = (_question: string, _lowerQuestion: string, context: any): string => {
    const currentAttendance = realtimeData?.crowd.current_attendance || 0;
    const expectedAttendance = eventData?.expected_attendance || 0;
    const density = context.crowdDensity;
    const riskLevel = context.riskLevel;
    
    // AI Crowd Analysis
    const crowdTrend = analyzeCrowdTrend();
    const peakPrediction = predictPeakTimes(context.eventPhase);
    const recommendations = generateCrowdRecommendations(density, riskLevel, context);
    
    return `👥 **AI Crowd Intelligence Analysis:**\n\n` +
           `📊 **Current Metrics:**\n` +
           `• Attendance: ${currentAttendance.toLocaleString()} / ${expectedAttendance.toLocaleString()}\n` +
           `• Density: ${density} (${((currentAttendance / expectedAttendance) * 100).toFixed(1)}%)\n` +
           `• Risk Level: ${riskLevel}\n` +
           `• Trend: ${crowdTrend}\n\n` +
           `🎯 **AI Recommendations:**\n${recommendations.map(r => `• ${r}`).join('\n')}\n\n` +
           `🔮 **Predictive Insights:**\n` +
           `• Peak time: ${peakPrediction}\n` +
           `• Expected max: ${(expectedAttendance * 1.1).toLocaleString()} attendees\n` +
           `• Optimal capacity: ${(expectedAttendance * 0.8).toLocaleString()} attendees\n\n` +
           `📈 **Performance Metrics:**\n` +
           `• Flow efficiency: ${getFlowEfficiency(density)}%\n` +
           `• Safety margin: ${getSafetyMargin(density)}%\n` +
           `• Event phase: ${context.eventPhase}`;
  };

  const analyzeCrowdTrend = (): string => {
    // Simulate trend analysis
    const trends = ['Increasing', 'Stable', 'Decreasing', 'Fluctuating'];
    return trends[Math.floor(Math.random() * trends.length)];
  };

  const predictPeakTimes = (eventPhase: string): string => {
    const predictions = {
      'Pre-Event': 'Next 30-45 minutes',
      'Event Starting': 'Now - Next 20 minutes',
      'Event Active': 'Next 60 minutes',
      'Event Ending Soon': 'Next 15 minutes',
      'Event Ending': 'Now - Next 10 minutes'
    };
    return predictions[eventPhase as keyof typeof predictions] || 'Unknown';
  };

  const generateCrowdRecommendations = (density: string, riskLevel: string, _context: any): string[] => {
    const recommendations: string[] = [];
    
    if (density === 'Critical') {
      recommendations.push('🚨 CRITICAL: Implement crowd control measures immediately');
      recommendations.push('🚧 Close additional entrances to reduce inflow');
      recommendations.push('👥 Deploy maximum security personnel');
      recommendations.push('📢 Announce capacity warnings');
    } else if (density === 'High') {
      recommendations.push('⚠️ High density detected - prepare crowd control');
      recommendations.push('🔄 Optimize gate flow distribution');
      recommendations.push('👥 Increase security presence');
    } else if (density === 'Medium') {
      recommendations.push('📊 Monitor closely - approaching optimal capacity');
      recommendations.push('🔄 Prepare for potential surge');
    } else {
      recommendations.push('✅ Optimal crowd density - maintain current operations');
    }
    
    if (riskLevel === 'High') {
      recommendations.push('🔴 High risk conditions - activate safety protocols');
    }
    
    return recommendations;
  };

  const getFlowEfficiency = (density: string): string => {
    const efficiencies = {
      'Low': '95',
      'Medium': '85',
      'High': '70',
      'Critical': '45'
    };
    return efficiencies[density as keyof typeof efficiencies] || '80';
  };

  const getSafetyMargin = (density: string): string => {
    const margins = {
      'Low': '25',
      'Medium': '15',
      'High': '5',
      'Critical': '0'
    };
    return margins[density as keyof typeof margins] || '10';
  };

  const handlePredictiveIntelligence = (_question: string, _lowerQuestion: string, context: any): string => {
    const predictions = generatePredictiveInsights(context);
    
    return `🔮 **AI Predictive Intelligence Report:**\n\n` +
           `📊 **Event Timeline Predictions:**\n` +
           `• Current Phase: ${context.eventPhase}\n` +
           `• Next Critical Point: ${predictions.nextCriticalPoint}\n` +
           `• Peak Crowd Time: ${predictions.peakCrowdTime}\n` +
           `• Weather Impact: ${predictions.weatherImpact}\n\n` +
           `🎯 **Risk Predictions:**\n` +
           `• High Risk Window: ${predictions.highRiskWindow}\n` +
           `• Potential Bottlenecks: ${predictions.bottlenecks.join(', ')}\n` +
           `• Recommended Actions: ${predictions.recommendedActions.join(', ')}\n\n` +
           `📈 **Performance Forecast:**\n` +
           `• Expected Efficiency: ${predictions.efficiency}%\n` +
           `• Safety Score: ${predictions.safetyScore}/10\n` +
           `• Success Probability: ${predictions.successProbability}%`;
  };

  const generatePredictiveInsights = (context: any): any => {
    return {
      nextCriticalPoint: 'Next 45 minutes',
      peakCrowdTime: 'In 2 hours',
      weatherImpact: context.rainProbability > 50 ? 'High' : 'Low',
      highRiskWindow: 'Next 30 minutes',
      bottlenecks: ['Gate B', 'Food Court A', 'Main Concourse'],
      recommendedActions: ['Increase Gate B capacity', 'Prepare weather shelter', 'Deploy additional staff'],
      efficiency: 85,
      safetyScore: 8,
      successProbability: 92
    };
  };

  const generateIntelligentDefaultResponse = (_question: string, _lowerQuestion: string, context: any): string => {
    return `🤖 **AI Event Management Assistant**\n\n` +
           `I'm your intelligent event management AI, currently monitoring:\n\n` +
           `📊 **Current Status:**\n` +
           `• Event Phase: ${context.eventPhase}\n` +
           `• Crowd Density: ${context.crowdDensity}\n` +
           `• Risk Level: ${context.riskLevel}\n` +
           `• Weather: ${context.weatherCondition}\n\n` +
           `🎯 **I can help you with:**\n` +
           `• Gate congestion analysis and optimization\n` +
           `• Weather impact predictions\n` +
           `• Crowd flow optimization\n` +
           `• Emergency response planning\n` +
           `• Predictive analytics\n` +
           `• Performance optimization\n` +
           `• Real-time monitoring reports\n\n` +
           `💡 **Try asking:**\n` +
           `• "Analyze Gate B performance"\n` +
           `• "Predict crowd patterns"\n` +
           `• "Optimize gate flow"\n` +
           `• "Weather impact analysis"\n` +
           `• "Emergency preparedness report"`;
  };

  const handleEmergencyIntelligence = (_question: string, _lowerQuestion: string, context: any): string => {
    const emergencyLevel = assessEmergencyLevel(context);
    const evacuationPlan = generateEvacuationPlan(context);
    
    addAlert({
      title: 'AI Emergency Intelligence Alert',
      message: `🚨 Emergency analysis: ${emergencyLevel} level detected. AI evacuation plan activated.`,
      severity: 'critical',
      category: 'Emergency',
      location: 'All Areas',
      actions: evacuationPlan.actions,
      mapLink: 'https://maps.google.com/?q=3.0480,101.6800'
    });
    
    return `🚨 **AI Emergency Intelligence Report:**\n\n` +
           `📊 **Emergency Assessment:**\n` +
           `• Emergency Level: ${emergencyLevel}\n` +
           `• Risk Factors: ${evacuationPlan.riskFactors.join(', ')}\n` +
           `• Estimated Evacuation Time: ${evacuationPlan.estimatedTime}\n` +
           `• Capacity Status: ${context.crowdDensity}\n\n` +
           `🎯 **AI Evacuation Plan:**\n${evacuationPlan.actions.map((r: string) => `• ${r}`).join('\n')}\n\n` +
           `🔮 **Predictive Analysis:**\n` +
           `• Bottleneck Risk: ${evacuationPlan.bottleneckRisk}\n` +
           `• Weather Impact: ${getWeatherImpact(context.weatherCondition)}\n` +
           `• Success Probability: ${evacuationPlan.successProbability}%\n\n` +
           `📱 **Communication Protocol:**\n` +
           `• Staff notifications: Sent\n` +
           `• Public announcements: Activated\n` +
           `• Emergency services: Contacted\n` +
           `• Media updates: Prepared`;
  };

  const assessEmergencyLevel = (context: any): string => {
    let emergencyScore = 0;
    
    if (context.crowdDensity === 'Critical') emergencyScore += 3;
    if (context.riskLevel === 'High') emergencyScore += 2;
    if (context.weatherCondition === 'Storm') emergencyScore += 2;
    if (context.eventPhase === 'Event Starting') emergencyScore += 1;
    
    if (emergencyScore >= 5) return 'Critical';
    if (emergencyScore >= 3) return 'High';
    if (emergencyScore >= 1) return 'Medium';
    return 'Low';
  };

  const generateEvacuationPlan = (context: any): any => {
    const riskFactors = [];
    if (context.crowdDensity === 'Critical') riskFactors.push('High crowd density');
    if (context.weatherCondition === 'Storm') riskFactors.push('Severe weather');
    if (context.riskLevel === 'High') riskFactors.push('Multiple risk factors');
    
    return {
      actions: [
        '🚨 CRITICAL: Activate emergency evacuation protocol',
        '🚪 Use Emergency Exits D & E only (clearest paths)',
        '🚧 Clear Gate B for emergency vehicle access',
        '📢 Activate loudspeaker announcements system',
        '👥 Deploy maximum security personnel',
        '🚑 Prepare emergency medical stations',
        '📱 Coordinate with emergency services',
        '🔄 Implement crowd flow control measures'
      ],
      riskFactors,
      estimatedTime: context.crowdDensity === 'Critical' ? '25-35 minutes' : '15-20 minutes',
      bottleneckRisk: context.crowdDensity === 'Critical' ? 'High' : 'Medium',
      successProbability: context.crowdDensity === 'Critical' ? 85 : 95
    };
  };

  const handleTransportIntelligence = (_question: string, _lowerQuestion: string, context: any): string => {
    const transportStatus = realtimeData?.transport || [];
    const delayedTransport = transportStatus.filter(t => t.status === 'delayed');
    const transportAnalysis = analyzeTransportImpact(delayedTransport, context);
    
    if (delayedTransport.length > 0) {
      addAlert({
        title: 'AI Transport Intelligence Alert',
        message: `🚇 Transport analysis: ${transportAnalysis.impactLevel} impact detected. AI mitigation plan activated.`,
        severity: transportAnalysis.impactLevel === 'High' ? 'critical' : 'warning',
        category: 'Transport',
        location: 'Transport Hubs',
        actions: transportAnalysis.recommendations,
        mapLink: 'https://maps.google.com/?q=3.0470,101.6810'
      });
    }
    
    return `🚇 **AI Transport Intelligence Report:**\n\n` +
           `📊 **Transport Status:**\n` +
           `• Delayed Services: ${delayedTransport.length}\n` +
           `• Impact Level: ${transportAnalysis.impactLevel}\n` +
           `• Estimated Delay: ${transportAnalysis.averageDelay} minutes\n` +
           `• Affected Capacity: ${transportAnalysis.affectedCapacity}%\n\n` +
           `🎯 **AI Recommendations:**\n${transportAnalysis.recommendations.map((r: string) => `• ${r}`).join('\n')}\n\n` +
           `🔮 **Predictive Analysis:**\n` +
           `• Peak Impact Time: ${transportAnalysis.peakImpactTime}\n` +
           `• Crowd Redistribution: ${transportAnalysis.crowdRedistribution}\n` +
           `• Recovery Time: ${transportAnalysis.recoveryTime}\n\n` +
           `📈 **Performance Metrics:**\n` +
           `• Service Reliability: ${transportAnalysis.reliability}%\n` +
           `• Alternative Capacity: ${transportAnalysis.alternativeCapacity}%\n` +
           `• Success Probability: ${transportAnalysis.successProbability}%`;
  };

  const analyzeTransportImpact = (delayedTransport: any[], _context: any): any => {
    const totalDelays = delayedTransport.reduce((sum, t) => sum + (t.delay || 0), 0);
    const averageDelay = delayedTransport.length > 0 ? totalDelays / delayedTransport.length : 0;
    
    let impactLevel = 'Low';
    if (delayedTransport.length > 3 || averageDelay > 20) impactLevel = 'High';
    else if (delayedTransport.length > 1 || averageDelay > 10) impactLevel = 'Medium';
    
    const recommendations = [];
    if (impactLevel === 'High') {
      recommendations.push('🚨 CRITICAL: Activate emergency transport protocols');
      recommendations.push('🚌 Deploy maximum shuttle bus capacity');
      recommendations.push('🅿️ Extend parking capacity by 40%');
      recommendations.push('📢 Announce delays via all channels');
    } else if (impactLevel === 'Medium') {
      recommendations.push('⚠️ Activate shuttle bus service');
      recommendations.push('🅿️ Extend parking capacity by 20%');
      recommendations.push('📱 Update attendees via mobile alerts');
    } else {
      recommendations.push('✅ Monitor closely - minor delays detected');
    }
    
    return {
      impactLevel,
      averageDelay: averageDelay.toFixed(1),
      affectedCapacity: delayedTransport.length * 15,
      recommendations,
      peakImpactTime: 'Next 30-45 minutes',
      crowdRedistribution: '20% increase in parking usage',
      recoveryTime: '60-90 minutes',
      reliability: 85,
      alternativeCapacity: 75,
      successProbability: 90
    };
  };

  const handleOptimizationIntelligence = (_question: string, _lowerQuestion: string, context: any): string => {
    const optimizationPlan = generateOptimizationPlan(context);
    
    return `🎯 **AI Optimization Intelligence Report:**\n\n` +
           `📊 **Current Performance:**\n` +
           `• Overall Efficiency: ${optimizationPlan.currentEfficiency}%\n` +
           `• Bottlenecks Identified: ${optimizationPlan.bottlenecks.length}\n` +
           `• Optimization Potential: ${optimizationPlan.potential}%\n` +
           `• Priority Level: ${optimizationPlan.priority}\n\n` +
           `🎯 **AI Optimization Plan:**\n${optimizationPlan.recommendations.map((r: string) => `• ${r}`).join('\n')}\n\n` +
           `🔮 **Expected Improvements:**\n` +
           `• Efficiency Gain: +${optimizationPlan.efficiencyGain}%\n` +
           `• Wait Time Reduction: -${optimizationPlan.waitTimeReduction}%\n` +
           `• Safety Improvement: +${optimizationPlan.safetyImprovement}%\n` +
           `• Implementation Time: ${optimizationPlan.implementationTime}\n\n` +
           `📈 **ROI Analysis:**\n` +
           `• Cost Savings: ${optimizationPlan.costSavings}\n` +
           `• Customer Satisfaction: +${optimizationPlan.satisfactionGain}%\n` +
           `• Success Probability: ${optimizationPlan.successProbability}%`;
  };

  const generateOptimizationPlan = (context: any): any => {
    const bottlenecks = [];
    if (context.crowdDensity === 'High' || context.crowdDensity === 'Critical') {
      bottlenecks.push('Gate B congestion', 'Food court queues', 'Restroom wait times');
    }
    
    const recommendations = [
      '🔄 Implement dynamic gate routing algorithm',
      '👥 Optimize staff deployment based on real-time data',
      '📊 Deploy predictive analytics for crowd flow',
      '🚪 Open additional emergency exits during peak times',
      '🍔 Implement mobile ordering for food courts',
      '📱 Deploy smart signage with real-time updates'
    ];
    
    return {
      currentEfficiency: 75,
      bottlenecks,
      potential: 25,
      priority: context.crowdDensity === 'Critical' ? 'High' : 'Medium',
      recommendations,
      efficiencyGain: 20,
      waitTimeReduction: 35,
      safetyImprovement: 15,
      implementationTime: '2-4 hours',
      costSavings: '$15,000 per event',
      satisfactionGain: 30,
      successProbability: 88
    };
  };

  const handleAnalyticsIntelligence = (_question: string, _lowerQuestion: string, context: any): string => {
    const analyticsReport = generateAnalyticsReport(context);
    
    return `📊 **AI Analytics Intelligence Report:**\n\n` +
           `📈 **Performance Summary:**\n` +
           `• Event Phase: ${context.eventPhase}\n` +
           `• Overall Score: ${analyticsReport.overallScore}/100\n` +
           `• Efficiency Rating: ${analyticsReport.efficiencyRating}\n` +
           `• Safety Score: ${analyticsReport.safetyScore}/10\n` +
           `• Customer Satisfaction: ${analyticsReport.satisfaction}%\n\n` +
           `🎯 **Key Metrics:**\n` +
           `• Average Wait Time: ${analyticsReport.avgWaitTime} minutes\n` +
           `• Gate Utilization: ${analyticsReport.gateUtilization}%\n` +
           `• Crowd Flow Rate: ${analyticsReport.flowRate} people/hour\n` +
           `• Incident Rate: ${analyticsReport.incidentRate}%\n\n` +
           `🔮 **Trends & Insights:**\n` +
           `• Peak Performance Time: ${analyticsReport.peakTime}\n` +
           `• Bottleneck Patterns: ${analyticsReport.bottleneckPatterns.join(', ')}\n` +
           `• Weather Correlation: ${analyticsReport.weatherCorrelation}\n` +
           `• Improvement Opportunities: ${analyticsReport.improvements.join(', ')}\n\n` +
           `📊 **Benchmarking:**\n` +
           `• vs Industry Average: ${analyticsReport.vsIndustry}%\n` +
           `• vs Previous Events: ${analyticsReport.vsPrevious}%\n` +
           `• Best Practice Score: ${analyticsReport.bestPracticeScore}/100`;
  };

  const generateAnalyticsReport = (_context: any): any => {
    return {
      overallScore: 85,
      efficiencyRating: 'Good',
      safetyScore: 8,
      satisfaction: 87,
      avgWaitTime: 12,
      gateUtilization: 78,
      flowRate: 2400,
      incidentRate: 0.2,
      peakTime: '19:30-20:30',
      bottleneckPatterns: ['Gate B congestion', 'Food court queues'],
      weatherCorrelation: 'Strong correlation with indoor crowding',
      improvements: ['Dynamic routing', 'Staff optimization', 'Predictive alerts'],
      vsIndustry: '+15%',
      vsPrevious: '+8%',
      bestPracticeScore: 92
    };
  };

  const getSeverityEmoji = (severity?: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-300';
      case 'warning': return 'bg-yellow-100 border-yellow-300';
      case 'info': return 'bg-blue-100 border-blue-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between bg-white">
        <div className="flex items-center space-x-3">
          <Bot className="h-6 w-6 text-green-600" />
          <div>
            <h1 className="font-semibold text-base text-gray-900">AI Crowd Safety</h1>
            <p className="text-xs text-gray-500">Ops chat • {status === 'LIVE' ? 'LIVE' : 'SIMULATED'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleVoice}
            className={`p-2 rounded-md border ${voiceEnabled ? 'border-green-600 text-green-700' : 'border-red-600 text-red-700'}`}
            title={voiceEnabled ? 'Voice enabled' : 'Voice disabled'}
          >
            {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={!recognition}
            className={`p-2 rounded-md border ${isListening ? 'border-red-600 text-red-700' : 'border-gray-300 text-gray-700'} ${!recognition ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          {unreadCount > 0 && !isVisible && (
            <div className="bg-red-600 text-white rounded-full px-2 py-0.5 text-xs font-semibold">{unreadCount}</div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm shadow border ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white border-blue-700'
                  : message.type === 'alert'
                  ? `${getSeverityColor(message.severity)} text-gray-900 border`
                  : 'bg-green-50 text-gray-900 border-green-200'
              }`}
            >
              {message.type === 'alert' && (
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-base">{getSeverityEmoji(message.severity)}</span>
                  <span className="text-xs text-gray-600 flex items-center">
                    <Clock className="h-3 w-3 mr-1" /> {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              )}

              <p className={message.type === 'alert' ? 'font-medium' : ''}>{message.content}</p>

              {message.actions && message.actions.length > 0 && (
                <div className="mt-2 p-2 bg-white rounded border text-gray-700">
                  <p className="text-xs font-medium text-gray-600 mb-1">Action:</p>
                  <ul className="text-xs space-y-1">
                    {message.actions.map((action, index) => (
                      <li key={index} className="flex items-start"><span className="mr-1">•</span><span>{action}</span></li>
                    ))}
                  </ul>
                </div>
              )}

              {message.mapLink && (
                <button className="mt-2 flex items-center space-x-1 text-blue-700 hover:text-blue-900 text-xs">
                  <MapPin className="h-3 w-3" />
                  <span>View on Map</span>
                </button>
              )}

              {message.type !== 'alert' && (
                <p className="text-[10px] mt-1 text-gray-500">{message.timestamp.toLocaleTimeString()}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-white p-3">
        {(isListening || isSpeaking) && (
          <div className="mb-2 flex items-center justify-center">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-sm ${isListening ? 'border-red-600 text-red-700' : 'border-green-600 text-green-700'}`}>
              {isListening ? (<><Mic className="h-4 w-4" /><span>Listening...</span></>) : (<><Volume2 className="h-4 w-4" /><span>Speaking...</span></>)}
            </div>
          </div>
        )}
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={isListening ? 'Listening...' : 'Type here (e.g., Gate A is packed, It started raining)'}
            className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            disabled={isListening}
          />
          <button
            onClick={sendMessage}
            disabled={isListening}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {['Gate A is packed', 'It started raining', "What's the next plan?", 'Which exit is safest?'].map((q) => (
            <button
              key={q}
              onClick={() => { setInputMessage(q); setTimeout(() => sendMessage(), 50); }}
              disabled={isListening}
              className="text-xs border px-3 py-1 rounded-full text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Chatbot;