import React, { useState, useEffect, useRef } from 'react';
import { User, ConversationWithUser, Message } from '../types';
import { getUserConversations, getMessagesForConversation, sendMessage } from '../services/firebaseService';
import Spinner from './Spinner';
import { MessageCircleIcon } from './icons';

interface MessagesViewProps {
  user: User;
}

const MessagesView: React.FC<MessagesViewProps> = ({ user }) => {
  const [conversations, setConversations] = useState<ConversationWithUser[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoadingConversations(true);
        const convos = await getUserConversations(user.id);
        setConversations(convos);
        
        // Auto-select first conversation if available
        if (convos.length > 0) {
          setSelectedConversation(convos[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load conversations');
      } finally {
        setLoadingConversations(false);
      }
    };

    loadConversations();
  }, [user.id]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;

    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        const msgs = await getMessagesForConversation(selectedConversation.id);
        setMessages(msgs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [selectedConversation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedConversation) return;

    try {
      setSendingMessage(true);
      await sendMessage(selectedConversation.id, user.id, newMessageText.trim());
      
      // Add message to local state immediately for optimistic UI
      const newMessage: Message = {
        id: Date.now().toString(), // Temporary ID
        conversationId: selectedConversation.id,
        senderId: user.id,
        text: newMessageText.trim(),
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
      };
      setMessages([...messages, newMessage]);
      setNewMessageText('');
      
      // Reload messages to get real IDs and timestamps
      const msgs = await getMessagesForConversation(selectedConversation.id);
      setMessages(msgs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than 1 minute
    if (diff < 60000) return 'Just now';
    
    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }
    
    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }
    
    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}d ago`;
    }
    
    // Format as date
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  if (loadingConversations) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center text-gray-500">
        <MessageCircleIcon className="w-16 h-16 mb-4 text-gray-300" />
        <h3 className="text-xl font-semibold mb-2">No conversations yet</h3>
        <p className="text-sm">Start a conversation by clicking "Can you help?" on the ISO Board</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      {/* Conversations Sidebar */}
      <div className="w-full md:w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Messages</h2>
          <p className="text-xs text-gray-500">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.map((convo) => (
            <button
              key={convo.id}
              onClick={() => setSelectedConversation(convo)}
              className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition ${
                selectedConversation?.id === convo.id ? 'bg-teal-50 border-l-4 border-l-teal-600' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center font-bold text-teal-700 flex-shrink-0">
                  {convo.participant.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">{convo.participant.displayName}</h3>
                  <p className="text-sm text-gray-500 truncate">{convo.lastMessageText}</p>
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0">
                  {formatTimestamp(convo.updatedAt)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-gray-50 hidden md:flex">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center font-bold text-teal-700">
                {selectedConversation.participant.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">{selectedConversation.participant.displayName}</h3>
                <p className="text-xs text-gray-500">{selectedConversation.participant.email}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isSender = message.senderId === user.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl ${
                          isSender
                            ? 'bg-teal-600 text-white rounded-br-none'
                            : 'bg-white text-gray-800 rounded-bl-none shadow-sm'
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className={`text-xs mt-1 ${isSender ? 'text-teal-100' : 'text-gray-400'}`}>
                          {formatTimestamp(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200">
              {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Type a message..."
                  disabled={sendingMessage}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={!newMessageText.trim() || sendingMessage}
                  className="px-6 py-2 bg-teal-600 text-white font-medium rounded-full hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:bg-teal-300 disabled:cursor-not-allowed transition"
                >
                  {sendingMessage ? <Spinner /> : 'Send'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesView;
