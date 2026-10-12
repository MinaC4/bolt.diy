import { useStore } from '@nanostores/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';
import { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, type LinksFunction } from 'react-router';
import { cssTransition, ToastContainer } from 'react-toastify';

import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url';
import { ClientOnly } from 'remix-utils/client-only';

import 'virtual:uno.css';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg+xml',
  },
  { rel: 'stylesheet', href: reactToastifyStyles },
  { rel: 'stylesheet', href: tailwindReset },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'stylesheet', href: xtermStyles },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
  {
    rel: 'preconnect',
    href: 'https://unpkg.com',
  },
  {
    rel: 'dns-prefetch',
    href: 'https://unpkg.com',
  },
];

const inlineThemeCode = stripIndents`
  setTutorialKitTheme();

  function setTutorialKitTheme() {
    try {
      const options = JSON.parse(localStorage.getItem('bolt_interface_options') || '{}');
      const root = document.documentElement;
      root.dataset.accentIntensity = String(typeof options.accentIntensity === 'number' ? options.accentIntensity : 50);
      root.style.setProperty('--interface-accent-strength', String(typeof options.accentIntensity === 'number' ? options.accentIntensity : 50) + '%');
      root.dataset.cornerRadius = ['sharp', 'soft', 'round'].includes(options.cornerRadius) ? options.cornerRadius : 'soft';
      root.dataset.compactMode = String(Boolean(options.compactMode));
      root.dataset.animatedTransitions = String(options.animatedTransitions !== false);
    } catch {}
    let colorTheme = localStorage.getItem('bolt_theme');

    if (!colorTheme) {
      colorTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-dracula' : 'light';
    }

    const mode = colorTheme === 'dark' || colorTheme.startsWith('dark-') ? 'dark' : 'light';
    document.querySelector('html')?.setAttribute('data-theme', mode);
    document.querySelector('html')?.setAttribute('data-color-theme', colorTheme === 'dark' ? 'dark-dracula' : colorTheme);
  }
`;

const bootDiagnosticsCode = String.raw`
  if (new URLSearchParams(window.location.search).has('debug')) {
    const report = (label, detail) => {
      if (!document.body) {
        document.addEventListener('DOMContentLoaded', () => report(label, detail), { once: true });
        return;
      }
      let panel = document.getElementById('bolt-boot-diagnostics');
      if (!panel) {
        panel = document.createElement('pre');
        panel.id = 'bolt-boot-diagnostics';
        panel.style.cssText = 'position:fixed;inset:auto 12px 12px 12px;z-index:2147483647;max-height:45vh;overflow:auto;margin:0;padding:12px;background:#101114;color:#f4f4f5;border:1px solid #71717a;border-radius:8px;font:12px/1.5 ui-monospace,monospace;white-space:pre-wrap;';
        document.body.appendChild(panel);
      }
      panel.textContent += (panel.textContent ? '\n' : '') + label + ': ' + detail;
    };

    window.addEventListener('error', (event) => {
      const target = event.target;
      const resource = target && target !== window ? (target.src || target.href || target.tagName) : '';
      const stack = event.error && event.error.stack;
      report('error', [event.message, resource, event.filename, event.lineno, stack].filter(Boolean).join(' | ') || 'Unknown browser error');
    }, true);

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      report('unhandled rejection', reason && (reason.stack || reason.message) || String(reason));
    });

    window.addEventListener('load', () => {
      window.setTimeout(() => {
        report('browser state', 'secure=' + window.isSecureContext + ', crossOriginIsolated=' + window.crossOriginIsolated + ', bodyTextLength=' + document.body.innerText.length + ', rootChildren=' + document.body.children.length);
      }, 3000);
    }, { once: true });
  }
`;

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = useStore(themeStore);

  useEffect(() => {
    const mode = theme === 'dark' || theme.startsWith('dark-') ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.setAttribute('data-color-theme', theme === 'dark' ? 'dark-dracula' : theme);
  }, [theme]);

  return (
    <html
      lang="en"
      data-theme={theme === 'dark' || theme.startsWith('dark-') ? 'dark' : 'light'}
      data-color-theme={theme === 'dark' ? 'dark-dracula' : theme}
      className="w-full h-full"
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: bootDiagnosticsCode }} />
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
      </head>
      <body className="w-full h-full">
        {/*
          The app boots a WebContainer and reads IndexedDB/localStorage, so it is
          genuinely client-only. `ClientOnly` renders `fallback` on the server and
          on the first client render (keeping hydration in sync), then swaps in the
          real tree once mounted.
        */}
        <ClientOnly fallback={<div className="w-full h-full" />}>
          {() => <DndProvider backend={HTML5Backend}>{children}</DndProvider>}
        </ClientOnly>
        <ToastContainer
          closeButton={({ closeToast }) => {
            return (
              <button className="Toastify__close-button" onClick={closeToast}>
                <div className="i-ph:x text-lg" />
              </button>
            );
          }}
          icon={({ type }) => {
            switch (type) {
              case 'success': {
                return <div className="i-ph:check-bold text-bolt-elements-icon-success text-2xl" />;
              }
              case 'error': {
                return <div className="i-ph:warning-circle-bold text-bolt-elements-icon-error text-2xl" />;
              }
            }

            return undefined;
          }}
          position="bottom-right"
          pauseOnFocusLoss
          transition={toastAnimation}
          autoClose={3000}
        />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

import { journeys, observeWebVitals } from './lib/performance/metrics';
import { prebootWebContainer } from './lib/performance/webcontainer-optimizer';
import { logStore } from './lib/stores/logs';
import { themeStore } from './lib/stores/theme';
import globalStyles from './styles/index.scss?url';
import { stripIndents } from './utils/stripIndent';

export default function App() {
  const theme = useStore(themeStore);

  useEffect(() => {
    // Mark app launch start
    journeys.appLaunch.start();
    journeys.appLaunch.reactHydrated();

    logStore.logSystem('Application initialized', {
      theme,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });

    // Start Web Vitals observation
    observeWebVitals();

    // Pre-boot WebContainer in background
    prebootWebContainer();

    // Initialize debug logging with improved error handling
    import('./utils/debugLogger')
      .then(({ debugLogger }) => {
        /*
         * The debug logger initializes itself and starts disabled by default
         * It will only start capturing when enableDebugMode() is called
         */
        const status = debugLogger.getStatus();
        logStore.logSystem('Debug logging ready', {
          initialized: status.initialized,
          capturing: status.capturing,
          enabled: status.enabled,
        });
      })
      .catch((error) => {
        logStore.logError('Failed to initialize debug logging', error);
      });

    // Mark app as interactive
    journeys.appLaunch.interactive({
      theme,
      performance: {
        navigation: performance.getEntriesByType('navigation')[0],
      },
    });
  }, []);

  /*
   * React Router applies the root route's `Layout` export itself, wrapping this
   * component. Rendering `<Layout>` here as well would nest a second
   * `<html>/<head>/<body>` inside the first, which React reports as invalid DOM
   * nesting and duplicate-element mounts. Remix v2 required the explicit wrap;
   * React Router 8 does not.
   */
  return <Outlet />;
}
