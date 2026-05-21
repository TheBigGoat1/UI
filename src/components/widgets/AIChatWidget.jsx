import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react';

const AIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: 'Hello. I\'m Insidr AI. Ask about macro conditions, sentiment, or any active trade setup.' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // 1. Add user message
    const userMsg = { id: Date.now(), sender: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // 2. Mock the AI response (Wire this up to your real LLM backend later)
    setTimeout(() => {
      const aiMsg = { 
        id: Date.now() + 1, 
        sender: 'ai', 
        text: "I've analyzed the recent price action and macro catalysts. The current environment suggests elevated volatility. I recommend tightening stops on your USD exposure." 
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* The Expanded Chat Panel */}
      {isOpen && (
        <div className="mb-4 w-[350px] sm:w-[400px] h-[500px] max-h-[70vh] glass-panel rounded-2xl shadow-card flex flex-col overflow-hidden animate-fade-in border-primary/20">
          
          {/* Chat Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-background/50 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/20 rounded-md border border-primary/30">
                <Sparkles className="text-primary w-4 h-4" />
              </div>
              <span className="font-bold text-text-main text-sm">Insidr AI</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-text-muted hover:text-text-main hover:bg-surface-hover p-1 rounded transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className="shrink-0">
                  {msg.sender === 'ai' ? (
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Bot size={16} className="text-primary" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-surface-hover border border-border flex items-center justify-center">
                      <User size={16} className="text-text-main" />
                    </div>
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
                  msg.sender === 'user' 
                    ? 'bg-primary text-white rounded-tr-sm' 
                    : 'bg-surface-hover border border-border text-text-main rounded-tl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Bot size={16} className="text-primary" />
                </div>
                <div className="px-4 py-3 bg-surface-hover border border-border rounded-2xl rounded-tl-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-background/50 border-t border-border">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about market conditions..."
                className="w-full bg-surface border border-border focus:border-primary text-text-main text-sm rounded-xl pl-4 pr-12 py-3 outline-none transition-colors"
              />
              <button 
                type="submit"
                disabled={!input.trim()}
                className="absolute right-2 p-1.5 bg-primary hover:bg-primary/90 disabled:bg-surface-hover text-white disabled:text-text-muted rounded-lg transition-colors"
              >
                <Send size={16} />
              </button>
            </form>
          </div>

        </div>
      )}

      {/* The Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 btn-primary rounded-full shadow-glow-primary flex items-center justify-center !p-0"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
};

export default AIChatWidget;
