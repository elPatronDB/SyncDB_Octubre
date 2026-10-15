# Documentación de la API Backend — SyncDB

Documentación canónica de los endpoints HTTP expuestos por el backend de SyncDB.

---

## 1. Convenciones Globales

### 1.1 Base URL
Todas las rutas de la API están prefijadas con `/api`.
* Local: `http://localhost:3000/api`

### 1.2 Formato Estándar de Respuesta HTTP

* **Respuesta de Éxito (`200 OK` / `201 Created`)**:
  ```json
  {
    "status": "success",
    "message": "Operación completada con éxito",
    "data": { ... }
  }
  ```

* **Respuesta de Error (`4xx` / `5xx`)**:
  ```json
  {
    "status": "error",
    "message": "Descripción clara del error",
    "code": "ERROR_CODE",
    "data": null
  }
  ```

### 1.3 Autenticación
Los endpoints protegidos requieren el encabezado:
```http
Authorization: Bearer <accessToken>
```
El token de refresco (`refreshToken`) se gestiona mediante la cookie segura `httpOnly` llamada `refreshToken`.

---

## 2. Endpoints del Módulo de Autenticación (`/api/auth`)

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/register` | Público | Registro de cuenta y creación de sesión activa |
| `POST` | `/api/auth/login` | Público | Inicio de sesión con email y contraseña |
| `POST` | `/api/auth/refresh` | Público | Renovación de token de acceso mediante cookie |
| `POST` | `/api/auth/logout` | Protegido | Cierre de sesión e invalidación de tokens |
| `GET` | `/api/auth/me` | Protegido | Consulta del perfil del usuario autenticado |

---

### Detalle de Endpoints

#### 1. Registro de Usuario
```http
POST /api/auth/register
Content-Type: application/json
```
**Request Body:**
```json
{
  "firstName": "Kevin",
  "lastName": "Sanchez",
  "email": "kevin@example.com",
  "password": "Password123!"
}
```
**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Registration successful",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "user": {
      "id": "c1f7a0b3-...",
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

---

#### 2. Inicio de Sesión (Login)
```http
POST /api/auth/login
Content-Type: application/json
```
**Request Body:**
```json
{
  "email": "admin@syncdb.com",
  "password": "Admin1234!"
}
```
**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "user": {
      "id": "a685c60b-...",
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

---

#### 3. Renovación de Token (Refresh)
```http
POST /api/auth/refresh
Cookie: refreshToken=<token>
```
**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Token renewed",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "user": {
      "id": "a685c60b-...",
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

---

#### 4. Cierre de Sesión (Logout)
```http
POST /api/auth/logout
Authorization: Bearer <accessToken>
```
**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Logout successful",
  "data": null
}
```

---

#### 5. Perfil de Usuario Autenticado
```http
GET /api/auth/me
Authorization: Bearer <accessToken>
```
**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Profile fetched",
  "data": {
    "id": "a685c60b-...",
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

---

## 3. Endpoints del Módulo de Proyectos (`/api/projects`)

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/projects` | Protegido | Consulta paginada y filtrado de proyectos del usuario |
| `POST` | `/api/projects` | Protegido | Creación de un nuevo proyecto |
| `GET` | `/api/projects/:id` | Protegido | Consulta detallada de un proyecto por ID |
| `PUT` | `/api/projects/:id` | Protegido | Actualización de datos y configuración del proyecto |
| `DELETE` | `/api/projects/:id` | Protegido | Eliminación de proyecto y sus dispositivos en cascada |
| `POST` | `/api/projects/:id/regenerate-share-link` | Protegido | Regenera el código y enlace público de compartición |
| `GET` | `/api/projects/:id/devices` | Protegido | Lista de dispositivos asociados al proyecto |
| `PATCH` | `/api/projects/:id/devices/:deviceId` | Protegido | Actualización administrativa del dispositivo (rol, posición, nombre) |
| `DELETE` | `/api/projects/:id/devices/:deviceId` | Protegido | Desvinculación/eliminación del dispositivo del proyecto |

---

## 4. Endpoints Públicos de Dispositivos (`/api/public`)

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/public/projects/:accessCode` | Público | Verificación del enlace de compartición y metadatos del proyecto |
| `POST` | `/api/public/projects/:accessCode/devices/register` | Público | Registro inicial o reconexión de dispositivo con persistencia |
| `POST` | `/api/public/devices/location` | Token Disp. | Actualización de coordenadas geográficas GPS |
| `POST` | `/api/public/devices/heartbeat` | Token Disp. | Señal de latido y actividad del dispositivo |

