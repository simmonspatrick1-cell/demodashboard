// Ensure React thinks tests already run inside `act()` so it doesn't log noisy warnings.
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Ensure libraries that still import the legacy ReactDOM act use the React 18 version.
jest.mock('react-dom/test-utils', () => {
  const actual = jest.requireActual('react-dom/test-utils');
  const react = jest.requireActual('react');
  return { ...actual, act: react.act };
});
