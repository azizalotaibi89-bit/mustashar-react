import { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import WelcomeScreen from './components/WelcomeScreen';
import Message from './components/Message';
import InputArea from './components/InputArea';
import SettingsModal from './components/SettingsModal';
import { useChat } from './hooks/useChat';

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('mustashar_api_key') || '');
  const [hasServerKey, setHasServerKey] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const chatRef = useRef(null);

  const { messages, isStreaming, sendMessage } = useChat();

  const isConnected = !!(apiKey || hasServerKey);

  // Check if server has its own API key
  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(d => setHasServerKey(d.has_server_key || false))
      .catch(() => {});
  }, []);

  // Auto-open settings if not connected
  useEffect(() => {
    if (!isConnected) setTimeout(() => setSettingsOpen(true), 500);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSaveKey = (key) => {
    setApiKey(key);
    localStorage.setItem('mustashar_api_key', key);
  };

  const handleSend = (text) => {
    if (!isConnected) { setSettingsOpen(true); return; }
    sendMessage(text, apiKey);
  };

  const handleSuggestion = (text) => {
    if (!isConnected) { setSettingsOpen(true); return; }
    sendMessage(text, apiKey);
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto font-arabic">
      <Header isConnected={isConnected} onOpenSettings={() => setSettingsOpen(true)} />

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
        isConnected={isConnected}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveKey}
        currentKey={apiKey}
      />
    </div>
  );
}
