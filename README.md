# NEXORA

Plataforma de abastecimiento colaborativo para bodegas de Lima Metropolitana. Las bodegas de una misma zona juntan sus pedidos en **compras conjuntas** para llegar al precio por volumen de un proveedor aprobado. Cada bodega decide si participa, ve su ahorro estimado antes de comprometerse y sigue la entrega hasta recibir su pedido.

Proyecto de fin de carrera · Diseño y Desarrollo de Software · TECSUP.
Equipo: Adriana Chinchayhuara Chumpitaz y Yakeli Jimenez Villalobos · Asesor: Luis Manuel Sigueñas Siaden.

---

## Contenido del repositorio

| Carpeta | Qué es | Tecnología |
|---|---|---|
| `backend/` | API del MVP: perfil comprador (bodeguero) programado | Java 21, Spring Boot 3.3, Spring Security, JPA, Flyway, PostgreSQL |
| `frontend/` | Aplicación web del bodeguero | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| `prototipo/` | Prototipo navegable de los **3 perfiles** (comprador, proveedor y administrador) con datos simulados; es la especificación visual del MVP | HTML, CSS y JavaScript sin dependencias |
| `docker-compose.yml` | Base de datos PostgreSQL lista para usar | Docker |

```
NEXORA/
├── backend/
│   ├── pom.xml
│   └── src/
│       ├── main/java/pe/nexora/
│       │   ├── reglas/        ← reglas de negocio puras (tramos, estados, fechas, ahorro, intérprete de pedidos)
│       │   ├── dominio/       ← entidades JPA (tablas)
│       │   ├── repositorio/   ← acceso a datos (Spring Data)
│       │   ├── servicio/      ← casos de uso (pedidos, compras, proveedor, notificaciones, datos de prueba)
│       │   ├── web/           ← controladores REST y DTO
│       │   └── config/        ← seguridad, errores, reloj de Lima, carga de los datos de prueba
│       ├── main/resources/db/migration/V1__esquema.sql   ← modelo de datos
│       └── test/java/…        ← pruebas de las reglas (JUnit 5)
├── frontend/
│   ├── src/
│   │   ├── components/ui/     ← componentes shadcn/ui (botón, tarjeta, diálogo, pestañas…)
│   │   ├── components/        ← componentes de NEXORA (estado, tramos, línea de fechas…)
│   │   ├── pages/             ← pantallas del bodeguero
│   │   ├── layout/            ← barra lateral, barra superior, navegación móvil
│   │   └── lib/               ← cliente de la API, sesión, tipos y formatos
│   └── public/img/            ← logo, ilustraciones y fotos de productos
└── prototipo/
    ├── index.html             ← landing del prototipo
    ├── pages/                 ← comprador/, proveedor/, administrador/
    ├── assets/                ← CSS, JS e imágenes
    └── tests/                 ← 49 pruebas en Node
```

---

## Qué hace el perfil comprador (sistema real)

