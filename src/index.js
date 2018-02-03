/* eslint-disable class-methods-use-this, no-underscore-dangle */
import jwtLib from 'jsonwebtoken';
import httpRequest from './httpRequest';
// import registerServiceWorker from './register-service-worker';

// TODO: combine request calls to ease server load?
// TODO: clever caching for instantaneous load

const validationError = () => ({ name: 'Validation Error', message: 'Not successful API call' });

function urlB64ToUint8Array(base64String) {
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

class IrisAPI {
  constructor() {
    // initialize storage
    // check API is online
    // TODO: get existing token from storage and check if it's expired
    this.init = this.init.bind(this);
    this.sendRequest = this.sendRequest.bind(this);
    this.subscribeUserToPush = this.subscribeUserToPush.bind(this);
    this.unSubscribeUserToPush = this.unSubscribeUserToPush.bind(this);
    this.updatePushSubscriptionOnServer = this.updatePushSubscriptionOnServer.bind(this);
    this.state = {
      // apiUrl: 'https://grapheel-iris-api.herokuapp.com',
      apiUrl: 'http://127.0.0.1:3000',
      token: null,
      isLoggedIn: false,
      user: {},
      apiResponse: {
        key: null,
        data: {},
      },
      swRegistration: null,
      shouldPush: false,
      isPushing: false,
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
    let success = false;
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
        if (payload.imageId) {
          return this.sendRequest('/messages', 'POST', payload);
        } else if (payload.messageId) {
          return this.sendRequest(`/messages/${payload.messageId}`, 'POST', payload);
        }
        return this.sendRequest('/messages', 'POST', payload);
      case 'REGISTER_SERVICE_WORKER':
        success = !!(payload && payload.pushManager);
        if (success) this.state.swRegistration = payload;
        return new Promise((resolve) => {
          resolve({ success });
        });
      case 'SUBSCRIBE_TO_PUSH_NOTIFCATIONS':
        this.state.shouldPush = true;
        if (this.state.swRegistration) {
          return this.subscribeUserToPush();
        }
        return new Promise((r, rej) => {
          rej({ success: false });
        });
      case 'UNSUBSCRIBE_FROM_PUSH_NOTIFICATIONS':
        return this.unSubscribeUserToPush();
      default:
        return new Promise((r, rej) => {
          rej({ success: false });
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
    return httpRequest(url, type, bodyHeaders, this.state).then(
      (res) => {
        if (!res.success) throw validationError();
        return res;
      },
    );
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
  // registerServiceWorker() {
  //   if (!this.state.user) return false;
  //   return registerServiceWorker(`${this.state.user.type}`)
  //     .then(
  //       (res) => { this.state.serviceWorker = res; },
  //       (err) => { console.error(err); }
  //     );
  // }
  updatePushSubscriptionOnServer(subscription) {
    // Here's where you would send the subscription to the application server
    if (subscription) {
      const jsonSubscription = JSON.stringify(subscription);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.state.apiUrl}/push/subscribe`, true);
      xhr.setRequestHeader('Content-type', 'application/json');
      xhr.onload = function xhrOnload() {
        // do something to response
        console.log(this.responseText);
      };
      xhr.send(jsonSubscription);
    }
  }
  subscribeUserToPush() {
    const applicationServerKey = urlB64ToUint8Array('BDIkZeyEv0Xj2xXd0TlTFlDIkCxo50qhbPO0yYNl2BojkEGV-vDvq1vF4K4nrSop3tHdA4Z3-zSNi0gtIJoUMxU');
    if (this.state.swRegistration) {
      return this.state.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })
        .then((subscription) => {
          console.log('User is subscribed:', subscription);
          this.updatePushSubscriptionOnServer(subscription);
          return true;
        })
        .catch((err) => {
          if (Notification.permission === 'denied') {
            console.warn('Permission for notifications was denied');
          } else {
            console.error('Failed to subscribe the user: ', err);
          }
          return false;
        });
    }
    return new Promise((resolve) => {
      resolve({ success: false });
    });
  }

  unSubscribeUserToPush() {
    this.state.swRegistration.pushManager.getSubscription()
      .then((subscription) => {
        if (subscription) {
          return subscription.unsubscribe();
        }
        return null;
      })
      .catch((error) => {
        console.log('Error unsubscribing', error);
        return false;
      })
      .then(() => {
        this.updatePushSubscriptionOnServer(null);
        console.log('User is unsubscribed');
        return true;
      });
  }
}

export default IrisAPI;
