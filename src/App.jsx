import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { extractVideoId, fetchVideoMetadata, generateSummary } from './utils';
import './index.css';

// ─── Framer Motion Animation Variants ───────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const scaleUp = {
  hidden: { opacity: 0, scale: 0.94, y: 20 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0, scale: 0.96, y: -10,
    transition: { duration: 0.3, ease: 'easeIn' },
  },
};

// ─── Animated Hero Title ──────────────────────────────────────────────────────
function AnimatedTitle() {
  const line1 = "Summarize any";
  const line2 = "YouTube video";
  const line3 = "instantly.";

  const wordVariants = {
    hidden: { opacity: 0, y: 30, filter: 'blur(4px)' },
    visible: (i) => ({
      opacity: 1, y: 0, filter: 'blur(0px)',
      transition: { duration: 0.65, delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] },
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
    hidden: { opacity: 0, y: 8, filter: 'blur(3px)' },
    visible: (i) => ({
      opacity: 1, y: 0, filter: 'blur(0px)',
      transition: { duration: 0.4, delay: i * 0.035, ease: 'easeOut' },
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
          style={{ display: 'inline-block', marginRight: '0.26em' }}
        >
          {word}
        </motion.span>
      ))}
    </motion.p>
  );
}

// ─── Toast Notifications ──────────────────────────────────────────────────────
function Toast({ message, type = 'default', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const icons = {
    error: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    ),
    success: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  };

  return (
    <motion.div
      className={`toast ${type}`}
      initial={{ opacity: 0, x: 60, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.92 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {icons[type]}
      {message}
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
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
    <motion.div className="steps" variants={fadeUp} custom={3} initial="hidden" animate="visible">
      {steps.map((label, i) => (
        <div key={i} className={`step ${step > i ? 'active' : ''}`}>
          <motion.div
            className="step-number"
            animate={step > i ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.4, type: 'spring' }}
          >
            {step > i ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : i + 1}
          </motion.div>
          <span className="step-label">{label}</span>
        </div>
      ))}
    </motion.div>
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

  const addToast = useCallback((message, type = 'default') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleAnalyze = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      addToast('Please paste a YouTube URL first.', 'error');
      return;
    }

    const vid = extractVideoId(trimmedUrl);
    if (!vid) {
      addToast('Invalid YouTube URL. Please check the link and try again.', 'error');
      return;
    }

    setLoading(true);
    setSummary('');
    setVideoMeta(null);
    setPhase('fetching');

    try {
      // 1. Fetch metadata with fallback
      let meta = null;
      try {
        meta = await fetchVideoMetadata(vid);
      } catch (e) {
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

      // 2. Generate summary (Gemini REST API -> automatic zero-fail NLP fallback)
      const sum = await generateSummary(vid, meta.title);
      setSummary(sum);
      setPhase('done');
    } catch (err) {
      console.error(err);
      addToast('Could not analyze this video link. Please try another link.', 'error');
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
    setUrl('');
    setVideoMeta(null);
    setSummary('');
    setPhase('idle');
  };

  const currentStep = phase === 'idle' ? 0 : phase === 'fetching' || phase === 'analyzing' ? 1 : phase === 'done' ? 3 : 0;
  const wordCount = summary ? summary.split(/\s+/).filter(Boolean).length : 0;

  const phaseLabel = {
    idle: '',
    fetching: 'Fetching video info…',
    analyzing: 'Summarizing…',
    done: 'Done',
    error: 'Error',
  };

  return (
    <div className="app-wrapper">
      {/* Toast Notifications */}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map(t => (
            <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
          ))}
        </AnimatePresence>
      </div>

      <div className="page-content">
        {/* ── Header ── */}
        <motion.header
          className="header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="logo">
            <div className="logo-icon">S</div>
            <span className="logo-name">Summarize</span>
          </div>
        </motion.header>

        {/* ── Hero Section ── */}
        <section className="hero">
          <AnimatedTitle />

          <motion.p className="hero-subtitle" variants={fadeUp} custom={2} initial="hidden" animate="visible">
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
            <label className="input-label" htmlFor="youtube-url-input">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.4a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
                <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
              </svg>
              YouTube Video URL
            </label>

            <div className="url-input-row">
              <motion.input
                id="youtube-url-input"
                type="url"
                className="url-input"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && handleAnalyze()}
                disabled={loading}
                whileFocus={{ scale: 1.005 }}
              />
              <motion.button
                id="analyze-btn"
                className="analyze-btn"
                onClick={handleAnalyze}
                disabled={loading || !url.trim()}
                whileHover={!loading ? { scale: 1.03 } : {}}
                whileTap={!loading ? { scale: 0.96 } : {}}
              >
                {loading && <span className="shimmer" />}
                {loading ? (
                  <>
                    <LoadingSpinner />
                    {phaseLabel[phase]}
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    Analyze
                  </>
                )}
              </motion.button>
            </div>

            {(videoMeta || phase !== 'idle') && (
              <motion.button
                onClick={handleReset}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '12px', color: 'var(--text-muted)', alignSelf: 'flex-start',
                  display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-sans)',
                  padding: '4px 0',
                }}
                whileHover={{ color: 'var(--text-primary)' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.28"/>
                </svg>
                Analyze another video
              </motion.button>
            )}
          </motion.div>

          {/* Loading Skeleton */}
          <AnimatePresence mode="wait">
            {(phase === 'fetching' || phase === 'analyzing') && !videoMeta && (
              <motion.div
                key="skeleton"
                variants={scaleUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-xl)', overflow: 'hidden',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <div className="skeleton" style={{ aspectRatio: '16/9', width: '100%' }} />
                <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="skeleton" style={{ height: 22, width: '75%', borderRadius: 6 }} />
                  <div className="skeleton" style={{ height: 14, width: '40%', borderRadius: 4 }} />
                </div>
              </motion.div>
            )}

            {/* Video Preview Card */}
            {videoMeta && (
              <VideoCard key="video-card" meta={videoMeta} />
            )}
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
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
                  <div className="dark-skeleton" style={{ height: 18, width: '100%' }} />
                  <div className="dark-skeleton" style={{ height: 18, width: '92%' }} />
                  <div className="dark-skeleton" style={{ height: 18, width: '96%' }} />
                  <div className="dark-skeleton" style={{ height: 18, width: '86%' }} />
                  <div className="dark-skeleton" style={{ height: 18, width: '55%' }} />
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
                  <span className="summary-word-count">{wordCount} words</span>
                </div>

                <TypewriterText text={summary} />

                <div className="summary-actions">
                  <motion.button
                    id="copy-summary-btn"
                    className="action-btn"
                    onClick={handleCopy}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    {copiedRecently ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    )}
                    {copiedRecently ? 'Copied!' : 'Copy'}
                  </motion.button>

                  <motion.a
                    href={videoMeta?.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="action-btn"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    style={{ textDecoration: 'none' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    Watch video
                  </motion.a>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Footer ── */}
        <motion.footer
          className="footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
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
      width="15" height="15" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </motion.svg>
  );
}
