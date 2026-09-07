import { spawn } from 'child_process';

async function runDiagnostic() {
  console.log('--- Starting Firefox WebDriver BiDi Diagnostic ---');
  
  // Launch Firefox with remote debugging
  const port = 9333;
  const ff = spawn('/usr/bin/firefox', [
    '--headless',
    '--remote-debugging-port',
    String(port),
    'about:blank'
  ], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  ff.stderr.on('data', (d) => {
    // console.log('[FF STDERR]', d.toString());
  });

  // Wait for BiDi to be ready
  await new Promise((resolve) => setTimeout(resolve, 2500));

  const ws = new WebSocket(`ws://127.0.0.1:${port}/session`);
  
  let msgId = 1;
  const pending = new Map();

  function send(method, params = {}) {
    const id = msgId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const logs = [];
  const navigations = [];
  const networkRequests = [];

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  ws.onmessage = (ev) => {
    const data = JSON.parse(ev.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data);
      else resolve(data.result);
      return;
    }

    if (data.method === 'log.entryAdded') {
      const entry = data.params;
      const text = `[BROWSER LOG ${entry.level.toUpperCase()}] ${entry.text} (${entry.source?.url || 'inline'})`;
      console.log(text);
      logs.push(text);
    } else if (data.method === 'browsingContext.navigationStarted') {
      const text = `[NAV STARTED] -> ${data.params.url}`;
      console.log(text);
      navigations.push(text);
    } else if (data.method === 'network.beforeRequestSent') {
      const req = data.params.request;
      if (req.url.includes('auth') || req.url.includes('google') || req.url.includes('api')) {
        const text = `[NET REQ] ${req.method} ${req.url.slice(0, 140)}`;
        console.log(text);
        networkRequests.push(text);
      }
    } else if (data.method === 'network.responseCompleted') {
      const res = data.params.response;
      if (res.url.includes('auth') || res.url.includes('google') || res.url.includes('api')) {
        const text = `[NET RES] ${res.status} ${res.url.slice(0, 140)}`;
        console.log(text);
        networkRequests.push(text);
      }
    }
  };

  try {
    // 1. Init BiDi session
    const sessionRes = await send('session.new', { capabilities: {} });
    console.log('Session initialized:', sessionRes.sessionId);

    // 2. Subscribe to events
    await send('session.subscribe', {
      events: [
        'log.entryAdded',
        'browsingContext.navigationStarted',
        'browsingContext.load',
        'network.beforeRequestSent',
        'network.responseCompleted'
      ]
    });

    // 3. Get top context
    const tree = await send('browsingContext.getTree', {});
    const contextId = tree.contexts[0].context;
    console.log('Top Browsing Context:', contextId);

    // 4. Navigate to compresscontext.web.app
    console.log('\n>>> Navigating to https://compresscontext.web.app ...');
    await send('browsingContext.navigate', {
      context: contextId,
      url: 'https://compresscontext.web.app',
      wait: 'complete'
    });

    // Wait 3 seconds for client initialization
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 5. Inspect button
    console.log('\n>>> Inspecting page and finding #btn-google-sign-in ...');
    const evalRes = await send('script.evaluate', {
      target: { context: contextId },
      expression: `
        (() => {
          const btn = document.getElementById('btn-google-sign-in');
          const title = document.title;
          return {
            title,
            hasButton: !!btn,
            buttonText: btn ? btn.innerText : null,
            disabled: btn ? btn.disabled : null
          };
        })()
      `,
      awaitPromise: true,
      resultOwnership: 'root'
    });
    console.log('Page state:', JSON.stringify(evalRes.result.value, null, 2));

    // 6. Click Continue with Google
    console.log('\n>>> Triggering click on #btn-google-sign-in ...');
    await send('script.evaluate', {
      target: { context: contextId },
      expression: `
        (() => {
          const btn = document.getElementById('btn-google-sign-in');
          if (btn) btn.click();
          return true;
        })()
      `,
      awaitPromise: true
    });

    // 7. Observe the reaction for 8 seconds
    console.log('\n>>> Waiting 8 seconds to observe popup/redirect/network events ...');
    for (let i = 1; i <= 8; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const statusRes = await send('script.evaluate', {
        target: { context: contextId },
        expression: `
          (() => {
            const btn = document.getElementById('btn-google-sign-in');
            const errEl = document.querySelector('[class*="error"], [style*="error"]');
            return {
              url: window.location.href,
              btnText: btn ? btn.innerText : null,
              hasError: !!errEl,
              errorText: errEl ? errEl.innerText : null
            };
          })()
        `,
        awaitPromise: true
      });
      console.log(`[t = ${i}s]`, JSON.stringify(statusRes.result.value));
    }

  } catch (err) {
    console.error('Diagnostic error:', err);
  } finally {
    ws.close();
    ff.kill('SIGTERM');
    console.log('--- Diagnostic Complete ---');
  }
}

runDiagnostic();
