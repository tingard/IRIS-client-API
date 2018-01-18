/* eslint prefer-arrow-callback: 0, func-names: 0, 'react/jsx-boolean-value': ['error', 'always'],
'react/jsx-filename-extension': 0, no-unused-vars: 0, no-underscore-dangle: 0 */

import assert from 'assert';
import jwt from 'jsonwebtoken';

jest.mock('../httpRequest');

const ApiClient = require('../index.js');

describe('initial configuration without a local token', () => {
  const cli = new ApiClient();
  it('should have a blank token', () => {
    expect(cli.state.token).toBe(null);
  });
  it('should have a blank user', () => {
    expect(cli.state.user).toEqual({});
  });
});

describe('initial configuration with a local token', () => {
  const token = jwt.sign({ foo: 'bar' }, 'shhhhh');
  const type = 'test_user';
  localStorage.setItem('iris-token', token);
  localStorage.setItem('iris-utype', type);
  describe('using `.init()`', () => {
    const cli = new ApiClient();
    it(
      'should have token from storage',
      () => cli.init().then(() => {
        expect.assertions(1);
        expect(cli.state.token).toBe(token);
      })
    );
    it('should have a user type', () => {
      expect.assertions(1);
      expect(cli.state.user).toEqual({ type });
    });
  });
  describe('using `.loadTokenFromStorage()`', () => {
    const cli = new ApiClient();
    cli.loadTokenFromStorage();
    it('should have token from storage', () => {
      expect.assertions(1);
      expect(cli.state.token).toBe(token);
    });
    it('should have a user type', () => {
      expect.assertions(1);
      expect(cli.state.user).toEqual({ type });
    });
  });
});
