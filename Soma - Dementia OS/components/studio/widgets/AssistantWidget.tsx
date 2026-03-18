import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { WidgetData } from '../../../types';
import { Bot, Send, Loader2 } from 'lucide-react';
import { chatWithAgent } from '../../../services/geminiService';

interface Props {
    data: WidgetData;
}

const AssistantWidget: React.FC<Props> = ({ data }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
      { role: 'ai', text: 'Hello. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
      if (!input.trim()) return;
      
      const userMsg = input;
      setInput('');
      setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setIsThinking(true);

      const response = await chatWithAgent(userMsg);
      
      setIsThinking(false);
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
  };

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-white/[0.02] to-transparent relative">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Bot size={16} className="text-white/70" />
                <span className="text-sm font-medium text-white/90">Assistant</span>
            </div>
        </div>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
            {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                        msg.role === 'user' 
                        ? 'bg-white text-black' 
                        : 'bg-white/5 text-white/80 border border-white/5'
                    }`}>
                        {msg.text}
                    </div>
                </div>
            ))}
            {isThinking && (
                 <div className="flex justify-start">
                    <div className="bg-white/5 rounded-2xl px-3 py-2">
                        <Loader2 size={12} className="animate-spin text-white/40" />
                    </div>
                </div>
            )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-white/5 flex gap-2">
            <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask anything..."
                className="flex-1 bg-white/5 border border-white/5 rounded-full px-4 py-2 text-xs text-white focus:outline-none focus:bg-white/10 transition-colors placeholder:text-white/20"
            />
            <button 
                onClick={handleSend}
                disabled={isThinking}
                className="p-2 rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-50 transition-colors"
            >
                <Send size={12} />
            </button>
        </div>
    </div>
  );
};

export default AssistantWidget;




