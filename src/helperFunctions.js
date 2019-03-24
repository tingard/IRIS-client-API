export const validationError = () => ({ name: 'Validation Error', message: 'Not successful API call' });

export function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  /* eslint-disable no-plusplus */
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  /* eslint-enable no-plusplus */
  return outputArray;
}

export const promiseGenerator = (success, status) => (
  success ? Promise.resolve({ success, status }) : Promise.reject(new Error({ success, status }))
);
