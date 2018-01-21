/* eslint-disable class-methods-use-this, no-underscore-dangle */
import jwtLib from 'jsonwebtoken';
import httpRequest from './httpRequest';

// TODO: combine request calls to ease server load?
// TODO: clever caching for instantaneous load

const validationError = () => ({ name: 'Validation Error', message: 'Not successful API call' });

class IrisAPI {
  constructor() {
    // initialize storage
    // check API is online
    // TODO: get existing token from storage and check if it's expired
    this.init = this.init.bind(this);
    this.sendRequest = this.sendRequest.bind(this);
    this._sendWebSocketRequest = this._sendWebSocketRequest.bind(this);
    this.state = {
      apiUrl: 'http://127.0.0.1:3000', // 'https://grapheel-iris-api.herokuapp.com',
      websocketUrl: '/websocket',
      token: null,
      isLoggedIn: false,
      user: {},
      websocket: null,
      apiResponse: {
        key: null,
        data: {},
      },
    };
  }
  init() {
    return new Promise((resolve, reject) => {
      this.sendRequest('', 'GET', []).then(
        () => null,
        (error) => {
          // the api is not responsive, TODO: how to deal with this?
          reject(error);
        },
      );
      const token = localStorage.getItem('iris-token');
      const utype = localStorage.getItem('iris-utype');
      if (token !== null) {
        const jwt = jwtLib.decode(token);
        // we might have a token, check by requesting a re-issue
        // TODO: make this call, and return the associated user details?
        this.state.token = token;
        this.state.user = {
          type: utype,
        };
        this.state.isLoggedIn = true;
        (() => null)(jwt);
      }
      resolve(this.state);
    });
  }
  loadTokenFromStorage() {
    console.log('API Setting auth token from storage');
    this.state.token = localStorage.getItem('iris-token');
    Object.assign(this.state.user, {
      type: localStorage.getItem('iris-utype'),
    });
    this.state.isLoggedIn = true;
  }
  login(utype, email, pwd) {
    // POST to /login with email, pwd, utypt in body headers x-www-form-urlencoded
    return this.sendRequest(
      `/login/${utype}`,
      'POST',
      { email, pwd },
    ).then(
      (response) => {
        if (response.success) {
          localStorage.setItem('iris-token', response.token);
          localStorage.setItem('iris-utype', utype);
          this.state.token = response.token;
          this.state.user = { type: utype };
          this.state.isLoggedIn = true;
        } else {
          // inform of failed login
          console.log('failed login');
        }
        return response;
      },
      () => ({ success: false }),
    );
  }
  registerUser(payload) {
    if (['volunteer', 'student'].includes(payload.utype)) {
      return this.sendRequest(`/${payload.utype}s`, 'POST', payload).then(
        res => this.login(payload.utype, payload.email, payload.pwd).then(() => {
          localStorage.setItem('iris-helpOverlay', true);
          return res;
        })
      );
    }
    return new Promise((resolve) => {
      resolve({ success: false });
    });
  }
  handle(type, payload) {
    // TODO: sanitize payload here AND server
    switch (type.name) {
      case 'GET_USER_DETAILS':
        return this.getUserDetails();
      case 'SET_USER_DETAILS':
        return this.sendRequest(`/${this.state.user.type}s`, 'PUT', payload);
      case 'GET_IMAGES':
        return this.sendRequest('/images', 'GET');
      case 'UPLOAD_IMAGE':
        return this.uploadImageRequest(payload);
      case 'EDIT_IMAGE':
        return this.sendRequest('/images', 'PUT', payload);
      case 'GET_MESSAGES':
        return this.sendRequest('/messages', 'GET');
      case 'SEND_MESSAGE':
        // return new Promise((resolve) => {
        //   resolve({});
        // });
        if (payload.imageId) {
          return this.sendRequest('/messages', 'POST', payload);
        } else if (payload.messageId) {
          return this.sendRequest(`/messages/${payload.messageId}`, 'POST', payload);
        }
        return this.sendRequest('/messages', 'POST', payload);
      default:
        return new Promise((resolve) => {
          resolve({ success: false });
        });
    }
  }
  uploadImageRequest(formData) {
    // TODO: mock for testing
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      const token = localStorage.getItem('iris-token');
      request.open('POST', `${this.state.apiUrl}/images`, true);
      request.setRequestHeader('Authorization', `JWT ${token}`);
      request.onload = () => {
        if (request.status === 200) {
          const responseObject = JSON.parse(request.response);
          resolve(responseObject);
        } else {
          reject(Error('Image upload failed'));
        }
      };
      request.send(formData);
    });
  }
  sendRequest(url, type, bodyHeaders) {
    // prefer to use websocket over https request
    if (this.state.websocket !== null && this.state.websocket.readyState === 1) {
      return this._sendWebSocketRequest(url, type, bodyHeaders);
    }
    return httpRequest(url, type, bodyHeaders, this.state).then(
      (res) => {
        if (!res.success) throw validationError();
        return res;
      },
    );
  }
  _sendWebSocketRequest(url, type, bodyHeaders) {
    // TODO: same method as _sendHttpRequest, but send over websocket
    this.state.websocket.send(JSON.stringify({
      url,
      type,
      bodyHeaders,
    }));
  }
  getUserDetails() {
    // GET to /${utype} with "JWT ${token}" in Authorization header
    return this.sendRequest(
      `/${this.state.user.type}s`,
      'GET',
      []
    ).then(
      (response) => {
        Object.assign(this.state.user, response);
        return this.state.user;
      },
      () => null
    );
  }
  getMessages() {
    // GET to /${utype}/${uid}/images with "JWT ${token}" in Authorization header
  }
  getImages() {
    if (this.state.user.utype === 'volunteer') {
      // GET to /${utype}/${uid}s/images with "JWT ${token}" in Authorization header
    }
  }
  websocketMessageHandler(message) {
    console.log(message);
  }
  websocketCloseHandler(e) {
    console.log(e);
  }
  startWebSocket(onMessageHandler, onCloseHandler) {
    this.state.websocket = new WebSocket(`${this.state.apiUrl}${this.state.websocketUrl}`);
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
