
import { useEffect, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I'm CareAI, an educational health-information assistant. I can explain general health topics and help you understand public educational documents. I cannot diagnose or prescribe. What would you like to learn about?"
    }
  ]);

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");

  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  // FIXED: useEffect no longer implicitly returns a value.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, busy]);

  // Send chat message
  async function sendMessage(text = input) {
    const question = text.trim();

    if (!question || busy) return;

    const history = messages.slice(-10).map(({ role, content }) => ({
      role,
      content
    }));

    setMessages((old) => [
      ...old,
      { role: "user", content: question }
    ]);

    setInput("");
    setBusy(true);
    setNotice("");

    try {
      const response = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: question,
          history
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Request failed.");
      }

      setMessages((old) => [
        ...old,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources || [],
          warning: data.warning || null
        }
      ]);
    } catch (error) {
      setMessages((old) => [
        ...old,
        {
          role: "assistant",
          content: `Sorry, I couldn't complete that request. ${error.message}`
        }
      ]);
    } finally {
      setBusy(false);
    }
  }

  // Upload PDF document
  async function uploadPdf(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploading(true);
    setNotice("");

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

      setNotice(
        `${data.filename} added to the local knowledge base (${data.chunks_indexed} text chunks).`
      );
    } catch (error) {
      setNotice(error.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  // Handle form submission
  function handleSubmit(event) {
    event.preventDefault();
    sendMessage();
  }

  return (
    <main className="app-shell">

      {/* Sidebar */}
      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">✚</div>

          <div>
            <strong>CareAI</strong>
            <span>Health information assistant</span>
          </div>
        </div>

        <div className="side-label">
          YOUR ASSISTANT
        </div>

        <div className="side-item active">
          ◉ <span>New conversation</span>
        </div>

        <div className="side-note">
          <strong>Designed for learning</strong>

          <p>
            Ask general health questions or upload a
            public educational PDF to explore its contents.
          </p>
        </div>

        <div className="privacy-note">
          🔒 Your API key stays on the backend.
          Uploaded files are stored locally in this demo.
        </div>

      </aside>

      {/* Chat panel */}
      <section className="chat-panel">

        <header className="topbar">

          <div>
            <div className="eyebrow">
              GENERATIVE AI · RAG
            </div>

            <h1>Medical Assistant</h1>
          </div>

          <div className="status">
            <span className="status-dot" />
            AI assistant
          </div>

        </header>

        {/* Medical disclaimer */}
        <div className="notice-banner">
          <strong>Important:</strong> Educational use only.
          Not a doctor, diagnosis, or emergency service.
          For an emergency in India, call <strong>112</strong>.
        </div>

        {/* Messages */}
        <div className="messages">

          <div className="welcome">

            <div className="welcome-icon">✚</div>

            <h2>How can I help you learn today?</h2>

            <p>
              Ask a general health question or explore
              an uploaded educational document.
            </p>

            <div className="suggestions">

              {[
                "What is blood pressure?",
                "Explain the importance of hydration",
                "What is the difference between a virus and bacteria?"
              ].map((q) => (
                <button
                  key={q}
                  className="suggestion"
                  onClick={() => sendMessage(q)}
                  disabled={busy}
                >
                  {q} <span>↗</span>
                </button>
              ))}

            </div>

          </div>

          {messages.map((message, index) => (

            <article
              className={`message ${message.role}`}
              key={index}
            >

              <div className="avatar">
                {message.role === "assistant" ? "✚" : "You"}
              </div>

              <div className="message-body">

                <div className="message-name">
                  {message.role === "assistant" ? "CareAI" : "You"}
                </div>

                <div className="message-text">
                  {message.content}
                </div>

                {message.warning && (
                  <div className="warning">
                    {message.warning}
                  </div>
                )}

                {message.sources?.length > 0 && (

                  <div className="sources">

                    <strong>Retrieved document context</strong>

                    {message.sources.map((source, i) => (

                      <div className="source" key={i}>

                        <b>{source.document}</b>

                        <p>{source.excerpt}</p>

                      </div>

                    ))}

                  </div>

                )}

              </div>

            </article>

          ))}

          {busy && (

            <div className="typing">
              <span />
              <span />
              <span />

              <small>
                CareAI is preparing an answer…
              </small>
            </div>

          )}

          <div ref={bottomRef} />

        </div>

        {/* Composer */}
        <div className="composer-wrap">

          {notice && (
            <div className="upload-notice">
              {notice}
            </div>
          )}

          <div className="upload-row">

            <button
              className="upload-button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading
                ? "Adding PDF…"
                : "＋ Add a PDF to knowledge base"}
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              hidden
              onChange={uploadPdf}
            />

            <span>
              PDF only · Max 10 MB · Use public, non-sensitive files
            </span>

          </div>

          <form
            className="composer"
            onSubmit={handleSubmit}
          >

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask a general health-information question…"
              rows="1"
              maxLength="4000"
            />

            <button
              className="send-button"
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send message"
            >
              ↑
            </button>

          </form>

          <p className="fine-print">
            AI can make mistakes. Do not share personal
            or identifiable health information.
          </p>

        </div>

      </section>

    </main>
  );
}
