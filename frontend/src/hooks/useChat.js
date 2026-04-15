import { useState, useCallback } from 'react';

const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [history, setHistory] = useState([]);

  const sendMessage = useCallback(async (text, apiKey) => {
    if (!text.trim() || isStreaming) return;

    const userMsg = { role: 'user', content: text, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    const assistantId = Date.now() + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '', id: assistantId, loading: true }]);
    setIsStreaming(true);

    let fullText = '';

    try {
      const res = await fetch(`${BACKEND}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: history.slice(-12),
          api_key: apiKey,
        }),
      });

      if (!res.ok) {
        let errMsg = `خطأ من السيرفر (${res.status})`;
        try { const d = await res.json(); errMsg = d.error || errMsg; } catch {}
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: '', error: errMsg, loading: false } : m
        ));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, loading: false } : m
      ));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sepIdx;
        while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
          const event = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + 2);

          for (const line of event.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullText += parsed.text;
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: fullText } : m
                ));
              }
              if (parsed.error) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, error: parsed.error } : m
                ));
              }
            } catch {}
          }
        }
      }

      setHistory(prev => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: fullText },
      ]);

    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: '', error: err.message, loading: false } : m
      ));
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, history]);

  return { messages, isStreaming, sendMessage };
}
