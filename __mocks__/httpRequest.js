// test httpRequest, don't actually send anything just return what's needed
export default (url, type, bodyHeaders) => new Promise((resolve) => {
  switch (url) {
    case '':
      if (type === 'GET') {
        resolve({ message: 'welcome to the IRIS api! Please log in' });
      }
      break;
    case '/login':
      if (type === 'POST') {
        resolve(bodyHeaders);
      }
      break;
    default:
      resolve({});
  }
  resolve({});
});
