import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import VerificarClient from '../VerificarClient';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockedUseSearchParams = vi.mocked(useSearchParams);

function withToken(token: string | null) {
  mockedUseSearchParams.mockReturnValue({
    get: (key: string) => (key === 'token' ? token : null),
  } as unknown as ReturnType<typeof useSearchParams>);
}

describe('VerificarClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sin token en la URL, muestra "enlace inválido" sin llamar al API', () => {
    withToken(null);
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<VerificarClient />);

    expect(screen.getByText('Enlace inválido')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('con un token válido, confirma el correo y muestra el nombre del cliente', async () => {
    withToken('token-valido');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ nombre: 'Ana' }),
    }) as unknown as typeof fetch;

    render(<VerificarClient />);

    expect(screen.getByText('Verificando tu correo…')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('¡Correo confirmado, Ana!')).toBeInTheDocument();
    });
  });

  it('con un token expirado o inválido, muestra el mensaje de error del backend', async () => {
    withToken('token-expirado');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'El enlace ha expirado' }),
    }) as unknown as typeof fetch;

    render(<VerificarClient />);

    await waitFor(() => {
      expect(screen.getByText('Enlace no válido')).toBeInTheDocument();
      expect(screen.getByText('El enlace ha expirado')).toBeInTheDocument();
    });
  });
});
