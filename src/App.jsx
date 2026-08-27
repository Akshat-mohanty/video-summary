import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { extractVideoId, fetchVideoMetadata, generateSummary } from './utils';
import './index.css';

// ─── Framer Motion Animation Variants ───────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

const scaleUp = {
  hidden: { opacity: 0, scale: 0.95, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -10,
    transition: { duration: 0.25, ease: 'easeIn' },
  },
};

// ─── Sample Video Presets ───────────────────────────────────────────────────
const SAMPLE_VIDEOS = [
  { label: '🎬 Tech Evolution', url: 'https://www.youtube.com/watch?v=M576WGiDBdQ' },
  { label: '🪐 Deep Space', url: 'https://www.youtube.com/watch?v=libKVRa01L8' },
  { label: '🧠 AI Revolution', url: 'https://www.youtube.com/watch?v=zjkBMFhNj_g' },
];

// ─── FAQ Questions Data ─────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'How does Summarize analyze videos?',
    a: 'Summarize extracts the actual spoken transcript and closed captions directly from YouTube, then uses Gemini 2.5 Flash to synthesize a factual, human-written summary under 150 words.',
  },
  {
    q: 'Does it work on any YouTube video?',
    a: 'Yes! It works on public YouTube videos, shorts, podcasts, and tutorials with English or auto-generated captions.',
  },
  {
    q: 'Is there a length or rate limit?',
    a: 'Summarize works on videos of any length from 60-second shorts to 3-hour long-form lectures in seconds.',
  },
];

// ─── Animated Hero Title ──────────────────────────────────────────────────────
function AnimatedTitle() {
  const line1 = 'Summarize any';
  const line2 = 'YouTube video';
  const line3 = 'instantly.';

  const wordVariants = {
    hidden: { opacity: 0, y: 24, filter: 'blur(4px)' },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.6, delay: 0.08 + i * 0.05, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  const allWords = [...line1.split(' '), '||', ...line2.split(' '), '|||', ...line3.split(' ')];
  let wordIndex = 0;
  const elements = [];
  let lineBuffer = [];

  for (let i = 0; i < allWords.length; i++) {
    const w = allWords[i];
    if (w === '||' || w === '|||') {
      elements.push(
        <span key={`line-${i}`} style={{ display: 'block' }}>
          {lineBuffer.map(({ word, idx }) => (
            <motion.span
              key={idx}
              custom={idx}
              variants={wordVariants}
              style={{ display: 'inline-block', marginRight: '0.22em' }}
            >
              {word === 'instantly.' ? <em>{word}</em> : word}
            </motion.span>
          ))}
        </span>
      );
      lineBuffer = [];
    } else {
      lineBuffer.push({ word: w, idx: wordIndex++ });
    }
  }
  if (lineBuffer.length) {
    elements.push(
      <span key="line-last" style={{ display: 'block' }}>
        {lineBuffer.map(({ word, idx }) => (
          <motion.span
            key={idx}
            custom={idx}
            variants={wordVariants}
            style={{ display: 'inline-block', marginRight: '0.22em' }}
          >
            {word === 'instantly.' ? <em>{word}</em> : word}
          </motion.span>
        ))}
      </span>
    );
  }

  return (
    <motion.h1 className="hero-title" initial="hidden" animate="visible">
      {elements}
    </motion.h1>
  );
}

// ─── Typewriter Word-by-Word Reveal ───────────────────────────────────────────
function TypewriterText({ text }) {
  const words = text.split(' ');
  const wordVariants = {
    hidden: { opacity: 0, y: 6, filter: 'blur(3px)' },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.35, delay: i * 0.03, ease: 'easeOut' },
    }),
  };

  return (
    <motion.p className="summary-text" initial="hidden" animate="visible">
      {words.map((word, i) => (
        <motion.span
          key={i}
          custom={i}
          variants={wordVariants}
          className="summary-word"
          style={{ display: 'inline-block', marginRight: '0.24em' }}
        >
          {word}
        </motion.span>
      ))}
    </motion.p>
  );
}

