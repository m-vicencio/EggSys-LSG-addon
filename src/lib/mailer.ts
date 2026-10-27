import nodemailer from "nodemailer";

function createSmtpConfig() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  const missingVars: string[] = [];
  if (!SMTP_HOST) missingVars.push("SMTP_HOST");
  if (!SMTP_USER) missingVars.push("SMTP_USER");
  if (!SMTP_PASS) missingVars.push("SMTP_PASS");

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required SMTP environment variable(s): ${missingVars.join(
        ", ",
      )}`,
    );
  }

  let port = 587;
  if (SMTP_PORT) {
    const parsedPort = Number(SMTP_PORT);
    if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
      throw new Error(
        `Invalid SMTP_PORT value "${SMTP_PORT}". It must be a positive integer.`,
      );
    }
    port = parsedPort;
  }

  return {
    host: SMTP_HOST as string,
    port,
    auth: {
      user: SMTP_USER as string,
      pass: SMTP_PASS as string,
    },
  };
}

// El transporter se crea al primer envio, no al importar el modulo: asi el
// build (y cualquier ruta que solo importe este archivo) no exige SMTP_*.
let transporter: ReturnType<typeof nodemailer.createTransport> | undefined;

function getTransporter() {
  transporter ??= nodemailer.createTransport(createSmtpConfig());
  return transporter;
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const baseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(
    /\/+$/g,
    "",
  );
  const encodedToken = encodeURIComponent(token);
  const resetLink = `${baseUrl}/reset?token=${encodedToken}`;

  if (!process.env.NEXTAUTH_URL) {
    console.warn(
      "sendPasswordResetEmail: NEXTAUTH_URL is not set, using http://localhost:3000 as fallback in email links.",
    );
  }
  const currentYear = new Date().getFullYear();

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "🔒 Recuperación de contraseña",
    html: `
      <div style="background-color: #f4f4f5; padding: 40px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <div style="background-color: #0f172a; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 600;">
              EGGSYS
            </h1>
          </div>

          <div style="padding: 40px 30px;">
            <h2 style="color: #1e293b; margin-top: 0; font-size: 22px;">¿Olvidaste tu contraseña?</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">Hola,</p>
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">Parece que perdiste el acceso a tu cuenta. No te preocupes, puedes establecer una nueva contraseña de forma segura haciendo clic en el botón de abajo:</p>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                Restablecer mi contraseña
              </a>
            </div>
            
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
            <div style="background-color: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <p style="word-break: break-all; color: #2563eb; font-size: 13px; margin: 0;">${resetLink}</p>
            </div>
          </div>

          <div style="background-color: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.5;">
              Si no solicitaste este cambio, puedes ignorar este correo. Tu cuenta está segura.
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 10px; margin-bottom: 0;">
              © ${currentYear} EggSys. Todos los derechos reservados.
            </p>
          </div>

        </div>
      </div>
    `,
  };

  await getTransporter().sendMail(mailOptions);
}
