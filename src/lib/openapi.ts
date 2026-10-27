import type { OpenAPIV3 } from "openapi-types";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers reutilizables
// ─────────────────────────────────────────────────────────────────────────────

const errorResponse = (description: string): OpenAPIV3.ResponseObject => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ErrorMessage" },
    },
  },
});

const validationError: OpenAPIV3.ResponseObject = {
  description: "Error de validación en el body",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ValidationError" },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Spec principal
// ─────────────────────────────────────────────────────────────────────────────

export const openApiSpec: OpenAPIV3.Document = {
  openapi: "3.0.3",

  info: {
    title: "EggSys API",
    version: "1.0.0",
    description: `
API REST para gestionar finanzas personales.  
Permite registrar **ingresos y egresos** por cuenta bancaria, organizar **presupuestos** por categoría y consultar el historial de transacciones.

## Autenticación
Los endpoints usan sesiones JWT gestionadas por **NextAuth.js**.  
Para autenticarte, realiza \`POST /api/auth/register\` y luego \`POST /api/auth/signin\`.

## Notas sobre Decimal
Los campos \`balance\`, \`amount\` e \`idealAmount\` se devuelven como **string numérico** (ej: \`"1500.00"\`) por el serializador de Prisma Decimal.
    `.trim(),
    contact: {
      name: "EggSys",
    },
  },

  servers: [{ url: "http://localhost:3000", description: "Desarrollo local" }],

  tags: [
    { name: "Auth", description: "Registro e inicio de sesión" },
    { name: "Users", description: "Gestión de usuarios" },
    { name: "Accounts", description: "Cuentas bancarias del usuario" },
    { name: "Transactions", description: "Ingresos y egresos por cuenta" },
    { name: "Budgets", description: "Presupuestos por categoría" },
    { name: "Categories", description: "Categorías por usuario" },
    {
      name: "LifeSync",
      description:
        "Addon sensor LifeSync-Games: vínculo de perfil y eventos conductuales (sin montos)",
    },
  ],

  // ─── Components ───────────────────────────────────────────────────────────
  components: {
    schemas: {
      // ── Genéricos ──────────────────────────────────────────────────────────
      ErrorMessage: {
        type: "object",
        properties: {
          message: { type: "string", example: "Resource not found" },
        },
        required: ["message"],
      },
      ValidationError: {
        type: "object",
        properties: {
          message: { type: "string", example: "Validation error" },
          errors: {
            type: "object",
            additionalProperties: {
              type: "array",
              items: { type: "string" },
            },
            example: { email: ["Invalid email"], name: ["Required"] },
          },
        },
        required: ["message"],
      },

      // ── Enums ──────────────────────────────────────────────────────────────
      TransactionType: {
        type: "string",
        enum: ["INCOME", "EXPENSE"],
        description: "INCOME = Ingreso · EXPENSE = Egreso",
      },
      MoneySource: {
        type: "string",
        enum: ["FATHER", "MOTHER", "SIBLING", "BOSS", "SELF"],
        description:
          "Fuente del dinero (solo aplica cuando type = INCOME). FATHER=Padre, MOTHER=Madre, SIBLING=Hermano/a, BOSS=Jefe, SELF=Yo",
      },
      CategorySlug: {
        type: "string",
        enum: [
          "TRANSPORT",
          "RESTAURANT",
          "GYM",
          "GIFTS",
          "SUPERMARKET",
          "INVESTMENTS",
          "COFFEE",
          "SALARY",
          "TAXI",
          "INTERNET",
          "HEALTH",
          "FUN",
          "RENT",
          "SOCIAL",
          "RESIDENCE",
          "PET",
          "BABY",
          "TRAVEL",
          "EDUCATION",
          "OTHER",
        ],
      },

      // ── Modelos ────────────────────────────────────────────────────────────
      User: {
        type: "object",
        properties: {
          id: { type: "string", example: "clxyz123abc" },
          email: {
            type: "string",
            format: "email",
            example: "juan@example.com",
          },
          name: { type: "string", nullable: true, example: "Juan Pérez" },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2026-02-17T10:00:00.000Z",
          },
        },
        required: ["id", "email", "createdAt"],
      },

      BankAccount: {
        type: "object",
        properties: {
          id: { type: "string", example: "clxyz456def" },
          name: { type: "string", example: "Cuenta corriente BancoEstado" },
          balance: {
            type: "string",
            description: "Saldo actual (Decimal serializado como string)",
            example: "250000.00",
          },
          userId: { type: "string", example: "clxyz123abc" },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2026-02-17T10:00:00.000Z",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            example: "2026-02-17T12:30:00.000Z",
          },
        },
        required: ["id", "name", "balance", "userId", "createdAt", "updatedAt"],
      },

      Category: {
        type: "object",
        properties: {
          id: { type: "string", example: "clxyz789ghi" },
          userId: { type: "string", nullable: true },
          name: { type: "string", example: "Supermercado" },
          type: { $ref: "#/components/schemas/TransactionType" },
          iconName: { type: "string", example: "ShoppingBagIcon" },
          color: { type: "string", example: "#f97316" },
          isActive: { type: "boolean", example: true },
          isDefault: { type: "boolean", example: false },
        },
        required: [
          "id",
          "name",
          "type",
          "iconName",
          "color",
          "isActive",
          "isDefault",
        ],
      },

      Transaction: {
        type: "object",
        properties: {
          id: { type: "string", example: "clxyz000jkl" },
          name: { type: "string", example: "Compra semana" },
          amount: {
            type: "string",
            description: "Monto (Decimal serializado como string)",
            example: "35400.00",
          },
          date: {
            type: "string",
            format: "date-time",
            example: "2026-02-15T14:30:00.000Z",
          },
          month: {
            type: "integer",
            minimum: 1,
            maximum: 12,
            example: 2,
          },
          year: { type: "integer", example: 2026 },
          type: { $ref: "#/components/schemas/TransactionType" },
          source: {
            allOf: [{ $ref: "#/components/schemas/MoneySource" }],
            nullable: true,
            description: "Solo presente si type = INCOME",
          },
          accountId: { type: "string", example: "clxyz456def" },
          categoryId: { type: "string", example: "clxyz789ghi" },
          userId: { type: "string", example: "clxyz123abc" },
          account: { $ref: "#/components/schemas/BankAccount" },
          category: { $ref: "#/components/schemas/Category" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        required: [
          "id",
          "name",
          "amount",
          "date",
          "month",
          "year",
          "type",
          "accountId",
          "categoryId",
          "userId",
          "createdAt",
          "updatedAt",
        ],
      },

      Budget: {
        type: "object",
        properties: {
          id: { type: "string", example: "clxyz111mno" },
          name: { type: "string", example: "Presupuesto supermercado" },
          idealAmount: {
            type: "string",
            description: "Monto ideal (Decimal serializado como string)",
            example: "150000.00",
          },
          categoryId: { type: "string", example: "clxyz789ghi" },
          userId: { type: "string", example: "clxyz123abc" },
          category: { $ref: "#/components/schemas/Category" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        required: [
          "id",
          "name",
          "idealAmount",
          "categoryId",
          "userId",
          "createdAt",
          "updatedAt",
        ],
      },
    },
  },

  // ─── Paths ────────────────────────────────────────────────────────────────
  paths: {
    // ════════════════════════════════════════════════════════════════════════
    // AUTH
    // ════════════════════════════════════════════════════════════════════════
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Registrar nuevo usuario",
        description:
          "Crea una cuenta nueva con email y contraseña. La contraseña se almacena como hash bcrypt.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "name", "password"],
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    example: "juan@example.com",
                  },
                  name: { type: "string", minLength: 1, example: "Juan Pérez" },
                  password: {
                    type: "string",
                    minLength: 6,
                    example: "mipassword123",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Usuario registrado exitosamente",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          "400": {
            description: "Email ya registrado o error de validación",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { $ref: "#/components/schemas/ErrorMessage" },
                    { $ref: "#/components/schemas/ValidationError" },
                  ],
                },
              },
            },
          },
          "500": errorResponse("Error interno del servidor"),
        },
      },
    },

    // ════════════════════════════════════════════════════════════════════════
    // USERS
    // ════════════════════════════════════════════════════════════════════════
    "/api/users": {
      get: {
        tags: ["Users"],
        summary: "Listar todos los usuarios",
        description: "Devuelve la lista de usuarios sin exponer la contraseña.",
        responses: {
          "200": {
            description: "Lista de usuarios",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/User" },
                },
              },
            },
          },
          "500": errorResponse("Error interno del servidor"),
        },
      },
    },

    "/api/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Obtener usuario por ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            example: "clxyz123abc",
          },
        ],
        responses: {
          "200": {
            description: "Usuario encontrado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          "404": errorResponse("Usuario no encontrado"),
          "500": errorResponse("Error interno del servidor"),
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Actualizar nombre o email",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", minLength: 1, example: "Juan" },
                  email: {
                    type: "string",
                    format: "email",
                    example: "nuevo@email.com",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Usuario actualizado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          "400": {
            description: "Error de validación",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ValidationError" },
              },
            },
          },
          "500": errorResponse("Error interno del servidor"),
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Eliminar usuario",
        description:
          "Elimina el usuario y en cascada sus cuentas, transacciones y presupuestos.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "204": { description: "Usuario eliminado (sin contenido)" },
          "500": errorResponse("Error interno del servidor"),
        },
      },
    },

    // ════════════════════════════════════════════════════════════════════════
    // ACCOUNTS
    // ════════════════════════════════════════════════════════════════════════
    "/api/accounts": {
      get: {
        tags: ["Accounts"],
        summary: "Listar cuentas de un usuario",
        parameters: [
          {
            name: "userId",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "ID del usuario propietario de las cuentas",
            example: "clxyz123abc",
          },
        ],
        responses: {
          "200": {
            description: "Lista de cuentas bancarias",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/BankAccount" },
                },
              },
            },
          },
          "400": errorResponse("Falta el parámetro userId"),
          "500": errorResponse("Error interno del servidor"),
        },
      },
      post: {
        tags: ["Accounts"],
        summary: "Crear cuenta bancaria",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "userId"],
                properties: {
                  name: {
                    type: "string",
                    minLength: 1,
                    example: "Cuenta BancoEstado",
                  },
                  balance: {
                    type: "number",
                    description: "Saldo inicial (default 0)",
                    example: 100000,
                  },
                  userId: { type: "string", example: "clxyz123abc" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Cuenta creada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BankAccount" },
              },
            },
          },
          "400": {
            description: "Validación fallida",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ValidationError" },
              },
            },
          },
          "500": errorResponse("Error interno del servidor"),
        },
      },
    },

    "/api/accounts/{id}": {
      get: {
        tags: ["Accounts"],
        summary: "Obtener cuenta por ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Cuenta encontrada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BankAccount" },
              },
            },
          },
          "404": errorResponse("Cuenta no encontrada"),
          "500": errorResponse("Error interno del servidor"),
        },
      },
      patch: {
        tags: ["Accounts"],
        summary: "Actualizar nombre o saldo de cuenta",
        description:
          "⚠️ Actualizar `balance` directamente sobreescribe el saldo calculado. Usa las transacciones para mover dinero de forma trazable.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", minLength: 1, example: "Mi cuenta" },
                  balance: { type: "number", example: 250000 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Cuenta actualizada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BankAccount" },
              },
            },
          },
          "400": {
            description: "Validación fallida",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ValidationError" },
              },
            },
          },
          "500": errorResponse("Error interno del servidor"),
        },
      },
      delete: {
        tags: ["Accounts"],
        summary: "Eliminar cuenta",
        description: "Elimina la cuenta y en cascada todas sus transacciones.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "204": { description: "Cuenta eliminada" },
          "500": errorResponse("Error interno del servidor"),
        },
      },
    },

    // ════════════════════════════════════════════════════════════════════════
    // TRANSACTIONS
    // ════════════════════════════════════════════════════════════════════════
    "/api/transactions": {
      get: {
        tags: ["Transactions"],
        summary: "Listar transacciones",
        description:
          "Devuelve las transacciones de un usuario. Se puede filtrar además por cuenta bancaria. Incluye los datos de `account` y `category` anidados.",
        parameters: [
          {
            name: "userId",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "ID del usuario",
          },
          {
            name: "accountId",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filtrar solo por esta cuenta (opcional)",
          },
        ],
        responses: {
          "200": {
            description: "Lista de transacciones ordenadas por fecha desc",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Transaction" },
                },
              },
            },
          },
          "400": errorResponse("Falta el parámetro userId"),
          "500": errorResponse("Error interno del servidor"),
        },
      },
      post: {
        tags: ["Transactions"],
        summary: "Crear transacción",
        description:
          "Registra un ingreso o egreso. **El saldo de la cuenta asociada se actualiza automáticamente**: INCOME suma, EXPENSE resta.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "name",
                  "amount",
                  "month",
                  "year",
                  "type",
                  "accountId",
                  "categoryId",
                  "userId",
                ],
                properties: {
                  name: {
                    type: "string",
                    minLength: 1,
                    example: "Sueldo febrero",
                  },
                  amount: {
                    type: "number",
                    minimum: 0.01,
                    example: 1500000,
                  },
                  date: {
                    type: "string",
                    format: "date-time",
                    description: "Fecha de la transacción (default: ahora)",
                    example: "2026-02-01T08:00:00.000Z",
                  },
                  month: {
                    type: "integer",
                    minimum: 1,
                    maximum: 12,
                    example: 2,
                  },
                  year: { type: "integer", minimum: 2000, example: 2026 },
                  type: { $ref: "#/components/schemas/TransactionType" },
                  source: {
                    allOf: [{ $ref: "#/components/schemas/MoneySource" }],
                    description: "Solo si type = INCOME",
                  },
                  accountId: {
                    type: "string",
                    example: "clxyz456def",
                  },
                  categoryId: {
                    type: "string",
                    example: "clxyz789ghi",
                  },
                  userId: {
                    type: "string",
                    example: "clxyz123abc",
                  },
                },
              },
              examples: {
                ingreso: {
                  summary: "Ingreso de sueldo",
                  value: {
                    name: "Sueldo febrero",
                    amount: 1500000,
                    month: 2,
                    year: 2026,
                    type: "INCOME",
                    source: "BOSS",
                    accountId: "clxyz456def",
                    categoryId: "clxyz789ghi",
                    userId: "clxyz123abc",
                  },
                },
                egreso: {
                  summary: "Gasto en supermercado",
                  value: {
                    name: "Compra semanal Jumbo",
                    amount: 45000,
                    month: 2,
                    year: 2026,
                    type: "EXPENSE",
                    accountId: "clxyz456def",
                    categoryId: "clxyz789ghi",
                    userId: "clxyz123abc",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Transacción creada y saldo de cuenta actualizado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Transaction" },
              },
            },
          },
          "400": validationError,
          "500": errorResponse("Error interno del servidor"),
        },
      },
    },

    "/api/transactions/{id}": {
      get: {
        tags: ["Transactions"],
        summary: "Obtener transacción por ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description:
              "Transacción encontrada con account y category anidados",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Transaction" },
              },
            },
          },
          "404": errorResponse("Transacción no encontrada"),
          "500": errorResponse("Error interno del servidor"),
        },
      },
      patch: {
        tags: ["Transactions"],
        summary: "Actualizar transacción",
        description:
          "Actualiza los campos enviados. Si cambian `amount` o `type`, el saldo de la cuenta se recalcula automáticamente (revierte el efecto anterior y aplica el nuevo).",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", minLength: 1 },
                  amount: { type: "number", minimum: 0.01 },
                  date: { type: "string", format: "date-time" },
                  month: { type: "integer", minimum: 1, maximum: 12 },
                  year: { type: "integer", minimum: 2000 },
                  type: { $ref: "#/components/schemas/TransactionType" },
                  source: { $ref: "#/components/schemas/MoneySource" },
                  categoryId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Transacción actualizada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Transaction" },
              },
            },
          },
          "400": validationError,
          "500": errorResponse("Error interno del servidor"),
        },
      },
      delete: {
        tags: ["Transactions"],
        summary: "Eliminar transacción",
        description:
          "Elimina la transacción y **revierte su efecto en el saldo** de la cuenta asociada.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "204": { description: "Transacción eliminada y saldo revertido" },
          "500": errorResponse("Error interno del servidor"),
        },
      },
    },

    // ════════════════════════════════════════════════════════════════════════
    // BUDGETS
    // ════════════════════════════════════════════════════════════════════════
    "/api/budgets": {
      get: {
        tags: ["Budgets"],
        summary: "Listar presupuestos de un usuario",
        description:
          "Devuelve los presupuestos del usuario con la categoría anidada.",
        parameters: [
          {
            name: "userId",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "ID del usuario",
          },
        ],
        responses: {
          "200": {
            description: "Lista de presupuestos",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Budget" },
                },
              },
            },
          },
          "400": errorResponse("Falta el parámetro userId"),
          "500": errorResponse("Error interno del servidor"),
        },
      },
      post: {
        tags: ["Budgets"],
        summary: "Crear presupuesto",
        description:
          "Define un monto ideal de gasto/ingreso para una categoría.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "idealAmount", "categoryId", "userId"],
                properties: {
                  name: {
                    type: "string",
                    minLength: 1,
                    example: "Presupuesto comida",
                  },
                  idealAmount: {
                    type: "number",
                    minimum: 0.01,
                    example: 200000,
                  },
                  categoryId: {
                    type: "string",
                    example: "clxyz789ghi",
                  },
                  userId: {
                    type: "string",
                    example: "clxyz123abc",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Presupuesto creado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Budget" },
              },
            },
          },
          "400": validationError,
          "500": errorResponse("Error interno del servidor"),
        },
      },
    },

    "/api/budgets/{id}": {
      get: {
        tags: ["Budgets"],
        summary: "Obtener presupuesto por ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Presupuesto encontrado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Budget" },
              },
            },
          },
          "404": errorResponse("Presupuesto no encontrado"),
          "500": errorResponse("Error interno del servidor"),
        },
      },
      patch: {
        tags: ["Budgets"],
        summary: "Actualizar presupuesto",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", minLength: 1 },
                  idealAmount: { type: "number", minimum: 0.01 },
                  categoryId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Presupuesto actualizado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Budget" },
              },
            },
          },
          "400": validationError,
          "500": errorResponse("Error interno del servidor"),
        },
      },
      delete: {
        tags: ["Budgets"],
        summary: "Eliminar presupuesto",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "204": { description: "Presupuesto eliminado" },
          "500": errorResponse("Error interno del servidor"),
        },
      },
    },

    // ════════════════════════════════════════════════════════════════════════
    // CATEGORIES
    // ════════════════════════════════════════════════════════════════════════
    "/api/categories": {
      get: {
        tags: ["Categories"],
        summary: "Listar todas las categorías",
        description:
          "Devuelve las categorías del usuario autenticado ordenadas por nombre. Si aún no existen, se crean las categorías por defecto.",
        responses: {
          "200": {
            description: "Lista de categorías ordenadas alfabéticamente",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Category" },
                  example: [
                    { id: "abc", name: "Arriendo", slug: "RENT" },
                    { id: "def", name: "Bebé", slug: "BABY" },
                    { id: "ghi", name: "Café", slug: "COFFEE" },
                  ],
                },
              },
            },
          },
          "500": errorResponse("Error interno del servidor"),
        },
      },
    },

    // ════════════════════════════════════════════════════════════════════════
    // LIFESYNC (addon sensor LSG)
    // ════════════════════════════════════════════════════════════════════════
    "/api/lsg/connection": {
      get: {
        tags: ["LifeSync"],
        summary: "Estado del vínculo con LifeSync-Games",
        responses: {
          "200": {
            description: "Estado del addon y del vínculo del usuario",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        addonEnabled: { type: "boolean" },
                        connection: {
                          type: "object",
                          nullable: true,
                          properties: {
                            lsgPlayerId: { type: "integer", example: 42 },
                            lsgEmail: { type: "string" },
                            enabled: { type: "boolean" },
                            disabledEvents: {
                              type: "array",
                              items: { type: "string" },
                            },
                            linkedAt: { type: "string", format: "date-time" },
                            lastSyncAt: {
                              type: "string",
                              format: "date-time",
                              nullable: true,
                            },
                            needsRelink: {
                              type: "boolean",
                              description:
                                "Sesión muerta y sin forma de recuperarse sola: hay que pedir la contraseña.",
                            },
                            adapterReachable: {
                              type: "boolean",
                              description:
                                "false si el adaptador no respondió; el resto del estado puede estar desactualizado.",
                            },
                            credentialConsent: { type: "boolean" },
                            credentialState: {
                              type: "string",
                              enum: ["NONE", "ACTIVE", "INVALID", "UNREADABLE"],
                            },
                            brokenReason: {
                              type: "string",
                              nullable: true,
                              description:
                                "Rotura del lado LSG (p. ej. player_not_found), distinta del kill switch.",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": errorResponse("No autenticado"),
          "500": errorResponse("Error interno del servidor"),
        },
      },
      post: {
        tags: ["LifeSync"],
        summary: "Vincular perfil LSG",
        description:
          "Valida las credenciales contra LSG-Auth vía el adaptador y guarda solo el id de jugador. La contraseña se descarta tras el login, salvo que storeCredential sea true: en ese caso el adaptador la guarda cifrada para renovar la sesión automáticamente cuando expire.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                  storeCredential: {
                    type: "boolean",
                    default: false,
                    description:
                      "Opt-in explícito a guardar la contraseña cifrada en el adaptador para la reconexión automática.",
                  },
                },
                required: ["email", "password"],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Vínculo creado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    lsgPlayerId: { type: "integer" },
                    lsgEmail: { type: "string" },
                    enabled: { type: "boolean" },
                    credentialConsent: { type: "boolean" },
                    credentialState: {
                      type: "string",
                      enum: ["NONE", "ACTIVE", "INVALID", "UNREADABLE"],
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Error de validación",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ValidationError" },
              },
            },
          },
          "401": errorResponse("Credenciales LSG inválidas"),
          "503": errorResponse(
            "Addon deshabilitado, adaptador no disponible o sin cifrado configurado",
          ),
        },
      },
      delete: {
        tags: ["LifeSync"],
        summary: "Desvincular perfil LSG",
        description:
          "Borra en el adaptador el token de sesión y la contraseña guardada, y después el vínculo local. Si el adaptador no lo confirma, responde 503 y el vínculo local se mantiene. Los eventos ya sincronizados permanecen en LSG (datos del estudio).",
        responses: {
          "200": { description: "Desvinculado" },
          "401": errorResponse("No autenticado"),
          "503": errorResponse("Adaptador no disponible; no se desvinculó"),
          "500": errorResponse("Error interno del servidor"),
        },
      },
    },

    "/api/lsg/connection/credential": {
      delete: {
        tags: ["LifeSync"],
        summary: "Revocar la contraseña guardada",
        description:
          "Borra la contraseña cifrada del adaptador y desactiva la reconexión automática, sin desvincular. La sesión actual se conserva hasta que expire por su cuenta.",
        responses: {
          "200": { description: "Credencial revocada" },
          "401": errorResponse("No autenticado"),
          "503": errorResponse("Adaptador no disponible"),
          "500": errorResponse("Error interno del servidor"),
        },
      },
    },

    "/api/lsg/events": {
      get: {
        tags: ["LifeSync"],
        summary: "Historial de eventos conductuales",
        description:
          "Outbox del usuario con estado de sincronización (PENDING/SYNCED/REJECTED/DUPLICATE/ERROR). Los payloads solo contienen conteos y porcentajes, nunca montos.",
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50, maximum: 200 },
          },
        ],
        responses: {
          "200": {
            description: "Lista de eventos del outbox",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          eventType: {
                            type: "string",
                            example: "streak.daily_logging",
                          },
                          periodKey: { type: "string", example: "2026-W29" },
                          clientRef: { type: "string", format: "uuid" },
                          status: {
                            type: "string",
                            enum: [
                              "PENDING",
                              "SENT",
                              "SYNCED",
                              "REJECTED",
                              "DUPLICATE",
                              "ERROR",
                            ],
                          },
                          occurredAt: { type: "string", format: "date-time" },
                          points: {
                            type: "integer",
                            nullable: true,
                            example: 5,
                          },
                          dimension: {
                            type: "string",
                            nullable: true,
                            enum: ["cognitivo", "afectivo", "linguistico"],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": errorResponse("No autenticado"),
          "500": errorResponse("Error interno del servidor"),
        },
      },
    },

    "/api/lsg/config": {
      get: {
        tags: ["LifeSync"],
        summary: "Configuración del sensor por usuario",
        responses: {
          "200": {
            description: "Kill switch y tipos de evento deshabilitados",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        enabled: { type: "boolean" },
                        disabledEvents: {
                          type: "array",
                          items: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": errorResponse("No autenticado"),
          "404": errorResponse("Usuario no vinculado"),
        },
      },
      patch: {
        tags: ["LifeSync"],
        summary: "Actualizar configuración del sensor",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  enabled: { type: "boolean" },
                  disabledEvents: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Configuración actualizada" },
          "400": {
            description: "Error de validación",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ValidationError" },
              },
            },
          },
          "401": errorResponse("No autenticado"),
        },
      },
    },
  },
};
