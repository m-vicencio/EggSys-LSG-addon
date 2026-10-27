import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y Condiciones | EggSys",
  description: "Términos y condiciones de uso de EggSys.",
};

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-dvh bg-muted/30 px-4 py-10">
      <article className="mx-auto w-full max-w-3xl rounded-2xl border bg-background p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">
          Términos y Condiciones
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Estos términos y condiciones aplican a la aplicación EggSys (en
          adelante, la "Aplicación") para dispositivos móviles, creada por Pipet
          dev (en adelante, el "Proveedor del Servicio") como un servicio
          gratuito.
        </p>

        <section className="mt-8 space-y-4 text-sm leading-7 text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">
            Uso de la Aplicación
          </h2>
          <p>
            Al descargar o utilizar la Aplicación, aceptas automáticamente estos
            términos. Se recomienda leerlos detenidamente antes de usar el
            servicio.
          </p>
          <p>
            Está prohibida la copia, modificación, ingeniería inversa o creación
            de obras derivadas de la Aplicación. Las marcas, derechos de autor,
            derechos de base de datos y demás derechos de propiedad intelectual
            permanecen bajo titularidad del Proveedor del Servicio.
          </p>
          <p>
            El Proveedor del Servicio puede actualizar, modificar o
            eventualmente cobrar por ciertas funciones, informándolo de forma
            clara cuando corresponda.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">
            Conectividad y dispositivo
          </h2>
          <p>
            Algunas funciones requieren conexión activa a internet (Wi-Fi o red
            móvil). El Proveedor del Servicio no se responsabiliza por
            limitaciones de uso debido a falta de conectividad o consumo de
            datos del operador móvil.
          </p>
          <p>
            También es responsabilidad del usuario mantener su dispositivo
            cargado, actualizado y seguro. El uso de dispositivos rooteados o
            con jailbreak puede afectar el funcionamiento y la seguridad de la
            Aplicación.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">
            Limitación de responsabilidad
          </h2>
          <p>
            Aunque se procura mantener la información actualizada y precisa,
            parte del contenido depende de terceros. En consecuencia, el
            Proveedor del Servicio no asume responsabilidad por pérdidas
            directas o indirectas derivadas del uso de la Aplicación.
          </p>
          <p>
            El Proveedor del Servicio puede suspender o finalizar el servicio en
            cualquier momento. Tras la terminación, cesan los derechos de uso y
            deberás dejar de utilizar la Aplicación.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">
            Cambios a estos términos
          </h2>
          <p>
            Estos términos pueden actualizarse periódicamente. Te recomendamos
            revisar esta página de forma regular.
          </p>
          <p>Vigente desde: 2026-04-04.</p>
        </section>

        <section className="mt-8 space-y-2 text-sm leading-7 text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">Contacto</h2>
          <p>
            Si tienes dudas o sugerencias sobre estos términos, puedes escribir
            a
            <a
              className="ml-1 font-medium text-blue-600 hover:underline"
              href="mailto:pipet.dev@gmail.com"
            >
              pipet.dev@gmail.com
            </a>
            .
          </p>
        </section>

        <div className="mt-8 border-t pt-4 text-xs text-muted-foreground">
          Documento adaptado a partir de una plantilla generada con App Privacy
          Policy Generator.
          <div className="mt-2">
            <Link
              href="/privacy-policy"
              className="font-medium text-blue-600 hover:underline"
            >
              Ver Política de Privacidad
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
