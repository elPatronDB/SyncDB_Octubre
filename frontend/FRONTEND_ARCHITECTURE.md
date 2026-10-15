# Frontend Architecture — SyncDB Master Console

## 1. Propósito y Principios

Este documento define la arquitectura, organización de directorios, estándares de diseño visual y convenciones de desarrollo de la interfaz de usuario de **SyncDB**.

El proyecto sigue los principios de **Clean Architecture** aplicados al frontend:
* **Desacoplamiento:** Las capas de presentación desconocen detalles de red; interactúan mediante servicios de infraestructura y stores de estado.
* **Single-User Workspace:** El usuario autenticado es el propietario de su consola master. No existen matrices ni jerarquías de permisos RBAC ni microservicios de OTP en el cliente.
* **Sistema de Diseño Neon:** Interfaz en modo oscuro estricto (`#000000`), superficies contrastadas (`#151617`), acentos verde neón terminal (`#34d59a`) y dicotomía de formas (botones píldora `9999px` y contenedores afilados `4px`).

---

## 2. Estructura de Carpetas (Schema del Frontend)

```text
frontend/src/
├── core/
│   ├── api/
│   │   ├── axios.instance.ts          # Cliente Axios central con inyección Bearer y auto-refresh en 401
│   │   ├── config.ts                  # URLs y endpoints de configuración
│   │   └── index.ts
│   ├── store/
│   │   └── authStore.ts               # Estado global Zustand (accessToken, user en memoria, restauración de sesión)
│   ├── theme/
│   │   ├── index.ts                   # Exportación del tema MUI
│   │   ├── palette.ts                 # Tokens cromáticos Neon (Blackout, Neon Glow, Graphite Deep)
│   │   ├── typography.ts              # Escala tipográfica Inter y Geist Mono con tracking negativo
│   │   └── theme.ts                   # Personalización de componentes Material UI (MuiButton, MuiCard, etc.)
│   └── utils/
│       ├── formatDate.ts              # Formateadores de fecha y hora local
│       ├── formatMoney.ts             # Formateadores numéricos y de moneda
│       └── index.ts
│
├── modules/
│   ├── auth/                          # Flujos de Autenticación (Login, Sesión)
│   │   ├── domain/                    # Entidades (AuthUser, AuthTokens) y esquemas Zod de validación
│   │   ├── infrastructure/            # Servicios HTTP (login, logout, refresh, me)
│   │   └── presentation/              # Página de Login y componentes de formulario
│   │
│   └── profile/                       # Gestión de Identidad y Cuenta del Usuario
│       ├── domain/                    # Interfaces de perfil
│       └── presentation/              # Vista de perfil de la Consola Master
│
├── presentation/
│   ├── layouts/
│   │   ├── blankLayout/               # Layout minimalista para flujos públicos (Login)
│   │   └── fullLayout/                # Layout de consola maestra con Sidebar retráctil y Navbar
│   │       ├── navbar/                # Barra superior con estado de conexión y menú de cuenta
│   │       └── sidebar/               # Navegación lateral con soporte para mini-colapso
│   └── routes/
│       ├── ProtectedRoute.tsx         # Guardia de autenticación y auto-refresh
│       └── appRouter.tsx              # Router React v7 con importación perezosa (lazy loading)
│
├── shared/                            # Componentes y vistas compartidas
│   ├── components/
│   │   ├── common/                    # PageHeader, barras de búsqueda y encabezados
│   │   ├── dialog/                    # ConfirmDialog genérico
│   │   ├── loaders/                   # FullPageLoader y spinners de carga
│   │   ├── pagination/                # Paginador reutilizable
│   │   └── tables/                    # ListTable dinámica
│   └── pages/
│       └── Dashboard.page.tsx         # Tablero principal de la Consola Master
│
├── index.css                          # Tokens CSS Neon y Google Fonts (Inter + Geist Mono)
└── main.tsx                           # Punto de entrada de la aplicación React con ThemeProvider
```

---

## 3. Sistema de Diseño Neon (`DESIGN.md`)

El tema visual sigue la estética **"Server Room After Dark"**:

### 3.1 Paleta de Color
* **Blackout (`#000000`):** Fondo absoluto del canvas de la página.
* **Depth (`#0a0a0b`):** Fondo de campos de entrada (`TextField`), chips y barras de navegación.
* **Graphite Deep (`#151617`):** Fondo de tarjetas (`Card`), paneles y diálogos.
* **Graphite Light (`#303236`):** Bordes estructurales, divisores y contornos de inputs.
* **Neon Glow (`#34d59a`):** Acento eléctrico primario para focos, estados activos y badges de estado.
* **Whiteout (`#ffffff`):** Texto principal y relleno de botones de acción primaria (`Button variant="contained"`).
* **Ash (`#797d86`):** Texto secundario, etiquetas descriptivas y navegación inactiva.

### 3.2 Geometría y Dicotomía de Formas
* **Botones:** `borderRadius: 9999px` (forma de píldora estricta).
* **Contenedores, Tarjetas e Inputs:** `borderRadius: 4px` (esquinas afiladas de precisión técnica).
* **Elevación:** Capas superficiales (`#151617` sobre `#000000`) delimitadas por bordes finos de 1px en `#303236`.

---

## 4. Ciclo de Vida de Autenticación

1. **Login:** El usuario envía credenciales en `/auth/login`. El backend responde con `accessToken` y datos del usuario, fijando la cookie `refreshToken`.
2. **Almacenamiento:** El store `useAuthStore` almacena `accessToken` y `user`.
3. **Peticiones Autenticadas:** Cada llamada Axios intercepta la petición e inyecta `Authorization: Bearer <accessToken>`.
4. **Recarga de Página:** Si el usuario recarga la pestaña, `ProtectedRoute` detecta la ausencia del usuario en memoria, solicita `/api/auth/refresh` y repuebla el store sin cerrar la sesión.
5. **Cierre de Sesión:** `/auth/logout` revoca la sesión en la base de datos, destruye la cookie en el servidor y limpia el estado local de Zustand redirigiendo a `/auth/login`.