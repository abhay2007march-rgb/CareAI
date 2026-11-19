import React, { useState, useEffect, useRef } from "react";
import { sound } from "./audio";
import {
  IconCross,
  IconPlus,
  IconSidebar,
  IconArrowUp,
  IconDoc,
  IconTrash,
  IconVolume,
  IconVolumeMute,
  IconSpeaker,
  IconCopy,
  IconCheck,
  IconSun,
  IconMoon,
  IconChevronDown,
  IconWarning,
  IconInfo,
  IconUpload,
  IconPhone,
  IconSparkles,
  IconHeart,
  IconDroplet,
  IconPill,
  IconActivity,
  IconShield,
  IconClose
} from "./icons";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const DEFAULT_WELCOME = {
  role: "assistant",
  content:
    "Hello! I am CareAI, your educational health information companion. I can help explain medical concepts, summarize wellness topics, and answer questions using your uploaded health documents. \n\nHow may I assist your learning today?",
  sources: [],
  warning: null
};

const TOPICS = [
  {
    icon: IconHeart,
    color: "#FF2D55",
    category: "Cardiovascular",
    title: "Understanding Blood Pressure",
    prompt: "What is blood pressure, what do systolic and diastolic numbers mean, and what are healthy ranges?"
  },
  {
    icon: IconDroplet,
    color: "#007AFF",
    category: "Hydration",
    title: "Hydration & Electrolytes",
    prompt: "Explain the physiological importance of daily hydration and electrolyte balance for human energy and focus."
  },
  {
    icon: IconActivity,
    color: "#34C759",
    category: "Microbiology",
    title: "Virus vs. Bacteria",
    prompt: "What is the key biological difference between a virus and a bacterium, and why do antibiotics not treat viral infections?"
  },
  {
    icon: IconPill,
    color: "#AF52DE",
    category: "Medication",
    title: "Safe Medication Practices",
    prompt: "What are general safety rules for storing prescription medications and understanding prescription labels?"
  }
];

