import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';
import { Providers } from './app/providers';

describe('App', () => {
  it('mounts App with providers without crashing', () => {
    const { container } = render(
      <Providers>
        <App />
      </Providers>
    );
    expect(container).toBeDefined();
  });
});
