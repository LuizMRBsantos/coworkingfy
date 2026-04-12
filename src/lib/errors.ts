/**
 * Erro de negócio padronizado para uso em API Routes.
 * Lançar dentro de transações Prisma ou handlers — capturar no catch do handler.
 *
 * @example
 * throw new AppError("Horário indisponível", "CONFLICT", 409);
 *
 * // No catch:
 * if (e instanceof AppError) {
 *   return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
 * }
 */
export class AppError extends Error {
  constructor(
    public override message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}
