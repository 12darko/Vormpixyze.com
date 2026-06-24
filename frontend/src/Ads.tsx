import { useEffect, useState } from 'react';

// Adsterra banner ad unit keys come from env (baked at build time). Ads only
// render when a key is set, so the site works fine before you add them.
const DESKTOP_KEY = import.meta.env.VITE_ADSTERRA_BANNER_KEY;        // 728x90
const MOBILE_KEY = import.meta.env.VITE_ADSTERRA_BANNER_MOBILE_KEY;  // 320x50

/**
 * Renders an Adsterra banner inside an isolated <iframe> via srcDoc.
 * Isolation matters: Adsterra's invoke.js can use document.write, which would
 * wipe the host page if injected directly into the SPA. Sandboxed here it can't.
 */
function AdsterraBanner({ adKey, width, height }: { adKey: string; width: number; height: number }) {
  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head>
<body>
<script type="text/javascript">
  atOptions = { 'key':'${adKey}','format':'iframe','height':${height},'width':${width},'params':{} };
</script>
<script type="text/javascript" src="//www.highperformanceformat.com/${adKey}/invoke.js"></script>
</body></html>`;

  return (
    <iframe
      title="advertisement"
      width={width}
      height={height}
      scrolling="no"
      // allow-scripts + allow-same-origin lets the ad load; no top-navigation.
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      style={{ border: 'none', display: 'block', overflow: 'hidden', maxWidth: '100%' }}
      srcDoc={srcDoc}
    />
  );
}

/**
 * Menu-only ad slot. Picks the size that matches an available key for the
 * current viewport. Renders nothing if no key is configured. NEVER mount this
 * during gameplay — only on auth / lobby / leaderboard / game-over screens.
 */
export function MenuAd() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  let adKey: string | undefined;
  let width = 728;
  let height = 90;

  if (isMobile) {
    if (MOBILE_KEY) { adKey = MOBILE_KEY; width = 320; height = 50; }
    else if (DESKTOP_KEY) { adKey = DESKTOP_KEY; width = 728; height = 90; }
  } else {
    if (DESKTOP_KEY) { adKey = DESKTOP_KEY; width = 728; height = 90; }
    else if (MOBILE_KEY) { adKey = MOBILE_KEY; width = 320; height = 50; }
  }

  if (!adKey) return null;

  return (
    <div className="menu-ad">
      <span className="menu-ad-label">Advertisement</span>
      {/* key forces a fresh iframe when the size/key changes (e.g. on resize) */}
      <AdsterraBanner key={`${adKey}-${width}`} adKey={adKey} width={width} height={height} />
    </div>
  );
}
