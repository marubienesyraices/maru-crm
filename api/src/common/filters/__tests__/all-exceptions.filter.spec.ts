import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import * as fs from 'fs';
import { AllExceptionsFilter } from '../all-exceptions.filter';

jest.mock('fs');

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (fs.appendFileSync as jest.Mock).mockReset().mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mockHost(method = 'GET', url = '/api/propiedades'): ArgumentsHost {
    return {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
        getRequest: () => ({ method, url }),
      }),
    } as unknown as ArgumentsHost;
  }

  it('debe usar el status de una HttpException', () => {
    const exception = new HttpException('No encontrado', HttpStatus.NOT_FOUND);
    filter.catch(exception, mockHost());

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'No encontrado',
        path: '/api/propiedades',
      }),
    );
  });

  it('debe usar 500 para excepciones que no son HttpException', () => {
    const exception = new Error('boom inesperado');
    filter.catch(exception, mockHost('POST', '/api/clientes'));

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, message: 'boom inesperado' }),
    );
  });

  it('debe usar un mensaje genérico si la excepción no es un Error', () => {
    filter.catch('algo raro no-Error', mockHost());

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, message: 'Unknown error' }),
    );
  });

  it('debe incluir timestamp ISO y el path del request en la respuesta', () => {
    filter.catch(
      new HttpException('x', HttpStatus.BAD_REQUEST),
      mockHost('PUT', '/api/tenants/1'),
    );

    const body = jsonMock.mock.calls[0][0];
    expect(body.path).toBe('/api/tenants/1');
    expect(() => new Date(body.timestamp).toISOString()).not.toThrow();
  });

  it('debe escribir el error en el log de archivo (global_error.log)', () => {
    filter.catch(new Error('para el log'), mockHost('DELETE', '/api/x/1'));

    expect(fs.appendFileSync).toHaveBeenCalledTimes(1);
    const [, contents] = (fs.appendFileSync as jest.Mock).mock.calls[0];
    expect(contents).toContain('DELETE /api/x/1');
    expect(contents).toContain('para el log');
  });
});
