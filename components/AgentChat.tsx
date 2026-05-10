"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Mic, MicOff, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  userLat?: number;
  userLng?: number;
}

export default function AgentChat({ userLat = 1.3521, userLng = 103.8198 }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Greeting when opened
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Hi! I'm CareMap. Ask me to find toilets, medical facilities, or accessible routes — in any language! 😊\n\nHi! ฉันคือ CareMap ถามฉันเกี่ยวกับห้องน้ำ สิ่งอำนวยความสะดวก หรือเส้นทางได้เลย! 🗺️",
      }]);
    }
  }, [open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6),
          userLat,
          userLng,
        }),
      });
      const data = await res.json() as any;
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);

      // TTS using Web Speech API
      if ("speechSynthesis" in window && data.response) {
        const utterance = new SpeechSynthesisUtterance(data.response);
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I had trouble connecting. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Voice input not supported on this browser.");
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = ""; // empty = auto-detect language

    recognition.onstart = () => setListening(true);
    recognition.onend   = () => setListening(false);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      sendMessage(transcript);
    };
    recognition.start();
    recognitionRef.current = recognition;
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-20 right-4 z-40 w-14 h-14 bg-brand-500 rounded-full shadow-xl flex items-center justify-center text-white hover:bg-brand-600 active:scale-95 transition-all"
        title="Ask CareMap"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col" style={{ maxHeight: "70vh" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center">
            <MessageCircle size={16} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-800">CareMap Assistant</p>
            <p className="text-[10px] text-brand-500">EN · 中文 · ภาษาไทย · Filipino · தமிழ்</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
          <X size={16} className="text-gray-600" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-brand-500 text-white rounded-tr-sm"
                : "bg-gray-100 text-gray-800 rounded-tl-sm"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm">
              <Loader2 size={16} className="animate-spin text-brand-500" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage(input)}
          placeholder="Ask in any language..."
          className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-brand-400 transition-all"
        />
        <button
          onClick={startListening}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            listening ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {listening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center disabled:opacity-40 hover:bg-brand-600 transition-all"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}