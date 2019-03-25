/* eslint-disable class-methods-use-this, no-underscore-dangle */
import httpRequest from './httpRequest';
import { validationError, urlB64ToUint8Array, promiseGenerator } from './helperFunctions';


class IrisAPI {
  constructor() {
    // initialize storage
    this.init = this.init.bind(this);
    this.sendRequest = this.sendRequest.bind(this);
    this.subscribeUserToPush = this.subscribeUserToPush.bind(this);
    this.unSubscribeUserToPush = this.unSubscribeUserToPush.bind(this);
    this.updatePushSubscriptionOnServer = this.updatePushSubscriptionOnServer.bind(this);
    let apiUrl;
    if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
      apiUrl = 'http://localhost:3000';
    } else {
      apiUrl = 'https://grapheel-iris-api.herokuapp.com';
    }
    this.state = {
      // apiUrl: 'https://grapheel-iris-api.herokuapp.com',
      apiUrl,
      token: localStorage.getItem('iris-token') || null,
      isLoggedIn: false,
      user: {
        type: localStorage.getItem('iris-utype') || null,
      },
      swRegistration: null,
      shouldPush: false,
      isPushing: false,
    };
  }

  loadTokenFromStorage() {
    const token = localStorage.getItem('iris-token');
    const utype = localStorage.getItem('iris-utype');
    this.state.token = token;
    Object.assign(this.state.user, { type: utype });
  }

  init() {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('iris-token');
      const utype = localStorage.getItem('iris-utype');
      if (token !== null) {
        // we might have a token, check by requesting a re-issue
        // TODO: make this call, and return the associated user details?
        this.state.token = token;
        this.state.user = {
          type: utype,
        };
        this.sendRequest(`/login/verify/${utype}`, 'GET')
          .catch(e => console.warn(e));
        this.state.isLoggedIn = true;
      }
      this.sendRequest('', 'GET', []).then(
        () => null,
        (error) => {
          // the api is not responsive, TODO: how to deal with this?
          reject(error);
        },
      );
      resolve(this.state);
    });
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
          console.log('[IRIS] failed login');
        }
        return response;
      },
      () => ({ success: false }),
    );
  }

  logout() {
    localStorage.removeItem('iris-token');
    localStorage.removeItem('iris-utype');
    document.location.assign('/');
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
        return this.sendRequest(`/images/${payload.imageId}`, 'PUT', payload);
      case 'REPLY_IMAGE':
        return this.sendRequest('/messages', 'POST', payload);
      case 'GET_MESSAGES':
        return this.sendRequest('/messages', 'GET');
      case 'SEND_MESSAGE':
        if (payload.imageId) {
          return this.sendRequest('/messages', 'POST', payload);
        }
        if (payload.messageId) {
          return this.sendRequest(`/messages/${payload.messageId}`, 'POST', payload);
        }
        return this.sendRequest('/messages', 'POST', payload);
      case 'ACCEPT_MESSAGE':
        return this.sendRequest(`/messages/${payload.messageId}/complete`, 'PUT', payload);
      case 'GET_LICENCES':
        return this.sendRequest('/licences', 'GET');
      case 'PURCHASE_LICENCE':
        return this.sendRequest('/licences/purchase', 'POST');
      case 'LINK_LICENCE':
        return this.sendRequest('/students', 'PUT', { details: { licences: payload.licenceId } });
      case 'REGISTER_SERVICE_WORKER':
        success = !!(payload && payload.pushManager);
        if (success) this.state.swRegistration = payload;
        return promiseGenerator(success);
      case 'SUBSCRIBE_TO_PUSH_NOTIFCATIONS':
        this.state.shouldPush = true;
        if (this.state.swRegistration) {
          return this.subscribeUserToPush();
        }
        return promiseGenerator(false, 'No service-worker linked to client API');
      case 'UNSUBSCRIBE_FROM_PUSH_NOTIFICATIONS':
        return this.unSubscribeUserToPush();
      case 'CONFIRM_EMAIL':
        return this.sendRequest(`/confirm/${payload}`, 'GET', {});
      case 'LOGOUT':
        // TODO: send analytics to server
        this.logout();
        return Promise.resolve();
      default:
        return promiseGenerator(false, 'INVALID_ACTION');
    }
  }

  requestPasswordReset({ utype, email }) {
    return this.sendRequest('/login/forgotten', 'POST', { utype, email });
  }

  setNewPassword({ utype, email, pwd, resetLink }) {
    return this.sendRequest(
      `/login/forgotten/${resetLink}`,
      'POST',
      { utype, email, pwd }
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
    return promiseGenerator(false, 'Invalid user type');
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
    return httpRequest(url, type, bodyHeaders, this.state)
      .then(
        (xhr) => {
          if (xhr.status === 200) {
            const responseObject = JSON.parse(xhr.response);
            if (!responseObject.success) {
              throw validationError();
            }
            return responseObject;
          }
          if (xhr.status === 401) {
            console.log('logging out');
            this.logout();
            return null;
          }
          throw new Error('Bad server response');
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
      }
    );
  }

  updatePushSubscriptionOnServer(subscription) {
    // Here's where you would send the subscription to the application server
    if (subscription) {
      const jsonSubscription = JSON.stringify(subscription);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.state.apiUrl}/${this.state.user.type}s/subscribe`, true);
      if (this.state.token !== null) {
        xhr.setRequestHeader('Authorization', `JWT ${this.state.token}`);
      }
      xhr.setRequestHeader('Content-type', 'application/json');
      xhr.send(jsonSubscription);
    }
  }

  subscribeUserToPush() {
    const applicationServerKey = urlB64ToUint8Array('BDIkZeyEv0Xj2xXd0TlTFlDIkCxo50qhbPO0yYNl2BojkEGV-vDvq1vF4K4nrSop3tHdA4Z3-zSNi0gtIJoUMxU');
    if (this.state.swRegistration) {
      return this.state.swRegistration.pushManager.subscribe({
        applicationServerKey,
        userVisibleOnly: true,
      })
        .then(
          (subscription) => {
            this.updatePushSubscriptionOnServer(subscription);
            return true;
          },
          () => false,
        );
    }
    return promiseGenerator(false);
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
        console.log('[IRIS] Error unsubscribing', error);
        return false;
      })
      .then(() => {
        this.updatePushSubscriptionOnServer(null);
        return true;
      });
  }
}

export default IrisAPI;
