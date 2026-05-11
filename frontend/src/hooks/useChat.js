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
    // Keep loading:true until we receive actual content or an error
    setMessages(prev => [...prev, { role: 'assistant', content: '', id: assistantId, loading: true }]);
    setIsStreaming(true);

    let fullText = '';
    let hadError = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

      let res;
      try {
        res = await fetch(`${BACKEND}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            history: history.slice(-6), // last 6 messages only — keeps prompt size manageable
            api_key: apiKey,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

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
                // Clear loading indicator on first chunk of text
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: fullText, loading: false } : m
                ));
              }
              if (parsed.error) {
                hadError = true;
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, error: parsed.error, loading: false } : m
                ));
              }
            } catch {}
          }
        }
      }

      // Stream ended — if no content and no error received, show fallback
      if (!fullText && !hadError) {
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, error: 'لم يصل رد من الخادم — أعد المحاولة', loading: false }
            : m
        ));
        return;
      }

      // Ensure loading is cleared
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, loading: false } : m
      ));

      if (fullText) {
        setHistory(prev => [
          ...prev,
          { role: 'user', content: text },
          { role: 'assistant', content: fullText },
        ]);
      }

    } catch (err) {
      const isTimeout = err.name === 'AbortError';
      const errMsg = isTimeout
        ? 'انتهت مهلة الانتظار — الخادم قد يكون في وضع السكون. أعد المحاولة بعد 30 ثانية'
        : (err.message || 'خطأ في الاتصال');
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: '', error: errMsg, loading: false } : m
      ));
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, history]);

  return { messages, isStreaming, sendMessage };
}
