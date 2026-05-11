import { useEffect, useRef, useState, useCallback } from 'react';
import Header from './components/Header';
import WelcomeScreen from './components/WelcomeScreen';
import Message from './components/Message';
import InputArea from './components/InputArea';
import LoadingScreen from './components/LoadingScreen';
import { useChat } from './hooks/useChat';

const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

export default function App() {
  const chatRef = useRef(null);
  const { messages, isStreaming, sendMessage } = useChat();
  const [loading, setLoading] = useState(true);
  const [serverWaking, setServerWaking] = useState(false);

  // Wake-up check: ping server on load; if slow show banner
  const pingServer = useCallback(async () => {
    const slowTimer = setTimeout(() => setServerWaking(true), 2500);
    try {
      await fetch(`${BACKEND}/api/status`, { signal: AbortSignal.timeout(90000) });
    } catch {}
    clearTimeout(slowTimer);
    setServerWaking(false);
  }, []);

  useEffect(() => {
    const loadTimer = setTimeout(() => setLoading(false), 1800);
    pingServer();
    // Keep-alive: ping every 8 minutes to prevent Render spin-down
    const keepAlive = setInterval(() => {
      fetch(`${BACKEND}/api/status`).catch(() => {});
    }, 8 * 60 * 1000);
    return () => { clearTimeout(loadTimer); clearInterval(keepAlive); };
  }, [pingServer]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text) => sendMessage(text, '');
  const handleSuggestion = (text) => sendMessage(text, '');

  return (
    <>
      <LoadingScreen visible={loading} />
      <div className="flex flex-col h-screen max-w-3xl mx-auto font-arabic">
        <Header />

        {/* Server waking banner */}
        {serverWaking && (
          <div className="mx-4 mt-2 mb-1 px-4 py-2 rounded-lg text-sm text-center"
            style={{ background: 'rgba(180,140,60,0.18)', color: '#e8c96a', border: '1px solid rgba(180,140,60,0.3)' }}>
            ⏳ جارٍ تشغيل الخادم... قد يستغرق 30-60 ثانية في أول استخدام
          </div>
        )}

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
                id={msg.id}
              />
            ))
          )}
        </div>

        <InputArea
          onSend={handleSend}
          isStreaming={isStreaming}
          isConnected={!serverWaking}
        />
      </div>
    </>
  );
}
