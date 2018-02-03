export default (serviceWorkerLocation) => {
// Check for browser support of service worker
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    console.log('Service Worker and Push is supported');

    // N.B. we register a service worker here which is passed through as a func.
    // This means we can call different workers depending on whether user is student
    // or volunteer
    return navigator.serviceWorker.register(serviceWorkerLocation)
      .then((swReg) => {
        console.log('Service Worker is registered', swReg);
        return swReg;
      })
      .catch((error) => {
        console.error('Service Worker Error', error);
        return null;
      });
  }
  console.warn('Push messaging is not supported');
  // TODO: handle this
  return new Promise(() => { throw new Error('Push messaging is not supported'); });
};