| Función | Historias | Dónde |
|---|---|---|
| Registro libre del negocio e inicio de sesión (sin aprobación del administrador) | HU-01, HU-02 | `/registro`, `/ingresar` |
| Catálogo de proveedores aprobados que atienden la zona, con precios por tramos, mínimo y unidad de venta | HU-08 | `/catalogo` |
| Pedido en lenguaje cotidiano («12 botellas de aceite y una caja de leche») que se ordena en productos y cantidades; el bodeguero revisa y confirma (Nexi, por reglas) | HU-12, HU-14, HU-34 (parcial) | `/pedidos/nuevo` |
| Fecha requerida: lo antes posible, esta semana, próxima semana o una fecha elegida | HU-15 | `/pedidos/nuevo` |
| Lista de pedidos con su coincidencia: hay compra que llega a tiempo, llega tarde, se puede proponer una compra o no hay oferta; un pedido repetido actualiza el existente; editar y cancelar | HU-16, HU-17, HU-18 | `/pedidos` |
| Compras conjuntas de la zona con las 4 etiquetas visibles: Reuniendo negocios, Esperando confirmación del proveedor, Confirmada y No se concretó | HU-19 | `/compras` |
| Detalle con línea de fechas (Hoy → Cierra → Entrega) y aviso «Llega a tiempo / Llega tarde», tramos de precio, avance hacia el mínimo y ahorro estimado (referencial, preliminar o confirmado) | HU-20, HU-21 | `/compras/:id` |
| «Si te unes con…»: simulación antes de decidir; unirse de forma voluntaria y retirarse con recálculo de cantidad, tramo y ahorro | HU-22, HU-24 | `/compras/:id` |
| Precio final: se acepta solo si no sube; si sube (o ya no llega a tiempo), el bodeguero acepta o se retira | HU-27 | `/compras/:id` |
| Seguimiento de la entrega (en preparación, en camino, entregada o retrasada), compromiso de compensación y puntualidad del proveedor; «Recibí mi pedido» | HU-28, HU-29 | `/compras/:id`, `/seguimiento` |
| Reporte de incidencias (no llegó, incompleto, dañado, tarde o precio distinto) | HU-38 (lado del bodeguero) | `/compras/:id` |
| Avisos del proveedor dentro de cada compra | HU-31 (lado del bodeguero) | `/compras/:id` |
| Navegación común: barra lateral, campana, menú de cuenta y barra inferior en el celular | HU-43 | todo |
| Notificaciones con enlace, hora y «Marcar todo como leído» | HU-33 | campana |
| Privacidad: las otras bodegas aparecen solo como un número; nadie ve tu nombre ni tu cantidad | HU-42 | todo |
| Perfil del negocio con datos opcionales (RUC, horario, descripción), «Completa tu perfil» y resumen de actividad | HU-07 | `/perfil` |
| Catálogo con «Mi lista»: se juntan varios productos y se guardan en un solo pedido | HU-08, HU-12 | `/catalogo` |
| «No me interesa»: ocultar una compra en grupo (y volver a mostrarla desde el filtro «Ocultadas») | — | `/compras`, `/compras/:id` |
| Preguntas anónimas por compra: la respuesta del proveedor la ven todas las bodegas | — | `/compras/:id`, `/mensajes` |
| Chat privado negocio–proveedor por compra, con mensajes sin leer y actualización cada 5 s | — | `/compras/:id`, `/mensajes` |
| Nexi, asistente por reglas: «¿Por qué mi pedido no tiene compra?», «¿Cuándo llega?», «¿Qué significa cada estado?», «¿Cuánto ahorro?», respondidas con los datos del negocio | HU-34 (parcial) | botón flotante |

**Perfil proveedor mínimo** (`/proveedor`, con su propio acceso y color verde): el proveedor ingresa con su cuenta y solo ve **sus** compras en grupo. Confirma stock, precio final, fecha de entrega, costo de entrega y compromiso por retraso; avanza la entrega (en preparación → en camino → entregada, o retrasada); publica avisos, responde incidencias y atiende **Mensajes**: las preguntas anónimas de cada compra y el chat privado con cada negocio (`/proveedor/mensajes`). Por privacidad, ve los nombres de los negocios solo cuando la compra ya está confirmada; antes, en el chat aparecen como «Bodega 1», «Bodega 2»… La sección **Datos de prueba** permite sumar una bodega simulada, cerrar una compra sin confirmar y restablecer todo para la sustentación. El catálogo propio del proveedor y el perfil administrador quedan para el VI ciclo.

---

## Cómo ejecutarlo en tu computadora (macOS)

### 1. Instala las herramientas (una sola vez)

