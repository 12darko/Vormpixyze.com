import { ArrowLeft } from 'lucide-react';

// Update these two before launch.
const CONTACT_EMAIL = 'support@vormpixyze.com';
const SITE_NAME = 'VormPixyze.io';
const LAST_UPDATED = 'June 24, 2026';

type Block =
  | { h: string }
  | { p: string }
  | { ul: string[] };

const PRIVACY: Block[] = [
  { p: `This Privacy Policy explains what data ${SITE_NAME} ("we", "us") collects when you play the game, why we collect it, and the choices you have. By using the game you agree to this policy.` },

  { h: '1. Data we collect' },
  { p: 'We keep the data we collect to the minimum needed to run the game:' },
  { ul: [
    'Account data (registered players): username, email address, and a password stored only as a one-way BCrypt hash — we never store your plain password.',
    'Guest data: when you "Play as Guest" we create a temporary account with a generated alias; no email or password is collected.',
    'Gameplay data: in-game stats such as level, XP, captured tiles, matches played, and leaderboard scores.',
    'Technical data: standard server logs (IP address, browser/user-agent, timestamps) used for security, abuse prevention, and debugging.',
  ] },

  { h: '2. How we use your data' },
  { ul: [
    'To create and authenticate your account and keep you signed in.',
    'To run real-time matches and show global leaderboards.',
    'To save your progress (level, XP, unlocks) across sessions.',
    'To protect the service from cheating, spam, and abuse.',
  ] },

  { h: '3. Cookies & local storage' },
  { p: 'We do not use tracking cookies for advertising. We store your login token and username in your browser\'s localStorage so you stay signed in. Clearing your browser storage removes them. If we later add analytics or ads, this policy will be updated and consent requested where required.' },

  { h: '4. Third parties' },
  { p: `The game is served from our own hosting infrastructure. If you reach ${SITE_NAME} through a game portal (for example CrazyGames or Poki), that portal\'s own privacy policy also applies to data they collect on their pages. We do not sell your personal data.` },

  { h: '5. Data retention & deletion' },
  { p: `We keep account data while your account is active. Inactive guest accounts may be removed periodically. You can request deletion of your account and associated data at any time by emailing ${CONTACT_EMAIL}.` },

  { h: '6. Your rights (GDPR / KVKK)' },
  { p: `Depending on where you live, you may have the right to access, correct, export, or delete your personal data, and to object to certain processing. To exercise these rights, contact us at ${CONTACT_EMAIL}.` },

  { h: '7. Children' },
  { p: 'The game is intended for players aged 13 and over. We do not knowingly collect personal data from children under 13. If you believe a child has provided us data, contact us and we will remove it.' },

  { h: '8. Changes to this policy' },
  { p: 'We may update this policy as the game evolves. The "Last updated" date below reflects the latest version. Material changes will be announced in-game where appropriate.' },

  { h: '9. Contact' },
  { p: `Questions about this policy? Email ${CONTACT_EMAIL}.` },
];

const TERMS: Block[] = [
  { p: `These Terms of Service ("Terms") govern your use of ${SITE_NAME}. By playing, you agree to these Terms. If you do not agree, please do not use the game.` },

  { h: '1. Eligibility' },
  { p: 'You must be at least 13 years old to play. If you are under the age of majority in your country, you confirm a parent or guardian has approved your use of the game.' },

  { h: '2. Your account' },
  { ul: [
    'You are responsible for keeping your login credentials secure and for all activity under your account.',
    'Provide accurate information when registering. One person should not create accounts to abuse, spam, or evade bans.',
    'You may request account deletion at any time (see the Privacy Policy).',
  ] },

  { h: '3. Acceptable use' },
  { p: 'To keep matches fair and fun, you agree not to:' },
  { ul: [
    'Cheat, exploit bugs, use bots, or modify the client to gain an unfair advantage.',
    'Attempt to disrupt, overload, reverse-engineer, or gain unauthorized access to the servers.',
    'Harass other players or use offensive, hateful, or illegal nicknames or content.',
  ] },

  { h: '4. Virtual items & cosmetics' },
  { p: 'Skins, levels, and other unlocks are cosmetic in-game items with no real-world monetary value. They are licensed to you for personal, non-commercial use within the game and may change or be discontinued. The game is not pay-to-win.' },

  { h: '5. Availability & changes' },
  { p: 'The game is provided "as is" and may be updated, interrupted, or discontinued at any time without notice. We do not guarantee uninterrupted or error-free service.' },

  { h: '6. Limitation of liability' },
  { p: 'To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of, or inability to use, the game.' },

  { h: '7. Termination' },
  { p: 'We may suspend or terminate accounts that violate these Terms, cheat, or harm other players or the service.' },

  { h: '8. Changes to these Terms' },
  { p: 'We may revise these Terms over time. Continued play after changes take effect means you accept the updated Terms.' },

  { h: '9. Contact' },
  { p: `Questions about these Terms? Email ${CONTACT_EMAIL}.` },
];

function renderBlock(b: Block, i: number) {
  if ('h' in b) {
    return (
      <h2
        key={i}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.05rem',
          letterSpacing: '0.5px',
          color: 'var(--accent-cyan)',
          margin: '1.75rem 0 0.6rem',
        }}
      >
        {b.h}
      </h2>
    );
  }
  if ('ul' in b) {
    return (
      <ul key={i} style={{ margin: '0.4rem 0 0.4rem 1.1rem', padding: 0, color: 'var(--text-mid)' }}>
        {b.ul.map((li, j) => (
          <li key={j} style={{ margin: '0.35rem 0', lineHeight: 1.6 }}>{li}</li>
        ))}
      </ul>
    );
  }
  return (
    <p key={i} style={{ margin: '0.5rem 0', color: 'var(--text-mid)', lineHeight: 1.7 }}>
      {b.p}
    </p>
  );
}

export function LegalPage({ type }: { type: 'privacy' | 'terms' }) {
  const isPrivacy = type === 'privacy';
  const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service';
  const blocks = isPrivacy ? PRIVACY : TERMS;

  return (
    <div className="app-layout">
      <header className="header-panel">
        <a href="/" className="brand-logo" style={{ textDecoration: 'none' }}>
          <div className="brand-icon">V</div>
          <span className="brand-text">
            VormPixyze<span>.io</span>
          </span>
        </a>
      </header>

      <main className="main-area" style={{ overflowY: 'auto', alignItems: 'flex-start', paddingTop: '2rem', paddingBottom: '2rem' }}>
        <div className="glass-panel" style={{ maxWidth: '760px', width: '100%', padding: '2rem 2.25rem', textAlign: 'left' }}>
          <a
            href="/"
            className="btn-secondary"
            style={{ width: 'auto', display: 'inline-flex', padding: '0.45rem 0.9rem', fontSize: '0.8rem', textDecoration: 'none', marginBottom: '1.25rem' }}
          >
            <ArrowLeft size={15} />
            <span>Back to game</span>
          </a>

          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--text-hi)', margin: '0 0 0.25rem' }}>
            {title}
          </h1>
          <p style={{ color: 'var(--text-mid)', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>
            Last updated: {LAST_UPDATED}
          </p>

          {blocks.map(renderBlock)}

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
            <a href={isPrivacy ? '/terms' : '/privacy'} style={{ color: 'var(--accent-cyan)' }}>
              {isPrivacy ? 'Terms of Service' : 'Privacy Policy'}
            </a>
          </div>
        </div>
      </main>

      <footer className="footer-panel">
        &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
      </footer>
    </div>
  );
}
