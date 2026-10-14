import type { Mock } from 'vitest';

// Atalhos de tipo para os testes. useQuery/useMutation são vi.fn() nos testes
// (vi.mock de @tanstack/react-query em cada arquivo), mas o TypeScript ainda
// os vê com a assinatura real. comoMock dá acesso à API de mock sem `any`.
export function comoMock(fn: unknown) {
  return fn as Mock<(...args: never[]) => unknown>;
}

// O que as telas passam para useMutation e os testes leem.
export type OpcoesDeMutation = {
  mutationFn: (variaveis: unknown) => unknown;
  onSuccess?: (...args: unknown[]) => unknown;
  onError?: (erro: unknown) => unknown;
};

// O que as telas passam para useQuery e os testes leem.
export type OpcoesDeQuery = {
  queryKey: readonly unknown[];
  queryFn?: () => unknown;
};
