import React from "react";
import { IoPerson } from "react-icons/io5";

interface Message {
    id: string;
    text: string;
    isSee: boolean; // "isCurrentUser" check logic
    timestamp: number;
    senderAvatar?: string;
}

interface BrainRotChatBubbleProps {
    message: Message;
    isCurrentUser: boolean;
}

export default function BrainRotChatBubble({ message, isCurrentUser }: BrainRotChatBubbleProps) {
    return (
        <div className={`flex w-full mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
            {!isCurrentUser && (
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex items-center justify-center mr-2 self-end">
                    {message.senderAvatar ? (
                        <img src={message.senderAvatar} className="w-full h-full object-cover" />
                    ) : (
                        <IoPerson className="w-4 h-4 text-zinc-400" />
                    )}
                </div>
            )}

            <div
                className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${isCurrentUser
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-zinc-100 dark:bg-zinc-800 dark:text-white rounded-bl-none'
                    }`}
            >
                {message.text}
            </div>
        </div>
    );
}



