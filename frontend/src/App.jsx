import { useEffect, useRef } from 'react';
import Header from './components/Header';
import WelcomeScreen from './components/WelcomeScreen';
import Message from './components/Message';
import InputArea from './components/InputArea';
import { useChat } from './hooks/useChat';

export default function App() {
  const chatRef = useRef(null);
  const { messages, isStreaming, sendMessage } = useChat();

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text) => sendMessage(text, '');
  const handleSuggestion = (text) => sendMessage(text, '');

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto font-arabic">
      <Header />

      {/* Chat area */}
      <div ref={chatRef} className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth">
        {messages.length === 0 ? (
          <WelcomeScreen onSuggestion={handleSuggestion} />
        ) : (
          messages.map(msg => (
            <Message
              key={msg.id}
              role={msg.role}
              content={msg.content}
              error={msg.error}
              loading={msg.loading}
            />
          ))
        )}
      </div>

      <InputArea
        onSend={handleSend}
        isStreaming={isStreaming}
        isConnected={true}
      />
    </div>
  );
}
