import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad | EggSys",
  description: "Política de privacidad de EggSys.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-dvh bg-muted/30 px-4 py-10">
      <article className="mx-auto w-full max-w-3xl rounded-2xl border bg-background p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">
          Política de Privacidad
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Esta política de privacidad aplica a la aplicación EggSys (en
          adelante, la "Aplicación") para dispositivos móviles, creada por Pipet
          dev (en adelante, el "Proveedor del Servicio") como un servicio
          gratuito.
        </p>

        <section className="mt-8 space-y-4 text-sm leading-7 text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">
            Información recopilada
          </h2>
          <p>
            La Aplicación puede recopilar información básica de uso, por
            ejemplo:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Dirección IP del dispositivo.</li>
            <li>Páginas o secciones visitadas, fecha y duración de uso.</li>
            <li>Sistema operativo del dispositivo.</li>
          </ul>
          <p>
            La Aplicación no recopila ubicación precisa del dispositivo y no
            utiliza tecnologías de IA para procesar datos o entregar
            funcionalidades.
          </p>
          <p>
            Para operar el servicio, pueden solicitarse datos personales como
            correo electrónico y nombre.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">
            Uso y compartición
          </h2>
          <p>
            El Proveedor del Servicio puede usar la información para
            comunicaciones importantes, avisos requeridos y promociones.
          </p>
          <p>
            Solo datos agregados o anonimizados pueden compartirse con terceros
            para mejorar el servicio. También puede existir divulgación por
            obligación legal o para proteger derechos y seguridad.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">
            Retención y eliminación
          </h2>
          <p>
            Los datos se conservan mientras uses la Aplicación y por un tiempo
            razonable posterior. Puedes solicitar la eliminación de tus datos
            escribiendo a
            <a
              className="ml-1 font-medium text-blue-600 hover:underline"
              href="mailto:pipet.dev@gmail.com"
            >
              pipet.dev@gmail.com
            </a>
            .
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">
            Menores de edad
          </h2>
          <p>
            El servicio no está dirigido a menores de 13 años y no busca
            recopilar datos personales de forma intencional de menores.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">
            Cambios de política
          </h2>
          <p>
            Esta política puede actualizarse periódicamente. El uso continuado
            de la Aplicación implica aceptación de los cambios publicados.
          </p>
          <p>Vigente desde: 2026-04-04.</p>
        </section>

        <div className="mt-8 border-t pt-4 text-xs text-muted-foreground">
          Documento adaptado a partir de una plantilla generada con App Privacy
          Policy Generator.
          <div className="mt-2">
            <Link
              href="/terms-and-conditions"
              className="font-medium text-blue-600 hover:underline"
            >
              Ver Términos y Condiciones
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
