# Arquitectura del Backend — SyncDB Engine

Este proyecto está construido siguiendo los principios de la **Arquitectura Limpia (Clean Architecture)** y **Arquitectura Hexagonal (Ports and Adapters)** en Node.js, Express y TypeScript, utilizando Prisma ORM sobre MySQL.

El sistema se enfoca en una arquitectura **Single-User Workspace / Consola Master**: no existen roles ni permisos jerárquicos (RBAC), tablas de auditoría de logs, ni microservicios de recuperación OTP. Cada usuario registrado es dueño exclusivo de su espacio de trabajo, proyectos de calibración acústica, dispositivos y mediciones.

---

## 1. Estructura de Carpetas (Schema del Proyecto)

```text
backend/
├── prisma/
│   ├── schema.prisma                  # Esquema Prisma: User, UserSession, Project, Device, AudioMeasurement
│   └── seed.ts                        # Script de inicialización idempotente (crea usuario Master por defecto)
│
├── src/
│   ├── app/                           # Lógica transversal de la aplicación Express
│   │   ├── http/
│   │   │   └── response.http.ts       # Formateador canónico de respuestas HTTP (success, error, paginated)
│   │   └── middleware/
│   │       ├── Auth.middleware.ts     # Guardia Bearer JWT para verificación de identidad y extracción de contexto
│   │       ├── Error.middleware.ts    # Interceptor global de errores (AppError, Zod, 500)
│   │       └── Validated.middleware.ts# Interceptor de validación sintáctica de payloads con Zod
│   │
│   ├── infrastructure/                # Configuración de base de datos e infraestructura global
│   │
│   ├── modules/                       # Módulos de dominio de la aplicación
│   │   └── Auth/                      # Módulo de Autenticación y Sesiones
│   │       ├── domain/                # Entidades puras (AuthUser, AuthSession), Interfaces/Puertos y JwtProvider
│   │       │   ├── auth-user.entity.ts
│   │       │   ├── auth-session.entity.ts
│   │       │   ├── auth.repository.ts
│   │       │   └── jwt.provider.ts
│   │       ├── application/           # Casos de uso (Lógica de negocio pura e independiente)
│   │       │   ├── login.usecase.ts
│   │       │   ├── register.usecase.ts
│   │       │   ├── refresh-token.usecase.ts
│   │       │   ├── get-profile.usecase.ts
│   │       │   └── logout.usecase.ts
│   │       ├── infrastructure/        # Adaptadores tecnológicos reales y mappers
│   │       │   ├── prisma-auth.repository.ts
│   │       │   └── mappers/auth.mapper.ts
│   │       ├── presentation/          # Puerta de entrada HTTP: Rutas, Controlador y Validadores Zod
│   │       │   ├── auth.controller.ts
│   │       │   ├── auth.routes.ts
│   │       │   └── validators/
│   │       └── auth.module.ts         # Contenedor de Inyección de Dependencias del módulo
│   │
│   ├── presentation/                  # Controladores base y abstracciones HTTP
│   │   └── base.controller.ts
│   │
│   ├── routes/                        # Enrutador centralizado
│   │   └── index.routes.ts            # Agrupador montado bajo /api
│   │
│   ├── shared/                        # Módulos y utilidades compartidas
│   │   ├── config/                    # Configuración de entorno
│   │   ├── domain/                    # Interfaces compartidas (HashProvider, Pagination)
│   │   ├── errors/                    # AppError centralizado
│   │   ├── infrastructure/            # Implementaciones (Argon2HashProvider)
│   │   ├── logger/                    # Logger con saneamiento de credenciales
│   │   └── utils/                     # Utilidades generales
│   │
│   ├── app.ts                         # Configuración de Express, CORS y middlewares globales
│   └── server.ts                      # Arranque del servidor HTTP
```

---

## 2. Descripción de Carpetas y Responsabilidades

| Carpeta | Propósito | Reglas de Dependencia |
|---|---|---|
| `prisma/` | Modelado de datos en base de datos y scripts de sembrado (`seed.ts`). | Contiene `schema.prisma` y genera `@prisma/client`. |
| `src/app/` | Infraestructura HTTP transversal: wrappers de respuesta estándar y middlewares globales. | Puede ser consumida por controladores y rutas. No debe ser llamada desde la capa `domain/`. |
| `src/modules/<Modulo>/domain/` | Núcleo del módulo: Entidades puras y contratos de repositorios/proveedores (Puertos). | **Completamente pura.** No importa Express, Prisma, Zod ni capas exteriores. |
| `src/modules/<Modulo>/application/` | Orquestación de lógica de negocio en Casos de Uso independientes. | Depende exclusivamente de las interfaces definidas en `domain/`. Lanza `AppError`. |
| `src/modules/<Modulo>/infrastructure/` | Implementación de persistencia con Prisma y mappers. | Implementa los contratos de `domain/`. Es la única capa que importa `@prisma/client`. |
| `src/modules/<Modulo>/presentation/` | Rutas HTTP Express, Controladores y esquemas Zod. | Recibe peticiones HTTP, valida formato sintáctico e invoca los Casos de Uso. |
| `src/modules/<Modulo>/<modulo>.module.ts` | Ensamblado e Inyección de Dependencias del módulo. | Instancia repositorios, proveedores, casos de uso y controlador para exportarlo listo. |
| `src/shared/` | Proveedores y utilidades comunes (Hashing con Argon2, errores tipados, logger seguro). | Reutilizable por cualquier módulo o capa de la aplicación. |
| `src/routes/index.routes.ts` | Agrupador maestro de rutas que expone todos los módulos bajo el prefijo `/api`. | Monta routers de módulos y aplica el middleware de manejo global de errores al final. |