// ─── Toast Notification ───────────────────────────────────────────────────────
function Toast({ message, type = 'default', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const icons = {
    error: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
    success: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  };

  return (
    <motion.div
      className={`toast ${type}`}
      initial={{ opacity: 0, x: 50, scale: 0.94 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.94 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {icons[type]}
      <span>{message}</span>
    </motion.div>
  );
}

// ─── Video Preview Card ───────────────────────────────────────────────────────
function VideoCard({ meta }) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      className="video-card"
      variants={scaleUp}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
    >
      <div className="video-thumbnail-wrap">
        <img
          src={imgError ? meta.thumbnailFallback : meta.thumbnail}
          alt={meta.title}
          className="video-thumbnail"
          onError={() => setImgError(true)}
        />
        <div className="video-play-overlay">
          <a
            href={meta.watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="play-button"
            title="Watch on YouTube"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </a>
        </div>
      </div>
      <div className="video-meta">
        <h3 className="video-title">{meta.title}</h3>
        <p className="video-channel">{meta.channel}</p>
      </div>
    </motion.div>
  );
}

// ─── Step Indicator Bar ───────────────────────────────────────────────────────
function StepsIndicator({ step }) {
  const steps = ['Paste Link', 'Summarizing', 'Read Summary'];
  return (
    <motion.div
      className="steps-container"
      variants={fadeUp}
      custom={3}
      initial="hidden"
      animate="visible"
    >
      {steps.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className={`step-item ${step >= i + 1 ? 'active' : ''}`}>
            <motion.div
              className="step-num"
              animate={step >= i + 1 ? { scale: [1, 1.18, 1] } : {}}
              transition={{ duration: 0.35, type: 'spring' }}
            >
              {step > i + 1 ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                i + 1
              )}
            </motion.div>
            <span className="step-text">{label}</span>
          </div>
          {i < steps.length - 1 && <div className="step-divider" />}
        </div>
      ))}
    </motion.div>
  );
}

