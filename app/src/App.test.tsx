import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';
import { Providers } from './app/providers';

describe('App Phase 0', () => {
  it('renders Stage Radar title and Phase 0 status banner', () => {
    render(
      <Providers>
        <App />
      </Providers>
    );
    expect(screen.getByText('Stage Radar')).toBeInTheDocument();
    expect(screen.getByText(/Phase 0 Scaffold opérationnel/i)).toBeInTheDocument();
  });
});
