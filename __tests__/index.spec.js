/* eslint prefer-arrow-callback: 0, func-names: 0, 'react/jsx-boolean-value': ['error', 'always'],
'react/jsx-filename-extension': 0, no-unused-vars: 0, no-underscore-dangle: 0 */

import assert from 'assert';
import jwt from 'jsonwebtoken';

const ApiClient = require('../index.js');

describe('initial configuration without a local token', () => {
  const cli = new ApiClient();
  it('should have a blank token', () => {
    expect(cli.state._token).toBe(null);
  });
  it('should have a blank user', () => {
    expect(cli.state.user).toBe(null);
  });
});

describe('initial configuration with a local token', () => {
  const token = jwt.sign({ foo: 'bar' }, 'shhhhh');
  localStorage.setItem('iris-token', token);
  const cli = new ApiClient();
  it('should have token from storage', () => {
    expect(cli.state._token).toBe(token);
  });
});

describe('initial configuration with a local token', () => {
  const token = jwt.sign({ foo: 'bar' }, 'shhhhh');
  localStorage.setItem('iris-token', token);
  const cli = new ApiClient();
  it('should have token from storage', () => {
    expect(cli.state._token).toBe(token);
  });
  it('should have a blank user', () => {
    expect(cli.state.user).toBe(null);
  });
});