Con [Homebrew](https://brew.sh):

```bash
brew install openjdk@21 maven node
```

Para la base de datos elige **una** opción:

- **Docker Desktop** (recomendado): instálalo y luego usa `docker compose` (paso 2A).
- **Postgres.app**: descárgalo de postgresapp.com, ábrelo y pulsa *Initialize* (paso 2B).

Comprueba las versiones:

```bash
java -version    # 21
mvn -v           # 3.9 o superior
node -v          # 18 o superior
```

> Si `java -version` no muestra 21, ejecuta: `export JAVA_HOME=$(/usr/libexec/java_home -v 21)`.

### 2A. Base de datos con Docker

Desde la carpeta `NEXORA/`:

```bash
docker compose up -d
```

### 2B. Base de datos con Postgres.app

```bash
psql postgres -c "CREATE USER nexora WITH PASSWORD 'nexora';"
psql postgres -c "CREATE DATABASE nexora OWNER nexora;"
```

### 3. Backend (terminal 1)

```bash
cd backend
mvn spring-boot:run
```

La primera vez descarga las librerías (unos minutos). Está listo cuando aparece `Started NexoraApplication` y `Datos de prueba cargados`. Flyway crea las tablas solo.

Prueba rápida: abre http://localhost:8080/api/salud → `{"estado":"ok"}`.

### 4. Frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Abre dos ventanas del navegador, una al lado de la otra (cada perfil guarda su sesión por separado):

| Ventana | Dirección | Correo | Contraseña |
|---|---|---|---|
| Bodeguero (Bodega Rosita) | http://localhost:5173 | `ana@nexora.pe` | `nexora123` |
| Proveedor (Distribuidora Andina) | http://localhost:5173/proveedor | `andina@nexora.pe` | `proveedor123` |

En cada acceso también está el botón **«Entrar con datos de prueba»**.

> Si tu base se creó antes del perfil proveedor, al arrancar se agrega sola la cuenta `andina@nexora.pe`. Para que el detergente aparezca entre las compras del proveedor, entra como proveedor y usa **Datos de prueba → Restablecer** una vez (o `docker compose down -v`).
>
> Después de actualizar a la versión con **Mensajes**, el backend crea solo las tablas nuevas (migración `V3__mensajeria.sql`). Usa **Datos de prueba → Restablecer** una vez para cargar las preguntas y el chat de ejemplo.

### 5. Prototipo de los 3 perfiles (opcional)

```bash
cd prototipo
python3 -m http.server 8000
```

Abre http://localhost:8000.

---

## Recorrido sugerido para la demostración (5 minutos)

1. **Bodeguero → Inicio**: «Podrías ahorrar», compras en grupo cerca, próximas fechas y «¿Qué necesitas comprar?».
2. **Registrar necesidad**: escribe «2 fardos de fideos y 20 bolsas de detergente» → **Ordenar mi pedido**. El sistema convierte 2 fardos en 40 paquetes; revisa, elige «Esta semana» y confirma. Los fideos no tienen compra → **Proponer compra en grupo**.
3. **Compras en grupo → Aceite vegetal**: fechas con «Llega a tiempo», tramos, avance 38/50 y «Si te unes con 12…». Únete: el grupo llega a 50, el precio baja a S/ 7.00 y pasa a **Esperando confirmación del proveedor**.
4. **Proveedor** (otra ventana, se actualiza sola): el aceite aparece con **Te toca confirmar**. Confirma con un precio mayor o una fecha más tarde: en la ventana del bodeguero llega la notificación con **Acepto** o **Me retiro**.
5. **Proveedor → Detergente**: confírmalo con el precio del tramo; queda **Confirmada** de inmediato.
6. **Proveedor → Vasos** (confirmada): **Marcar en camino**. El bodeguero pulsa **Recibí mi pedido** y **Reportar un problema**; la incidencia aparece al proveedor, que la responde.
7. **Mensajes**: en el detalle del aceite, el bodeguero hace una pregunta anónima y escribe por el chat privado. En la ventana del proveedor aparece en **Mensajes** (con contador); responde y la respuesta llega al bodeguero en unos segundos.
8. **Nexi** (botón flotante): «¿Por qué mi pedido no tiene compra?» y «¿Cuándo llega mi pedido?».
9. **Proveedor → Datos de prueba → Restablecer** para empezar de nuevo; las fechas se recalculan desde hoy.

---

## Pruebas

```bash
cd backend && mvn test           # reglas de compra, intérprete de pedidos y privacidad de la mensajería (JUnit 5)
cd frontend && npm run build     # verificación de tipos y compilación
cd prototipo && for t in tests/*.test.cjs; do node "$t" >/dev/null && echo "PASS $t" || echo "FAIL $t"; done
```

---

## API (resumen)

Todas las rutas empiezan con `/api`. Salvo registro, inicio de sesión, zonas y salud, requieren `Authorization: Bearer <token>`.

| Método | Ruta | Uso |
|---|---|---|
| POST | `/auth/registro`, `/auth/login`, `/auth/salir` | Cuenta y sesión |
| GET | `/auth/yo` · PUT `/perfil` | Datos de la cuenta y del negocio |
| GET | `/zonas`, `/categorias`, `/catalogo?categoria=&q=` | Datos de referencia y catálogo |
| GET | `/inicio` | Resumen de la pantalla de inicio |
| POST | `/necesidades/interpretar` | Ordena un pedido escrito en lenguaje cotidiano |
| GET/POST | `/necesidades` · PUT/DELETE `/necesidades/{id}` | Pedidos del bodeguero |
| POST | `/necesidades/{id}/proponer` | Crea una compra conjunta a partir de un pedido |
| GET | `/compras?filtro=` · `/compras/{id}?cantidad=&necesidadId=` | Compras de la zona y detalle con simulación |
| POST | `/compras/{id}/unirse`, `/retirarse`, `/aceptar-precio`, `/recibido`, `/incidencias` | Acciones del bodeguero |
| GET | `/participaciones`, `/incidencias` | Seguimiento |
| GET/POST | `/notificaciones`, `/notificaciones/{id}/leer`, `/notificaciones/leer-todas` | Notificaciones |
| GET | `/mensajes` · `/compras/{id}/mensajes` | Bandeja del negocio y preguntas + chat de una compra |
| POST | `/compras/{id}/preguntas`, `/compras/{id}/chat` | Pregunta anónima y mensaje privado al proveedor |
| GET/POST | `/compras/ocultas` · `/compras/{id}/ocultar`, `/mostrar` | «No me interesa» |
| GET | `/proveedor/mensajes` · `/proveedor/compras/{id}/chat/{negocioId}` | Bandeja del proveedor y chat con un negocio |
| POST | `/proveedor/compras/{id}/chat/{negocioId}` · `/proveedor/preguntas/{id}/responder` | Respuestas del proveedor |
| GET | `/proveedor/panel` | Panel del proveedor: sus compras, avisos e incidencias (perfil PROVEEDOR) |
| POST | `/proveedor/compras/{id}/confirmar`, `/entrega`, `/aviso` · `/proveedor/incidencias/{id}/responder` | Acciones del proveedor |
| POST | `/proveedor/prueba/restablecer`, `/proveedor/prueba/compras/{id}/sumar-bodega`, `/cerrar` | Datos de prueba para la sustentación |

---

## Reglas de negocio implementadas

Están en `backend/src/main/java/pe/nexora/reglas/` (`ReglasCompra.java`, `ReglasMensajeria.java`) y tienen pruebas en `ReglasCompraTest.java` y `ReglasMensajeriaTest.java`.

- **Tramo de precio**: el que alcanza la cantidad total del grupo.
- **Estado**: al llegar al mínimo, la compra pasa a «Esperando confirmación del proveedor»; si un retiro la deja por debajo, vuelve a «Reuniendo negocios». Unirse nunca confirma la compra. Si vence el cierre sin confirmar, queda en «No se concretó».
- **Llega a tiempo**: el último día de la entrega debe ser igual o anterior a la fecha requerida.
- **Precio final**: se acepta solo si no supera el precio con el que te uniste; si lo supera, decides tú.
- **Ahorro neto estimado** = cantidad × (precio de referencia − precio de la compra) − costo de entrega conocido. Es **referencial** sin precio individual, **preliminar** con precio individual y **confirmado** cuando el proveedor confirmó precio y costo de entrega.
- **Compra propuesta**: cierra a más tardar en 5 días y antes de que la entrega deje de llegar a tiempo.
- **Unidad de venta**: «2 cajas de aceite» se convierte en 24 botellas (1 caja = 12).
- **Mensajería**: un negocio puede preguntar o escribir en las compras de su zona o en las que participa; las preguntas son anónimas; el proveedor ve «Bodega 1, 2…» hasta que la compra se confirma y el negocio participa; si la compra no se concretó, el chat queda en solo lectura.

## Configuración

`backend/src/main/resources/application.properties` acepta variables de entorno:

| Variable | Por defecto |
|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/nexora` |
| `DB_USER` / `DB_PASSWORD` | `nexora` / `nexora` |
| `FRONTEND_URL` | `http://localhost:5173` |

## Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `Connection refused` al iniciar el backend | La base de datos no está encendida: `docker compose up -d` o abre Postgres.app. |
| `password authentication failed for user "nexora"` | Crea el usuario y la base (paso 2B) o revisa `DB_USER` y `DB_PASSWORD`. |
| `release version 21 not supported` | Maven usa otro Java: `export JAVA_HOME=$(/usr/libexec/java_home -v 21)`. |
| El frontend dice «No pudimos conectar con el servidor» | El backend no está corriendo en el puerto 8080. |
| Quiero empezar de cero | En el portal del proveedor: Datos de prueba → Restablecer. O borra la base: `docker compose down -v`. |
| `Port 8080 already in use` | Cierra el otro proceso (`lsof -i :8080`) o usa `mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=8081` y `VITE_API_URL=http://localhost:8081 npm run dev`. |

## Próximos pasos (VI ciclo)

- Perfil proveedor completo (catálogo propio, ofertas, registro y aprobación) y perfil administrador (hoy existen en el prototipo).
- Normalización con embeddings Sentence-BERT y pgvector (hoy: reglas).
- Asistente conversacional con un LLM (hoy: Nexi e intérprete por reglas).
- Mensajería en tiempo real con WebSocket (hoy: consulta periódica cada pocos segundos).
- Aplicación móvil en Flutter con las funciones esenciales del bodeguero.
