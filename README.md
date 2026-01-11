# Sistema de Tesorería - Escuela Dominical

Sistema completo para la gestión de tesorería de la Escuela Dominical con diseño moderno y funcionalidades completas.

## Características

- ✅ **Sistema de Login** - Autenticación segura con sesiones
- ✅ Gestión de Rubros (Ingresos y Egresos)
- ✅ Registro de Ingresos con todos los campos requeridos
- ✅ Registro de Egresos con todos los campos requeridos
- ✅ Dashboard con estadísticas en tiempo real
- ✅ Sistema de Informes (Mensual, Bimestral, Anual, Personalizado)
- ✅ Gestión de Perfil de Usuario
- ✅ Diseño moderno, profesional e interactivo
- ✅ Base de datos MySQL/MariaDB
- ✅ Interfaz responsive (adaptable a móviles)
- ✅ Moneda: Sol Peruano (PEN)

## Requisitos

- XAMPP (o WAMP/LAMP) con PHP 7.4 o superior
- MySQL/MariaDB
- Navegador web moderno

## Instalación

### 1. Copiar archivos
Copia todos los archivos del proyecto a la carpeta:
```
C:\xampp\htdocs\TESORERÍADNI
```

### 2. Crear la base de datos

1. Abre phpMyAdmin (http://localhost/phpmyadmin)
2. Importa el archivo `database.sql` o ejecuta las siguientes instrucciones:

```sql
-- Crear base de datos
CREATE DATABASE IF NOT EXISTS tesoreria_dni CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seleccionar base de datos
USE tesoreria_dni;

-- Ejecutar el contenido completo del archivo database.sql
```

### 3. Configurar conexión

Si es necesario, edita el archivo `config.php` para ajustar las credenciales de la base de datos:

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'tesoreria_dni');
```

### 4. Iniciar servidor

1. Inicia Apache y MySQL desde el panel de control de XAMPP
2. Abre tu navegador y visita: `http://localhost/TESORERÍADNI` o `http://localhost/TESORERÍADNI/index.php`
3. Serás redirigido automáticamente a la página de login (`login.html`)

### 5. Credenciales por defecto

- **Email:** admin@tesoreria.com
- **Contraseña:** admin123

**IMPORTANTE:** Cambia la contraseña después del primer inicio de sesión desde la sección de Perfil.

## Estructura del Sistema

### Secciones del Menú

1. **Inicio (Dashboard)**
   - Saldo actual
   - Ingresos del mes
   - Egresos del mes
   - Actividad reciente

2. **Rubros**
   - Gestión de rubros para ingresos
   - Gestión de rubros para egresos
   - Crear, editar, eliminar rubros

3. **Ingresos**
   - Formulario de registro de ingresos
   - Listado de todos los ingresos
   - Filtros por fecha
   - Edición y eliminación

4. **Egresos**
   - Formulario de registro de egresos
   - Listado de todos los egresos
   - Filtros por fecha
   - Edición y eliminación

5. **Informes**
   - Informe Mensual
   - Informe Bimestral (según calendario eclesiástico)
   - Informe Anual (Noviembre - Octubre)
   - Informe Personalizado (rango de fechas seleccionable)
   - Incluye: Saldo anterior, Ingresos por rubro, Egresos por rubro, Resumen

6. **Perfil**
   - Edición de datos personales
   - Cambio de contraseña

## Estructura de Datos

### Ingresos
- Recibido de
- Cantidad
- Concepto
- Fecha
- Número de recibo
- Rubro

### Egresos
- Cantidad
- Concepto
- Fecha
- Entregado a
- Número de recibo
- Rubro

### Informes Bimestrales
Según el calendario eclesiástico:
- Noviembre - Diciembre 2025
- Enero - Febrero 2026
- Marzo - Abril 2026
- Mayo - Junio 2026
- Julio - Agosto 2026
- Septiembre - Octubre 2026
- Noviembre - Diciembre 2026

## Configuración del Saldo Anterior

Para establecer el saldo anterior de la gestión pasada (Noviembre 2025):

1. Ve a la sección de Informes
2. Genera un informe para Noviembre 2025
3. El saldo anterior se puede configurar desde la base de datos directamente en la tabla `saldo_anterior`

O ejecuta en phpMyAdmin:

```sql
UPDATE saldo_anterior 
SET monto = [TU_SALDO], 
    fecha_gestion = '2025-11-01',
    descripcion = 'Saldo inicial de la gestión Noviembre 2025'
WHERE id = 1;
```

## Uso

1. **Primer paso**: Configura los rubros de ingresos y egresos según tus necesidades
2. **Segundo paso**: Establece el saldo anterior en la tabla `saldo_anterior`
3. **Tercer paso**: Comienza a registrar ingresos y egresos
4. **Cuarto paso**: Genera informes según necesites

## Soporte

Para cualquier problema o duda, revisa:
- Los logs de errores de PHP (si están habilitados)
- La consola del navegador (F12) para errores de JavaScript
- La conexión a la base de datos en `config.php`

## Seguridad

- El sistema requiere autenticación para acceder
- Todas las rutas de la API están protegidas con verificación de sesión
- Las contraseñas se almacenan con hash MD5 (considera usar hash más seguro en producción)
- La sesión se cierra automáticamente después de cerrar el navegador

## Notas

- El sistema está diseñado para el año eclesiástico que comienza en Noviembre 2025
- Los informes bimestrales siguen el calendario eclesiástico
- El sistema calcula automáticamente el saldo final considerando el saldo anterior
- Todos los montos se muestran en formato de moneda Sol Peruano (PEN)

