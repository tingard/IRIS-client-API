/* eslint-disable class-methods-use-this, no-underscore-dangle */
import jwtLib from 'jsonwebtoken';
// TODO: combine request calls to ease server load

class IrisAPI {
  constructor() {
    // initialize storage
    // check API is online
    // TODO: get existing token from storage and check if it's expired
    this._sendRequest = this._sendRequest.bind(this);
    this._sendWebSocketRequest = this._sendWebSocketRequest.bind(this);
    this._sendHttpRequest = this._sendHttpRequest.bind(this);
    this.state = {
      apiUrl: 'https://grapheel-iris.herokuapp.com/api', // TODO: http://app.grapheel.com
      websocketUrl: 'https://grapheel-iris.herokuapp.com/websocket',
      _token: null,
      user: null,
      websocket: null,
      apiResponse: {
        key: Math.random(),
        data: {},
      },
    };
    const token = localStorage.getItem('iris-token');
    if (token !== null) {
      const jwt = jwtLib.decode(token);
      if (!(jwt.exp < Date.now() / 1000)) {
        this.state._token = token;
      }
    }
  }
  _sendRequest(url, type, bodyHeaders) {
    if (this.state.websocket !== null && this.state.websocket.readyState === 1) {
      return this._sendWebSocketRequest(url, type, bodyHeaders);
    }
    return this._sendHttpRequest(url, type, bodyHeaders);
  }
  _sendWebSocketRequest(url, type, bodyHeaders) {
    // TODO: same method as _sendHttpRequest, but send over websocket
    this.state.websocket.send(JSON.stringify({
      url,
      type,
      bodyHeaders,
    }));
  }
  _sendHttpRequest(url, type, bodyHeaders) {
    // Create new Promise which does the request, and return it to be chained
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(type, `${this.state.apiUrl}${url}`, true);
      xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
      if (this.state.token !== null) {
        xhr.setRequestHeader('Authorization', `JWT ${this.state.token}`);
      }
      // When the request loads, check whether it was successful
      xhr.onload = () => {
        if (xhr.status === 200) {
          const responseObject = JSON.parse(xhr.response);
          resolve(responseObject);
        } else {
          reject(Error(`API call to ${url} failed`));
        }
      };
      xhr.onerror = () => {
        // Also deal with the case when the entire request fails to begin with
        // This is probably a network error, so reject the promise with an appropriate message
        reject(Error('There was a network error.'));
      };
      const sendObject = JSON.stringify(bodyHeaders);
      xhr.send(sendObject);
    });
  }
  login(utype, email, pwd) {
    if (this.state.token !== null) {
      // POST to /api/login with email, pwd, utypt in body headers x-www-form-urlencoded
      this.state.user = {};
      this._sendRequest(`/login/${utype}`, 'POST', { email, pwd })
        .then(
          (response) => {
            this.state.token = response.token; // TODO: save to local storage
            localStorage.setItem('iris-token', response.token);
          },
          (error) => {
            console.error(error);
          },
        );
    }
  }
  getUserDetails() {
    // GET to /api/${utype}/${uid} with "JWT ${token}" in Authorization header
  }
  getMessages() {
    // GET to /api/${utype}/${uid}/images with "JWT ${token}" in Authorization header
  }
  getImages() {
    if (this.state.user.utype === 'volunteer') {
      // GET to /api/${utype}/${uid}/images with "JWT ${token}" in Authorization header
    }
  }
  startWebSocket(onMessageHandler, onCloseHandler) {
    this.state.websocket = new WebSocket(this.state.websocketUrl);
    this.state.websocket.onmessage = onMessageHandler;
    if (onCloseHandler) {
      this.state.websocket.onclose = onCloseHandler;
    }
    return true;
  }
  stopWebSocket() {
    if (this.state.websocket !== null && this.state.websocket.readyState < 2) {
      this.state.websocket.close();
      this.state.websocket = null;
    }
  }
}

export default IrisAPI;