---

## 3. Modelo de Dominio, Seguridad y Seed

### 3.1 Sin Roles, Permisos ni OTP (Single-User Workspace)
* Se eliminaron completamente las tablas `Role`, `Permission`, `UserRole`, `RolePermission` y `AuditLog`.
* Se eliminó toda dependencia con el microservicio de OTP y flujos de recuperación externos.
* El usuario autenticado es el propietario de su consola master.
* El payload del JWT contiene únicamente la identidad del usuario (`sub: userId, email`), sin reclamos de roles ni permisos.

### 3.2 Sesiones y Tokens
1. **Access Token (JWT)**:
   * TTL: `15m`
   * Algoritmo: `HS256`
   * Claims: `{ sub: user.id, email: user.email }`
   * Transporte: Encabezado `Authorization: Bearer <token>`
2. **Refresh Token**:
   * TTL: `7d`
   * Persistencia: Tabla `UserSession` en base de datos (`userId`, `token`, `expiresAt`) con relación 1:1 única.
   * Transporte: Cookie `httpOnly`, `secure`, `sameSite: strict`.

### 3.3 Inicialización con Seed (`npm run db:seed`)
El comando ejecuta `prisma/seed.ts` para asegurar la existencia de un usuario master para pruebas y arranque:
* **Email:** `admin@syncdb.com`
* **Contraseña:** `Admin1234!`
* **Nombre:** Kevin Sanchez

---

## 4. Documentación de Endpoints de Autenticación (`/api/auth`)

### 1. `POST /api/auth/register`
Registra una nueva cuenta de usuario y genera su sesión activa inmediata.
* **Acceso:** Público
* **Payload:**
  ```json
  {
    "firstName": "Kevin",
    "lastName": "Sanchez",
    "email": "kevin@example.com",
    "password": "Password123!"
  }
  ```
* **Respuesta Exitosa (`201 Created`):**
  ```json
  {
    "status": "success",
    "message": "Registration successful",
    "data": {
      "accessToken": "eyJhbGciOi...",
      "user": {
        "id": "uuid",
        "name": "Kevin Sanchez",
        "firstName": "Kevin",
        "lastName": "Sanchez",
        "email": "kevin@example.com",
        "avatarUrl": null,
        "isVerify": false
      }
    }
  }
  ```
* **Set-Cookie:** `refreshToken=<token>; HttpOnly; Path=/; SameSite=Strict`

---

### 2. `POST /api/auth/login`
Inicia sesión validando credenciales mediante Argon2 y registra la sesión activa única en la base de datos.
* **Acceso:** Público
* **Payload:**
  ```json
  {
    "email": "admin@syncdb.com",
    "password": "Admin1234!"
  }
  ```
* **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "status": "success",
    "message": "Login successful",
    "data": {
      "accessToken": "eyJhbGciOi...",
      "user": {
        "id": "uuid",
        "name": "Kevin Sanchez",
        "firstName": "Kevin",
        "lastName": "Sanchez",
        "email": "admin@syncdb.com",
        "avatarUrl": null,
        "isVerify": true
      }
    }
  }
  ```
* **Set-Cookie:** `refreshToken=<token>; HttpOnly; Path=/; SameSite=Strict`

---

### 3. `POST /api/auth/refresh`
Renueva el Access Token y el Refresh Token utilizando la cookie HTTP-Only.
* **Acceso:** Público (requiere cookie `refreshToken`)
* **Payload:** Vacío
* **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "status": "success",
    "message": "Token renewed",
    "data": {
      "accessToken": "eyJhbGciOi...",
      "user": { ... }
    }
  }
  ```

---

### 4. `POST /api/auth/logout`
Invalida la sesión activa del usuario en base de datos y destruye la cookie `refreshToken`.
* **Acceso:** Protegido (`Authorization: Bearer <token>`)
* **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "status": "success",
    "message": "Logout successful",
    "data": null
  }
  ```

---

### 5. `GET /api/auth/me`
Retorna el perfil del usuario autenticado en la sesión actual.
* **Acceso:** Protegido (`Authorization: Bearer <token>`)
* **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "status": "success",
    "message": "Profile fetched",
    "data": {
      "id": "uuid",
      "name": "Kevin Sanchez",
      "firstName": "Kevin",
      "lastName": "Sanchez",
      "email": "admin@syncdb.com",
      "avatarUrl": null,
      "isActive": true,
      "isVerify": true,
      "createdAt": "2026-10-15T12:00:00.000Z",
      "updatedAt": "2026-10-15T12:00:00.000Z"
    }
  }
  ```
