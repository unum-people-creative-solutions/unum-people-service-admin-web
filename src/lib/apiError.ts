// Erro lançado pelos clientes HTTP do admin (apiFetch e fetchWithAuth) quando
// a resposta não é 2xx. Guarda o status para a tela distinguir, por exemplo,
// um 409 de conflito de uma falha genérica.
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