// ─── FAQ Accordion Item ───────────────────────────────────────────────────────
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="faq-item">
      <button className="faq-question" onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <motion.span
          className="faq-icon"
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          +
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <p className="faq-answer">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Application ─────────────────────────────────────────────────────────
export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | fetching | analyzing | done | error
  const [videoMeta, setVideoMeta] = useState(null);
  const [summary, setSummary] = useState('');
  const [toasts, setToasts] = useState([]);
  const [copiedRecently, setCopiedRecently] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const inputRef = useRef(null);

  const addToast = useCallback((message, type = 'default') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Text-to-Speech handler
  const handleToggleSpeech = () => {
    if (!summary || !window.speechSynthesis) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(summary);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setSpeaking(true);
    }
  };

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  // Paste from clipboard helper
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.includes('youtube.com') || text.includes('youtu.be')) {
        setUrl(text.trim());
        addToast('Link pasted from clipboard!', 'success');
      } else if (text) {
        setUrl(text.trim());
      }
    } catch {
      inputRef.current?.focus();
    }
  };

  const handleAnalyze = async (overrideUrl) => {
    const targetUrl = (overrideUrl || url).trim();
    if (!targetUrl) {
      addToast('Please paste a YouTube URL first.', 'error');
      return;
    }

    const vid = extractVideoId(targetUrl);
    if (!vid) {
      addToast('Invalid YouTube URL. Please check the link and try again.', 'error');
      return;
    }

    // Cancel speech if already playing
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);

    setLoading(true);
    setSummary('');
    setVideoMeta(null);
    setPhase('fetching');

    try {
      // 1. Fetch metadata with fallback
      let meta = null;
      try {
        meta = await fetchVideoMetadata(vid);
      } catch {
        meta = {
          title: 'YouTube Video',
          channel: 'Creator',
          thumbnail: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
          thumbnailFallback: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
          watchUrl: `https://www.youtube.com/watch?v=${vid}`,
        };
      }
      setVideoMeta(meta);
      setPhase('analyzing');

      // 2. Generate Gemini 2.5 Flash summary
      const sum = await generateSummary(vid, meta.title);
      setSummary(sum);
      setPhase('done');
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Could not analyze this video link. Please try another.', 'error');
      setPhase('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopiedRecently(true);
    addToast('Summary copied to clipboard!', 'success');
    setTimeout(() => setCopiedRecently(false), 2000);
  };

  const handleReset = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
    setUrl('');
    setVideoMeta(null);
    setSummary('');
    setPhase('idle');
  };

  const handleTrySample = (sampleUrl) => {
    setUrl(sampleUrl);
    handleAnalyze(sampleUrl);
  };

  const currentStep = phase === 'idle' ? 1 : phase === 'fetching' || phase === 'analyzing' ? 2 : phase === 'done' ? 3 : 1;
  const wordCount = summary ? summary.split(/\s+/).filter(Boolean).length : 0;
  const readingTimeSeconds = Math.max(15, Math.round((wordCount / 200) * 60));

  const phaseLabel = {
    idle: '',
    fetching: 'Connecting to YouTube…',
    analyzing: 'Summarizing video…',
    done: 'Done',
    error: 'Error',
  };

  return (
    <div className="app-wrapper">
      {/* Toast Notifications */}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map((t) => (
            <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
          ))}
        </AnimatePresence>
      </div>

      <div className="page-content">
        {/* ── Floating Island Header ── */}
        <div className="header-wrapper">
          <motion.header
            className="header"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="logo">
              <div className="logo-icon">S</div>
              <span className="logo-name">Summarize</span>
            </div>
          </motion.header>
        </div>

        {/* ── Hero Section ── */}
        <section className="hero">
          <AnimatedTitle />

          <motion.p
            className="hero-subtitle"
            variants={fadeUp}
            custom={2}
            initial="hidden"
            animate="visible"
          >
            Paste any YouTube link to get a detailed summary<br />
            <span>in 150 words or fewer.</span>
          </motion.p>
        </section>

        {/* ── Step Indicators ── */}
        <StepsIndicator step={currentStep} />

        {/* ── Analyzer Input Card ── */}
        <section className="analyzer-section">
          <motion.div
            className="input-card"
            variants={fadeUp}
            custom={4}
            initial="hidden"
            animate="visible"
          >
            <div className="input-header-row">
              <label className="input-label" htmlFor="youtube-url-input">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.4a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
                  <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
                </svg>
                YouTube Video Link
              </label>

              {!url && (
                <button className="paste-button" type="button" onClick={handlePasteClipboard}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Paste
                </button>
              )}
            </div>

            <div className="url-input-row">
              <div className="input-field-wrap">
                <input
                  id="youtube-url-input"
                  ref={inputRef}
                  type="url"
                  className="url-input"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && handleAnalyze()}
                  disabled={loading}
                />
                {url && !loading && (
                  <button
                    className="clear-input-btn"
                    onClick={() => setUrl('')}
                    title="Clear input"
                    type="button"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>

              <motion.button
                id="analyze-btn"
                className="analyze-btn"
                onClick={() => handleAnalyze()}
                disabled={loading || !url.trim()}
                whileHover={!loading ? { scale: 1.02 } : {}}
                whileTap={!loading ? { scale: 0.97 } : {}}
              >
                {loading && <span className="shimmer" />}
                {loading ? (
                  <>
                    <LoadingSpinner />
                    <span>{phaseLabel[phase]}</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    <span>Summarize</span>
                  </>
                )}
              </motion.button>
            </div>

            <div className="input-footer-row">
              <span className="input-hint">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Supports standard videos, shorts, podcasts, and livestreams
              </span>

              {(videoMeta || phase !== 'idle') && (
                <button className="reset-btn" type="button" onClick={handleReset}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 .49-3.28" />
                  </svg>
                  Reset
                </button>
              )}
            </div>
          </motion.div>

          {/* Video Preview Card */}
          <AnimatePresence mode="wait">
            {videoMeta && <VideoCard key="video-card" meta={videoMeta} />}
          </AnimatePresence>
        </section>

        {/* ── Summary Box ── */}
        <AnimatePresence mode="wait">
          {(phase === 'analyzing' || (loading && !summary)) && (
            <motion.section
              className="summary-section"
              key="summary-skeleton"
              variants={scaleUp}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="summary-card">
                <div className="summary-header">
                  <span className="summary-label">
                    <span className="summary-label-dot" />
                    Generating Summary…
                  </span>
                  <span className="summary-badge-pill">Gemini 2.5 Flash</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
                  <div className="dark-skeleton" style={{ height: 16, width: '100%' }} />
                  <div className="dark-skeleton" style={{ height: 16, width: '94%' }} />
                  <div className="dark-skeleton" style={{ height: 16, width: '97%' }} />
                  <div className="dark-skeleton" style={{ height: 16, width: '88%' }} />
                  <div className="dark-skeleton" style={{ height: 16, width: '60%' }} />
                </div>
              </div>
            </motion.section>
          )}

          {summary && (
            <motion.section
              className="summary-section"
              key="summary"
              variants={scaleUp}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="summary-card">
                <div className="summary-header">
                  <span className="summary-label">
                    <span className="summary-label-dot" />
                    Summary
                  </span>
                  <div className="summary-meta-badges">
                    <span className="summary-badge-pill">~{readingTimeSeconds}s read</span>
                    <span className="summary-badge-pill">{wordCount} words</span>
                  </div>
                </div>

                <TypewriterText text={summary} />

                <div className="summary-actions">
                  <motion.button
                    id="copy-summary-btn"
                    className="action-btn"
                    onClick={handleCopy}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {copiedRecently ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#27AE60" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                    <span>{copiedRecently ? 'Copied to Clipboard' : 'Copy'}</span>
                  </motion.button>

                  <motion.button
                    className={`action-btn ${speaking ? 'active' : ''}`}
                    onClick={handleToggleSpeech}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {speaking ? (
                        <>
                          <rect x="6" y="4" width="4" height="16" />
                          <rect x="14" y="4" width="4" height="16" />
                        </>
                      ) : (
                        <>
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </>
                      )}
                    </svg>
                    <span>{speaking ? 'Stop Audio' : 'Listen'}</span>
                  </motion.button>

                  {videoMeta?.watchUrl && (
                    <motion.a
                      href={videoMeta.watchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="action-btn"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      <span>Watch video</span>
                    </motion.a>
                  )}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Capabilities / Feature Cards Grid ── */}
        <section className="features-section">
          <div className="section-eyebrow">Why Summarize</div>
          <div className="features-grid">
            <motion.div
              className="feature-card"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <div className="feature-icon-box">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h4 className="feature-title">Direct Transcript Audio</h4>
              <p className="feature-desc">Analyzes every spoken sentence and timestamp directly from YouTube closed captions.</p>
            </motion.div>

            <motion.div
              className="feature-card"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.08 }}
            >
              <div className="feature-icon-box">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h4 className="feature-title">Strict 150-Word Limit</h4>
              <p className="feature-desc">Condensed into pure essential insight with zero filler, taking under 45 seconds to read.</p>
            </motion.div>

            <motion.div
              className="feature-card"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.16 }}
            >
              <div className="feature-icon-box">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h4 className="feature-title">Zero Assumptions</h4>
              <p className="feature-desc">Recounts real events, steps, numbers, and facts without making up hypothetical claims.</p>
            </motion.div>
          </div>
        </section>

        {/* ── FAQ Section ── */}
        <section className="faq-section">
          <div className="section-eyebrow">Frequently Asked Questions</div>
          <div className="faq-list">
            {FAQ_ITEMS.map((item, idx) => (
              <FaqItem key={idx} q={item.q} a={item.a} />
            ))}
          </div>
        </section>

        {/* ── Footer ── */}
        <motion.footer
          className="footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <span>© 2026 Akshat Mohanty. Built with ❤️</span>
        </motion.footer>
      </div>
    </div>
  );
}

// ─── Micro Loading Spinner ────────────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <motion.svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </motion.svg>
  );
}
