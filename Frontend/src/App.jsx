import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  User,
  Bot,
  ClipboardCheck,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Stethoscope
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...args) => twMerge(clsx(args));

const API_BASE = 'http://localhost:8000';

function App() {
  const [screen, setScreen] = useState('welcome'); // welcome, chat, report
  const [name, setName] = useState('');
  const [threadId, setThreadId] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [finalReport, setFinalReport] = useState(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleStart = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_name: name }),
      });
      const data = await res.json();
      setThreadId(data.thread_id);
      setMessages([{ role: 'assistant', content: data.assistant_reply }]);
      setScreen('chat');
    } catch (err) {
      console.error("Failed to start session:", err);
      alert("Error starting session. Is the backend running?");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const userMsg = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { role: 'human', content: userMsg }]);
    setIsTyping(true);

    try {
      const res = await fetch(`${API_BASE}/session/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: userMsg,
          thread_id: threadId
        }),
      });
      const data = await res.json();

      setMessages(prev => [...prev, { role: 'assistant', content: data.assistant_reply }]);

      if (data.status === 'done') {
        fetchReport();
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsTyping(false);
    }
  };

  const fetchReport = async () => {
    setIsLoadingReport(true);
    setScreen('report');
    try {
      let status = 'not_ready';
      let attempts = 0;
      while (status !== 'ready' && attempts < 10) {
        const res = await fetch(`${API_BASE}/session/${threadId}/report`);
        const data = await res.json();
        status = data.status;
        if (status === 'ready') {
          setFinalReport(data.report);
          break;
        }
        await new Promise(r => setTimeout(r, 1000));
        attempts++;
      }
    } catch (err) {
      console.error("Failed to fetch report:", err);
    } finally {
      setIsLoadingReport(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {screen === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-10 rounded-3xl w-full max-w-md flex flex-col items-center text-center space-y-8"
          >
            <div className="bg-blue-500/10 p-5 rounded-3xl mb-2">
              <Stethoscope className="w-14 h-14 text-blue-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-800 dark:text-white">Wardly</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pre-visit Clinical Intake Agent</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs px-4">Please provide your name to begin a secure consultation session.</p>
            </div>

            <form onSubmit={handleStart} className="w-full space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl"
                  autoFocus
                />
              </div>
              <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl flex items-center justify-center gap-2 group hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30">
                Start Session
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </motion.div>
        )}

        {screen === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card rounded-[2rem] w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl relative overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-2xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 rotate-3">
                  <Bot className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 dark:text-white leading-tight">Clinical Assistant</h2>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Live Intake</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Patient</span>
                <span className="text-sm text-blue-500 font-bold">{name}</span>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth"
            >
              {messages.map((m, i) => (
                <div key={i} className={cn(
                  "flex items-end gap-3 max-w-[85%]",
                  m.role === 'human' ? "ml-auto flex-row-reverse" : "mr-auto"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                    m.role === 'human' ? "bg-slate-200 dark:bg-slate-700" : "bg-blue-600"
                  )}>
                    {m.role === 'human' ? <User className="w-5 h-5 text-slate-500 dark:text-slate-300" /> : <Bot className="w-5 h-5 text-white" />}
                  </div>
                  <div className={cn(
                    "px-5 py-4 rounded-3xl text-sm leading-relaxed",
                    m.role === 'human'
                      ? "glass-bubble-user rounded-br-none"
                      : "glass-bubble-ai rounded-bl-none text-slate-700 dark:text-slate-200"
                  )}>
                    {m.content}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-end gap-3 max-w-[85%] mr-auto">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="px-5 py-4 glass-bubble-ai rounded-3xl rounded-bl-none flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-6 border-t border-black/5 dark:border-white/10 bg-white/10 backdrop-blur-3xl px-8">
              <div className="relative flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Type your response here..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={isTyping}
                    className="w-full bg-white/50 dark:bg-black/20 border-slate-200 dark:border-white/5 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 pr-14 py-4 rounded-2xl"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isTyping}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white disabled:opacity-50 disabled:bg-slate-500 transition-all shadow-lg shadow-blue-500/20"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mt-4 text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-widest text-center">Protected Session • Wardly Medical Core</span>
              </div>
            </form>
          </motion.div>
        )}

        {screen === 'report' && (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl space-y-8"
          >
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setScreen('welcome')}
                className="bg-transparent border-none text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-2 font-bold text-sm tracking-tight"
              >
                <ArrowLeft className="w-4 h-4" /> Start New Consultation
              </button>
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs font-bold uppercase tracking-widest bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20">
                <ClipboardCheck className="w-4 h-4" /> Clinical Note Finalized
              </div>
            </div>

            {isLoadingReport ? (
              <div className="glass-card rounded-[2.5rem] p-32 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse" />
                  <Loader2 className="w-16 h-16 text-blue-600 animate-spin relative" />
                </div>
                <div className="text-center">
                  <p className="text-slate-800 dark:text-white font-bold text-lg">Analyzing Transcript</p>
                  <p className="text-slate-400 text-sm">Summarizing clinical history...</p>
                </div>
              </div>
            ) : finalReport ? (
              <div className="space-y-8 pb-20">
                <div className="glass-card p-10 rounded-[2.5rem] overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-8">
                    <Stethoscope className="w-32 h-32 text-blue-500/5 -rotate-12" />
                  </div>

                  <div className="relative">
                    <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-4">
                      {finalReport.report_title || "Clinical Brief"}
                    </h3>

                    {finalReport.report_summary && (
                      <div className="relative">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-full" />
                        <p className="text-slate-600 dark:text-slate-300 text-base pl-6 py-2 leading-relaxed">
                          {finalReport.report_summary}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-12 grid grid-cols-1 gap-10">
                    {finalReport.sections?.map((section, idx) => (
                      <section key={idx} className="relative">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <h4 className="text-xs uppercase tracking-[0.2em] text-slate-400 font-black">
                            {section.section_title}
                          </h4>
                        </div>
                        <div className={cn(
                          "p-8 rounded-3xl text-sm leading-[1.8] shadow-sm border",
                          section.section_title === 'Chief Complaint'
                            ? "bg-blue-500/5 italic border-blue-500/10 text-slate-700 dark:text-blue-100 font-medium text-lg"
                            : "bg-white/40 dark:bg-black/20 border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-300"
                        )}>
                          {section.section_text || "Clinician evaluation recommended."}
                        </div>
                      </section>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center gap-6">
                  <button onClick={() => window.print()} className="px-8 py-4 bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 transition-all shadow-xl rounded-2xl">
                    Export to PDF
                  </button>
                  <button onClick={() => setScreen('welcome')} className="px-10 py-4 bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-500/30 rounded-2xl">
                    Close Case
                  </button>
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-[2rem] p-20 text-center text-slate-500 space-y-4">
                <p className="text-xl font-bold">System Error</p>
                <p>We encountered an issue preparing your report.</p>
                <button onClick={() => setScreen('welcome')} className="bg-blue-600 mt-4 px-8 py-3 rounded-xl">Try Again</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
