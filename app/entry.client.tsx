import { Buffer as __boltBuffer } from 'vite-plugin-node-polyfills/shims/buffer';
import __boltProcess from 'vite-plugin-node-polyfills/shims/process';

globalThis.Buffer ??= __boltBuffer;
globalThis.process ??= __boltProcess;
globalThis.global ??= globalThis;

// Load the application only after its browser globals are ready. Keeping the
// shim bootstrap out of every source module avoids a Rolldown runtime cycle.
async function hydrate() {
  const [{ startTransition }, { hydrateRoot }, { HydratedRouter }] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('react-router/dom'),
  ]);

  startTransition(() => {
    hydrateRoot(document, <HydratedRouter />);
  });
}

void hydrate();
