import { Resend } from "resend";

const FROM = process.env.RESEND_FROM ?? "Coworkingfy <noreply@coworkingfy.com.br>";
const BASE_URL = process.env.AUTH_URL ?? "http://localhost:3000";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function providerApprovalHtml({
  providerName,
  osNumber,
  unitName,
  description,
  link,
}: {
  providerName: string;
  osNumber:     string;
  unitName:     string;
  description:  string;
  link:         string;
}): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OS Aprovada</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

          <!-- Header -->
          <tr>
            <td style="background:#18181b;padding:24px 32px;">
              <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">
                Coworkingfy
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:.8px;">
                Ordem de Serviço
              </p>
              <h1 style="margin:0 0 4px;color:#18181b;font-size:22px;font-weight:700;">
                ${osNumber}
              </h1>
              <p style="margin:0 0 24px;color:#52525b;font-size:14px;">
                ${unitName}
              </p>

              <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.6;">
                Olá, <strong>${providerName}</strong>!
              </p>
              <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.6;">
                A ordem de serviço abaixo foi aprovada e está aguardando sua execução:
              </p>

              <!-- OS Card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f4f4f5;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:#52525b;font-size:13px;line-height:1.6;">
                      ${description}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;color:#3f3f46;font-size:15px;line-height:1.6;">
                Clique no botão abaixo para abrir a OS no seu celular, registrar o check-in
                e enviar o relatório de conclusão.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:6px;background:#18181b;">
                    <a href="${link}"
                       style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:-0.2px;">
                      Abrir Ordem de Serviço →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;color:#a1a1aa;font-size:12px;line-height:1.6;">
                Este link é pessoal e expira em 7 dias. Não compartilhe com terceiros.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background:#fafafa;border-top:1px solid #e4e4e7;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;">
                © Coworkingfy — Sistema de Gestão de Coworking
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Funções de disparo
// ---------------------------------------------------------------------------

export interface SendProviderApprovalEmailParams {
  to:           string;
  providerName: string;
  osNumber:     string;
  unitName:     string;
  description:  string;
  token:        string;
}

/**
 * Envia o link mágico ao prestador quando a OS é aprovada.
 * Deve ser chamado FORA da transaction (fire-and-forget).
 * Erros são logados sem propagar para não bloquear a resposta da API.
 */
export async function sendProviderApprovalEmail(
  params: SendProviderApprovalEmailParams,
): Promise<void> {
  const link = `${BASE_URL}/provider/os/${params.token}`;

  await getResend().emails.send({
    from:    FROM,
    to:      params.to,
    subject: `OS ${params.osNumber} aprovada — acesse para iniciar`,
    html:    providerApprovalHtml({
      providerName: params.providerName,
      osNumber:     params.osNumber,
      unitName:     params.unitName,
      description:  params.description,
      link,
    }),
  });
}
