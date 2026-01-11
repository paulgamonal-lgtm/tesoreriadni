<?php
// Iniciar output buffering para evitar errores de headers
ob_start();

require_once 'config.php';

// Si no está autenticado, redirigir al login
if (!checkAuth()) {
    ob_end_clean();
    // Usar JavaScript como respaldo si header no funciona
    header('Location: login.html');
    echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><script>window.location.href="login.html";</script></head><body>Redirigiendo al login...</body></html>';
    exit;
}

// Establecer variables de sesión para JavaScript
$user_id = $_SESSION['user_id'];
$user_nombre = $_SESSION['nombre'] ?? '';
$user_email = $_SESSION['email'] ?? '';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistema de Tesorería - Escuela Dominical</title>
    <link rel="stylesheet" href="css/styles.css?v=3.0">
    <link rel="stylesheet" href="css/no-internal-scroll.css?v=1.0">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <script>
        // Verificar que jsPDF se cargue correctamente
        window.addEventListener('load', function() {
            if (typeof window.jspdf === 'undefined') {
                console.error('Error: jsPDF no se cargó correctamente');
            } else {
                console.log('jsPDF cargado correctamente:', typeof window.jspdf);
            }
        });
    </script>
</head>
<body>
    <div class="container">
        <!-- Sidebar -->
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h2><i class="fas fa-coins"></i> Tesorería</h2>
                <p class="subtitle">Escuela Dominical</p>
            </div>
            <nav class="sidebar-nav">
                <a href="#" class="nav-item active" data-section="dashboard">
                    <i class="fas fa-home"></i> Inicio
                </a>
                <a href="#" class="nav-item" data-section="rubros">
                    <i class="fas fa-list"></i> Rubros
                </a>
                <a href="#" class="nav-item" data-section="ingresos">
                    <i class="fas fa-arrow-down"></i> Ingresos
                </a>
                <a href="#" class="nav-item" data-section="egresos">
                    <i class="fas fa-arrow-up"></i> Egresos
                </a>
                <a href="#" class="nav-item" data-section="saldos-intangibles">
                    <i class="fas fa-coins"></i> Saldos Intangibles
                </a>
                <a href="#" class="nav-item" data-section="informes">
                    <i class="fas fa-chart-bar"></i> Informes
                </a>
                <a href="#" class="nav-item" data-section="periodos">
                    <i class="fas fa-history"></i> Gestión de Ciclos
                </a>
                <a href="#" class="nav-item" data-section="perfil">
                    <i class="fas fa-user"></i> Perfil
                </a>
            </nav>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
            <!-- Header -->
            <header class="header">
                <button class="menu-toggle" id="menuToggle">
                    <i class="fas fa-bars"></i>
                </button>
                <h1 id="pageTitle">Dashboard</h1>
                <div class="header-actions">
                    <span class="date-display" id="currentDate"></span>
                    <button class="btn btn-danger btn-sm" onclick="logout()" style="margin-left: 1rem;">
                        <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                    </button>
                </div>
            </header>

            <!-- Sections -->
            <!-- Dashboard -->
            <section id="dashboard" class="section active">
                <div class="stats-grid">
                    <div class="stat-card primary">
                        <div class="stat-icon"><i class="fas fa-wallet"></i></div>
                        <div class="stat-info">
                            <h3>Saldo Actual</h3>
                            <p class="stat-value" id="saldoActual">S/ 0.00</p>
                        </div>
                    </div>
                    <div class="stat-card success">
                        <div class="stat-icon"><i class="fas fa-arrow-down"></i></div>
                        <div class="stat-info">
                            <h3>Ingresos del Mes</h3>
                            <p class="stat-value" id="ingresosMes">S/ 0.00</p>
                        </div>
                    </div>
                    <div class="stat-card danger">
                        <div class="stat-icon"><i class="fas fa-arrow-up"></i></div>
                        <div class="stat-info">
                            <h3>Egresos del Mes</h3>
                            <p class="stat-value" id="egresosMes">S/ 0.00</p>
                        </div>
                    </div>
                    <div class="stat-card warning">
                        <div class="stat-icon"><i class="fas fa-coins"></i></div>
                        <div class="stat-info">
                            <h3>Saldos Intangibles</h3>
                            <p class="stat-value" id="dineroIntangibleDashboard">S/ 0.00</p>
                        </div>
                    </div>
                    <div class="stat-card info">
                        <div class="stat-icon"><i class="fas fa-calendar"></i></div>
                        <div class="stat-info">
                            <h3>Período</h3>
                            <p class="stat-value" id="periodoActual">Nov 2025</p>
                        </div>
                    </div>
                </div>
                <div class="recent-activity">
                    <h2>Actividad Reciente</h2>
                    <div id="recentActivityContent"></div>
                </div>
            </section>

            <!-- Rubros Section -->
            <section id="rubros" class="section">
                <div class="section-header">
                    <div class="tab-buttons">
                        <button class="tab-btn active" data-tab="rubros-ingresos">Rubros Ingresos</button>
                        <button class="tab-btn" data-tab="rubros-egresos">Rubros Egresos</button>
                    </div>
                    <button id="btnNuevoRubro" class="btn btn-primary" onclick="openRubroModal('ingresos')">
                        <i class="fas fa-plus"></i> Nuevo Rubro
                    </button>
                </div>
                
                <!-- Rubros Ingresos -->
                <div id="rubros-ingresos" class="tab-content active">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre</th>
                                    <th>Descripción</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="rubrosIngresosTable"></tbody>
                        </table>
                    </div>
                </div>

                <!-- Rubros Egresos -->
                <div id="rubros-egresos" class="tab-content">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre</th>
                                    <th>Descripción</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="rubrosEgresosTable"></tbody>
                        </table>
                    </div>
                </div>
            </section>

            <!-- Ingresos Section -->
            <section id="ingresos" class="section">
                <div class="section-header">
                    <button class="btn btn-primary" onclick="openIngresoModal()">
                        <i class="fas fa-plus"></i> Nuevo Ingreso
                    </button>
                    <div class="filters" style="margin-bottom: 0;">
                        <input type="date" id="fechaInicioIngresos" class="form-control" style="width: auto;">
                        <input type="date" id="fechaFinIngresos" class="form-control" style="width: auto;">
                        <button class="btn btn-secondary" onclick="filtrarIngresos()">
                            <i class="fas fa-filter"></i> Filtrar
                        </button>
                        <button class="btn btn-secondary" onclick="resetFiltrosIngresos()">
                            <i class="fas fa-redo"></i> Resetear
                        </button>
                    </div>
                </div>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Recibido de</th>
                                <th>Cantidad</th>
                                <th>Concepto</th>
                                <th>N° Recibo</th>
                                <th>Rubro</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="ingresosTable"></tbody>
                    </table>
                </div>
            </section>

            <!-- Egresos Section -->
            <section id="egresos" class="section">
                <div class="section-header">
                    <button class="btn btn-primary" onclick="openEgresoModal()">
                        <i class="fas fa-plus"></i> Nuevo Egreso
                    </button>
                    <div class="filters" style="margin-bottom: 0;">
                        <input type="date" id="fechaInicioEgresos" class="form-control" style="width: auto;">
                        <input type="date" id="fechaFinEgresos" class="form-control" style="width: auto;">
                        <button class="btn btn-secondary" onclick="filtrarEgresos()">
                            <i class="fas fa-filter"></i> Filtrar
                        </button>
                        <button class="btn btn-secondary" onclick="resetFiltrosEgresos()">
                            <i class="fas fa-redo"></i> Resetear
                        </button>
                    </div>
                </div>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Entregado a</th>
                                <th>Cantidad</th>
                                <th>Concepto</th>
                                <th>N° Recibo</th>
                                <th>Rubro</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="egresosTable"></tbody>
                    </table>
                </div>
            </section>

            <section id="saldos-intangibles" class="section">
                <div class="section-header">
                    <div class="tab-buttons">
                        <button class="tab-btn active" data-tab="saldos-intangibles-list">Saldos Intangibles</button>
                        <button class="tab-btn" data-tab="aportes-intangibles-list">Aportes</button>
                        <button class="tab-btn" data-tab="retiros-intangibles-list">Retiros</button>
                        <button class="tab-btn" data-tab="resumen-intangibles">Resumen</button>
                    </div>
                    
                    <div id="intangibles-actions" style="display: flex; align-items: center; gap: 0.75rem;">
                        <!-- Botones de Acción en la Cabecera -->
                        <button id="btnNuevoSaldoIntangible" class="btn btn-primary" onclick="openSaldoIntangibleModal()">
                            <i class="fas fa-plus"></i> Nuevo Saldo Intangible
                        </button>
                        <button id="btnNuevoAporteIntangible" class="btn btn-primary btn-sm" style="display: none;" onclick="openAporteIntangibleModal()">
                            <i class="fas fa-plus"></i> Nuevo Aporte
                        </button>
                        <button id="btnNuevoRetiroIntangible" class="btn btn-primary btn-sm" style="display: none;" onclick="openRetiroIntangibleModal()">
                            <i class="fas fa-plus"></i> Nuevo Retiro
                        </button>
                        <div id="resumen-export-actions" style="display: none; gap: 0.5rem; flex-wrap: wrap;">
                            <button class="btn btn-primary btn-sm" onclick="descargarResumenIntangiblePDF()">
                                <i class="fas fa-file-pdf"></i> PDF
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="descargarResumenIntangibleDetalladoPDF()">
                                <i class="fas fa-file-pdf"></i> PDF Detallado
                            </button>
                            <button class="btn btn-success btn-sm" onclick="descargarResumenIntangibleExcel()">
                                <i class="fas fa-file-excel"></i> Excel
                            </button>
                            <button class="btn btn-success btn-sm" onclick="descargarResumenIntangibleDetalladoExcel()">
                                <i class="fas fa-file-excel"></i> Excel Detallado
                            </button>
                        </div>
                    </div>
                </div>

                <div class="tabs-container" style="background: none; padding: 0; box-shadow: none;">
                    
                    <!-- Tab Saldos Intangibles -->
                    <div id="saldos-intangibles-list" class="tab-content active">
                        <div class="table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Descripción</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="saldosIntangiblesTable"></tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Tab Aportes -->
                    <div id="aportes-intangibles-list" class="tab-content">
                        <div class="filters" style="margin-bottom: 1rem; display: flex; gap: 0.5rem; align-items: center;">
                            <select id="filtroSaldoIntangible" class="form-control form-control-sm" style="width: auto; min-width: 150px;" onchange="filtrarAportes()">
                                <option value="">Todos los saldos</option>
                            </select>
                            <input type="date" id="fechaInicioAportes" class="form-control form-control-sm" style="width: auto;">
                            <input type="date" id="fechaFinAportes" class="form-control form-control-sm" style="width: auto;">
                            <button class="btn btn-secondary btn-sm" onclick="filtrarAportes()">
                                <i class="fas fa-filter"></i> Filtrar
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="resetFiltrosAportes()">
                                <i class="fas fa-redo"></i> Resetear
                            </button>
                        </div>
                        <div class="table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Saldo Intangible</th>
                                        <th>Entregado por</th>
                                        <th>Aporte</th>
                                        <th>Descripción</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="aportesIntangiblesTable"></tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Tab Retiros -->
                    <div id="retiros-intangibles-list" class="tab-content">
                        <div class="filters" style="margin-bottom: 1rem; display: flex; gap: 0.5rem; align-items: center;">
                            <select id="filtroSaldoIntangibleRetiro" class="form-control form-control-sm" style="width: auto; min-width: 150px;" onchange="filtrarRetiros()">
                                <option value="">Todos los saldos</option>
                            </select>
                            <input type="date" id="fechaInicioRetiros" class="form-control form-control-sm" style="width: auto;">
                            <input type="date" id="fechaFinRetiros" class="form-control form-control-sm" style="width: auto;">
                            <button class="btn btn-secondary btn-sm" onclick="filtrarRetiros()">
                                <i class="fas fa-filter"></i> Filtrar
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="resetFiltrosRetiros()">
                                <i class="fas fa-redo"></i> Resetear
                            </button>
                        </div>
                        <div class="table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Saldo Intangible</th>
                                        <th>Entregado a</th>
                                        <th>Retiro</th>
                                        <th>Descripción</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="retirosIntangiblesTable"></tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Tab Resumen -->
                    <div id="resumen-intangibles" class="tab-content">
                        <div class="filters" style="margin-bottom: 1rem; display: flex; gap: 0.5rem; align-items: center;">
                            <input type="date" id="fechaInicioResumen" class="form-control form-control-sm" style="width: auto;">
                            <input type="date" id="fechaFinResumen" class="form-control form-control-sm" style="width: auto;">
                            <button class="btn btn-secondary btn-sm" onclick="cargarResumenIntangibles()">
                                <i class="fas fa-filter"></i> Filtrar
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="resetFiltrosResumen()">
                                <i class="fas fa-redo"></i> Resetear
                            </button>
                        </div>
                        <div id="resumenIntangiblesContent">
                            <div class="text-center" style="padding: 2rem;">
                                <i class="fas fa-spinner fa-spin fa-2x"></i>
                                <p>Cargando resumen...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Informes Section -->
            <section id="informes" class="section">

                <div class="informes-controls-card">
                    <div class="informes-controls-grid">
                        <div class="form-group">
                            <label><i class="fas fa-history"></i> Ciclo de Gestión</label>
                            <select id="cicloInforme" class="form-control" onchange="cambiarCicloInforme()">
                                <!-- Se llenará dinámicamente -->
                            </select>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-chart-bar"></i> Tipo de Informe</label>
                            <select id="tipoInforme" class="form-control" onchange="cambiarTipoInforme()">
                                <option value="mensual">Mensual</option>
                                <option value="bimestral">Bimestral</option>
                                <option value="anual">Anual</option>
                                <option value="personalizado">Personalizado</option>
                            </select>
                        </div>
                        <div class="form-group" id="periodoSelectGroup">
                            <label><i class="fas fa-calendar"></i> Período</label>
                            <select id="periodoInforme" class="form-control"></select>
                        </div>
                        <div class="form-group" id="periodoFinGroup" style="display:none;">
                            <label><i class="fas fa-calendar-alt"></i> Mes Final</label>
                            <input type="month" id="periodoFinInforme" class="form-control">
                        </div>
                    </div>
                    <div class="informes-actions">
                        <button class="btn btn-primary btn-lg" onclick="generarInforme()">
                            <i class="fas fa-file-pdf"></i> Descargar PDF
                        </button>
                        <button class="btn btn-success btn-lg" onclick="descargarExcel()" style="margin-left: 1rem;">
                            <i class="fas fa-file-excel"></i> Descargar en Excel
                        </button>
                        <button id="btnInformeDetallado" class="btn btn-info btn-lg" style="margin-left: 1rem;">
                            <i class="fas fa-file-alt"></i> Informe Detallado PDF
                        </button>
                        <button id="btnInformeDetalladoExcel" class="btn btn-success btn-lg" onclick="descargarInformeDetalladoExcel()" style="margin-left: 1rem;">
                            <i class="fas fa-file-excel"></i> Informe Detallado Excel
                        </button>

                    </div>
                </div>
                <div id="informeContent" class="informe-container"></div>
            </section>

            <!-- Periodos Gestion Section -->
            <section id="periodos" class="section">
                <div class="section-header" style="justify-content: flex-end;">
                    <button class="btn btn-primary" onclick="openPeriodoModal()">
                        <i class="fas fa-plus"></i> Nuevo Ciclo
                    </button>
                </div>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Nombre del Ciclo</th>
                                <th>Fecha Inicio</th>
                                <th>Fecha Fin</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="periodosTable"></tbody>
                    </table>
                </div>
            </section>

            <section id="perfil" class="section">
                <div class="profile-container">
                    <form id="perfilForm" class="profile-form">
                        <div class="profile-grid">
                            <div class="profile-column">
                                <h3 style="margin-bottom: 20px;"><i class="fas fa-user-circle"></i> Información Personal</h3>
                                <div class="form-group">
                                    <label>Nombre</label>
                                    <input type="text" id="perfilNombre" class="form-control" required>
                                </div>
                                <div class="form-group">
                                    <label>Email</label>
                                    <input type="email" id="perfilEmail" class="form-control" required>
                                </div>
                                <div class="form-group">
                                    <label>Teléfono</label>
                                    <input type="text" id="perfilTelefono" class="form-control">
                                </div>
                                <div class="form-group">
                                    <label>Nueva Contraseña (dejar vacío para no cambiar)</label>
                                    <input type="password" id="perfilPassword" class="form-control">
                                </div>
                            </div>

                            <div class="profile-column">
                                <h3 style="margin-bottom: 20px;"><i class="fas fa-file-signature"></i> Configuración de Firma para PDFs</h3>
                                <div class="form-group">
                                    <label>Nombre para Firma</label>
                                    <input type="text" id="perfilNombreFirma" class="form-control" placeholder="EDINSON PAUL GAMONAL VIDARTE">
                                </div>
                                <div class="form-group">
                                    <label>Cargo para Firma</label>
                                    <input type="text" id="perfilCargoFirma" class="form-control" placeholder="TESORERO DNI">
                                </div>
                                <div style="margin-top: 1rem; display: flex; justify-content: flex-end;">
                                    <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; justify-content: center;">
                                        <i class="fas fa-save"></i> Guardar Cambios
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </section>
        </main>
    </div>

    <!-- Modals -->
    <!-- Rubro Modal -->
    <div id="rubroModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="rubroModalTitle">Nuevo Rubro</h3>
                <span class="close" onclick="closeRubroModal()">&times;</span>
            </div>
            <form id="rubroForm" class="modal-body">
                <input type="hidden" id="rubroId">
                <input type="hidden" id="rubroTipo">
                <div class="form-group">
                    <label>Nombre *</label>
                    <input type="text" id="rubroNombre" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea id="rubroDescripcion" class="form-control" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="rubroActivo" checked> Activo
                    </label>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeRubroModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Ingreso Modal -->
    <div id="ingresoModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="ingresoModalTitle"><i class="fas fa-arrow-down text-success"></i> Nuevo Ingreso</h3>
                <span class="close" onclick="closeIngresoModal()">&times;</span>
            </div>
            <form id="ingresoForm">
                <div class="modal-body" style="padding: 1rem 1.25rem;">
                    <input type="hidden" id="ingresoId">
                    
                    <div id="saldoReferenciaIngreso" style="background: var(--light-color); padding: 0.4rem 0.6rem; border-radius: 6px; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border-color);">
                        <span style="font-size: 0.75rem; color: var(--text-light);"><i class="fas fa-wallet"></i> Saldo Actual:</span>
                        <span class="saldo-actual-ref" style="font-weight: 700; color: var(--primary-dark); font-size: 0.85rem;">S/ 0.00</span>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Recibido de *</label>
                            <div class="input-with-icon">
                                <i class="fas fa-user"></i>
                                <input type="text" id="ingresoRecibidoDe" class="form-control" placeholder="Nombre" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Cantidad (S/) *</label>
                            <div class="input-with-icon">
                                <i class="fas fa-coins"></i>
                                <input type="number" id="ingresoCantidad" class="form-control" step="0.01" min="0" placeholder="0.00" required>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Concepto del Ingreso *</label>
                        <textarea id="ingresoConcepto" class="form-control" rows="1" placeholder="Motivo..." required style="min-height: 40px;"></textarea>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Fecha *</label>
                            <div class="input-with-icon">
                                <i class="fas fa-calendar-alt"></i>
                                <input type="date" id="ingresoFecha" class="form-control" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>N° Recibo</label>
                            <div class="input-with-icon">
                                <i class="fas fa-receipt"></i>
                                <input type="text" id="ingresoNumeroRecibo" class="form-control" placeholder="Número">
                            </div>
                        </div>
                    </div>

                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Rubro de Ingreso *</label>
                        <div class="input-with-icon">
                            <i class="fas fa-tag"></i>
                            <select id="ingresoRubro" class="form-control" required></select>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeIngresoModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar Ingreso</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Egreso Modal -->
    <div id="egresoModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="egresoModalTitle"><i class="fas fa-arrow-up text-danger"></i> Nuevo Egreso</h3>
                <span class="close" onclick="closeEgresoModal()">&times;</span>
            </div>
            <form id="egresoForm">
                <div class="modal-body" style="padding: 1rem 1.25rem;">
                    <input type="hidden" id="egresoId">
                    
                    <div id="saldoReferenciaEgreso" style="background: var(--light-color); padding: 0.4rem 0.6rem; border-radius: 6px; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border-color);">
                        <span style="font-size: 0.75rem; color: var(--text-light);"><i class="fas fa-wallet"></i> Saldo Disponible:</span>
                        <span class="saldo-actual-ref" style="font-weight: 700; color: var(--danger-color); font-size: 0.85rem;">S/ 0.00</span>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Entregado a *</label>
                            <div class="input-with-icon">
                                <i class="fas fa-user"></i>
                                <input type="text" id="egresoEntregadoA" class="form-control" placeholder="Nombre" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Cantidad (S/) *</label>
                            <div class="input-with-icon">
                                <i class="fas fa-coins"></i>
                                <input type="number" id="egresoCantidad" class="form-control" step="0.01" min="0" placeholder="0.00" required>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Concepto del Gasto *</label>
                        <textarea id="egresoConcepto" class="form-control" rows="1" placeholder="Motivo..." required style="min-height: 40px;"></textarea>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Fecha *</label>
                            <div class="input-with-icon">
                                <i class="fas fa-calendar-alt"></i>
                                <input type="date" id="egresoFecha" class="form-control" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>N° Recibo</label>
                            <div class="input-with-icon">
                                <i class="fas fa-receipt"></i>
                                <input type="text" id="egresoNumeroRecibo" class="form-control" placeholder="Número">
                            </div>
                        </div>
                    </div>

                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Rubro de Egreso *</label>
                        <div class="input-with-icon">
                            <i class="fas fa-tag"></i>
                            <select id="egresoRubro" class="form-control" required></select>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeEgresoModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar Egreso</button>
                </div>
            </form>
        </div>
    </div>



    <!-- Saldo Intangible Modal -->
    <div id="saldoIntangibleModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="saldoIntangibleModalTitle">Nuevo Saldo Intangible</h3>
                <span class="close" onclick="closeSaldoIntangibleModal()">&times;</span>
            </div>
            <form id="saldoIntangibleForm" class="modal-body">
                <input type="hidden" id="saldoIntangibleId">
                <div class="form-group">
                    <label>Descripción *</label>
                    <input type="text" id="saldoIntangibleDescripcion" class="form-control" required placeholder="Ej: Fondo de emergencia, Fondo para materiales, etc.">
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="saldoIntangibleActivo" checked> Activo
                    </label>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeSaldoIntangibleModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Retiro Intangible Modal -->
    <div id="retiroIntangibleModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="retiroIntangibleModalTitle">Nuevo Retiro</h3>
                <span class="close" onclick="closeRetiroIntangibleModal()">&times;</span>
            </div>
            <form id="retiroIntangibleForm" class="modal-body">
                <input type="hidden" id="retiroIntangibleId">
                <div class="form-row">
                    <div class="form-group">
                        <label>Saldo Intangible *</label>
                        <select id="retiroIntangibleSaldo" class="form-control" required onchange="actualizarSaldoDisponible()"></select>
                        <small id="saldoDisponibleRetiro" style="color: var(--info-color); font-size: 0.875rem; margin-top: 0.25rem;"></small>
                    </div>
                    <div class="form-group">
                        <label>Monto Retiro *</label>
                        <input type="number" id="retiroIntangibleMonto" class="form-control" step="0.01" min="0" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Fecha *</label>
                        <input type="date" id="retiroIntangibleFecha" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Entregado a *</label>
                        <input type="text" id="retiroIntangibleEntregadoA" class="form-control" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea id="retiroIntangibleDescripcion" class="form-control" rows="2"></textarea>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeRetiroIntangibleModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Aporte Intangible Modal -->
    <div id="aporteIntangibleModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="aporteIntangibleModalTitle">Nuevo Aporte</h3>
                <span class="close" onclick="closeAporteIntangibleModal()">&times;</span>
            </div>
            <form id="aporteIntangibleForm" class="modal-body">
                <input type="hidden" id="aporteIntangibleId">
                <div class="form-row">
                    <div class="form-group">
                        <label>Saldo Intangible *</label>
                        <select id="aporteIntangibleSaldo" class="form-control" required></select>
                    </div>
                    <div class="form-group">
                        <label>Monto Aporte *</label>
                        <input type="number" id="aporteIntangibleMonto" class="form-control" step="0.01" min="0" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Fecha *</label>
                        <input type="date" id="aporteIntangibleFecha" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Entregado por *</label>
                        <input type="text" id="aporteIntangibleEntregadoPor" class="form-control" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea id="aporteIntangibleDescripcion" class="form-control" rows="2"></textarea>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeAporteIntangibleModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Dinero Intangible Modal (mantener por compatibilidad) -->
    <div id="dineroIntangibleModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Gestionar Dinero Intangible</h3>
                <span class="close" onclick="closeDineroIntangibleModal()">&times;</span>
            </div>
            <form id="dineroIntangibleForm" class="modal-body">
                <div class="form-group">
                    <label>Mes *</label>
                    <input type="month" id="dineroIntangibleMes" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Monto *</label>
                    <input type="number" id="dineroIntangibleMonto" class="form-control" step="0.01" min="0" required>
                    <small id="dineroIntangibleMontoActual" style="color: var(--text-light); font-size: 0.875rem;"></small>
                </div>
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea id="dineroIntangibleDescripcion" class="form-control" rows="3" placeholder="Descripción del dinero intangible (opcional)"></textarea>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="dineroIntangibleSumar"> Sumar al saldo existente (en lugar de reemplazar)
                    </label>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeDineroIntangibleModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        // Verificar que las funciones básicas estén disponibles
        console.log('Iniciando aplicación...');
        
        // Asegurar que logout esté disponible antes de cargar el script principal
        if (typeof window.logout === 'undefined') {
            window.logout = async function() {
                if (confirm('¿Está seguro de cerrar sesión?')) {
                    try {
                        const response = await fetch('api/auth.php', {
                            method: 'DELETE',
                            credentials: 'same-origin'
                        });
                        window.location.href = 'login.html';
                    } catch (error) {
                        console.error('Error logging out:', error);
                        window.location.href = 'login.html';
                    }
                }
            };
            console.log('Función logout definida');
        }
        
        // No necesitamos el respaldo si el código principal funciona bien
    </script>
    <!-- Modal Ciclo/Periodo -->
    <div id="periodoModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="periodoModalTitle">Nuevo Ciclo de Gestión</h3>
                <span class="close" onclick="closePeriodoModal()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="periodoForm">
                    <input type="hidden" id="periodoId">
                    <div class="form-group">
                        <label>Nombre del Ciclo (ej: Periodo 2025-2026)</label>
                        <input type="text" id="periodoNombre" class="form-control" placeholder="Gestión 2025-2026" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Fecha de Inicio</label>
                            <input type="date" id="periodoFechaInicio" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Fecha de Fin</label>
                            <input type="date" id="periodoFechaFin" class="form-control" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Saldo Inicial (para este ciclo)</label>
                        <div class="input-group">
                            <span class="input-group-text">S/</span>
                            <input type="number" id="periodoSaldoInicial" class="form-control" step="0.01" min="0" placeholder="0.00">
                        </div>
                        <small class="form-text text-muted">Monto con el que inicia este ciclo específico.</small>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-container">
                            <input type="checkbox" id="periodoActivo">
                            <span class="checkmark"></span> Establecer como ciclo activo por defecto
                        </label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closePeriodoModal()">Cancelar</button>
                <button type="submit" form="periodoForm" class="btn btn-primary">Guardar Ciclo</button>
            </div>
        </div>
    </div>

    <script src="js/app.js?v=2.0"></script>
    <script>
        // Verificar que la inicialización se haya completado
        setTimeout(function() {
            console.log('Verificando inicialización...');
            console.log('currentSection:', typeof currentSection !== 'undefined' ? currentSection : 'no definido');
            console.log('Función logout:', typeof window.logout !== 'undefined' ? 'disponible' : 'no disponible');
            console.log('Función showSection:', typeof showSection !== 'undefined' ? 'disponible' : 'no disponible');
            
            // Verificar elementos del menú
            const navItems = document.querySelectorAll('.nav-item');
            console.log('Items del menú encontrados:', navItems.length);
            
            // Verificar secciones
            const sections = document.querySelectorAll('.section');
            console.log('Secciones encontradas:', sections.length);
            
            // Probar navegación manualmente
            navItems.forEach(function(item) {
                const section = item.getAttribute('data-section');
                console.log('Item del menú:', section, 'Elemento:', item);
            });
        }, 1000);
    </script>
</body>
</html>
<?php
ob_end_flush();
?>

