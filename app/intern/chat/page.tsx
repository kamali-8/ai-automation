'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquareCode,
  Send,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  BookOpen,
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CurrentTask {
  id: string;
  title: string;
  taskTemplate: {
    instructions: string;
    learningObjective: string;
    expectedDeliverables: string;
  };
}

export default function InternChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [currentTask, setCurrentTask] = useState<CurrentTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [aiStatus, setAiStatus] = useState<{ available: boolean; error?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatContext();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadChatContext() {
    setInitialLoading(true);
    try {
      const [resDashboard, resAi] = await Promise.all([
        fetch('/api/intern/dashboard'),
        fetch('/api/ai/status'),
      ]);
      const dataDash = await resDashboard.json();
      const dataAi = await resAi.json();

      setAiStatus(dataAi);
      if (dataDash.currentTask) {
        setCurrentTask(dataDash.currentTask);
        // Initial greeting
        setMessages([
          {
            role: 'assistant',
            content: `Hello! I'm your AI Internship Mentor for **"${dataDash.currentTask.title}"**.\n\nI can explain task instructions in plain English, break them into step-by-step action items, explain relevant concepts, and clarify rubric expectations. What would you like help with?`,
          },
        ]);
      } else {
        setMessages([
          {
            role: 'assistant',
            content: `You currently do not have an active task assigned. Once a task is assigned, I can help explain instructions and guide your implementation.`,
          },
        ]);
      }
    } catch (err) {
      console.error('Error loading chat context:', err);
    } finally {
      setInitialLoading(false);
    }
  }

  async function sendMessage(questionText?: string) {
    const textToSend = questionText || input;
    if (!textToSend.trim() || !currentTask || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: textToSend.trim() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/intern/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: currentTask.id,
          question: textToSend.trim(),
          chatHistory: newHistory.slice(-6),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get AI response');

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply },
      ]);
      if (!data.available) {
        setAiStatus({ available: false, error: data.error });
      }
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `AI Mentor is currently offline or encountered an error. Here are your original task instructions:\n\n**${currentTask.title}**\n\n${currentTask.taskTemplate.instructions}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const quickPrompts = [
    'Break down this task into simple steps',
    'What key concepts should I understand first?',
    'What deliverables am I expected to submit?',
    'What are common pitfalls to avoid?',
  ];

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#29332B' }}>AI Task Mentor</h1>
        <p style={{ fontSize: '13px', color: '#69746B', marginTop: '2px' }}>
          Ask questions about your assigned milestone instructions, break down complex logic, or clarify concepts.
        </p>
      </div>

      {/* Offline Alert if Ollama is not connected */}
      {aiStatus && !aiStatus.available && (
        <div className="alert-banner alert-warning" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="#744210" />
            <div>
              <strong>Ollama Local AI is Offline:</strong>
              <div style={{ fontSize: '12px' }}>
                When Ollama is offline, the tutor will safely provide the original syllabus task instructions without fabricating responses.
              </div>
            </div>
          </div>
          <button
            onClick={loadChatContext}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11px' }}
          >
            <RefreshCw size={12} />
            <span>Check Connection</span>
          </button>
        </div>
      )}

      {/* Task Context Card */}
      {currentTask && (
        <div className="card" style={{ padding: '14px 20px', background: '#ffffff', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span style={{ fontSize: '11px', color: '#69746B', textTransform: 'uppercase', fontWeight: 600 }}>
              Current Milestone
            </span>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#29332B' }}>
              {currentTask.title}
            </div>
          </div>
          <Link href="/intern" style={{ fontSize: '12px', color: '#15803D', fontWeight: 600 }}>
            View Full Task & Submit →
          </Link>
        </div>
      )}

      {/* Quick Prompts */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => sendMessage(prompt)}
            disabled={loading || !currentTask}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '12px', borderRadius: '16px', padding: '5px 12px', backgroundColor: '#FAF8F1' }}
          >
            <Sparkles size={12} color="#15803D" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* Chat Window */}
      <div className="chat-window">
        <div className="chat-messages">
          {initialLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#69746B' }}>
              Loading task mentor context...
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`}>
                <div style={{ fontSize: '11px', color: '#69746B', marginBottom: '4px', fontWeight: 600 }}>
                  {msg.role === 'assistant' ? 'AI Mentor' : 'You'}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.content}</div>
              </div>
            ))
          )}
          {loading && (
            <div className="chat-bubble assistant" style={{ fontStyle: 'italic', color: '#69746B' }}>
              AI Mentor is thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="chat-input-bar"
        >
          <input
            type="text"
            className="form-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              currentTask
                ? `Ask about "${currentTask.title}"...`
                : 'No active task assigned'
            }
            disabled={loading || !currentTask}
            style={{ background: '#ffffff' }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !input.trim() || !currentTask}
          >
            <Send size={15} />
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
}

