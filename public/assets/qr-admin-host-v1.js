(() => {
  const minimumHeight = () => Math.max(520, window.innerHeight - (window.innerWidth <= 900 ? 64 : 84));

  function applyFrameHeight(frame, requestedHeight) {
    const height = Math.max(minimumHeight(), Number(requestedHeight) || 0);
    frame.setAttribute('scrolling', 'no');
    frame.style.setProperty('width', '100%', 'important');
    frame.style.setProperty('height', `${height}px`, 'important');
    frame.style.setProperty('min-height', '0', 'important');
    frame.style.setProperty('overflow', 'hidden', 'important');

    const content = frame.closest('.rms-pro-content');
    if (content) {
      content.style.setProperty('height', 'auto', 'important');
      content.style.setProperty('padding', '0', 'important');
      content.style.setProperty('overflow', 'visible', 'important');
    }
  }

  window.addEventListener('message', event => {
    if (event.origin !== window.location.origin || event.data?.type !== 'rms-qr-admin-height') return;
    const frame = [...document.querySelectorAll('iframe')].find(node => node.contentWindow === event.source);
    if (frame?.title === 'QR Admin') applyFrameHeight(frame, event.data.height);
  });

  window.addEventListener('resize', () => {
    document.querySelectorAll('iframe[title="QR Admin"]').forEach(frame => {
      const currentHeight = Number.parseFloat(frame.style.height) || 0;
      applyFrameHeight(frame, currentHeight);
    });
  });
})();
