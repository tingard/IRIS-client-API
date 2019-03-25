// extracted to allow for api call testing
export default (url, type, bodyHeaders, state) => (
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(type, `${state.apiUrl}${url}`, true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    if (state.token !== null) {
      xhr.setRequestHeader('Authorization', `JWT ${state.token}`);
    }
    // When the request loads, check whether it was successful
    xhr.onload = () => resolve(xhr);

    xhr.onerror = () => {
      // Also deal with the case when the entire request fails to begin with
      // This is probably a network error, so reject the promise with an appropriate message
      reject(Error('There was a network error.'));
    };
    const sendObject = JSON.stringify(bodyHeaders);
    xhr.send(sendObject);
  })
);
