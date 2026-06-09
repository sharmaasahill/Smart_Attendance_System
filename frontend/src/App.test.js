import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// Mock browser APIs not available in jsdom
beforeAll(() => {
  // IntersectionObserver (needed by framer-motion viewport features)
  global.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Suppress act() and react-router deprecation warnings
  jest.spyOn(console, 'error').mockImplementation((msg) => {
    if (typeof msg === 'string' && (msg.includes('act(') || msg.includes('deprecated'))) return;
  });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('App', () => {
  it('renders the home page by default', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    // The Navbar brand link is always visible
    expect(screen.getAllByText('SAS').length).toBeGreaterThan(0);
  });

  it('redirects unauthenticated users from /dashboard to /login', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );
    // Login page has a sign-in button
    expect(screen.getAllByText(/sign in/i).length).toBeGreaterThan(0);
  });

  it('redirects unauthenticated users from /profile to /login', () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getAllByText(/sign in/i).length).toBeGreaterThan(0);
  });
});
