-- Base de datos para Sistema de Tesorería Escuela Dominical
CREATE DATABASE IF NOT EXISTS tesoreria_dni CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tesoreria_dni;

-- Tabla de usuarios/perfil
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    telefono VARCHAR(20),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de rubros para ingresos
CREATE TABLE IF NOT EXISTS rubros_ingresos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de rubros para egresos
CREATE TABLE IF NOT EXISTS rubros_egresos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de saldo anterior
CREATE TABLE IF NOT EXISTS saldo_anterior (
    id INT AUTO_INCREMENT PRIMARY KEY,
    monto DECIMAL(10,2) NOT NULL,
    fecha_gestion DATE NOT NULL,
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para saldos intangibles (fondos que se informan pero no entran como movimiento)
CREATE TABLE IF NOT EXISTS saldos_intangibles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    descripcion VARCHAR(200) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para aportes a saldos intangibles
CREATE TABLE IF NOT EXISTS aportes_intangibles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    saldo_intangible_id INT NOT NULL,
    aporte DECIMAL(10,2) NOT NULL,
    fecha DATE NOT NULL,
    entregado_por VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (saldo_intangible_id) REFERENCES saldos_intangibles(id) ON DELETE RESTRICT
);

-- Tabla para retiros de saldos intangibles
CREATE TABLE IF NOT EXISTS retiros_intangibles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    saldo_intangible_id INT NOT NULL,
    retiro DECIMAL(10,2) NOT NULL,
    fecha DATE NOT NULL,
    entregado_a VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (saldo_intangible_id) REFERENCES saldos_intangibles(id) ON DELETE RESTRICT
);

-- Tabla de ingresos
CREATE TABLE IF NOT EXISTS ingresos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recibido_de VARCHAR(200) NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL,
    concepto TEXT NOT NULL,
    fecha DATE NOT NULL,
    numero_recibo VARCHAR(50),
    rubro_id INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rubro_id) REFERENCES rubros_ingresos(id) ON DELETE RESTRICT
);

-- Tabla de egresos
CREATE TABLE IF NOT EXISTS egresos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cantidad DECIMAL(10,2) NOT NULL,
    concepto TEXT NOT NULL,
    fecha DATE NOT NULL,
    entregado_a VARCHAR(200) NOT NULL,
    numero_recibo VARCHAR(50),
    rubro_id INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rubro_id) REFERENCES rubros_egresos(id) ON DELETE RESTRICT
);

-- Insertar usuario por defecto
INSERT INTO usuarios (nombre, email, password) VALUES 
('Administrador', 'admin@tesoreria.com', MD5('admin123'));

-- Insertar rubros iniciales para ingresos
INSERT INTO rubros_ingresos (nombre, descripcion) VALUES 
('Ofrendas', 'Ofrendas de los hermanos'),
('Diezmos', 'Diezmos de miembros'),
('Eventos', 'Ingresos por eventos especiales'),
('Donaciones', 'Donaciones recibidas'),
('Otros', 'Otros ingresos');

-- Insertar rubros iniciales para egresos
INSERT INTO rubros_egresos (nombre, descripcion) VALUES 
('Materiales', 'Compra de materiales didácticos'),
('Eventos', 'Gastos de eventos'),
('Mantenimiento', 'Mantenimiento de instalaciones'),
('Servicios', 'Servicios públicos y otros'),
('Otros', 'Otros egresos');

-- Insertar saldo anterior (Noviembre 2025)
INSERT INTO saldo_anterior (monto, fecha_gestion, descripcion) VALUES 
(0.00, '2025-11-01', 'Saldo inicial de la gestión Noviembre 2025');