export default function App() {
  // Theme state
  const [theme, setTheme] = useState(() => {
    return (
      localStorage.getItem("careai_theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    );
  });

  // Sound state
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Layout states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Backend status
  const [backendHealth, setBackendHealth] = useState({ online: false, model: "" });

  // Multi-session chat
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem("careai_sessions");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      {
        id: "session-init",
        title: "Health Consultation",
        createdAt: Date.now(),
        messages: [DEFAULT_WELCOME]
      }
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    return (
      localStorage.getItem("careai_active_session") ||
      (sessions[0] ? sessions[0].id : "session-init")
    );
  });

  // Active chat session
  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0] || {
      id: "session-fallback",
      title: "New Consultation",
      createdAt: Date.now(),
      messages: [DEFAULT_WELCOME]
    };

  const messages = activeSession.messages;

  // Knowledge base files state
  const [indexedFiles, setIndexedFiles] = useState(() => {
    try {
      const saved = localStorage.getItem("careai_indexed_files");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Input & action states
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Sync theme to root class
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("careai_theme", theme);
  }, [theme]);

  // Persist sessions
  useEffect(() => {
    try {
      localStorage.setItem("careai_sessions", JSON.stringify(sessions));
      localStorage.setItem("careai_active_session", activeSessionId);
    } catch (e) {}
  }, [sessions, activeSessionId]);

  // Persist indexed files
  useEffect(() => {
    try {
      localStorage.setItem("careai_indexed_files", JSON.stringify(indexedFiles));
    } catch (e) {}
  }, [indexedFiles]);

  // Check backend health
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(`${API}/api/health`);
        if (res.ok) {
          const data = await res.json();
          setBackendHealth({ online: true, model: data.model || "Groq LLM" });
        } else {
          setBackendHealth({ online: false, model: "" });
        }
      } catch (e) {
        setBackendHealth({ online: false, model: "" });
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 25000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll on new messages with gentle spring-like behavior
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth"
    });
  }, [messages, busy]);

  // Dynamic textarea sizing
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  // Sound toggle
  function handleToggleSound() {
    const newState = sound.toggleSound();
    setSoundEnabled(newState);
  }

  // Create new conversation
  function handleNewChat() {
    sound.playTap();
    const newSession = {
      id: "session-" + Date.now(),
      title: "New Consultation",
      createdAt: Date.now(),
      messages: [DEFAULT_WELCOME]
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setInput("");
    if (window.innerWidth <= 840) {
      setSidebarOpen(false);
    }
  }

  // Delete conversation
  function handleDeleteSession(e, id) {
    e.stopPropagation();
    sound.playTap();
    if (sessions.length <= 1) {
      // Reset only session
      const resetSession = {
        id: "session-" + Date.now(),
        title: "Health Consultation",
        createdAt: Date.now(),
        messages: [DEFAULT_WELCOME]
      };
      setSessions([resetSession]);
      setActiveSessionId(resetSession.id);
      return;
    }

    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) {
      setActiveSessionId(filtered[0].id);
    }
  }

  // Update active session messages
  function updateMessages(updater) {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          const nextMsgs = typeof updater === "function" ? updater(s.messages) : updater;
          // Dynamically name session from first user query
          let title = s.title;
          if (title === "New Consultation" || title === "Health Consultation") {
            const firstUser = nextMsgs.find((m) => m.role === "user");
            if (firstUser) {
              title = firstUser.content.slice(0, 32).trim() + (firstUser.content.length > 32 ? "…" : "");
            }
          }
          return { ...s, messages: nextMsgs, title };
        }
        return s;
      })
    );
  }

  // Send message
  async function sendMessage(textToSend = input) {
    const question = textToSend.trim();
    if (!question || busy) return;

    sound.playSend();

    const history = messages.slice(-10).map(({ role, content }) => ({
      role,
      content
    }));

    updateMessages((old) => [...old, { role: "user", content: question }]);
    setInput("");
    setBusy(true);
    setNotice("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, history })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Request failed.");
      }

      if (data.warning) {
        sound.playAlert();
      } else {
        sound.playReceive();
      }

      updateMessages((old) => [
        ...old,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources || [],
          warning: data.warning || null
        }
      ]);
    } catch (error) {
      sound.playAlert();
      updateMessages((old) => [
        ...old,
        {
          role: "assistant",
          content: `Unable to process request: ${error.message}. Please verify the backend service is running.`
        }
      ]);
    } finally {
      setBusy(false);
    }
  }

  // Upload PDF file
  async function handleFileUpload(file) {
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      sound.playAlert();
      setNotice("Please select a valid PDF file.");
      return;
    }

    setUploading(true);
    setNotice(`Analyzing and indexing "${file.name}"…`);
    sound.playTap();

    const form = new FormData();
    form.append("file", file);

    try {
      const response = await fetch(`${API}/api/documents`, {
        method: "POST",
        body: form
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed.");
      }

      sound.playSuccess();
      setNotice(`"${data.filename}" successfully indexed (${data.chunks_indexed} passages).`);

      // Add to indexed documents list if not already present
      setIndexedFiles((prev) => {
        const existing = prev.filter((item) => item.name !== data.filename);
        return [
          {
            name: data.filename,
            chunks: data.chunks_indexed,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          },
          ...existing
        ];
      });
    } catch (error) {
      sound.playAlert();
      setNotice(error.message || "Failed to upload document.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  // Drag & drop handlers
  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!dragOver) setDragOver(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.relatedTarget === null || e.currentTarget === e.target) {
      setDragOver(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }

  // Copy message to clipboard
  function handleCopy(text, idx) {
    sound.playTap();
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1800);
  }

  // Text to Speech
  function handleSpeech(text, idx) {
    sound.playTap();
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (speakingIndex === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean markdown before speaking
    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/#{1,6}\s?/g, "")
      .replace(/\[Document:.*?\]/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);

    setSpeakingIndex(idx);
    window.speechSynthesis.speak(utterance);
  }

  // Toggle sources disclosure
  function toggleSources(idx) {
    sound.playTap();
    setExpandedSources((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  }

  // Form submission
  function handleSubmit(e) {
    e.preventDefault();
    sendMessage();
  }

  // Structured Markdown formatter for assistant responses
  function renderFormattedContent(text) {
    if (!text) return null;

    // Check if ends with standard disclaimer
    const disclaimerMarker = "educational health-information assistant";
    let mainContent = text;
    let disclaimerPart = null;

    const lower = text.toLowerCase();
    const discIndex = lower.indexOf(disclaimerMarker);
    if (discIndex !== -1) {
      // Find where disclaimer sentence starts
      const startOfSentence = text.lastIndexOf("\n\n", discIndex);
      if (startOfSentence !== -1) {
        mainContent = text.slice(0, startOfSentence).trim();
        disclaimerPart = text.slice(startOfSentence).trim();
      }
    }

    const paragraphs = mainContent.split(/\n\n+/);

    return (
      <div className="message-prose">
        {paragraphs.map((para, pIdx) => {
          // Check for bullet list
          if (para.includes("\n- ") || para.startsWith("- ") || para.includes("\n* ") || para.startsWith("* ")) {
            const lines = para.split("\n").filter((l) => l.trim().length > 0);
            return (
              <ul key={pIdx} className="prose-list">
                {lines.map((line, lIdx) => {
                  const cleaned = line.replace(/^[-*•]\s+/, "");
                  return (
                    <li key={lIdx} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(cleaned) }} />
                  );
                })}
              </ul>
            );
          }

          // Check for numbered list
          if (/^\d+\.\s/.test(para)) {
            const lines = para.split("\n").filter((l) => l.trim().length > 0);
            return (
              <ol key={pIdx} className="prose-numbered-list">
                {lines.map((line, lIdx) => {
                  const cleaned = line.replace(/^\d+\.\s+/, "");
                  return (
                    <li key={lIdx} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(cleaned) }} />
                  );
                })}
              </ol>
            );
          }

          // Check for headers
          if (para.startsWith("### ")) {
            return (
              <h4 key={pIdx} className="prose-heading-3">
                {para.replace("### ", "")}
              </h4>
            );
          }
          if (para.startsWith("## ")) {
            return (
              <h3 key={pIdx} className="prose-heading-2">
                {para.replace("## ", "")}
              </h3>
            );
          }

          // Regular paragraph
          return (
            <p
              key={pIdx}
              className="prose-paragraph"
              dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(para) }}
            />
          );
        })}

        {disclaimerPart && (
          <aside className="message-inline-disclaimer">
            <IconShield size={14} className="disclaimer-shield-icon" />
            <span>{disclaimerPart}</span>
          </aside>
        )}
      </div>
    );
  }

  // Format bold and code elements
  function formatInlineMarkdown(str) {
    return str
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  return (
    <div
      className={`apple-workspace ${dragOver ? "is-drag-active" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Full-screen PDF Drag & Drop Overlay */}
      {dragOver && (
        <div className="drag-backdrop">
          <div className="drag-sheet">
            <div className="drag-icon-pulse">
              <IconUpload size={38} />
            </div>
            <h3>Drop PDF to Index</h3>
            <p>Knowledge base will extract educational chunks instantly</p>
          </div>
        </div>
      )}

      {/* Main Apple Application Shell */}
      <div className={`apple-shell ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
        {/* Translucent Sidebar */}
        <aside className="apple-sidebar" aria-label="Navigation & History">
          {/* macOS Window Controls / Brand */}
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <div className="brand-symbol">
                <IconCross size={18} />
              </div>
              <div className="brand-meta">
                <span className="brand-title">CareAI</span>
                <span className="brand-subtitle">Health Intelligence</span>
              </div>
            </div>

            <button
              className="apple-icon-button"
              onClick={handleNewChat}
              title="New Consultation"
              aria-label="New Consultation"
            >
              <IconPlus size={16} />
            </button>
          </div>

          {/* Quick Action Button */}
          <div className="sidebar-actions">
            <button className="apple-prominent-button" onClick={handleNewChat}>
              <IconPlus size={16} />
              <span>New Health Query</span>
            </button>
          </div>

          {/* Section: Chat Sessions */}
          <div className="sidebar-scrollable">
            <div className="sidebar-section">
              <div className="section-label">CONSULTATIONS</div>
              <div className="session-list">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className={`session-item ${sess.id === activeSessionId ? "is-active" : ""}`}
                    onClick={() => {
                      sound.playTap();
                      setActiveSessionId(sess.id);
                      if (window.innerWidth <= 840) setSidebarOpen(false);
                    }}
                  >
                    <div className="session-icon">
                      <IconSparkles size={14} />
                    </div>
                    <span className="session-title" title={sess.title}>
                      {sess.title}
                    </span>
                    <button
                      className="session-delete"
                      onClick={(e) => handleDeleteSession(e, sess.id)}
                      title="Delete consultation"
                      aria-label="Delete consultation"
                    >
                      <IconTrash size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Section: Knowledge Base (RAG) */}
            <div className="sidebar-section">
              <div className="section-header-row">
                <div className="section-label">KNOWLEDGE BASE</div>
                <span className="badge-count">{indexedFiles.length}</span>
              </div>

              <div className="rag-card">
                <div className="rag-card-header">
                  <div className="rag-status-dot pulse-green" />
                  <span>RAG Engine Ready</span>
                </div>
                <p className="rag-card-desc">
                  Upload medical research or public health PDFs to augment responses with verified citations.
                </p>

                <button
                  className="apple-secondary-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <IconDoc size={15} />
                  <span>{uploading ? "Indexing PDF…" : "Add PDF Document"}</span>
                </button>

                {indexedFiles.length > 0 && (
                  <div className="indexed-list">
                    {indexedFiles.map((f, i) => (
                      <div key={i} className="indexed-file-chip" title={`${f.name} (${f.chunks} chunks)`}>
                        <IconDoc size={12} className="chip-doc-icon" />
                        <span className="chip-name">{f.name}</span>
                        <span className="chip-chunks">{f.chunks} ch</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Footnote: Privacy & Agency */}
            <div className="sidebar-footer">
              <div className="privacy-pill">
                <IconShield size={14} />
                <span>On-Device Privacy · Local RAG</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Floating Chat Content Panel */}
        <section className="apple-content" aria-label="CareAI Workspace">
          {/* Frosted Glass Navigation Bar */}
          <header className="apple-nav">
            <div className="nav-leading">
              <button
                className="apple-icon-button"
                onClick={() => {
                  sound.playTap();
                  setSidebarOpen(!sidebarOpen);
                }}
                title="Toggle Sidebar"
                aria-label="Toggle Sidebar"
              >
                <IconSidebar size={18} />
              </button>

              <div className="nav-title-block">
                <h1 className="nav-title">{activeSession.title}</h1>
                <div className="nav-status-indicator">
                  <span
                    className={`nav-status-dot ${backendHealth.online ? "is-online" : "is-offline"}`}
                  />
                  <span className="nav-status-text">
                    {backendHealth.online
                      ? `Active · ${backendHealth.model}`
                      : "Connecting to Backend…"}
                  </span>
                </div>
              </div>
            </div>

            <div className="nav-trailing">
              {/* Sound toggle */}
              <button
                className={`apple-icon-button ${!soundEnabled ? "is-muted" : ""}`}
                onClick={handleToggleSound}
                title={soundEnabled ? "Mute interface audio" : "Enable tactile audio"}
                aria-label="Toggle interface sounds"
              >
                {soundEnabled ? <IconVolume size={18} /> : <IconVolumeMute size={18} />}
              </button>

              {/* Theme toggle */}
              <button
                className="apple-icon-button"
                onClick={() => {
                  sound.playTap();
                  setTheme(theme === "dark" ? "light" : "dark");
                }}
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                aria-label="Toggle color theme"
              >
                {theme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
              </button>

              {/* Medical safety info sheet button */}
              <button
                className="apple-icon-button"
                onClick={() => {
                  sound.playTap();
                  setShowInfoSheet(true);
                }}
                title="Safety & Medical Standards"
                aria-label="Safety & Medical Standards"
              >
                <IconInfo size={18} />
              </button>
            </div>
          </header>

          {/* Medical Responsibility Banner */}
          <div className="apple-safety-strip">
            <div className="safety-strip-content">
              <span className="safety-badge">EDUCATIONAL GUIDANCE ONLY</span>
              <span className="safety-text">
                Not a licensed medical practitioner. In serious health emergencies in India, call{" "}
                <a href="tel:112" className="emergency-link">
                  <strong>112</strong>
                </a>{" "}
                immediately.
              </span>
            </div>
          </div>

          {/* Chat Stream Area */}
          <div className="apple-scroll-container">
            <div className="apple-stream">
              {/* Welcome Discovery Cards (shown when single message) */}
              {messages.length <= 1 && (
                <div className="discovery-hero">
                  <div className="discovery-icon-container">
                    <IconCross size={34} />
                  </div>
                  <h2 className="discovery-heading">CareAI Health Companion</h2>
                  <p className="discovery-subhead">
                    Clear, calm, evidence-informed health education. Explore everyday wellness topics or upload
                    clinical research PDFs for contextual synthesis.
                  </p>

                  <div className="discovery-grid">
                    {TOPICS.map((topic, i) => {
                      const IconComponent = topic.icon;
                      return (
                        <button
                          key={i}
                          className="discovery-card"
                          onClick={() => {
                            sound.playTap();
                            sendMessage(topic.prompt);
                          }}
                          disabled={busy}
                        >
                          <div className="card-top">
                            <span
                              className="card-category-pill"
                              style={{ color: topic.color, backgroundColor: `${topic.color}18` }}
                            >
                              <IconComponent size={13} />
                              {topic.category}
                            </span>
                            <span className="card-arrow">↗</span>
                          </div>
                          <strong className="card-title">{topic.title}</strong>
                          <p className="card-prompt">{topic.prompt}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Messages Thread */}
              {messages.map((msg, index) => {
                const isAssistant = msg.role === "assistant";
                const isWarning = Boolean(msg.warning);

                return (
                  <div
                    key={index}
                    className={`message-row ${isAssistant ? "row-assistant" : "row-user"} ${
                      isWarning ? "row-has-warning" : ""
                    }`}
                  >
                    {isAssistant && (
                      <div className="assistant-avatar">
                        <IconCross size={16} />
                      </div>
                    )}

                    <div className="bubble-wrapper">
                      {/* Emergency Warning Callout if triggered */}
                      {isWarning && (
                        <div className="emergency-callout">
                          <div className="callout-header">
                            <div className="callout-icon-pulse">
                              <IconWarning size={18} />
                            </div>
                            <span className="callout-title">URGENT MEDICAL ADVISORY</span>
                          </div>
                          <p className="callout-body">{msg.warning}</p>
                          <div className="callout-actions">
                            <a href="tel:112" className="emergency-call-btn" onClick={() => sound.playAlert()}>
                              <IconPhone size={15} />
                              <span>Dial Emergency 112</span>
                            </a>
                            <span className="callout-help-text">Seek immediate emergency medical care</span>
                          </div>
                        </div>
                      )}

                      {/* Main Message Bubble */}
                      <article className={`message-bubble ${isAssistant ? "bubble-glass" : "bubble-user"}`}>
                        {isAssistant ? (
                          renderFormattedContent(msg.content)
                        ) : (
                          <div className="user-message-content">{msg.content}</div>
                        )}
                      </article>

                      {/* Retrievable RAG Sources Disclosure */}
                      {isAssistant && msg.sources && msg.sources.length > 0 && (
                        <div className="sources-disclosure">
                          <button
                            className="sources-toggle-btn"
                            onClick={() => toggleSources(index)}
                            aria-expanded={expandedSources[index]}
                          >
                            <span className="sources-pill-tag">
                              <IconDoc size={12} />
                              <span>Verified Context</span>
                            </span>
                            <span className="sources-count">{msg.sources.length} document references</span>
                            <IconChevronDown
                              size={14}
                              className={`chevron-rotator ${expandedSources[index] ? "is-expanded" : ""}`}
                            />
                          </button>

                          {expandedSources[index] && (
                            <div className="sources-flyout">
                              {msg.sources.map((src, sIdx) => (
                                <div key={sIdx} className="source-card">
                                  <div className="source-card-header">
                                    <IconDoc size={13} />
                                    <strong>{src.document}</strong>
                                  </div>
                                  <p className="source-excerpt">"{src.excerpt}"</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Assistant Actions Bar (Copy / Speak) */}
                      {isAssistant && (
                        <div className="bubble-toolbar">
                          <button
                            className="toolbar-btn"
                            onClick={() => handleCopy(msg.content, index)}
                            title="Copy response"
                          >
                            {copiedIndex === index ? (
                              <>
                                <IconCheck size={13} className="text-green" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <IconCopy size={13} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          <button
                            className={`toolbar-btn ${speakingIndex === index ? "is-speaking" : ""}`}
                            onClick={() => handleSpeech(msg.content, index)}
                            title={speakingIndex === index ? "Stop voice narration" : "Read out loud"}
                          >
                            <IconSpeaker size={13} />
                            <span>{speakingIndex === index ? "Stop" : "Listen"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing / Reasoning Indicator */}
              {busy && (
                <div className="message-row row-assistant">
                  <div className="assistant-avatar">
                    <IconCross size={16} />
                  </div>
                  <div className="bubble-wrapper">
                    <div className="message-bubble bubble-glass typing-bubble">
                      <div className="spring-dots">
                        <span className="dot dot-1" />
                        <span className="dot dot-2" />
                        <span className="dot dot-3" />
                      </div>
                      <span className="typing-label">CareAI is synthesizing medical context…</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Floating VisionOS-Style Island Composer */}
          <footer className="composer-region">
            {notice && (
              <div className="floating-banner" role="status">
                <span>{notice}</span>
                <button className="banner-close" onClick={() => setNotice("")}>
                  ×
                </button>
              </div>
            )}

            <div className="composer-island">
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />

              {/* PDF Attachment Action */}
              <button
                type="button"
                className={`composer-attach-btn ${uploading ? "is-uploading" : ""}`}
                onClick={() => {
                  sound.playTap();
                  fileInputRef.current?.click();
                }}
                disabled={uploading}
                title="Attach PDF to RAG Knowledge Base"
                aria-label="Upload PDF"
              >
                <IconDoc size={18} />
                {uploading && <span className="attach-spinner" />}
              </button>

              {/* Elastic Resizing Form */}
              <form className="composer-form" onSubmit={handleSubmit}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Ask a health or medical question…"
                  rows={1}
                  maxLength={4000}
                  disabled={busy}
                />

                <button
                  type="submit"
                  className="composer-send-btn"
                  disabled={busy || !input.trim()}
                  aria-label="Send message"
                  onClick={() => sound.playTap()}
                >
                  <IconArrowUp size={18} />
                </button>
              </form>
            </div>

            <div className="composer-footnote">
              CareAI provides educational information, not personal medical diagnoses.
            </div>
          </footer>
        </section>
      </div>

      {/* Apple Presentation Sheet Modal: Safety & Standards */}
      {showInfoSheet && (
        <div
          className="apple-sheet-scrim"
          onClick={() => {
            sound.playTap();
            setShowInfoSheet(false);
          }}
        >
          <div
            className="apple-sheet-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="sheet-drag-handle" />

            <div className="sheet-header">
              <div className="sheet-icon-wrap">
                <IconShield size={24} />
              </div>
              <h3>CareAI Safety & Principles</h3>
              <button
                className="sheet-close-btn"
                onClick={() => {
                  sound.playTap();
                  setShowInfoSheet(false);
                }}
                aria-label="Close"
              >
                <IconClose size={18} />
              </button>
            </div>

            <div className="sheet-body">
              <div className="sheet-principle">
                <strong>1. Educational Objective</strong>
                <p>
                  CareAI is trained exclusively as an educational assistant. It provides health context, physiology
                  explanations, and literature synthesis. It never issues formal diagnoses, prescriptions, or clinical
                  treatment orders.
                </p>
              </div>

              <div className="sheet-principle">
                <strong>2. Triage & Emergency Safeguards</strong>
                <p>
                  Whenever symptoms matching acute distress (such as severe chest pain, stroke signs, anaphylaxis, or
                  uncontrolled bleeding) are detected, CareAI immediately displays emergency contact buttons for Indian
                  Emergency Services (112) and cautions against delaying in-person evaluation.
                </p>
              </div>

              <div className="sheet-principle">
                <strong>3. Grounded Retrieval (RAG)</strong>
                <p>
                  Uploaded PDF materials are chunked and matched vectorially on the backend. When excerpts inform an
                  answer, they are transparently attributed with document name and page indices.
                </p>
              </div>

              <div className="sheet-principle">
                <strong>4. Confidentiality & Architecture</strong>
                <p>
                  LLM queries are processed securely through the configured backend API. Documents reside on the local
                  server storage and are never publicly broadcast.
                </p>
              </div>
            </div>

            <div className="sheet-footer">
              <button
                className="sheet-done-btn"
                onClick={() => {
                  sound.playTap();
                  setShowInfoSheet(false);
                }}
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
