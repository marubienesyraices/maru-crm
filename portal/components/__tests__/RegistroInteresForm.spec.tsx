import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegistroInteresForm from '../RegistroInteresForm';

describe('RegistroInteresForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('empieza cerrado y muestra el formulario al hacer clic en el botón', async () => {
    const user = userEvent.setup();
    render(<RegistroInteresForm propiedadId="prop-1" />);

    expect(screen.queryByPlaceholderText(/nombre completo/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /registrar interés/i }));

    expect(screen.getByPlaceholderText(/nombre completo/i)).toBeInTheDocument();
  });

  it('envía POST /api/public/registro con los datos del formulario y muestra confirmación', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<RegistroInteresForm propiedadId="prop-123" />);

    await user.click(screen.getByRole('button', { name: /registrar interés/i }));
    await user.type(screen.getByPlaceholderText(/nombre completo/i), 'Juan Pérez');
    await user.type(screen.getByPlaceholderText(/correo electrónico/i), 'juan@example.com');
    await user.click(screen.getByRole('button', { name: /enviar solicitud/i }));

    await waitFor(() => {
      expect(screen.getByText('¡Solicitud enviada!')).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/public/registro'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Juan Pérez',
          email: 'juan@example.com',
          propiedad_id: 'prop-123',
        }),
      }),
    );
  });

  it('muestra el mensaje de error del backend cuando la solicitud falla', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'El correo ya está registrado' }),
    }) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<RegistroInteresForm propiedadId="prop-1" />);

    await user.click(screen.getByRole('button', { name: /registrar interés/i }));
    await user.type(screen.getByPlaceholderText(/nombre completo/i), 'Ana López');
    await user.type(screen.getByPlaceholderText(/correo electrónico/i), 'ana@example.com');
    await user.click(screen.getByRole('button', { name: /enviar solicitud/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('El correo ya está registrado');
    });
  });
});
