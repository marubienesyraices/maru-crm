import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { useAuthStore } from '../../stores/authStore';

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

const mockedUseAuthStore = vi.mocked(useAuthStore);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>Página de login</div>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Contenido protegido</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('redirige a /login cuando no hay sesión activa', () => {
    mockedUseAuthStore.mockReturnValue({ user: null, accessToken: null } as never);

    renderAt('/dashboard');

    expect(screen.getByText('Página de login')).toBeInTheDocument();
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
  });

  it('redirige a /login si hay token pero no hay usuario (token corrupto)', () => {
    mockedUseAuthStore.mockReturnValue({ user: null, accessToken: 'algo' } as never);

    renderAt('/dashboard');

    expect(screen.getByText('Página de login')).toBeInTheDocument();
  });

  it('renderiza los children cuando hay sesión activa', () => {
    mockedUseAuthStore.mockReturnValue({
      user: { sub: 'u1', tenantId: 't1', email: 'a@b.com', rol: 'ADMIN' },
      accessToken: 'token-valido',
    } as never);

    renderAt('/dashboard');

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
  });
});
