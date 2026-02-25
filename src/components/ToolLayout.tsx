import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface ToolLayoutProps {
  title: string;
  children: React.ReactNode;
}

export default function ToolLayout({ title, children }: ToolLayoutProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        background: 'var(--bg)',
        overflow: 'hidden' // tool content handles scroll if needed
      }}
    >
      <header style={{
        display: 'flex',
        alignItems: 'center',
        padding: '24px 48px',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        gap: '32px'
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1rem',
            fontWeight: 800,
            color: 'var(--ink)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: 0.6,
            transition: 'opacity 0.2s',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>

        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 800,
          margin: 0,
          letterSpacing: '-0.5px',
          color: 'var(--ink)'
        }}>
          {title}
        </h1>
      </header>
      
      <main style={{
        flex: 1,
        position: 'relative',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {children}
      </main>
    </motion.div>
  );
}
