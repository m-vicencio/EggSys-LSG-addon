# 🎨 Guía de Estilos UI/UX y Reglas de Negocio (Frontend)

Este documento define las reglas estrictas de diseño, accesibilidad y redacción (UX Writing) para mantener la consistencia visual en toda la aplicación. Cualquier nuevo componente o vista generada debe adherirse a estos principios.

## 1. UX Writing y Tipografía (Reglas de Oro)
* **Estándar de Títulos (Sentence case):** En español, **SOLO** la primera letra de la frase lleva mayúscula (ej. "Configuración completa", "Saldo actual", "Explorar mi dashboard"). Prohibido usar "Title Case" estilo inglés ("Saldo Actual").
* **Tono y Voz:** Directo, empoderador y cercano. 
* **Economía de palabras:** Evitar la redundancia de pronombres posesivos. (Bien: "Toma el control de tus finanzas" / Mal: "Toma tu control de tus finanzas").
* **Etiquetas (Labels) estandarizadas:** Todos los "eyebrows" o labels de inputs deben usar la misma jerarquía visual para no marear al usuario.
  * Clase base: `text-[11px] font-bold uppercase tracking-widest text-muted-foreground`.

## 2. Accesibilidad (a11y) y Contraste
* **Prohibido el bajo contraste:** Los bordes de tarjetas e inputs no deben ser casi invisibles. 
  * Usar `border-border` o `border-primary/50` para focos, no abusar de opacidades bajas como `/20` en textos o bordes interactivos.
* **Inputs definidos:** Los campos de texto deben parecer campos de texto. Deben tener un borde claro, un `bg-background` y esquinas redondeadas (`rounded-xl`). Prohibido usar inputs "invisibles" (`border-none bg-transparent`) a menos que sea un título gigante muy evidente.
* **Placeholders legibles:** Los textos de relleno deben tener contraste suficiente. Usar `placeholder:text-muted-foreground/60` (nunca menor a `/50`).

## 3. Localización y Formatos (MVP Chile)
* **Moneda (CLP):** El Peso Chileno **NO** tiene decimales. 
  * Los inputs de dinero deben forzar números enteros.
  * Formato de miles: Separados por puntos (ej. `1.000.000`), usando `Intl.NumberFormat("es-CL")`.
* **Indicadores Estáticos:** Si la moneda es fija (CLP), usar un texto estático "CLP" dentro del input (`pointer-events-none`). 
* **Ley de KISS en Selectores:** Prohibido usar un `<select>` nativo si solo hay 1 opción disponible.

## 4. Layout, Simetría y Carga Cognitiva
* **Alineación Visual (Patrón en F):** Los formularios deben mantener un eje principal (generalmente a la izquierda). No mezclar elementos centrados con elementos alineados a la izquierda en la misma tarjeta.
* **Consistencia de Íconos:** Los fondos de los íconos principales deben medir lo mismo para mantener el ritmo (ej. `h-12 w-12 rounded-2xl`).
* **Botones con Íconos:** Si un botón ancho contiene texto y un ícono a la derecha, el texto debe estar 100% centrado. El ícono debe ir con `absolute right-6` para no "empujar" el texto hacia la izquierda.
* **Evitar "Cajas dentro de Cajas":** Agrupar elementos por cercanía y espacio en blanco (Ley de Proximidad de Gestalt). Evitar encerrar sub-formularios en bordes extraños que solo suman ruido visual.

## 5. Interacción del Usuario
* **Anti-Autofill destructivo:** Si el usuario selecciona una sugerencia (ej. Banco), esto no debe sobreescribir campos personalizados (ej. Nombre de la cuenta), debe guardarse en un campo independiente. El sistema no debe asumir que sabe más que el usuario.
* **Áreas de clic generosas:** Los *Switches* o *Checkboxes* deben estar acompañados de un `<Label>` con `cursor-pointer` que ocupe buen espacio para facilitar el tap en móviles.