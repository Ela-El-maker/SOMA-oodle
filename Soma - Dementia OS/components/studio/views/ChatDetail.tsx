import * as React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone, Video, Info, Image as ImageIcon, Mic, Sticker, Heart } from 'lucide-react';
import { ChatSession, ChatMessage } from '../../../types';

interface Props {
  chat: ChatSession;
  onBack: () => void;
  currentUserAvatar: string;
}

const ChatDetail: React.FC<Props> = ({ chat, onBack, currentUserAvatar }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'other',
      text: "Did you see the new update?",
      timestamp: '10:02 AM',
      avatar: chat.image
    },
    {
      id: '2',
      sender: 'user',
      text: "Yeah looks amazing! The dark mode is perfect.",
      timestamp: '10:05 AM',
    },
    {
      id: '3',
      sender: 'other',
      text: "Sending you the files now.",
      timestamp: '10:11 AM',
      avatar: chat.image
    },
  ]);
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
      if(!inputText.trim()) return;
      const newMsg: ChatMessage = {
          id: Date.now().toString(),
          sender: 'user',
          text: inputText,
          timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };
      setMessages([...messages, newMsg]);
      setInputText('');
  };

  const handleAction = (action: string) => {
      alert(`${action} triggered (Placeholder)`);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black z-50">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="text-white p-1 -ml-1 hover:opacity-70 transition-opacity">
                    <ArrowLeft size={28} />
                </button>
                <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                    <img src={chat.image} className="w-8 h-8 rounded-full object-cover" alt="Avatar" />
                    <div className="flex flex-col justify-center">
                        <span className="text-[15px] font-semibold leading-none">{chat.title}</span>
                        <span className="text-[12px] text-white/50 leading-none mt-1 font-normal">Active 1h ago</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-6 pr-1">
                <button onClick={() => handleAction('Voice Call')} className="hover:opacity-70 transition-opacity">
                    <Phone size={26} strokeWidth={1.5} />
                </button>
                <button onClick={() => handleAction('Video Call')} className="hover:opacity-70 transition-opacity">
                    <Video size={28} strokeWidth={1.5} />
                </button>
            </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 pb-28">
            <div className="text-center text-[11px] font-medium text-white/40 my-4">Today</div>
            
            {messages.map((msg) => (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id} 
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2 mb-0.5`}
                >
                    {msg.sender === 'other' && (
                        <img src={chat.image} className="w-7 h-7 rounded-full object-cover mb-1" />
                    )}
                    
                    <div 
                        className={`max-w-[70%] px-4 py-2.5 text-[15px] leading-snug rounded-[22px] font-normal
                            ${msg.sender === 'user' 
                                ? 'bg-[#3797F0] text-white rounded-br-md' 
                                : 'bg-[#262626] text-white rounded-bl-md'
                            }`}
                    >
                        {msg.text}
                    </div>
                </motion.div>
            ))}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-black z-50 flex items-center gap-3 pb-8">
             {/* Camera Button */}
             <button 
                onClick={() => handleAction('Camera')}
                className="w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center shrink-0 active:scale-95 transition-transform cursor-pointer group"
             >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-500 p-[2px]">
                    <div className="w-full h-full bg-black rounded-full flex items-center justify-center border-2 border-transparent">
                        <div className="w-full h-full bg-[#262626] rounded-full group-hover:bg-[#333] transition-colors"></div>
                    </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                </div>
             </button>
             
             {/* Input Pill */}
             <div className="flex-1 bg-[#262626] rounded-full h-11 flex items-center px-4 gap-2 transition-all">
                 <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Message..."
                    className="flex-1 bg-transparent border-none text-white focus:outline-none placeholder:text-white/50 text-[15px] h-full"
                 />
                 
                 {inputText ? (
                     <button onClick={handleSend} className="text-[#3797F0] font-semibold text-[15px] ml-2 hover:text-[#3797F0]/80 transition-colors">
                        Send
                     </button>
                 ) : (
                     <div className="flex items-center gap-3 text-white">
                         <button onClick={() => handleAction('Mic')} className="p-1 hover:opacity-70 transition-opacity">
                            <Mic size={22} strokeWidth={1.5} />
                         </button>
                         <button onClick={() => handleAction('Gallery')} className="p-1 hover:opacity-70 transition-opacity">
                            <ImageIcon size={22} strokeWidth={1.5} />
                         </button>
                         <button onClick={() => handleAction('Sticker')} className="p-1 hover:opacity-70 transition-opacity">
                            <Sticker size={22} strokeWidth={1.5} />
                         </button>
                     </div>
                 )}
             </div>
             
             {/* Heart Button (Only visible if not typing) */}
             {!inputText && (
                <button onClick={() => handleAction('Like')} className="p-1 hover:opacity-70 transition-opacity">
                    <Heart size={26} strokeWidth={1.5} />
                </button>
             )}
        </div>
    </div>
  );
};

export default ChatDetail;




