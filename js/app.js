// API Base URL
const API_BASE = 'api';
const LOGO_IZQUIERDO = 'img/DNI.png';
const LOGO_DERECHO = 'img/LOGO IDN.jpg';

// Estado de la aplicación
let currentSection = 'dashboard';
let editingId = null;
let periodosGestion = []; // Almacenar los ciclos de gestión
let activePeriod = null; // Ciclo activo actual

// Función auxiliar para obtener la fecha de hoy en formato YYYY-MM-DD (zona horaria local)
function getTodayLocalDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Función auxiliar para formatear una fecha en formato YYYY-MM-DD sin problemas de zona horaria
function formatDateToYYYYMMDD(dateString) {
    if (!dateString) return '';

    // Convertir a string si no lo es
    const dateStr = String(dateString).trim();

    // Si ya está en formato YYYY-MM-DD, devolverlo directamente
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }

    // Si viene con información de tiempo (YYYY-MM-DD HH:MM:SS o YYYY-MM-DDTHH:MM:SS), extraer solo la fecha
    const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
        // Validar que la fecha sea válida
        const year = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10);
        const day = parseInt(dateMatch[3], 10);

        // Verificar que los valores sean válidos
        if (year >= 1000 && year <= 9999 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
    }

    // Si no se puede parsear, intentar crear una fecha local (sin usar UTC)
    // Pero esto es un último recurso
    try {
        // Parsear manualmente sin usar Date para evitar problemas de zona horaria
        // Si viene en formato ISO, extraer componentes
        const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
            return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
        }
    } catch (e) {
        console.warn('Error parsing date:', dateString, e);
    }

    // Si viene de un input type="date", ya está en formato correcto
    return dateStr;
}

// Función auxiliar para convertir un objeto Date a YYYY-MM-DD usando zona horaria local
function dateToLocalYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Función auxiliar para parsear una fecha string a objeto Date usando zona horaria local
function parseDateLocal(dateString) {
    if (!dateString) return new Date();

    const dateMatch = String(dateString).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
        const year = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10) - 1; // Los meses van de 0-11
        const day = parseInt(dateMatch[3], 10);
        return new Date(year, month, day);
    }

    // Si no está en formato YYYY-MM-DD, intentar parsear normalmente
    return new Date(dateString);
}

// Función auxiliar para parsear fecha para ordenamiento (retorna timestamp)
function parseDateForSort(dateString) {
    if (!dateString) return 0;

    const dateMatch = String(dateString).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
        const year = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10) - 1;
        const day = parseInt(dateMatch[3], 10);
        return new Date(year, month, day).getTime();
    }

    // Si no está en formato YYYY-MM-DD, intentar parsear normalmente
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 0 : date.getTime();
}

// Helper para hacer peticiones fetch con credenciales
async function apiFetch(url, options = {}) {
    const defaultOptions = {
        credentials: 'same-origin'
    };

    const response = await fetch(url, { ...defaultOptions, ...options });

    // Si la respuesta es no autorizado, redirigir al login
    if (response.status === 401 || response.status === 403) {
        window.location.href = 'login.html';
        return response;
    }

    return response;
}

// Inicialización - Ya estamos autenticados porque index.php verifica la sesión del servidor
// Configurar event delegation para los botones de informes (se ejecutará cuando el DOM esté listo)
function setupInformesButtons() {
    document.addEventListener('click', function (e) {
        // Botón de informe detallado PDF
        if (e.target && (e.target.id === 'btnInformeDetallado' || e.target.closest('#btnInformeDetallado'))) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Botón de informe detallado clickeado');
            try {
                descargarInformeDetalladoPDF();
            } catch (error) {
                console.error('Error al llamar a descargarInformeDetalladoPDF:', error);
                showNotification('Error al generar el informe detallado. Consulte la consola para más detalles.', 'error');
            }
        }




    });
}

// Configurar los botones cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupInformesButtons);
} else {
    setupInformesButtons();
}

// Usar window.onload como respaldo si DOMContentLoaded ya se ejecutó
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM ya está cargado
    initializeApp();
}

// Verificar autenticación
async function checkAuthentication() {
    try {
        const response = await apiFetch(`${API_BASE}/auth.php`);
        const data = await response.json();
        return data.authenticated === true;
    } catch (error) {
        console.error('Error checking auth:', error);
        return false;
    }
}

// Logout - Hacerla global
window.logout = async function () {
    if (confirm('¿Está seguro de cerrar sesión?')) {
        try {
            await apiFetch(`${API_BASE}/auth.php`, {
                method: 'DELETE'
            });
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error logging out:', error);
            window.location.href = 'login.html';
        }
    }
};

async function initializeApp() {
    try {
        setupNavigation();
        setupModals();
        setupForms();
        updateDateDisplay();

        // Cargar el ciclo activo primero para tener el contexto
        await loadActivePeriod();

        // Establecer fecha por defecto (hoy)
        const ingresoFecha = document.getElementById('ingresoFecha');
        const egresoFecha = document.getElementById('egresoFecha');
        if (ingresoFecha) ingresoFecha.value = getTodayLocalDate();
        if (egresoFecha) egresoFecha.value = getTodayLocalDate();

        // Inicializar opciones de período según el tipo de informe
        if (typeof cambiarTipoInforme === 'function') {
            cambiarTipoInforme();
        }

        // Los event listeners para los botones de informes se configuran globalmente arriba
    } catch (error) {
        console.error('Error en initializeApp:', error);
    }
}

// Navegación - Versión simplificada y más confiable
function setupNavigation() {
    console.log('Configurando navegación...');

    // Agregar listeners directamente a cada item del menú
    const navItems = document.querySelectorAll('.nav-item');
    console.log('Items del menú encontrados:', navItems.length);

    navItems.forEach(function (navItem) {
        // Remover listeners anteriores clonando el elemento
        const newItem = navItem.cloneNode(true);
        navItem.parentNode.replaceChild(newItem, navItem);

        // Agregar listener al nuevo elemento
        newItem.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const section = this.getAttribute('data-section');
            console.log('Click en menú - Sección:', section);

            if (section) {
                // Llamar a showSection
                if (typeof showSection === 'function') {
                    showSection(section);
                } else {
                    console.error('showSection no está definida');
                    // Fallback: hacerlo manualmente
                    document.querySelectorAll('.section').forEach(function (s) {
                        s.classList.remove('active');
                    });
                    const target = document.getElementById(section);
                    if (target) {
                        target.classList.add('active');
                    }
                }

                // Actualizar estado activo
                document.querySelectorAll('.nav-item').forEach(function (ni) {
                    ni.classList.remove('active');
                });
                this.classList.add('active');
            } else {
                console.error('No se encontró data-section');
            }
        });
    });

    // Menu toggle
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function (e) {
            e.preventDefault();
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.toggle('active');
            }
        });
    }

    console.log('Navegación configurada correctamente');
}

function showSection(section) {
    console.log('showSection llamada con:', section);

    if (!section) {
        console.error('showSection: section no definida');
        return;
    }

    try {
        // Ocultar todas las secciones
        const allSections = document.querySelectorAll('.section');
        console.log('Ocultando', allSections.length, 'secciones');
        allSections.forEach(function (s) {
            s.classList.remove('active');
        });

        // Mostrar sección seleccionada
        const targetSection = document.getElementById(section);
        if (!targetSection) {
            console.error('showSection: No se encontró la sección con id:', section);
            console.log('Secciones disponibles:', Array.from(document.querySelectorAll('.section')).map(s => s.id));
            return;
        }

        console.log('Mostrando sección:', section);
        targetSection.classList.add('active');
        currentSection = section;

        // Actualizar título
        const titles = {
            'dashboard': 'Dashboard',
            'rubros': 'Rubros',
            'ingresos': 'Ingresos',
            'egresos': 'Egresos',
            'saldos-intangibles': 'Saldos Intangibles',
            'informes': 'Informes',
            'periodos': 'Gestión de Ciclos',
            'perfil': 'Perfil'
        };
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            pageTitle.textContent = titles[section] || 'Dashboard';
        }

        // Cargar datos según la sección
        switch (section) {
            case 'rubros':
                if (typeof loadRubros === 'function') {
                    loadRubros('ingresos');
                    loadRubros('egresos');
                }
                break;
            case 'ingresos':
                if (typeof loadIngresos === 'function') loadIngresos();
                if (typeof loadRubrosIngresos === 'function') loadRubrosIngresos();
                break;
            case 'egresos':
                if (typeof loadEgresos === 'function') loadEgresos();
                if (typeof loadRubrosEgresos === 'function') loadRubrosEgresos();
                break;
            case 'saldos-intangibles':
                if (typeof loadSaldosIntangibles === 'function') loadSaldosIntangibles();
                if (typeof loadAportesIntangibles === 'function') loadAportesIntangibles();
                if (typeof loadRetirosIntangibles === 'function') loadRetirosIntangibles();
                if (typeof loadSaldosIntangiblesSelect === 'function') loadSaldosIntangiblesSelect();
                if (typeof cargarResumenIntangibles === 'function') cargarResumenIntangibles();

                // Resetear visibilidad de botones al entrar (por defecto el primer tab)
                updateIntangibleButtons('saldos-intangibles-list');
                break;
            case 'informes':
                if (typeof cargarCiclosInformes === 'function') cargarCiclosInformes();
                break;
            case 'perfil':
                if (typeof loadPerfil === 'function') loadPerfil();
                break;
            case 'periodos':
                if (typeof loadPeriodos === 'function') loadPeriodos();
                break;
        }
    } catch (error) {
        console.error('Error en showSection:', error);
    }
}

// Tabs para rubros y saldos intangibles
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        const parentSection = btn.closest('.section');

        // Solo afectar botones dentro de la misma sección
        if (parentSection) {
            parentSection.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            parentSection.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        } else {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        }

        btn.classList.add('active');
        const tabContent = document.getElementById(tab);
        if (tabContent) {
            tabContent.classList.add('active');

            // Lógica específica para Rubros
            if (tab === 'rubros-ingresos' || tab === 'rubros-egresos') {
                const btnNuevo = document.getElementById('btnNuevoRubro');
                if (btnNuevo) {
                    const tipo = tab === 'rubros-ingresos' ? 'ingresos' : 'egresos';
                    btnNuevo.setAttribute('onclick', `openRubroModal('${tipo}')`);
                    btnNuevo.style.display = 'inline-flex';
                }
            }

            // Lógica específica para Saldos Intangibles
            if (tab.includes('intangibles')) {
                updateIntangibleButtons(tab);
            }

            // Si es el tab de resumen, cargar el resumen automáticamente
            if (tab === 'resumen-intangibles' && typeof cargarResumenIntangibles === 'function') {
                if (!datosResumenActual) {
                    cargarResumenIntangibles();
                }
            }
        }
    });
});

// Función para actualizar la visibilidad de los botones en la sección de intangibles
function updateIntangibleButtons(tab) {
    const btnNuevoSaldo = document.getElementById('btnNuevoSaldoIntangible');
    const btnNuevoAporte = document.getElementById('btnNuevoAporteIntangible');
    const btnNuevoRetiro = document.getElementById('btnNuevoRetiroIntangible');
    const resumenActions = document.getElementById('resumen-export-actions');

    if (btnNuevoSaldo) btnNuevoSaldo.style.display = tab === 'saldos-intangibles-list' ? 'inline-flex' : 'none';
    if (btnNuevoAporte) btnNuevoAporte.style.display = tab === 'aportes-intangibles-list' ? 'inline-flex' : 'none';
    if (btnNuevoRetiro) btnNuevoRetiro.style.display = tab === 'retiros-intangibles-list' ? 'inline-flex' : 'none';
    if (resumenActions) resumenActions.style.display = tab === 'resumen-intangibles' ? 'flex' : 'none';
}

// Cargar el ciclo activo
async function loadActivePeriod() {
    try {
        const response = await apiFetch(`${API_BASE}/periodos_gestion.php?activo=1`);
        const data = await response.json();
        if (data.success && data.data) {
            activePeriod = data.data;
            console.log('Ciclo activo cargado:', activePeriod);

            // Actualizar display de periodo en dashboard
            const periodoElement = document.getElementById('periodoActual');
            if (periodoElement) {
                // Si estamos en dashboard, podemos mostrar el nombre del ciclo también
                periodoElement.textContent = activePeriod.nombre;
            }

            // Sincronizar todas las fechas de filtros con el ciclo activo
            syncFilterDates();
        }
        // Independientemente de si hay ciclo o no, cargar el dashboard
        loadDashboard();
    } catch (error) {
        console.error('Error loading active period:', error);
        loadDashboard();
    }
}

// Función para sincronizar fechas de filtros con el ciclo activo
function syncFilterDates() {
    if (!activePeriod) return;

    const fields = [
        'fechaInicioIngresos', 'fechaFinIngresos',
        'fechaInicioEgresos', 'fechaFinEgresos',
        'fechaInicioAportes', 'fechaFinAportes',
        'fechaInicioRetiros', 'fechaFinRetiros',
        'fechaInicioResumen', 'fechaFinResumen'
    ];

    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id.includes('Inicio')) el.value = activePeriod.fecha_inicio;
            if (id.includes('Fin')) el.value = activePeriod.fecha_fin;
        }
    });

    console.log('Fechas de filtros sincronizadas con el ciclo:', activePeriod.nombre);
}

// Dashboard
async function loadDashboard() {
    try {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const fechaInicio = dateToLocalYYYYMMDD(firstDay);
        const fechaFin = dateToLocalYYYYMMDD(lastDay);

        let url = `${API_BASE}/informes.php?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
        if (activePeriod) {
            url += `&periodo_id=${activePeriod.id}`;
        }

        const informe = await apiFetch(url)
            .then(r => r.json());

        if (informe.success) {
            document.getElementById('saldoActual').textContent = formatCurrency(informe.data.saldo_final);
            document.getElementById('ingresosMes').textContent = formatCurrency(informe.data.total_ingresos);
            document.getElementById('egresosMes').textContent = formatCurrency(informe.data.total_egresos);

            // Actualizar dinero intangible del mes actual (viene en el informe) - ahora acumulativo (aportes - retiros)
            const intangibleElement = document.getElementById('dineroIntangibleDashboard');
            if (intangibleElement) {
                const totalIntangible = informe.data.dinero_intangible || 0;
                intangibleElement.textContent = formatCurrency(totalIntangible);
            } else {
                console.warn('Elemento dineroIntangibleDashboard no encontrado');
            }

            const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            document.getElementById('periodoActual').textContent =
                `${monthNames[today.getMonth()]} ${today.getFullYear()}`;
        }

        // Cargar actividad reciente
        await loadRecentActivity();
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadRecentActivity() {
    try {
        let urlIngresos = `${API_BASE}/ingresos.php`;
        let urlEgresos = `${API_BASE}/egresos.php`;

        if (activePeriod) {
            urlIngresos += `?fecha_inicio=${activePeriod.fecha_inicio}&fecha_fin=${activePeriod.fecha_fin}`;
            urlEgresos += `?fecha_inicio=${activePeriod.fecha_inicio}&fecha_fin=${activePeriod.fecha_fin}`;
        }

        const ingresos = await apiFetch(urlIngresos).then(r => r.json());
        const egresos = await apiFetch(urlEgresos).then(r => r.json());

        const activity = [];

        if (ingresos.success) {
            ingresos.data.slice(0, 5).forEach(i => {
                activity.push({
                    type: 'ingreso',
                    concepto: i.concepto,
                    cantidad: i.cantidad,
                    fecha: i.fecha,
                    recibido_de: i.recibido_de
                });
            });
        }

        if (egresos.success) {
            egresos.data.slice(0, 5).forEach(e => {
                activity.push({
                    type: 'egreso',
                    concepto: e.concepto,
                    cantidad: e.cantidad,
                    fecha: e.fecha,
                    entregado_a: e.entregado_a
                });
            });
        }

        // Ordenar por fecha parseando manualmente para evitar problemas de zona horaria
        activity.sort((a, b) => {
            const fechaA = parseDateForSort(a.fecha);
            const fechaB = parseDateForSort(b.fecha);
            return fechaB - fechaA;
        });

        const container = document.getElementById('recentActivityContent');
        if (activity.length === 0) {
            container.innerHTML = '<p class="loading">No hay actividad reciente</p>';
            return;
        }

        container.innerHTML = activity.slice(0, 10).map(item => `
            <div class="activity-item">
                <div class="activity-icon ${item.type}">
                    <i class="fas fa-${item.type === 'ingreso' ? 'arrow-down' : 'arrow-up'}"></i>
                </div>
                <div class="activity-info">
                    <h4>${item.concepto}</h4>
                    <p>${item.type === 'ingreso' ? item.recibido_de : item.entregado_a} - ${formatDate(item.fecha)}</p>
                </div>
                <div class="activity-amount ${item.type}">
                    ${item.type === 'ingreso' ? '+' : '-'}${formatCurrency(item.cantidad)}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

// Rubros
async function loadRubros(tipo) {
    try {
        let url = `${API_BASE}/rubros_${tipo}.php`;
        const response = await apiFetch(url);
        const data = await response.json();

        if (data.success) {
            const tbody = document.getElementById(`rubros${tipo.charAt(0).toUpperCase() + tipo.slice(1)}Table`);
            tbody.innerHTML = data.data.map(rubro => `
                <tr>
                    <td>${rubro.id}</td>
                    <td>${rubro.nombre}</td>
                    <td>${rubro.descripcion || '-'}</td>
                    <td><span class="badge ${rubro.activo ? 'badge-success' : 'badge-danger'}">
                        ${rubro.activo ? 'Activo' : 'Inactivo'}
                    </span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editRubro(${rubro.id}, '${tipo}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteRubro(${rubro.id}, '${tipo}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading rubros:', error);
        showNotification('Error al cargar rubros', 'error');
    }
}

async function loadRubrosIngresos() {
    try {
        let url = `${API_BASE}/rubros_ingresos.php`;
        const response = await apiFetch(url);
        const data = await response.json();
        if (data.success) {
            const select = document.getElementById('ingresoRubro');
            select.innerHTML = data.data.filter(r => r.activo).map(r =>
                `<option value="${r.id}">${r.nombre}</option>`
            ).join('');
        }
    } catch (error) {
        console.error('Error loading rubros ingresos:', error);
    }
}

async function loadRubrosEgresos() {
    try {
        let url = `${API_BASE}/rubros_egresos.php`;
        const response = await apiFetch(url);
        const data = await response.json();
        if (data.success) {
            const select = document.getElementById('egresoRubro');
            select.innerHTML = data.data.filter(r => r.activo).map(r =>
                `<option value="${r.id}">${r.nombre}</option>`
            ).join('');
        }
    } catch (error) {
        console.error('Error loading rubros egresos:', error);
    }
}

function openRubroModal(tipo) {
    editingId = null;
    document.getElementById('rubroId').value = '';
    document.getElementById('rubroTipo').value = tipo;
    document.getElementById('rubroNombre').value = '';
    document.getElementById('rubroDescripcion').value = '';
    document.getElementById('rubroActivo').checked = true;
    document.getElementById('rubroModalTitle').textContent = `Nuevo Rubro ${tipo === 'ingresos' ? 'Ingreso' : 'Egreso'}`;
    document.getElementById('rubroModal').style.display = 'block';
}

function closeRubroModal() {
    document.getElementById('rubroModal').style.display = 'none';
    document.getElementById('rubroForm').reset();
    editingId = null;
}

async function editRubro(id, tipo) {
    try {
        const response = await apiFetch(`${API_BASE}/rubros_${tipo}.php?id=${id}`);
        const data = await response.json();

        if (data.success) {
            editingId = id;
            document.getElementById('rubroId').value = id;
            document.getElementById('rubroTipo').value = tipo;
            document.getElementById('rubroNombre').value = data.data.nombre;
            document.getElementById('rubroDescripcion').value = data.data.descripcion || '';
            document.getElementById('rubroActivo').checked = data.data.activo == 1;
            document.getElementById('rubroModalTitle').textContent = `Editar Rubro ${tipo === 'ingresos' ? 'Ingreso' : 'Egreso'}`;
            document.getElementById('rubroModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading rubro:', error);
        showNotification('Error al cargar rubro', 'error');
    }
}

async function deleteRubro(id, tipo) {
    if (!confirm('¿Está seguro de eliminar este rubro?')) return;

    try {
        const response = await apiFetch(`${API_BASE}/rubros_${tipo}.php?id=${id}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
            showNotification('Rubro eliminado exitosamente', 'success');
            loadRubros(tipo);
        } else {
            showNotification(data.message || 'Error al eliminar rubro', 'error');
        }
    } catch (error) {
        console.error('Error deleting rubro:', error);
        showNotification('Error al eliminar rubro', 'error');
    }
}

// Ingresos
async function loadIngresos() {
    try {
        let fechaInicio = document.getElementById('fechaInicioIngresos').value;
        let fechaFin = document.getElementById('fechaFinIngresos').value;

        // Si no hay filtros manuales y hay un ciclo activo, filtrar por el ciclo
        if (!fechaInicio && !fechaFin && activePeriod) {
            fechaInicio = activePeriod.fecha_inicio;
            fechaFin = activePeriod.fecha_fin;
            // Opcionalmente actualizar los inputs para que el usuario vea el filtro
            document.getElementById('fechaInicioIngresos').value = fechaInicio;
            document.getElementById('fechaFinIngresos').value = fechaFin;
        }

        let url = `${API_BASE}/ingresos.php`;
        if (fechaInicio && fechaFin) {
            url += `?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
        }

        const response = await apiFetch(url);
        const data = await response.json();

        if (data.success) {
            const tbody = document.getElementById('ingresosTable');
            if (data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay ingresos registrados</td></tr>';
                return;
            }

            tbody.innerHTML = data.data.map(ingreso => `
                <tr>
                    <td>${formatDate(ingreso.fecha)}</td>
                    <td>${ingreso.recibido_de}</td>
                    <td class="text-success">${formatCurrency(ingreso.cantidad)}</td>
                    <td>${ingreso.concepto}</td>
                    <td>${ingreso.numero_recibo || '-'}</td>
                    <td>${ingreso.rubro_nombre}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editIngreso(${ingreso.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteIngreso(${ingreso.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading ingresos:', error);
        showNotification('Error al cargar ingresos', 'error');
    }
}

function openIngresoModal() {
    editingId = null;
    document.getElementById('ingresoForm').reset();
    document.getElementById('ingresoId').value = '';
    document.getElementById('ingresoModalTitle').textContent = 'Nuevo Ingreso';
    document.getElementById('ingresoFecha').value = getTodayLocalDate();
    loadRubrosIngresos();

    // Actualizar el saldo de referencia
    const saldoActualText = document.getElementById('saldoActual').textContent;
    document.querySelectorAll('#ingresoModal .saldo-actual-ref').forEach(el => el.textContent = saldoActualText);

    document.getElementById('ingresoModal').style.display = 'block';
}

function closeIngresoModal() {
    document.getElementById('ingresoModal').style.display = 'none';
    document.getElementById('ingresoForm').reset();
    editingId = null;
}

async function editIngreso(id) {
    try {
        const response = await apiFetch(`${API_BASE}/ingresos.php?id=${id}`);
        const data = await response.json();

        if (data.success) {
            editingId = id;
            document.getElementById('ingresoId').value = id;
            document.getElementById('ingresoRecibidoDe').value = data.data.recibido_de;
            document.getElementById('ingresoCantidad').value = data.data.cantidad;
            document.getElementById('ingresoConcepto').value = data.data.concepto;
            document.getElementById('ingresoFecha').value = formatDateToYYYYMMDD(data.data.fecha);
            document.getElementById('ingresoNumeroRecibo').value = data.data.numero_recibo || '';
            await loadRubrosIngresos();
            document.getElementById('ingresoRubro').value = data.data.rubro_id;
            document.getElementById('ingresoModalTitle').textContent = 'Editar Ingreso';

            // Actualizar el saldo de referencia
            const saldoActualText = document.getElementById('saldoActual').textContent;
            document.querySelectorAll('#ingresoModal .saldo-actual-ref').forEach(el => el.textContent = saldoActualText);

            document.getElementById('ingresoModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading ingreso:', error);
        showNotification('Error al cargar ingreso', 'error');
    }
}

async function deleteIngreso(id) {
    if (!confirm('¿Está seguro de eliminar este ingreso?')) return;

    try {
        const response = await apiFetch(`${API_BASE}/ingresos.php?id=${id}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
            showNotification('Ingreso eliminado exitosamente', 'success');
            loadIngresos();
            loadDashboard();
        } else {
            showNotification(data.message || 'Error al eliminar ingreso', 'error');
        }
    } catch (error) {
        console.error('Error deleting ingreso:', error);
        showNotification('Error al eliminar ingreso', 'error');
    }
}

function filtrarIngresos() {
    loadIngresos();
}

function resetFiltrosIngresos() {
    document.getElementById('fechaInicioIngresos').value = '';
    document.getElementById('fechaFinIngresos').value = '';
    loadIngresos();
}

// Egresos
async function loadEgresos() {
    try {
        let fechaInicio = document.getElementById('fechaInicioEgresos').value;
        let fechaFin = document.getElementById('fechaFinEgresos').value;

        // Si no hay filtros manuales y hay un ciclo activo, filtrar por el ciclo
        if (!fechaInicio && !fechaFin && activePeriod) {
            fechaInicio = activePeriod.fecha_inicio;
            fechaFin = activePeriod.fecha_fin;
            // Opcionalmente actualizar los inputs para que el usuario vea el filtro
            document.getElementById('fechaInicioEgresos').value = fechaInicio;
            document.getElementById('fechaFinEgresos').value = fechaFin;
        }

        let url = `${API_BASE}/egresos.php`;
        if (fechaInicio && fechaFin) {
            url += `?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
        }

        const response = await apiFetch(url);
        const data = await response.json();

        if (data.success) {
            const tbody = document.getElementById('egresosTable');
            if (data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay egresos registrados</td></tr>';
                return;
            }

            tbody.innerHTML = data.data.map(egreso => `
                <tr>
                    <td>${formatDate(egreso.fecha)}</td>
                    <td>${egreso.entregado_a}</td>
                    <td class="text-danger">${formatCurrency(egreso.cantidad)}</td>
                    <td>${egreso.concepto}</td>
                    <td>${egreso.numero_recibo || '-'}</td>
                    <td>${egreso.rubro_nombre}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editEgreso(${egreso.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteEgreso(${egreso.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading egresos:', error);
        showNotification('Error al cargar egresos', 'error');
    }
}

function openEgresoModal() {
    editingId = null;
    document.getElementById('egresoForm').reset();
    document.getElementById('egresoId').value = '';
    document.getElementById('egresoModalTitle').textContent = 'Nuevo Egreso';
    document.getElementById('egresoFecha').value = getTodayLocalDate();
    loadRubrosEgresos();

    // Actualizar el saldo de referencia
    const saldoActualText = document.getElementById('saldoActual').textContent;
    document.querySelectorAll('#egresoModal .saldo-actual-ref').forEach(el => el.textContent = saldoActualText);

    document.getElementById('egresoModal').style.display = 'block';
}

function closeEgresoModal() {
    document.getElementById('egresoModal').style.display = 'none';
    document.getElementById('egresoForm').reset();
    editingId = null;
}

async function editEgreso(id) {
    try {
        const response = await apiFetch(`${API_BASE}/egresos.php?id=${id}`);
        const data = await response.json();

        if (data.success) {
            editingId = id;
            document.getElementById('egresoId').value = id;
            document.getElementById('egresoEntregadoA').value = data.data.entregado_a;
            document.getElementById('egresoCantidad').value = data.data.cantidad;
            document.getElementById('egresoConcepto').value = data.data.concepto;
            document.getElementById('egresoFecha').value = formatDateToYYYYMMDD(data.data.fecha);
            document.getElementById('egresoNumeroRecibo').value = data.data.numero_recibo || '';
            await loadRubrosEgresos();
            document.getElementById('egresoRubro').value = data.data.rubro_id;
            document.getElementById('egresoModalTitle').textContent = 'Editar Egreso';

            // Actualizar el saldo de referencia
            const saldoActualText = document.getElementById('saldoActual').textContent;
            document.querySelectorAll('#egresoModal .saldo-actual-ref').forEach(el => el.textContent = saldoActualText);

            document.getElementById('egresoModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading egreso:', error);
        showNotification('Error al cargar egreso', 'error');
    }
}

async function deleteEgreso(id) {
    if (!confirm('¿Está seguro de eliminar este egreso?')) return;

    try {
        const response = await apiFetch(`${API_BASE}/egresos.php?id=${id}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
            showNotification('Egreso eliminado exitosamente', 'success');
            loadEgresos();
            loadDashboard();
        } else {
            showNotification(data.message || 'Error al eliminar egreso', 'error');
        }
    } catch (error) {
        console.error('Error deleting egreso:', error);
        showNotification('Error al eliminar egreso', 'error');
    }
}

function filtrarEgresos() {
    loadEgresos();
}

function resetFiltrosEgresos() {
    document.getElementById('fechaInicioEgresos').value = '';
    document.getElementById('fechaFinEgresos').value = '';
    loadEgresos();
}

// Informes
function cambiarTipoInforme() {
    const tipo = document.getElementById('tipoInforme').value;
    const periodoFinGroup = document.getElementById('periodoFinGroup');
    const periodoSelectGroup = document.getElementById('periodoSelectGroup');
    const periodoSelect = document.getElementById('periodoInforme');

    if (tipo === 'personalizado') {
        periodoFinGroup.style.display = 'block';
        periodoSelectGroup.style.display = 'none';
        // Crear input month si no existe
        if (!document.getElementById('periodoInformeInput')) {
            const input = document.createElement('input');
            input.type = 'month';
            input.id = 'periodoInformeInput';
            input.className = 'form-control';
            input.style.marginTop = '0.5rem';
            periodoSelectGroup.parentNode.insertBefore(input, periodoSelectGroup);
        }
    } else {
        periodoFinGroup.style.display = 'none';
        periodoSelectGroup.style.display = 'block';
        // Eliminar input si existe
        const inputExists = document.getElementById('periodoInformeInput');
        if (inputExists) {
            inputExists.remove();
        }

        // Llenar el select según el tipo
        llenarOpcionesPeriodo(tipo);
    }
}

async function cargarCiclosInformes() {
    try {
        const response = await apiFetch(`${API_BASE}/periodos_gestion.php`);
        const data = await response.json();
        if (data.success) {
            periodosGestion = data.data;
            const select = document.getElementById('cicloInforme');
            if (select) {
                select.innerHTML = '';
                periodosGestion.forEach(p => {
                    const option = document.createElement('option');
                    option.value = p.id;
                    option.textContent = p.nombre;
                    if (p.es_activo == 1) option.selected = true;
                    select.appendChild(option);
                });
                // Llenar los periodos iniciales
                cambiarTipoInforme();
            }
        }
    } catch (error) {
        console.error('Error loading ciclos for reports:', error);
    }
}

function cambiarCicloInforme() {
    cambiarTipoInforme(); // Refrescar los periodos (meses/bimestres) según el ciclo seleccionado
}

const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function llenarOpcionesPeriodo(tipo) {
    const select = document.getElementById('periodoInforme');
    const cicloId = document.getElementById('cicloInforme')?.value;
    const ciclo = periodosGestion.find(p => p.id == cicloId);

    select.innerHTML = '<option value="">Seleccione un período</option>';
    if (!ciclo) return;

    const fechaInicio = parseDateLocal(ciclo.fecha_inicio);
    const fechaFin = parseDateLocal(ciclo.fecha_fin);

    if (tipo === 'mensual') {
        let actual = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), 1);
        while (actual <= fechaFin) {
            const val = `${actual.getFullYear()}-${String(actual.getMonth() + 1).padStart(2, '0')}`;
            const label = `${monthNames[actual.getMonth()].substring(0, 3)}-${String(actual.getFullYear()).substring(2)}`;
            const option = document.createElement('option');
            option.value = val;
            option.textContent = label;
            select.appendChild(option);
            actual.setMonth(actual.getMonth() + 1);
        }
    } else if (tipo === 'bimestral') {
        let actual = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), 1);
        while (actual <= fechaFin) {
            const mes1 = actual.getMonth();
            const anio1 = actual.getFullYear();

            let sig = new Date(actual.getFullYear(), actual.getMonth() + 1, 1);
            if (sig > fechaFin) break;

            const mes2 = sig.getMonth();
            const anio2 = sig.getFullYear();

            const val = `${anio1}-${String(mes1 + 1).padStart(2, '0')}`;
            const label = `${monthNames[mes1].substring(0, 3)}-${String(anio1).substring(2)} - ${monthNames[mes2].substring(0, 3)}-${String(anio2).substring(2)}`;

            const option = document.createElement('option');
            option.value = val;
            option.textContent = label;
            select.appendChild(option);

            actual.setMonth(actual.getMonth() + 2);
        }
    } else if (tipo === 'anual') {
        const option = document.createElement('option');
        option.value = ciclo.fecha_inicio.substring(0, 7);
        option.textContent = ciclo.nombre;
        select.appendChild(option);
    }
}

// Variable global para almacenar los datos del informe actual
let datosInformeActual = null;

async function obtenerDatosInforme() {
    const tipo = document.getElementById('tipoInforme').value;
    const periodo = document.getElementById('periodoInforme').value;

    if (!periodo && tipo !== 'anual' && tipo !== 'personalizado') {
        showNotification('Por favor, seleccione un período', 'error');
        return null;
    }

    let fechaInicio, fechaFin;

    if (tipo === 'mensual') {
        const [year, month] = periodo.split('-');
        fechaInicio = `${year}-${month}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        fechaFin = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    } else if (tipo === 'bimestral') {
        const [year, month] = periodo.split('-');
        const mesSeleccionado = parseInt(month);

        if (mesSeleccionado === 11) {
            fechaInicio = `${year}-11-01`;
            fechaFin = `${year}-12-31`;
        } else if (mesSeleccionado === 1) {
            fechaInicio = `${year}-01-01`;
            const lastDayFeb = new Date(year, 2, 0).getDate();
            fechaFin = `${year}-02-${String(lastDayFeb).padStart(2, '0')}`;
        } else if (mesSeleccionado === 3) {
            fechaInicio = `${year}-03-01`;
            const lastDayApr = new Date(year, 4, 0).getDate();
            fechaFin = `${year}-04-${String(lastDayApr).padStart(2, '0')}`;
        } else if (mesSeleccionado === 5) {
            fechaInicio = `${year}-05-01`;
            const lastDayJun = new Date(year, 6, 0).getDate();
            fechaFin = `${year}-06-${String(lastDayJun).padStart(2, '0')}`;
        } else if (mesSeleccionado === 7) {
            fechaInicio = `${year}-07-01`;
            const lastDayAug = new Date(year, 8, 0).getDate();
            fechaFin = `${year}-08-${String(lastDayAug).padStart(2, '0')}`;
        } else if (mesSeleccionado === 9) {
            fechaInicio = `${year}-09-01`;
            const lastDayOct = new Date(year, 10, 0).getDate();
            fechaFin = `${year}-10-${String(lastDayOct).padStart(2, '0')}`;
        }
    } else if (tipo === 'anual') {
        fechaInicio = '2025-11-01';
        fechaFin = '2026-10-31';
    } else { // personalizado
        const periodoInicio = document.getElementById('periodoInformeInput').value;
        const periodoFin = document.getElementById('periodoFinInforme').value;
        fechaInicio = periodoInicio + '-01';
        const [year, month] = periodoFin.split('-');
        const lastDay = new Date(year, month, 0).getDate();
        fechaFin = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    }

    try {
        const cicloId = document.getElementById('cicloInforme')?.value;
        let url = `${API_BASE}/informes.php?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
        if (cicloId) {
            url += `&periodo_id=${cicloId}`;
        }

        const response = await apiFetch(url);
        if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);

        const data = await response.json();
        if (data.success) {
            datosInformeActual = data.data;
            return data.data;
        } else {
            throw new Error(data.message || 'Error al obtener datos');
        }
    } catch (error) {
        console.error('Error fetching report data:', error);
        showNotification('Error: ' + error.message, 'error');
        return null;
    }
}

async function generarInforme() {
    const data = await obtenerDatosInforme();
    if (data) {
        // Mostrar en UI
        mostrarInforme(data);
        // Descargar PDF
        generarPDF(data);
        showNotification('Reporte generado y PDF descargado', 'success');
    }
}

function mostrarInforme(datos) {
    const container = document.getElementById('informeContent');

    // Obtener el tipo de informe y período seleccionado
    const tipoInforme = document.getElementById('tipoInforme').value;
    const periodoSelect = document.getElementById('periodoInforme');
    const periodoSeleccionado = periodoSelect ? periodoSelect.options[periodoSelect.selectedIndex]?.textContent : '';

    let periodoTexto = '';
    if (tipoInforme === 'mensual') {
        periodoTexto = `Informe Mensual - ${periodoSeleccionado || 'Período'}`;
    } else if (tipoInforme === 'bimestral') {
        periodoTexto = `Informe Bimestral - ${periodoSeleccionado || 'Período'}`;
    } else if (tipoInforme === 'anual') {
        periodoTexto = `Informe Anual - ${periodoSeleccionado || 'Nov 2025 - Oct 2026'}`;
    } else {
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        // Parsear fechas manualmente para evitar problemas de zona horaria
        const fechaInicio = parseDateLocal(datos.fecha_inicio);
        const fechaFin = parseDateLocal(datos.fecha_fin);
        periodoTexto = `Informe Personalizado - ${monthNames[fechaInicio.getMonth()]} ${fechaInicio.getFullYear()} - ${monthNames[fechaFin.getMonth()]} ${fechaFin.getFullYear()}`;
    }

    container.innerHTML = `
        <div class="informe-header">
            <h2>Informe Financiero</h2>
            <p>${periodoTexto}</p>
            <p>Generado el: ${formatDate(getTodayLocalDate())}</p>
        </div>
        
        <div class="informe-section">
            <h3>Ingresos por Rubro</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Rubro</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Saldo Anterior</td>
                        <td class="text-info">${formatCurrency(datos.saldo_anterior || 0)}</td>
                    </tr>
                    ${datos.ingresos_por_rubro.map(r => `
                        <tr>
                            <td>${r.nombre}</td>
                            <td class="text-success">${formatCurrency(r.total)}</td>
                        </tr>
                    `).join('')}
                    <tr style="font-weight: bold; background: var(--light-color);">
                        <td>TOTAL INGRESOS</td>
                        <td class="text-success">${formatCurrency((parseFloat(datos.total_ingresos) || 0) + (parseFloat(datos.saldo_anterior) || 0))}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="informe-section">
            <h3>Egresos por Rubro</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Rubro</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${datos.egresos_por_rubro.map(r => `
                        <tr>
                            <td>${r.nombre}</td>
                            <td class="text-danger">${formatCurrency(r.total)}</td>
                        </tr>
                    `).join('')}
                    <tr style="font-weight: bold; background: var(--light-color);">
                        <td>TOTAL EGRESOS</td>
                        <td class="text-danger">${formatCurrency(datos.total_egresos)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="informe-section">
            <h3>Saldos Intangibles</h3>
            ${datos.dinero_intangible_por_saldo && Array.isArray(datos.dinero_intangible_por_saldo) && datos.dinero_intangible_por_saldo.length > 0 ? `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Saldo Intangible</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${datos.dinero_intangible_por_saldo.filter(s => s && s.total > 0).map(s => `
                            <tr>
                                <td>${s.descripcion || 'Sin descripción'}</td>
                                <td class="text-success">${formatCurrency(s.total)}</td>
                            </tr>
                        `).join('')}
                        <tr style="font-weight: bold; background: var(--light-color);">
                            <td>TOTAL SALDOS INTANGIBLES</td>
                            <td class="text-success">${formatCurrency(datos.dinero_intangible || 0)}</td>
                        </tr>
                    </tbody>
                </table>
            ` : `
                <div class="resumen-box">
                    <div class="resumen-item">
                        <label>Total Saldos Intangibles</label>
                        <div class="value" style="color: var(--warning-color);">
                            ${formatCurrency(datos.dinero_intangible || 0)}
                        </div>
                    </div>
                </div>
            `}
        </div>
        
        <div class="informe-section">
            <h3>Resumen Financiero</h3>
            <div class="resumen-box">
                <div class="resumen-item">
                    <label>Ingresos</label>
                    <div class="value text-success">${formatCurrency((parseFloat(datos.total_ingresos) || 0) + (parseFloat(datos.saldo_anterior) || 0))}</div>
                </div>
                <div class="resumen-item">
                    <label>Total Egresos</label>
                    <div class="value text-danger">${formatCurrency(datos.total_egresos)}</div>
                </div>
                <div class="resumen-item">
                    <label>Saldo Final</label>
                    <div class="value" style="color: var(--primary-color); font-weight: bold;">${formatCurrency(datos.saldo_final)}</div>
                </div>
            </div>
        </div>
    `;
}

// Perfil
async function loadPerfil() {
    try {
        const response = await apiFetch(`${API_BASE}/perfil.php?id=1`);
        const data = await response.json();

        if (data.success) {
            document.getElementById('perfilNombre').value = data.data.nombre || '';
            document.getElementById('perfilEmail').value = data.data.email || '';
            document.getElementById('perfilTelefono').value = data.data.telefono || '';
            document.getElementById('perfilNombreFirma').value = data.data.nombre_firma || 'EDINSON PAUL GAMONAL VIDARTE';
            document.getElementById('perfilCargoFirma').value = data.data.cargo_firma || 'TESORERO DNI';

        }
    } catch (error) {
        console.error('Error loading perfil:', error);
    }
}

// Gestión de Periodos/Ciclos
async function loadPeriodos() {
    try {
        const response = await apiFetch(`${API_BASE}/periodos_gestion.php`);
        const data = await response.json();

        if (data.success) {
            const tbody = document.getElementById('periodosTable');
            if (!tbody) return;

            tbody.innerHTML = '';
            data.data.forEach(periodo => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${periodo.nombre}</td>
                    <td>${formatDate(periodo.fecha_inicio)}</td>
                    <td>${formatDate(periodo.fecha_fin)}</td>
                    <td>
                        <span class="badge ${periodo.es_activo == 1 ? 'badge-success' : 'badge-secondary'}">
                            ${periodo.es_activo == 1 ? 'Activo' : 'Inactivo'}
                        </span>
                    </td>
                    <td>
                        <div class="actions">
                            <button class="btn btn-sm btn-info" onclick="openPeriodoModal(${periodo.id})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${periodo.es_activo == 0 ? `
                                <button class="btn btn-sm btn-danger" onclick="eliminarPeriodo(${periodo.id})" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error loading periodos:', error);
    }
}

async function openPeriodoModal(id = null) {
    const modal = document.getElementById('periodoModal');
    const form = document.getElementById('periodoForm');
    const title = document.getElementById('periodoModalTitle');

    form.reset();
    document.getElementById('periodoId').value = id || '';
    title.textContent = id ? 'Editar Ciclo de Gestión' : 'Nuevo Ciclo de Gestión';

    if (id) {
        try {
            const response = await apiFetch(`${API_BASE}/periodos_gestion.php?id=${id}`);
            const data = await response.json();
            if (data.success) {
                document.getElementById('periodoNombre').value = data.data.nombre;
                document.getElementById('periodoFechaInicio').value = data.data.fecha_inicio;
                document.getElementById('periodoFechaFin').value = data.data.fecha_fin;
                document.getElementById('periodoActivo').checked = data.data.es_activo == 1;
                document.getElementById('periodoSaldoInicial').value = data.data.saldo_inicial || 0;
            }
        } catch (error) {
            console.error('Error fetching periodo:', error);
        }
    }

    modal.style.display = 'block';
}

function closePeriodoModal() {
    document.getElementById('periodoModal').style.display = 'none';
}

async function eliminarPeriodo(id) {
    if (confirm('¿Está seguro de eliminar este ciclo?')) {
        try {
            const response = await apiFetch(`${API_BASE}/periodos_gestion.php?id=${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                showNotification(data.message, 'success');
                loadPeriodos();
            } else {
                showNotification(data.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting periodo:', error);
        }
    }
}

// Forms
function setupForms() {
    // Periodo Form
    const periodoForm = document.getElementById('periodoForm');
    if (periodoForm) {
        periodoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('periodoId').value;
            const data = {
                nombre: document.getElementById('periodoNombre').value,
                fecha_inicio: document.getElementById('periodoFechaInicio').value,
                fecha_fin: document.getElementById('periodoFechaFin').value,
                es_activo: document.getElementById('periodoActivo').checked ? 1 : 0,
                saldo_inicial: parseFloat(document.getElementById('periodoSaldoInicial').value) || 0
            };

            if (id) data.id = parseInt(id);

            try {
                const method = id ? 'PUT' : 'POST';
                const response = await apiFetch(`${API_BASE}/periodos_gestion.php`, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (result.success) {
                    showNotification(result.message, 'success');
                    closePeriodoModal();
                    loadPeriodos();
                    // Si se marcó como activo, recargar los datos generales
                    if (data.es_activo == 1) {
                        loadActivePeriod();
                    }
                } else {
                    showNotification(result.message, 'error');
                }
            } catch (error) {
                console.error('Error saving periodo:', error);
            }
        });
    }

    // Rubro Form
    document.getElementById('rubroForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const tipo = document.getElementById('rubroTipo').value;
        const id = document.getElementById('rubroId').value;
        const data = {
            nombre: document.getElementById('rubroNombre').value,
            descripcion: document.getElementById('rubroDescripcion').value,
            activo: document.getElementById('rubroActivo').checked ? 1 : 0
        };

        if (id) {
            data.id = parseInt(id);
        }

        try {
            const method = id ? 'PUT' : 'POST';
            const response = await apiFetch(`${API_BASE}/rubros_${tipo}.php`, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                showNotification(result.message || 'Rubro guardado exitosamente', 'success');
                closeRubroModal();
                loadRubros(tipo);
            } else {
                showNotification(result.message || 'Error al guardar rubro', 'error');
            }
        } catch (error) {
            console.error('Error saving rubro:', error);
            showNotification('Error al guardar rubro', 'error');
        }
    });

    // Ingreso Form
    document.getElementById('ingresoForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('ingresoId').value;
        const data = {
            recibido_de: document.getElementById('ingresoRecibidoDe').value,
            cantidad: parseFloat(document.getElementById('ingresoCantidad').value),
            concepto: document.getElementById('ingresoConcepto').value,
            fecha: document.getElementById('ingresoFecha').value,
            numero_recibo: document.getElementById('ingresoNumeroRecibo').value,
            rubro_id: parseInt(document.getElementById('ingresoRubro').value)
        };

        if (id) {
            data.id = parseInt(id);
        }

        try {
            const method = id ? 'PUT' : 'POST';
            const response = await apiFetch(`${API_BASE}/ingresos.php`, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                showNotification(result.message || 'Ingreso guardado exitosamente', 'success');
                closeIngresoModal();
                loadIngresos();
                loadDashboard();
            } else {
                showNotification(result.message || 'Error al guardar ingreso', 'error');
            }
        } catch (error) {
            console.error('Error saving ingreso:', error);
            showNotification('Error al guardar ingreso', 'error');
        }
    });

    // Egreso Form
    document.getElementById('egresoForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('egresoId').value;
        const data = {
            entregado_a: document.getElementById('egresoEntregadoA').value,
            cantidad: parseFloat(document.getElementById('egresoCantidad').value),
            concepto: document.getElementById('egresoConcepto').value,
            fecha: document.getElementById('egresoFecha').value,
            numero_recibo: document.getElementById('egresoNumeroRecibo').value,
            rubro_id: parseInt(document.getElementById('egresoRubro').value)
        };

        if (id) {
            data.id = parseInt(id);
        }

        try {
            const method = id ? 'PUT' : 'POST';
            const response = await apiFetch(`${API_BASE}/egresos.php`, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                showNotification(result.message || 'Egreso guardado exitosamente', 'success');
                closeEgresoModal();
                loadEgresos();
                loadDashboard();
            } else {
                showNotification(result.message || 'Error al guardar egreso', 'error');
            }
        } catch (error) {
            console.error('Error saving egreso:', error);
            showNotification('Error al guardar egreso', 'error');
        }
    });

    // Perfil Form
    document.getElementById('perfilForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            id: 1,
            nombre: document.getElementById('perfilNombre').value,
            email: document.getElementById('perfilEmail').value,
            telefono: document.getElementById('perfilTelefono').value,
            nombre_firma: document.getElementById('perfilNombreFirma').value,
            cargo_firma: document.getElementById('perfilCargoFirma').value,

        };

        const password = document.getElementById('perfilPassword').value;
        if (password) {
            data.password = password;
        }

        try {
            const response = await apiFetch(`${API_BASE}/perfil.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                showNotification('Perfil actualizado exitosamente', 'success');
                document.getElementById('perfilPassword').value = '';
            } else {
                showNotification(result.message || 'Error al actualizar perfil', 'error');
            }
        } catch (error) {
            console.error('Error updating perfil:', error);
            showNotification('Error al actualizar perfil', 'error');
        }
    });

    // Saldo Anterior Form
    const saldoAnteriorForm = document.getElementById('saldoAnteriorForm');
    if (saldoAnteriorForm) {
        saldoAnteriorForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                fecha_gestion: document.getElementById('saldoAnteriorFecha').value,
                monto: parseFloat(document.getElementById('saldoAnteriorMonto').value),
                descripcion: document.getElementById('saldoAnteriorDescripcion').value
            };

            try {
                const response = await apiFetch(`${API_BASE}/saldo_anterior.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    showNotification('Saldo anterior guardado exitosamente', 'success');
                    closeSaldoAnteriorModal();
                    loadDashboard();
                } else {
                    showNotification(result.message || 'Error al guardar saldo anterior', 'error');
                }
            } catch (error) {
                console.error('Error saving saldo anterior:', error);
                showNotification('Error al guardar saldo anterior', 'error');
            }
        });
    }

    // Saldo Anterior del Período Form
    const saldoAnteriorPeriodoForm = document.getElementById('saldoAnteriorPeriodoForm');
    if (saldoAnteriorPeriodoForm) {
        saldoAnteriorPeriodoForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                fecha_gestion: document.getElementById('saldoAnteriorPeriodoFecha').value,
                monto: parseFloat(document.getElementById('saldoAnteriorPeriodoMonto').value),
                descripcion: document.getElementById('saldoAnteriorPeriodoDescripcion').value
            };

            try {
                const response = await apiFetch(`${API_BASE}/saldo_anterior.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    showNotification('Saldo anterior del período guardado exitosamente', 'success');
                    closeSaldoAnteriorPeriodoModal();
                    // Recargar el informe si está visible
                    if (datosInformeActual) {
                        const tipo = document.getElementById('tipoInforme').value;
                        const periodo = document.getElementById('periodoInforme').value;
                        if (tipo && periodo) {
                            // Regenerar el informe para mostrar el nuevo saldo anterior
                            setTimeout(() => {
                                generarInforme();
                            }, 500);
                        }
                    }
                } else {
                    showNotification(result.message || 'Error al guardar saldo anterior', 'error');
                }
            } catch (error) {
                console.error('Error saving saldo anterior del período:', error);
                showNotification('Error al guardar saldo anterior', 'error');
            }
        });
    }

    // Saldo Intangible Form
    const saldoIntangibleForm = document.getElementById('saldoIntangibleForm');
    if (saldoIntangibleForm) {
        saldoIntangibleForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const id = document.getElementById('saldoIntangibleId').value;
            const data = {
                descripcion: document.getElementById('saldoIntangibleDescripcion').value,
                activo: document.getElementById('saldoIntangibleActivo').checked ? 1 : 0
            };

            if (id) {
                data.id = parseInt(id);
            }

            try {
                const method = id ? 'PUT' : 'POST';
                const response = await apiFetch(`${API_BASE}/saldos_intangibles.php`, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    showNotification(result.message || 'Saldo intangible guardado exitosamente', 'success');
                    closeSaldoIntangibleModal();
                    loadSaldosIntangibles();
                    loadSaldosIntangiblesSelect();
                } else {
                    showNotification(result.message || 'Error al guardar saldo intangible', 'error');
                }
            } catch (error) {
                console.error('Error saving saldo intangible:', error);
                showNotification('Error al guardar saldo intangible', 'error');
            }
        });
    }

    // Aporte Intangible Form
    const aporteIntangibleForm = document.getElementById('aporteIntangibleForm');
    if (aporteIntangibleForm) {
        aporteIntangibleForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const id = document.getElementById('aporteIntangibleId').value;
            const fechaInput = document.getElementById('aporteIntangibleFecha').value;

            // Usar la fecha directamente del input (ya viene en formato YYYY-MM-DD)
            // No convertir con new Date() para evitar problemas de zona horaria
            const fecha = formatDateToYYYYMMDD(fechaInput);

            const data = {
                saldo_intangible_id: parseInt(document.getElementById('aporteIntangibleSaldo').value),
                aporte: parseFloat(document.getElementById('aporteIntangibleMonto').value),
                fecha: fecha,
                entregado_por: document.getElementById('aporteIntangibleEntregadoPor').value,
                descripcion: document.getElementById('aporteIntangibleDescripcion').value
            };

            console.log('Guardando aporte con fecha:', fecha);

            if (id) {
                data.id = parseInt(id);
            }

            try {
                const method = id ? 'PUT' : 'POST';
                const response = await apiFetch(`${API_BASE}/aportes_intangibles.php`, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    showNotification(result.message || 'Aporte guardado exitosamente', 'success');
                    closeAporteIntangibleModal();
                    loadAportesIntangibles();
                    // Actualizar dashboard siempre
                    loadDashboard();
                } else {
                    showNotification(result.message || 'Error al guardar aporte', 'error');
                }
            } catch (error) {
                console.error('Error saving aporte:', error);
                showNotification('Error al guardar aporte', 'error');
            }
        });
    }

    // Retiro Intangible Form
    const retiroIntangibleForm = document.getElementById('retiroIntangibleForm');
    if (retiroIntangibleForm) {
        retiroIntangibleForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const id = document.getElementById('retiroIntangibleId').value;
            const fechaInput = document.getElementById('retiroIntangibleFecha').value;

            // Usar la fecha directamente del input (ya viene en formato YYYY-MM-DD)
            // No convertir con new Date() para evitar problemas de zona horaria
            const fecha = formatDateToYYYYMMDD(fechaInput);

            const data = {
                saldo_intangible_id: parseInt(document.getElementById('retiroIntangibleSaldo').value),
                retiro: parseFloat(document.getElementById('retiroIntangibleMonto').value),
                fecha: fecha,
                entregado_a: document.getElementById('retiroIntangibleEntregadoA').value,
                descripcion: document.getElementById('retiroIntangibleDescripcion').value
            };

            console.log('Guardando retiro con fecha:', fecha);

            if (id) {
                data.id = parseInt(id);
            }

            try {
                const method = id ? 'PUT' : 'POST';
                const response = await apiFetch(`${API_BASE}/retiros_intangibles.php`, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    showNotification(result.message || 'Retiro guardado exitosamente', 'success');
                    closeRetiroIntangibleModal();
                    loadRetirosIntangibles();
                    loadDashboard();
                } else {
                    showNotification(result.message || 'Error al guardar retiro', 'error');
                }
            } catch (error) {
                console.error('Error saving retiro:', error);
                showNotification('Error al guardar retiro', 'error');
            }
        });
    }
}

// Funciones para Saldo Anterior
async function openSaldoAnteriorModal() {
    try {
        const response = await apiFetch(`${API_BASE}/saldo_anterior.php`);
        const data = await response.json();

        if (data.success && data.data) {
            document.getElementById('saldoAnteriorFecha').value = formatDateToYYYYMMDD(data.data.fecha_gestion);
            document.getElementById('saldoAnteriorMonto').value = data.data.monto;
            document.getElementById('saldoAnteriorDescripcion').value = data.data.descripcion || '';
        } else {
            // Valores por defecto
            document.getElementById('saldoAnteriorFecha').value = '2025-11-01';
            document.getElementById('saldoAnteriorMonto').value = '';
            document.getElementById('saldoAnteriorDescripcion').value = '';
        }

        document.getElementById('saldoAnteriorModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading saldo anterior:', error);
        document.getElementById('saldoAnteriorModal').style.display = 'block';
    }
}

function closeSaldoAnteriorModal() {
    document.getElementById('saldoAnteriorModal').style.display = 'none';
    document.getElementById('saldoAnteriorForm').reset();
}

// Funciones para Saldo Anterior del Período
async function openSaldoAnteriorPeriodoModal() {
    try {
        const tipoInforme = document.getElementById('tipoInforme');
        const periodoSelect = document.getElementById('periodoInforme');

        if (!tipoInforme || !periodoSelect) {
            showNotification('Por favor, seleccione un tipo de informe y período primero', 'warning');
            return;
        }

        const tipo = tipoInforme.value;
        const periodo = periodoSelect.value;

        if (!periodo && tipo !== 'anual') {
            showNotification('Por favor, seleccione un período', 'warning');
            return;
        }

        // Calcular la fecha de inicio del período
        let fechaInicio = '';
        let periodoTexto = '';

        if (tipo === 'mensual') {
            const [year, month] = periodo.split('-');
            fechaInicio = `${year}-${month}-01`;
            const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            periodoTexto = `${monthNames[parseInt(month) - 1]} ${year}`;
        } else if (tipo === 'bimestral') {
            const [year, month] = periodo.split('-');
            const mesSeleccionado = parseInt(month);
            const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

            if (mesSeleccionado === 11) {
                fechaInicio = `${year}-11-01`;
                periodoTexto = `Noviembre - Diciembre ${year}`;
            } else if (mesSeleccionado === 1) {
                fechaInicio = `${year}-01-01`;
                periodoTexto = `Enero - Febrero ${year}`;
            } else if (mesSeleccionado === 3) {
                fechaInicio = `${year}-03-01`;
                periodoTexto = `Marzo - Abril ${year}`;
            } else if (mesSeleccionado === 5) {
                fechaInicio = `${year}-05-01`;
                periodoTexto = `Mayo - Junio ${year}`;
            } else if (mesSeleccionado === 7) {
                fechaInicio = `${year}-07-01`;
                periodoTexto = `Julio - Agosto ${year}`;
            } else if (mesSeleccionado === 9) {
                fechaInicio = `${year}-09-01`;
                periodoTexto = `Septiembre - Octubre ${year}`;
            }
        } else if (tipo === 'anual') {
            fechaInicio = '2025-11-01';
            periodoTexto = 'Año Eclesiástico 2025-2026 (Nov 2025 - Oct 2026)';
        } else {
            // Personalizado
            const periodoInicio = document.getElementById('periodoInformeInput').value;
            if (!periodoInicio) {
                showNotification('Por favor, seleccione el mes inicial del período personalizado', 'warning');
                return;
            }
            fechaInicio = periodoInicio + '-01';
            const periodoFin = document.getElementById('periodoFinInforme').value;
            const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            const [yearIni, monthIni] = periodoInicio.split('-');
            const [yearFin, monthFin] = periodoFin.split('-');
            periodoTexto = `${monthNames[parseInt(monthIni) - 1]} ${yearIni} - ${monthNames[parseInt(monthFin) - 1]} ${yearFin}`;
        }

        // Llenar el formulario
        document.getElementById('saldoAnteriorPeriodoTexto').value = periodoTexto;
        document.getElementById('saldoAnteriorPeriodoFecha').value = fechaInicio;

        // Intentar cargar el saldo anterior existente para este período
        try {
            const response = await apiFetch(`${API_BASE}/saldo_anterior.php?fecha_gestion=${fechaInicio}`);
            const data = await response.json();

            if (data.success && data.data) {
                document.getElementById('saldoAnteriorPeriodoMonto').value = data.data.monto || '';
                document.getElementById('saldoAnteriorPeriodoDescripcion').value = data.data.descripcion || '';
            } else {
                document.getElementById('saldoAnteriorPeriodoMonto').value = '';
                document.getElementById('saldoAnteriorPeriodoDescripcion').value = '';
            }
        } catch (error) {
            console.warn('No se pudo cargar el saldo anterior existente:', error);
            document.getElementById('saldoAnteriorPeriodoMonto').value = '';
            document.getElementById('saldoAnteriorPeriodoDescripcion').value = '';
        }

        // Mostrar el modal
        document.getElementById('saldoAnteriorPeriodoModal').style.display = 'block';
    } catch (error) {
        console.error('Error abriendo modal de saldo anterior del período:', error);
        showNotification('Error al abrir el formulario de saldo anterior', 'error');
    }
}

// Asegurar que la función esté disponible globalmente
window.openSaldoAnteriorPeriodoModal = openSaldoAnteriorPeriodoModal;

function closeSaldoAnteriorPeriodoModal() {
    document.getElementById('saldoAnteriorPeriodoModal').style.display = 'none';
    document.getElementById('saldoAnteriorPeriodoForm').reset();
}

// Asegurar que la función esté disponible globalmente
window.closeSaldoAnteriorPeriodoModal = closeSaldoAnteriorPeriodoModal;

// Funciones para Saldos Intangibles
async function loadSaldosIntangibles() {
    try {
        let url = `${API_BASE}/saldos_intangibles.php`;
        const response = await apiFetch(url);
        const data = await response.json();

        if (data.success) {
            const tbody = document.getElementById('saldosIntangiblesTable');
            if (data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay saldos intangibles registrados</td></tr>';
                return;
            }

            tbody.innerHTML = data.data.map(saldo => `
                <tr>
                    <td>${saldo.id}</td>
                    <td>${saldo.descripcion}</td>
                    <td><span class="badge ${saldo.activo ? 'badge-success' : 'badge-danger'}">
                        ${saldo.activo ? 'Activo' : 'Inactivo'}
                    </span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editSaldoIntangible(${saldo.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteSaldoIntangible(${saldo.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading saldos intangibles:', error);
        showNotification('Error al cargar saldos intangibles', 'error');
    }
}

async function loadSaldosIntangiblesSelect() {
    try {
        let url = `${API_BASE}/saldos_intangibles.php?activos=1`;
        const response = await apiFetch(url);
        const data = await response.json();

        if (data.success) {
            const optionsHTML = data.data.map(s => `<option value="${s.id}">${s.descripcion}</option>`).join('');

            // Llenar select del modal de aportes
            const selectAporte = document.getElementById('aporteIntangibleSaldo');
            if (selectAporte) {
                selectAporte.innerHTML = '<option value="">Seleccione un saldo intangible</option>' + optionsHTML;
            }

            // Llenar select del modal de retiros
            const selectRetiro = document.getElementById('retiroIntangibleSaldo');
            if (selectRetiro) {
                selectRetiro.innerHTML = '<option value="">Seleccione un saldo intangible</option>' + optionsHTML;
            }

            // Llenar filtros
            const selectFiltro = document.getElementById('filtroSaldoIntangible');
            if (selectFiltro) {
                selectFiltro.innerHTML = '<option value="">Todos los saldos</option>' + optionsHTML;
            }

            const selectFiltroRetiro = document.getElementById('filtroSaldoIntangibleRetiro');
            if (selectFiltroRetiro) {
                selectFiltroRetiro.innerHTML = '<option value="">Todos los saldos</option>' + optionsHTML;
            }
        }
    } catch (error) {
        console.error('Error loading saldos intangibles select:', error);
    }
}

async function loadAportesIntangibles() {
    try {
        const saldoId = document.getElementById('filtroSaldoIntangible').value;
        let fechaInicio = document.getElementById('fechaInicioAportes').value;
        let fechaFin = document.getElementById('fechaFinAportes').value;

        // Si no hay filtros manuales y hay un ciclo activo, filtrar por el ciclo
        if (!fechaInicio && !fechaFin && activePeriod) {
            fechaInicio = activePeriod.fecha_inicio;
            fechaFin = activePeriod.fecha_fin;
            document.getElementById('fechaInicioAportes').value = fechaInicio;
            document.getElementById('fechaFinAportes').value = fechaFin;
        }

        let url = `${API_BASE}/aportes_intangibles.php`;
        const params = [];

        if (saldoId) params.push(`saldo_id=${saldoId}`);
        if (fechaInicio) params.push(`fecha_inicio=${fechaInicio}`);
        if (fechaFin) params.push(`fecha_fin=${fechaFin}`);

        if (params.length > 0) {
            url += '?' + params.join('&');
        }

        const response = await apiFetch(url);
        const data = await response.json();

        if (data.success) {
            const tbody = document.getElementById('aportesIntangiblesTable');
            if (data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay aportes registrados</td></tr>';
                return;
            }

            // Ordenar por fecha de forma ascendente (antiguo -> nuevo)
            const aportesOrdenados = data.data.sort((a, b) => parseDateLocal(a.fecha) - parseDateLocal(b.fecha));

            tbody.innerHTML = aportesOrdenados.map(aporte => `
                <tr>
                    <td>${formatDate(aporte.fecha)}</td>
                    <td>${aporte.saldo_intangible_descripcion}</td>
                    <td>${aporte.entregado_por}</td>
                    <td class="text-success">${formatCurrency(aporte.aporte)}</td>
                    <td>${aporte.descripcion || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editAporteIntangible(${aporte.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteAporteIntangible(${aporte.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading aportes intangibles:', error);
        showNotification('Error al cargar aportes', 'error');
    }
}

function openSaldoIntangibleModal() {
    document.getElementById('saldoIntangibleId').value = '';
    document.getElementById('saldoIntangibleDescripcion').value = '';
    document.getElementById('saldoIntangibleActivo').checked = true;
    document.getElementById('saldoIntangibleModalTitle').textContent = 'Nuevo Saldo Intangible';
    document.getElementById('saldoIntangibleModal').style.display = 'block';
}

function closeSaldoIntangibleModal() {
    document.getElementById('saldoIntangibleModal').style.display = 'none';
    document.getElementById('saldoIntangibleForm').reset();
}

async function editSaldoIntangible(id) {
    try {
        const response = await apiFetch(`${API_BASE}/saldos_intangibles.php?id=${id}`);
        const data = await response.json();

        if (data.success) {
            document.getElementById('saldoIntangibleId').value = id;
            document.getElementById('saldoIntangibleDescripcion').value = data.data.descripcion;
            document.getElementById('saldoIntangibleActivo').checked = data.data.activo == 1;
            document.getElementById('saldoIntangibleModalTitle').textContent = 'Editar Saldo Intangible';
            document.getElementById('saldoIntangibleModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading saldo intangible:', error);
        showNotification('Error al cargar saldo intangible', 'error');
    }
}

async function deleteSaldoIntangible(id) {
    if (!confirm('¿Está seguro de eliminar este saldo intangible? Se eliminarán todos sus aportes relacionados.')) return;

    try {
        const response = await apiFetch(`${API_BASE}/saldos_intangibles.php?id=${id}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
            showNotification('Saldo intangible eliminado exitosamente', 'success');
            loadSaldosIntangibles();
            loadSaldosIntangiblesSelect();
        } else {
            showNotification(data.message || 'Error al eliminar saldo intangible', 'error');
        }
    } catch (error) {
        console.error('Error deleting saldo intangible:', error);
        showNotification('Error al eliminar saldo intangible', 'error');
    }
}

function openAporteIntangibleModal() {
    document.getElementById('aporteIntangibleId').value = '';
    document.getElementById('aporteIntangibleSaldo').value = '';
    document.getElementById('aporteIntangibleMonto').value = '';

    // Usar fecha local sin conversión a UTC para evitar problemas de zona horaria
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    document.getElementById('aporteIntangibleFecha').value = `${year}-${month}-${day}`;

    document.getElementById('aporteIntangibleEntregadoPor').value = '';
    document.getElementById('aporteIntangibleDescripcion').value = '';
    document.getElementById('aporteIntangibleModalTitle').textContent = 'Nuevo Aporte';
    loadSaldosIntangiblesSelect();
    document.getElementById('aporteIntangibleModal').style.display = 'block';
}

function closeAporteIntangibleModal() {
    document.getElementById('aporteIntangibleModal').style.display = 'none';
    document.getElementById('aporteIntangibleForm').reset();
}

async function editAporteIntangible(id) {
    try {
        const response = await apiFetch(`${API_BASE}/aportes_intangibles.php?id=${id}`);
        const data = await response.json();

        if (data.success) {
            document.getElementById('aporteIntangibleId').value = id;
            await loadSaldosIntangiblesSelect();
            document.getElementById('aporteIntangibleSaldo').value = data.data.saldo_intangible_id;
            document.getElementById('aporteIntangibleMonto').value = data.data.aporte;
            document.getElementById('aporteIntangibleFecha').value = formatDateToYYYYMMDD(data.data.fecha);
            document.getElementById('aporteIntangibleEntregadoPor').value = data.data.entregado_por;
            document.getElementById('aporteIntangibleDescripcion').value = data.data.descripcion || '';
            document.getElementById('aporteIntangibleModalTitle').textContent = 'Editar Aporte';
            document.getElementById('aporteIntangibleModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading aporte:', error);
        showNotification('Error al cargar aporte', 'error');
    }
}

async function deleteAporteIntangible(id) {
    if (!confirm('¿Está seguro de eliminar este aporte?')) return;

    try {
        const response = await apiFetch(`${API_BASE}/aportes_intangibles.php?id=${id}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
            showNotification('Aporte eliminado exitosamente', 'success');
            loadAportesIntangibles();
            // Actualizar dashboard siempre
            loadDashboard();
        } else {
            showNotification(data.message || 'Error al eliminar aporte', 'error');
        }
    } catch (error) {
        console.error('Error deleting aporte:', error);
        showNotification('Error al eliminar aporte', 'error');
    }
}

function filtrarAportes() {
    loadAportesIntangibles();
}

function resetFiltrosAportes() {
    document.getElementById('filtroSaldoIntangible').value = '';
    document.getElementById('fechaInicioAportes').value = '';
    document.getElementById('fechaFinAportes').value = '';
    loadAportesIntangibles();
}

// Funciones para Retiros Intangibles
async function loadRetirosIntangibles() {
    try {
        const saldoId = document.getElementById('filtroSaldoIntangibleRetiro').value;
        let fechaInicio = document.getElementById('fechaInicioRetiros').value;
        let fechaFin = document.getElementById('fechaFinRetiros').value;

        // Si no hay filtros manuales y hay un ciclo activo, filtrar por el ciclo
        if (!fechaInicio && !fechaFin && activePeriod) {
            fechaInicio = activePeriod.fecha_inicio;
            fechaFin = activePeriod.fecha_fin;
            document.getElementById('fechaInicioRetiros').value = fechaInicio;
            document.getElementById('fechaFinRetiros').value = fechaFin;
        }

        let url = `${API_BASE}/retiros_intangibles.php`;
        const params = [];

        if (saldoId) params.push(`saldo_id=${saldoId}`);
        if (fechaInicio) params.push(`fecha_inicio=${fechaInicio}`);
        if (fechaFin) params.push(`fecha_fin=${fechaFin}`);

        if (params.length > 0) {
            url += '?' + params.join('&');
        }

        const response = await apiFetch(url);
        const data = await response.json();

        if (data.success) {
            const tbody = document.getElementById('retirosIntangiblesTable');
            if (data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay retiros registrados</td></tr>';
                return;
            }

            // Ordenar por fecha de forma ascendente (antiguo -> nuevo)
            const retirosOrdenados = data.data.sort((a, b) => parseDateLocal(a.fecha) - parseDateLocal(b.fecha));

            tbody.innerHTML = retirosOrdenados.map(retiro => `
                <tr>
                    <td>${formatDate(retiro.fecha)}</td>
                    <td>${retiro.saldo_intangible_descripcion}</td>
                    <td>${retiro.entregado_a}</td>
                    <td class="text-danger">${formatCurrency(retiro.retiro)}</td>
                    <td>${retiro.descripcion || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editRetiroIntangible(${retiro.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteRetiroIntangible(${retiro.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading retiros intangibles:', error);
        showNotification('Error al cargar retiros', 'error');
    }
}

async function openRetiroIntangibleModal() {
    document.getElementById('retiroIntangibleId').value = '';
    document.getElementById('retiroIntangibleSaldo').value = '';
    document.getElementById('retiroIntangibleMonto').value = '';

    // Usar fecha local sin conversión a UTC para evitar problemas de zona horaria
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    document.getElementById('retiroIntangibleFecha').value = `${year}-${month}-${day}`;

    document.getElementById('retiroIntangibleEntregadoA').value = '';
    document.getElementById('retiroIntangibleDescripcion').value = '';
    document.getElementById('saldoDisponibleRetiro').textContent = '';
    document.getElementById('retiroIntangibleModalTitle').textContent = 'Nuevo Retiro';

    // Cargar saldos intangibles y asegurarse de que se complete antes de mostrar el modal
    await loadSaldosIntangiblesSelect();
    document.getElementById('retiroIntangibleModal').style.display = 'block';
}

function closeRetiroIntangibleModal() {
    document.getElementById('retiroIntangibleModal').style.display = 'none';
    document.getElementById('retiroIntangibleForm').reset();
}

async function actualizarSaldoDisponible() {
    const saldoId = document.getElementById('retiroIntangibleSaldo').value;
    const retiroId = document.getElementById('retiroIntangibleId').value;

    if (!saldoId) {
        document.getElementById('saldoDisponibleRetiro').textContent = '';
        return;
    }

    try {
        // Obtener aportes
        const aportesResp = await apiFetch(`${API_BASE}/aportes_intangibles.php?saldo_id=${saldoId}`).then(r => r.json());
        const totalAportes = aportesResp.success ? aportesResp.data.reduce((sum, a) => sum + parseFloat(a.aporte || 0), 0) : 0;

        // Obtener retiros
        const retirosResp = await apiFetch(`${API_BASE}/retiros_intangibles.php?saldo_id=${saldoId}`).then(r => r.json());
        let totalRetiros = retirosResp.success ? retirosResp.data.reduce((sum, r) => {
            // Si estamos editando, excluir el retiro actual
            if (retiroId && r.id == retiroId) return sum;
            return sum + parseFloat(r.retiro || 0);
        }, 0) : 0;

        const saldoDisponible = totalAportes - totalRetiros;
        const saldoElement = document.getElementById('saldoDisponibleRetiro');

        if (saldoDisponible > 0) {
            saldoElement.textContent = `Saldo disponible: ${formatCurrency(saldoDisponible)}`;
            saldoElement.style.color = 'var(--success-color)';
        } else {
            saldoElement.textContent = 'No hay saldo disponible';
            saldoElement.style.color = 'var(--danger-color)';
        }
    } catch (error) {
        console.error('Error calculando saldo disponible:', error);
    }
}

async function editRetiroIntangible(id) {
    try {
        const response = await apiFetch(`${API_BASE}/retiros_intangibles.php?id=${id}`);
        const data = await response.json();

        if (data.success) {
            document.getElementById('retiroIntangibleId').value = id;
            await loadSaldosIntangiblesSelect();
            document.getElementById('retiroIntangibleSaldo').value = data.data.saldo_intangible_id;
            document.getElementById('retiroIntangibleMonto').value = data.data.retiro;
            document.getElementById('retiroIntangibleFecha').value = formatDateToYYYYMMDD(data.data.fecha);
            document.getElementById('retiroIntangibleEntregadoA').value = data.data.entregado_a;
            document.getElementById('retiroIntangibleDescripcion').value = data.data.descripcion || '';
            document.getElementById('retiroIntangibleModalTitle').textContent = 'Editar Retiro';
            await actualizarSaldoDisponible();
            document.getElementById('retiroIntangibleModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading retiro:', error);
        showNotification('Error al cargar retiro', 'error');
    }
}

async function deleteRetiroIntangible(id) {
    if (!confirm('¿Está seguro de eliminar este retiro?')) return;

    try {
        const response = await apiFetch(`${API_BASE}/retiros_intangibles.php?id=${id}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
            showNotification('Retiro eliminado exitosamente', 'success');
            loadRetirosIntangibles();
            loadDashboard();
        } else {
            showNotification(data.message || 'Error al eliminar retiro', 'error');
        }
    } catch (error) {
        console.error('Error deleting retiro:', error);
        showNotification('Error al eliminar retiro', 'error');
    }
}

function filtrarRetiros() {
    loadRetirosIntangibles();
}

function resetFiltrosRetiros() {
    document.getElementById('filtroSaldoIntangibleRetiro').value = '';
    document.getElementById('fechaInicioRetiros').value = '';
    document.getElementById('fechaFinRetiros').value = '';
    loadRetirosIntangibles();
}

// Funciones para Resumen de Saldos Intangibles
let datosResumenActual = null;

async function cargarResumenIntangibles() {
    try {
        let fechaInicio = document.getElementById('fechaInicioResumen')?.value || '';
        let fechaFin = document.getElementById('fechaFinResumen')?.value || '';

        // Si no hay filtros manuales y hay un ciclo activo, filtrar por el ciclo
        if (!fechaInicio && !fechaFin && activePeriod) {
            fechaInicio = activePeriod.fecha_inicio;
            fechaFin = activePeriod.fecha_fin;
            if (document.getElementById('fechaInicioResumen')) {
                document.getElementById('fechaInicioResumen').value = fechaInicio;
            }
            if (document.getElementById('fechaFinResumen')) {
                document.getElementById('fechaFinResumen').value = fechaFin;
            }
        }

        // Obtener todos los aportes
        let urlAportes = `${API_BASE}/aportes_intangibles.php`;
        const paramsAportes = new URLSearchParams();
        if (fechaInicio) paramsAportes.append('fecha_inicio', fechaInicio);
        if (fechaFin) paramsAportes.append('fecha_fin', fechaFin);
        if (paramsAportes.toString()) urlAportes += '?' + paramsAportes.toString();

        const responseAportes = await apiFetch(urlAportes);
        const dataAportes = await responseAportes.json();

        // Obtener todos los retiros
        let urlRetiros = `${API_BASE}/retiros_intangibles.php`;
        const paramsRetiros = new URLSearchParams();
        if (fechaInicio) paramsRetiros.append('fecha_inicio', fechaInicio);
        if (fechaFin) paramsRetiros.append('fecha_fin', fechaFin);
        if (paramsRetiros.toString()) urlRetiros += '?' + paramsRetiros.toString();

        const responseRetiros = await apiFetch(urlRetiros);
        const dataRetiros = await responseRetiros.json();

        // Obtener saldos intangibles para obtener las descripciones
        let urlSaldos = `${API_BASE}/saldos_intangibles.php`;
        const responseSaldos = await apiFetch(urlSaldos);
        const dataSaldos = await responseSaldos.json();

        const saldosMap = {};
        if (dataSaldos.success) {
            dataSaldos.data.forEach(s => {
                saldosMap[s.id] = s.descripcion;
            });
        }

        if (dataAportes.success && dataRetiros.success) {
            const aportes = dataAportes.data || [];
            const retiros = dataRetiros.data || [];

            // Calcular totales por saldo intangible
            const resumenPorSaldo = {};

            aportes.forEach(aporte => {
                const saldoId = aporte.saldo_intangible_id;
                if (!resumenPorSaldo[saldoId]) {
                    resumenPorSaldo[saldoId] = {
                        id: saldoId,
                        descripcion: saldosMap[saldoId] || 'Desconocido',
                        totalAportes: 0,
                        totalRetiros: 0,
                        aportes: [],
                        retiros: []
                    };
                }
                resumenPorSaldo[saldoId].totalAportes += parseFloat(aporte.aporte);
                resumenPorSaldo[saldoId].aportes.push(aporte);
            });

            retiros.forEach(retiro => {
                const saldoId = retiro.saldo_intangible_id;
                if (!resumenPorSaldo[saldoId]) {
                    resumenPorSaldo[saldoId] = {
                        id: saldoId,
                        descripcion: saldosMap[saldoId] || 'Desconocido',
                        totalAportes: 0,
                        totalRetiros: 0,
                        aportes: [],
                        retiros: []
                    };
                }
                resumenPorSaldo[saldoId].totalRetiros += parseFloat(retiro.retiro);
                resumenPorSaldo[saldoId].retiros.push(retiro);
            });

            // Calcular totales generales
            let totalAportes = 0;
            let totalRetiros = 0;
            Object.values(resumenPorSaldo).forEach(saldo => {
                totalAportes += saldo.totalAportes;
                totalRetiros += saldo.totalRetiros;
            });

            const saldoNeto = totalAportes - totalRetiros;

            // Ordenar los arreglos originales por fecha ascendente
            aportes.sort((a, b) => parseDateLocal(a.fecha) - parseDateLocal(b.fecha));
            retiros.sort((a, b) => parseDateLocal(a.fecha) - parseDateLocal(b.fecha));

            // Guardar datos para exportar
            datosResumenActual = {
                fechaInicio: fechaInicio || null,
                fechaFin: fechaFin || null,
                totalAportes,
                totalRetiros,
                saldoNeto,
                resumenPorSaldo,
                aportes,
                retiros
            };

            // Mostrar resumen
            mostrarResumenIntangibles(datosResumenActual);
        }
    } catch (error) {
        console.error('Error cargando resumen de intangibles:', error);
        showNotification('Error al cargar el resumen de intangibles', 'error');
    }
}

function mostrarResumenIntangibles(datos) {
    const content = document.getElementById('resumenIntangiblesContent');

    if (!content) return;

    let html = `
        <div class="stats-grid" style="margin-top: 2rem;">
            <div class="stat-card success">
                <div class="stat-icon"><i class="fas fa-arrow-down"></i></div>
                <div class="stat-info">
                    <h3>Total Aportes</h3>
                    <p class="stat-value">${formatCurrency(datos.totalAportes)}</p>
                </div>
            </div>
            <div class="stat-card danger">
                <div class="stat-icon"><i class="fas fa-arrow-up"></i></div>
                <div class="stat-info">
                    <h3>Total Retiros</h3>
                    <p class="stat-value">${formatCurrency(datos.totalRetiros)}</p>
                </div>
            </div>
            <div class="stat-card info">
                <div class="stat-icon"><i class="fas fa-wallet"></i></div>
                <div class="stat-info">
                    <h3>Saldo Neto</h3>
                    <p class="stat-value">${formatCurrency(datos.saldoNeto)}</p>
                </div>
            </div>
        </div>
        
        <h3 style="margin-top: 2rem; margin-bottom: 1rem;">Resumen por Saldo Intangible</h3>
    `;

    // Resumen por saldo
    Object.values(datos.resumenPorSaldo).forEach(saldo => {
        const saldoNetoSaldo = saldo.totalAportes - saldo.totalRetiros;
        html += `
            <div class="card" style="margin-bottom: 1.5rem;">
                <div class="card-header" style="background: #667eea; color: white; padding: 1rem;">
                    <h4 style="margin: 0;">${saldo.descripcion}</h4>
                </div>
                <div class="card-body" style="padding: 1.5rem;">
                    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 1rem;">
                        <div>
                            <strong>Aportes:</strong> ${formatCurrency(saldo.totalAportes)}
                        </div>
                        <div>
                            <strong>Retiros:</strong> ${formatCurrency(saldo.totalRetiros)}
                        </div>
                        <div>
                            <strong>Saldo Neto:</strong> <span style="color: ${saldoNetoSaldo >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">${formatCurrency(saldoNetoSaldo)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    // Tabla de aportes
    html += `
        <h3 style="margin-top: 2rem; margin-bottom: 1rem;">Detalle de Aportes</h3>
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Saldo Intangible</th>
                        <th>Entregado por</th>
                        <th>Aporte</th>
                        <th>Descripción</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (datos.aportes.length === 0) {
        html += '<tr><td colspan="5" class="text-center">No hay aportes registrados</td></tr>';
    } else {
        datos.aportes.forEach(aporte => {
            html += `
                <tr>
                    <td>${formatDate(aporte.fecha)}</td>
                    <td>${datos.resumenPorSaldo[aporte.saldo_intangible_id]?.descripcion || 'Desconocido'}</td>
                    <td>${aporte.entregado_por}</td>
                    <td>${formatCurrency(aporte.aporte)}</td>
                    <td>${aporte.descripcion || '-'}</td>
                </tr>
            `;
        });
    }

    html += `
                </tbody>
            </table>
        </div>
        
        <h3 style="margin-top: 2rem; margin-bottom: 1rem;">Detalle de Retiros</h3>
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Saldo Intangible</th>
                        <th>Entregado a</th>
                        <th>Retiro</th>
                        <th>Descripción</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (datos.retiros.length === 0) {
        html += '<tr><td colspan="5" class="text-center">No hay retiros registrados</td></tr>';
    } else {
        datos.retiros.forEach(retiro => {
            html += `
                <tr>
                    <td>${formatDate(retiro.fecha)}</td>
                    <td>${datos.resumenPorSaldo[retiro.saldo_intangible_id]?.descripcion || 'Desconocido'}</td>
                    <td>${retiro.entregado_a}</td>
                    <td>${formatCurrency(retiro.retiro)}</td>
                    <td>${retiro.descripcion || '-'}</td>
                </tr>
            `;
        });
    }

    html += `
                </tbody>
            </table>
        </div>
    `;

    content.innerHTML = html;
}

function resetFiltrosResumen() {
    document.getElementById('fechaInicioResumen').value = '';
    document.getElementById('fechaFinResumen').value = '';
    cargarResumenIntangibles();
}

// Funciones para Dinero Intangible (mantener por compatibilidad, pero deprecado)
async function openDineroIntangibleModal() {
    // Redirigir a la nueva sección
    showSection('saldos-intangibles');
    document.querySelector('.nav-item[data-section="saldos-intangibles"]').click();
}

function closeDineroIntangibleModal() {
    document.getElementById('dineroIntangibleModal').style.display = 'none';
}

// Función para descargar informe en Excel
async function descargarExcel() {
    let datos = datosInformeActual;

    if (!datos) {
        // Intentar obtener datos si no están disponibles
        datos = await obtenerDatosInforme();
    }

    if (!datos) return;

    try {
        const tipoInforme = document.getElementById('tipoInforme').value;
        const periodoSelect = document.getElementById('periodoInforme');
        const periodoSeleccionado = periodoSelect ? periodoSelect.options[periodoSelect.selectedIndex]?.textContent : '';

        let nombreArchivo = 'Informe_Financiero';
        if (tipoInforme === 'mensual') {
            nombreArchivo = `Informe_Mensual_${periodoSeleccionado.replace(/\s/g, '_')}`;
        } else if (tipoInforme === 'bimestral') {
            nombreArchivo = `Informe_Bimestral_${periodoSeleccionado.replace(/\s/g, '_').replace(/-/g, '_')}`;
        } else if (tipoInforme === 'anual') {
            nombreArchivo = 'Informe_Anual_2025_2026';
        } else {
            nombreArchivo = 'Informe_Personalizado';
        }

        // Crear workbook
        const wb = XLSX.utils.book_new();

        // Hoja 1: Resumen
        const resumenData = [
            ['INFORME FINANCIERO - ESCUELA DOMINICAL'],
            [periodoSeleccionado || 'Período'],
            ['Generado el: ' + formatDate(getTodayLocalDate())],
            [''],
            ['INGRESOS'],
            ['Rubro', 'Monto'],
            ['Saldo Anterior', parseFloat(datos.saldo_anterior) || 0],
            ...datos.ingresos_por_rubro.filter(r => r.total > 0).map(r => [r.nombre, r.total]),
            ['TOTAL INGRESOS', (parseFloat(datos.total_ingresos) || 0) + (parseFloat(datos.saldo_anterior) || 0)],
            [''],
            ['EGRESOS'],
            ['Rubro', 'Monto'],
            ...datos.egresos_por_rubro.filter(r => r.total > 0).map(r => [r.nombre, r.total]),
            ['TOTAL EGRESOS', datos.total_egresos],
            [''],
            ['RESUMEN'],
            ['Ingresos', (parseFloat(datos.total_ingresos) || 0) + (parseFloat(datos.saldo_anterior) || 0)],
            ['Egresos', datos.total_egresos],
            ['SALDO FINAL', datos.saldo_final],
            ['Saldos Intangibles', datos.dinero_intangible || 0],
            ['']
        ];
        const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
        XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

        // Hoja 2: Ingresos por Rubro
        const ingresosData = [
            ['INGRESOS POR RUBRO'],
            ['Rubro', 'Total'],
            ['Saldo Anterior', parseFloat(datos.saldo_anterior) || 0]
        ];
        datos.ingresos_por_rubro.forEach(rubro => {
            if (rubro.total > 0) {
                ingresosData.push([rubro.nombre, rubro.total]);
            }
        });
        ingresosData.push(['TOTAL INGRESOS', (parseFloat(datos.total_ingresos) || 0) + (parseFloat(datos.saldo_anterior) || 0)]);
        const wsIngresos = XLSX.utils.aoa_to_sheet(ingresosData);
        XLSX.utils.book_append_sheet(wb, wsIngresos, 'Ingresos');

        // Hoja 3: Egresos por Rubro
        const egresosData = [
            ['EGRESOS POR RUBRO'],
            ['Rubro', 'Total']
        ];
        datos.egresos_por_rubro.forEach(rubro => {
            if (rubro.total > 0) {
                egresosData.push([rubro.nombre, rubro.total]);
            }
        });
        egresosData.push(['TOTAL EGRESOS', datos.total_egresos]);
        const wsEgresos = XLSX.utils.aoa_to_sheet(egresosData);
        XLSX.utils.book_append_sheet(wb, wsEgresos, 'Egresos');

        // Hoja 4: Saldos Intangibles
        const intangiblesData = [
            ['SALDOS INTANGIBLES'],
            ['Saldo Intangible', 'Total']
        ];
        if (datos.dinero_intangible_por_saldo && datos.dinero_intangible_por_saldo.length > 0) {
            datos.dinero_intangible_por_saldo.forEach(saldo => {
                if (saldo.total > 0) {
                    intangiblesData.push([saldo.descripcion, saldo.total]);
                }
            });
        }
        intangiblesData.push(['TOTAL SALDOS INTANGIBLES', datos.dinero_intangible || 0]);
        const wsIntangibles = XLSX.utils.aoa_to_sheet(intangiblesData);
        XLSX.utils.book_append_sheet(wb, wsIntangibles, 'Saldos Intangibles');

        // Descargar archivo
        XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
        showNotification('Informe descargado en Excel exitosamente', 'success');
    } catch (error) {
        console.error('Error generando Excel:', error);
        showNotification('Error al generar archivo Excel', 'error');
    }
}

function setupModals() {
    // Cerrar modales al hacer click fuera
    window.onclick = function (event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        });
    }
}

// Utilidades
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN'
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '';

    // Parsear la fecha manualmente sin usar new Date() para evitar problemas de zona horaria
    const dateMatch = String(dateString).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!dateMatch) {
        // Si no está en formato YYYY-MM-DD, intentar parsear de otra forma
        try {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('es-PE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        } catch (e) {
            return dateString;
        }
        return dateString;
    }

    const year = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1; // Los meses en JavaScript van de 0-11
    const day = parseInt(dateMatch[3], 10);

    // Crear fecha usando componentes locales (no UTC)
    const date = new Date(year, month, day);

    // Verificar que la fecha sea válida
    if (isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Generar PDF del informe
async function generarPDF(datos) {
    try {
        console.log('Iniciando generación de PDF...');

        // Cargar datos del perfil para logos y firma
        let perfilData = null;
        try {
            const perfilResponse = await apiFetch(`${API_BASE}/perfil.php?id=1`);
            const perfilResult = await perfilResponse.json();
            if (perfilResult.success) {
                perfilData = perfilResult.data;
            }
        } catch (error) {
            console.warn('No se pudieron cargar los datos del perfil:', error);
        }

        // Verificar que jsPDF esté disponible
        let jsPDF;
        if (typeof window.jspdf !== 'undefined' && window.jspdf.jsPDF) {
            jsPDF = window.jspdf.jsPDF;
        } else if (typeof window.jspdf !== 'undefined' && window.jspdf.default) {
            jsPDF = window.jspdf.default;
        } else if (typeof window.jsPDF !== 'undefined') {
            jsPDF = window.jsPDF;
        } else {
            console.error('jsPDF no está disponible');
            showNotification('Error: La librería jsPDF no está cargada. Por favor, recarga la página (Ctrl+F5).', 'error');
            return;
        }

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        // Obtener el tipo de informe y período seleccionado
        const tipoInforme = document.getElementById('tipoInforme').value;
        const periodoSelect = document.getElementById('periodoInforme');
        const periodoSeleccionado = periodoSelect ? periodoSelect.options[periodoSelect.selectedIndex]?.textContent : '';

        let periodoTexto = '';
        if (tipoInforme === 'mensual') {
            periodoTexto = `Informe Mensual - ${periodoSeleccionado || 'Período'}`;
        } else if (tipoInforme === 'bimestral') {
            periodoTexto = `Informe Bimestral - ${periodoSeleccionado || 'Período'}`;
        } else if (tipoInforme === 'anual') {
            periodoTexto = `Informe Anual - ${periodoSeleccionado || 'Nov 2025 - Oct 2026'}`;
        } else {
            const fechaInicio = parseDateLocal(datos.fecha_inicio);
            const fechaFin = parseDateLocal(datos.fecha_fin);
            periodoTexto = `Informe Personalizado - ${monthNames[fechaInicio.getMonth()]} ${fechaInicio.getFullYear()} - ${monthNames[fechaFin.getMonth()]} ${fechaFin.getFullYear()}`;
        }

        let y = 20;
        const pageHeight = 297; // A4 height in mm
        const margin = 20;
        const maxY = pageHeight - 30;

        // Función auxiliar para agregar logo
        const addLogoToPDF = async (logoPath, x, y, width, height) => {
            if (!logoPath) return false;
            try {
                let fullPath;
                if (logoPath.startsWith('http')) {
                    fullPath = logoPath;
                } else {
                    const currentUrl = window.location.href;
                    const urlObj = new URL(currentUrl);
                    let basePath = urlObj.pathname;
                    if (basePath.endsWith('.php') || basePath.endsWith('.html')) {
                        basePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
                    } else if (!basePath.endsWith('/')) {
                        basePath += '/';
                    }
                    fullPath = urlObj.origin + basePath + logoPath;
                }

                return new Promise((resolve) => {
                    fetch(fullPath)
                        .then(response => {
                            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                            return response.blob();
                        })
                        .then(blob => {
                            return new Promise((resolveBlob) => {
                                const reader = new FileReader();
                                reader.onloadend = function () {
                                    const base64data = reader.result;
                                    try {
                                        let format = 'PNG';
                                        if (logoPath.toLowerCase().endsWith('.jpg') || logoPath.toLowerCase().endsWith('.jpeg')) {
                                            format = 'JPEG';
                                        }
                                        doc.addImage(base64data, format, x, y, width, height);
                                        resolve(true);
                                    } catch (error) {
                                        console.error('Error al agregar imagen al PDF:', error);
                                        resolve(false);
                                    }
                                };
                                reader.onerror = function () {
                                    resolve(false);
                                };
                                reader.readAsDataURL(blob);
                            });
                        })
                        .catch(error => {
                            console.error('Error al cargar imagen:', fullPath, error);
                            resolve(false);
                        });
                });
            } catch (error) {
                console.error('Error al procesar logo:', error);
                return false;
            }
        };

        // Cargar logos
        const logoHeight = 25;
        const logoWidth = 40;
        await Promise.all([
            addLogoToPDF(LOGO_IZQUIERDO, 20, y, logoWidth, logoHeight),
            addLogoToPDF(LOGO_DERECHO, 150, y, logoWidth, logoHeight)
        ]);
        y += logoHeight + 5;

        // Encabezado
        doc.setFontSize(18);
        doc.setTextColor(79, 70, 229);
        doc.text('Informe Financiero', 105, y, { align: 'center' });
        y += 10;

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Sistema de Tesorería - Escuela Dominical', 105, y, { align: 'center' });
        y += 8;

        doc.text(periodoTexto, 105, y, { align: 'center' });
        y += 6;

        const hoy = new Date();
        doc.text(`Generado el: ${hoy.getDate()} de ${monthNames[hoy.getMonth()]} de ${hoy.getFullYear()}`, 105, y, { align: 'center' });
        y += 15;

        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, 190, y);
        y += 10;

        // Función para verificar si necesita nueva página
        const checkNewPage = (requiredSpace) => {
            if (y + requiredSpace > maxY) {
                doc.addPage();
                y = 20;
                return true;
            }
            return false;
        };

        // Ingresos por Rubro
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Ingresos por Rubro', margin, y);
        y += 8;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);

        // Saldo Anterior como primer rubro de ingreso
        const saldoAnterior = parseFloat(datos.saldo_anterior) || 0;
        doc.text('Saldo Anterior:', margin + 5, y);
        doc.text(formatCurrency(saldoAnterior), 170, y, { align: 'right' });
        y += 6;

        datos.ingresos_por_rubro.forEach(rubro => {
            if (rubro.total > 0) {
                checkNewPage(6);
                doc.text(`${rubro.nombre}:`, margin + 5, y);
                doc.text(formatCurrency(rubro.total), 170, y, { align: 'right' });
                y += 6;
            }
        });

        checkNewPage(10);
        doc.setFont(undefined, 'bold');
        doc.text('TOTAL INGRESOS:', margin + 5, y);
        doc.setTextColor(16, 185, 129);
        const totalIngresosIncSA = (parseFloat(datos.total_ingresos) || 0) + saldoAnterior;
        doc.text(formatCurrency(totalIngresosIncSA), 170, y, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        y += 10;

        // Egresos por Rubro
        checkNewPage(20);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Egresos por Rubro', margin, y);
        y += 8;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);

        datos.egresos_por_rubro.forEach(rubro => {
            if (rubro.total > 0) {
                checkNewPage(6);
                doc.text(`${rubro.nombre}:`, margin + 5, y);
                doc.text(formatCurrency(rubro.total), 170, y, { align: 'right' });
                y += 6;
            }
        });

        checkNewPage(10);
        doc.setFont(undefined, 'bold');
        doc.text('TOTAL EGRESOS:', margin + 5, y);
        doc.setTextColor(239, 68, 68);
        doc.text(formatCurrency(datos.total_egresos), 170, y, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        y += 10;

        // Saldos Intangibles
        checkNewPage(20);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Saldos Intangibles', margin, y);
        y += 8;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);

        if (datos.dinero_intangible_por_saldo && Array.isArray(datos.dinero_intangible_por_saldo) && datos.dinero_intangible_por_saldo.length > 0) {
            datos.dinero_intangible_por_saldo.forEach(saldo => {
                if (saldo && saldo.total !== undefined && saldo.total > 0) {
                    checkNewPage(6);
                    doc.text(`${saldo.descripcion || 'Sin descripción'}:`, margin + 5, y);
                    doc.setTextColor(245, 158, 11);
                    doc.text(formatCurrency(saldo.total), 170, y, { align: 'right' });
                    doc.setTextColor(0, 0, 0);
                    y += 6;
                }
            });

            checkNewPage(10);
            const totalIntangible = datos.dinero_intangible || 0;
            doc.setFont(undefined, 'bold');
            doc.text('TOTAL SALDOS INTANGIBLES:', margin + 5, y);
            doc.setTextColor(245, 158, 11);
            doc.text(formatCurrency(totalIntangible), 170, y, { align: 'right' });
            doc.setTextColor(0, 0, 0);
            y += 6;
        } else {
            const totalIntangible = datos.dinero_intangible || 0;
            if (totalIntangible > 0) {
                doc.setTextColor(245, 158, 11);
                doc.text(`Total Saldos Intangibles: ${formatCurrency(totalIntangible)}`, margin + 5, y);
                doc.setTextColor(0, 0, 0);
                y += 6;
            } else {
                doc.setTextColor(100, 100, 100);
                doc.text('No hay saldos intangibles registrados', margin + 5, y);
                doc.setTextColor(0, 0, 0);
                y += 6;
            }
        }

        doc.setFontSize(12);
        y += 10;

        // Línea separadora
        checkNewPage(5);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, 190, y);
        y += 10;

        // Resumen Financiero
        checkNewPage(40); // Asegurar espacio suficiente para el resumen
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Resumen Financiero', margin, y);
        y += 10;

        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');

        const totalIngresosResumen = (parseFloat(datos.total_ingresos) || 0) + saldoAnterior;
        doc.text('Total Ingresos:', margin + 5, y);
        doc.setTextColor(16, 185, 129);
        doc.text(formatCurrency(totalIngresosResumen), 170, y, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        y += 8;

        doc.text('Total Egresos:', margin + 5, y);
        doc.setTextColor(239, 68, 68);
        doc.text(formatCurrency(datos.total_egresos), 170, y, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        y += 10;

        // Línea separadora
        doc.setDrawColor(150, 150, 150);
        doc.line(margin + 5, y, margin + 160, y);
        y += 8;

        doc.setFont(undefined, 'bold');
        doc.text('Saldo Final:', margin + 5, y);

        // Calcular saldo final explícitamente para asegurar consistencia
        const saldoFinal = saldoAnterior + parseFloat(datos.total_ingresos || 0) - parseFloat(datos.total_egresos || 0);

        doc.setTextColor(saldoFinal >= 0 ? 16 : 239, saldoFinal >= 0 ? 185 : 68, saldoFinal >= 0 ? 129 : 68);
        doc.text(formatCurrency(saldoFinal), 170, y, { align: 'right' });
        y += 8;

        // Agregar firma si existe información del perfil
        if (perfilData) {
            checkNewPage(25);

            const nombreFirma = perfilData.nombre_firma || 'EDINSON PAUL GAMONAL VIDARTE';
            const cargoFirma = perfilData.cargo_firma || 'TESORERO DNI';

            y += 5;

            // Espacio para firma (centrado en la página)
            const pageWidth = 210; // Ancho de página A4 en mm
            const signatureWidth = 90; // Ancho de la línea de firma
            const signatureX = (pageWidth - signatureWidth) / 2; // Centrar horizontalmente

            // Línea para firma (centrada)
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.05);
            doc.line(signatureX, y, signatureX + signatureWidth, y);
            y += 5;

            // Nombre (centrado)
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(nombreFirma, pageWidth / 2, y, { align: 'center' });
            y += 7;

            // Cargo (centrado)
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(cargoFirma, pageWidth / 2, y, { align: 'center' });
        }

        // Nombre del archivo
        let nombreArchivo = 'Informe_Financiero.pdf';
        if (tipoInforme === 'mensual') {
            nombreArchivo = `Informe_Mensual_${periodoSeleccionado.replace(/\s/g, '_')}.pdf`;
        } else if (tipoInforme === 'bimestral') {
            nombreArchivo = `Informe_Bimestral_${periodoSeleccionado.replace(/\s/g, '_').replace(/-/g, '_')}.pdf`;
        } else if (tipoInforme === 'anual') {
            nombreArchivo = 'Informe_Anual_2025_2026.pdf';
        } else {
            nombreArchivo = 'Informe_Personalizado.pdf';
        }

        // Descargar PDF
        doc.save(nombreArchivo);

        showNotification('PDF generado y descargado exitosamente', 'success');
    } catch (error) {
        console.error('Error generando PDF:', error);
        showNotification('Error al generar PDF: ' + (error.message || 'Error desconocido'), 'error');
    }
}

// Función para descargar informe detallado en PDF (Mensual, Bimestral, Anual)
async function descargarInformeDetalladoPDF() {
    console.log('descargarInformeDetalladoPDF llamada');

    try {
        const tipo = document.getElementById('tipoInforme');
        if (!tipo) {
            console.error('No se encontró el elemento tipoInforme');
            showNotification('Error: No se encontró el selector de tipo de informe', 'error');
            return;
        }

        const tipoValor = tipo.value;
        const periodoSelect = document.getElementById('periodoInforme');
        const periodo = periodoSelect?.value;

        if (!periodo && tipoValor !== 'anual' && tipoValor !== 'personalizado') {
            showNotification('Por favor, seleccione un período', 'error');
            return;
        }

        let fechaInicio, fechaFin;

        if (tipoValor === 'mensual') {
            const [year, month] = periodo.split('-');
            fechaInicio = `${year}-${month}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            fechaFin = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
        } else if (tipoValor === 'bimestral') {
            const [year, month] = periodo.split('-');
            const mesSeleccionado = parseInt(month);
            if (mesSeleccionado === 11) {
                fechaInicio = `${year}-11-01`;
                fechaFin = `${year}-12-31`;
            } else if (mesSeleccionado === 1) {
                fechaInicio = `${year}-01-01`;
                const lastDayFeb = new Date(year, 2, 0).getDate();
                fechaFin = `${year}-02-${String(lastDayFeb).padStart(2, '0')}`;
            } else if (mesSeleccionado === 3) {
                fechaInicio = `${year}-03-01`;
                const lastDayApr = new Date(year, 4, 0).getDate();
                fechaFin = `${year}-04-${String(lastDayApr).padStart(2, '0')}`;
            } else if (mesSeleccionado === 5) {
                fechaInicio = `${year}-05-01`;
                const lastDayJun = new Date(year, 6, 0).getDate();
                fechaFin = `${year}-06-${String(lastDayJun).padStart(2, '0')}`;
            } else if (mesSeleccionado === 7) {
                fechaInicio = `${year}-07-01`;
                const lastDayAug = new Date(year, 8, 0).getDate();
                fechaFin = `${year}-08-${String(lastDayAug).padStart(2, '0')}`;
            } else if (mesSeleccionado === 9) {
                fechaInicio = `${year}-09-01`;
                const lastDayOct = new Date(year, 10, 0).getDate();
                fechaFin = `${year}-10-${String(lastDayOct).padStart(2, '0')}`;
            }
        } else if (tipoValor === 'anual') {
            fechaInicio = '2025-11-01';
            fechaFin = '2026-10-31';
        } else { // personalizado
            const periodoInicio = document.getElementById('periodoInformeInput').value;
            const periodoFin = document.getElementById('periodoFinInforme').value;
            fechaInicio = periodoInicio + '-01';
            const [year, month] = periodoFin.split('-');
            const lastDay = new Date(year, month, 0).getDate();
            fechaFin = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
        }

        showNotification('Generando informe detallado...', 'info');

        // Obtener datos del resumen y detalles individuales en paralelo
        const [resumenResponse, ingresosResponse, egresosResponse, aportesResponse, retirosResponse] = await Promise.all([
            apiFetch(`${API_BASE}/informes.php?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`),
            apiFetch(`${API_BASE}/ingresos.php?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`),
            apiFetch(`${API_BASE}/egresos.php?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`),
            apiFetch(`${API_BASE}/aportes_intangibles.php?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`),
            apiFetch(`${API_BASE}/retiros_intangibles.php?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`)
        ]);

        if (!resumenResponse.ok || !ingresosResponse.ok || !egresosResponse.ok || !aportesResponse.ok || !retirosResponse.ok) {
            console.error('Error en las respuestas HTTP:', {
                resumen: resumenResponse.status,
                ingresos: ingresosResponse.status,
                egresos: egresosResponse.status,
                aportes: aportesResponse.status,
                retiros: retirosResponse.status
            });
            showNotification('Error al obtener los datos del informe', 'error');
            return;
        }

        const resumenData = await resumenResponse.json();
        const ingresosData = await ingresosResponse.json();
        const egresosData = await egresosResponse.json();
        const aportesData = await aportesResponse.json();
        const retirosData = await retirosResponse.json();

        if (!resumenData.success || !ingresosData.success || !egresosData.success || !aportesData.success || !retirosData.success) {
            showNotification('Error al procesar los datos del informe', 'error');
            return;
        }

        // Generar PDF detallado
        await generarPDFDetallado(resumenData.data, ingresosData.data, egresosData.data, aportesData.data, retirosData.data, fechaInicio, fechaFin);

    } catch (error) {
        console.error('Error generando informe detallado:', error);
        console.error('Stack trace:', error.stack);
        showNotification('Error al generar informe detallado: ' + (error.message || 'Error desconocido'), 'error');
    }
}

// Asegurar que las funciones estén disponibles globalmente
window.descargarInformeDetalladoPDF = descargarInformeDetalladoPDF;

// Función para generar PDF detallado con todos los movimientos
async function generarPDFDetallado(resumen, ingresos, egresos, aportes, retiros, fechaInicio, fechaFin) {
    try {
        // Verificar que jsPDF esté disponible
        let jsPDF;
        if (typeof window.jspdf !== 'undefined' && window.jspdf.jsPDF) {
            jsPDF = window.jspdf.jsPDF;
        } else if (typeof window.jspdf !== 'undefined' && window.jspdf.default) {
            jsPDF = window.jspdf.default;
        } else if (typeof window.jsPDF !== 'undefined') {
            jsPDF = window.jsPDF;
        } else {
            showNotification('Error: La librería jsPDF no está cargada. Por favor, recarga la página (Ctrl+F5).', 'error');
            return;
        }

        // Cargar datos del perfil para logos y firma
        let perfilData = null;
        try {
            const perfilResponse = await apiFetch(`${API_BASE}/perfil.php?id=1`);
            const perfilResult = await perfilResponse.json();
            if (perfilResult.success) {
                perfilData = perfilResult.data;
            }
        } catch (error) {
            console.warn('No se pudieron cargar los datos del perfil:', error);
        }

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        // Obtener el período seleccionado
        const periodoSelect = document.getElementById('periodoInforme');
        const periodoSeleccionado = periodoSelect ? periodoSelect.options[periodoSelect.selectedIndex]?.textContent : '';
        const tipoInformeVal = document.getElementById('tipoInforme').value;

        const fechaInicioObj = parseDateLocal(fechaInicio);
        const fechaFinObj = parseDateLocal(fechaFin);

        let periodoTexto = '';
        if (tipoInformeVal === 'mensual') {
            periodoTexto = `${monthNames[fechaInicioObj.getMonth()]} ${fechaInicioObj.getFullYear()}`;
        } else if (tipoInformeVal === 'bimestral' || tipoInformeVal === 'anual') {
            periodoTexto = periodoSeleccionado || `${monthNames[fechaInicioObj.getMonth()]} ${fechaInicioObj.getFullYear()} - ${monthNames[fechaFinObj.getMonth()]} ${fechaFinObj.getFullYear()}`;
        } else {
            periodoTexto = `${monthNames[fechaInicioObj.getMonth()]} ${fechaInicioObj.getFullYear()} - ${monthNames[fechaFinObj.getMonth()]} ${fechaFinObj.getFullYear()}`;
        }

        let y = 20;
        const pageHeight = 297; // A4 height in mm
        const margin = 20;
        const maxY = pageHeight - 30;

        // Función auxiliar para agregar logo
        const addLogoToPDF = async (logoPath, x, y, width, height) => {
            if (!logoPath) return false;
            try {
                let fullPath;
                if (logoPath.startsWith('http')) {
                    fullPath = logoPath;
                } else {
                    const currentUrl = window.location.href;
                    const urlObj = new URL(currentUrl);
                    let basePath = urlObj.pathname;
                    if (basePath.endsWith('.php') || basePath.endsWith('.html')) {
                        basePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
                    } else if (!basePath.endsWith('/')) {
                        basePath += '/';
                    }
                    fullPath = urlObj.origin + basePath + logoPath;
                }

                return new Promise((resolve) => {
                    fetch(fullPath)
                        .then(response => {
                            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                            return response.blob();
                        })
                        .then(blob => {
                            return new Promise((resolveBlob) => {
                                const reader = new FileReader();
                                reader.onloadend = function () {
                                    const base64data = reader.result;
                                    try {
                                        let format = 'PNG';
                                        if (logoPath.toLowerCase().endsWith('.jpg') || logoPath.toLowerCase().endsWith('.jpeg')) {
                                            format = 'JPEG';
                                        }
                                        doc.addImage(base64data, format, x, y, width, height);
                                        resolve(true);
                                    } catch (error) {
                                        console.error('Error al agregar imagen al PDF:', error);
                                        resolve(false);
                                    }
                                };
                                reader.onerror = function () {
                                    resolve(false);
                                };
                                reader.readAsDataURL(blob);
                            });
                        })
                        .catch(error => {
                            console.error('Error al cargar imagen:', fullPath, error);
                            resolve(false);
                        });
                });
            } catch (error) {
                console.error('Error al procesar logo:', error);
                return false;
            }
        };

        // Cargar logos
        const logoHeight = 25;
        const logoWidth = 40;
        await Promise.all([
            addLogoToPDF(LOGO_IZQUIERDO, 20, y, logoWidth, logoHeight),
            addLogoToPDF(LOGO_DERECHO, 150, y, logoWidth, logoHeight)
        ]);
        y += logoHeight + 5;

        // Encabezado dinámico según tipo de informe
        const tipoInforme = document.getElementById('tipoInforme').value;
        let tituloInforme = 'Informe Detallado';
        if (tipoInforme === 'mensual') tituloInforme = 'Informe Mensual Detallado';
        else if (tipoInforme === 'bimestral') tituloInforme = 'Informe Bimestral Detallado';
        else if (tipoInforme === 'anual') tituloInforme = 'Informe Anual Detallado';

        doc.setFontSize(18);
        doc.setTextColor(79, 70, 229);
        doc.text(tituloInforme, 105, y, { align: 'center' });
        y += 10;

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Sistema de Tesorería - Escuela Dominical', 105, y, { align: 'center' });
        y += 8;

        doc.text(`Período: ${periodoTexto}`, 105, y, { align: 'center' });
        y += 6;

        const hoy = new Date();
        doc.text(`Generado el: ${hoy.getDate()} de ${monthNames[hoy.getMonth()]} de ${hoy.getFullYear()}`, 105, y, { align: 'center' });
        y += 15;

        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, 190, y);
        y += 10;

        // Función para verificar si necesita nueva página
        const checkNewPage = (requiredSpace) => {
            if (y + requiredSpace > maxY) {
                doc.addPage();
                y = 20;
                return true;
            }
            return false;
        };

        // Definición de columnas
        const colFecha = 20;
        const colPersona = 45; // Recibido de / Entregado a
        const colConcepto = 55;
        const colRubro = 25;
        const colMonto = 25;

        const xFecha = margin;
        const xPersona = xFecha + colFecha;
        const xConcepto = xPersona + colPersona;
        const xRubro = xConcepto + colConcepto;
        const xMonto = xRubro + colRubro;

        // SECCIÓN DE INGRESOS DETALLADOS
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('INGRESOS DETALLADOS', margin, y);
        y += 6;

        // Encabezado de tabla
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y, 170, 6, 'F');

        doc.text('Fecha', xFecha + 2, y + 4);
        doc.text('Recibido de', xPersona + 2, y + 4);
        doc.text('Concepto', xConcepto + 2, y + 4);
        doc.text('Rubro', xRubro + 2, y + 4);
        doc.text('Monto', xMonto + colMonto - 2, y + 4, { align: 'right' });
        y += 6;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);

        // Insertar Saldo Anterior como primer movimiento de ingreso
        const saldoAnteriorMonto = parseFloat(resumen.saldo_anterior) || 0;
        const saRowHeight = 6;
        checkNewPage(saRowHeight);

        doc.setFillColor(235, 245, 255); // Color distintivo para saldo anterior
        doc.rect(margin, y, 170, saRowHeight, 'F');

        const fechaSAStr = `${fechaInicioObj.getDate()}/${fechaInicioObj.getMonth() + 1}/${fechaInicioObj.getFullYear()}`;

        doc.setFontSize(7);
        doc.setFont(undefined, 'bold');
        doc.text(fechaSAStr, xFecha + 2, y + 4);
        doc.text('SALDO ANTERIOR', xPersona + 2, y + 4);
        doc.text('Saldo inicial del período', xConcepto + 2, y + 4);
        doc.text('SALDO ANTERIOR', xRubro + 2, y + 4);
        doc.text(formatCurrency(saldoAnteriorMonto), xMonto + colMonto - 2, y + 4, { align: 'right' });

        y += saRowHeight;
        doc.setFont(undefined, 'normal');

        if (ingresos && ingresos.length > 0) {
            // Agrupar ingresos por rubro
            const ingresosPorRubro = ingresos.reduce((acc, ingreso) => {
                const rubro = ingreso.rubro_nombre || 'OTROS';
                if (!acc[rubro]) acc[rubro] = [];
                acc[rubro].push(ingreso);
                return acc;
            }, {});

            // Ordenar rubros alfabéticamente
            const rubrosOrdenados = Object.keys(ingresosPorRubro).sort();

            rubrosOrdenados.forEach(rubro => {
                const movimientos = ingresosPorRubro[rubro].sort((a, b) => parseDateLocal(a.fecha) - parseDateLocal(b.fecha));

                // Cabecera del rubro
                const rubroHeaderLines = doc.splitTextToSize(`RUBRO: ${rubro.toUpperCase()}`, 166);
                const headerHeight = Math.max(6, rubroHeaderLines.length * 3.5 + 2);

                checkNewPage(headerHeight + 2);
                doc.setFont(undefined, 'bold');
                doc.setFontSize(8);
                doc.setFillColor(248, 250, 252);
                doc.rect(margin, y, 170, headerHeight, 'F');
                doc.setTextColor(79, 70, 229);
                doc.text(rubroHeaderLines, margin + 2, y + 4);
                doc.setTextColor(0, 0, 0);
                y += headerHeight;

                doc.setFontSize(7);
                movimientos.forEach((ingreso, index) => {
                    const fecha = parseDateLocal(ingreso.fecha);
                    const fechaStr = `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()}`;

                    // Preparar textos largos con wrap
                    const personaLines = doc.splitTextToSize(ingreso.recibido_de || '', colPersona - 4);
                    const conceptoLines = doc.splitTextToSize(ingreso.concepto || '', colConcepto - 4);
                    const rubroLines = doc.splitTextToSize(ingreso.rubro_nombre || '', colRubro - 4);

                    // Calcular altura de fila basada en el texto más largo
                    const maxLines = Math.max(personaLines.length, conceptoLines.length, rubroLines.length);
                    const rowHeight = Math.max(5.5, maxLines * 3.5 + 1.5);

                    checkNewPage(rowHeight);

                    // Alternar color de fondo
                    if (index % 2 === 0) {
                        doc.setFillColor(254, 254, 254);
                        doc.rect(margin, y, 170, rowHeight, 'F');
                    }

                    doc.setFont(undefined, 'normal');
                    doc.text(fechaStr, xFecha + 2, y + 3.5);
                    doc.text(personaLines, xPersona + 2, y + 3.5);
                    doc.text(conceptoLines, xConcepto + 2, y + 3.5);
                    doc.text(rubroLines, xRubro + 2, y + 3.5);
                    doc.text(formatCurrency(parseFloat(ingreso.cantidad) || 0), xMonto + colMonto - 2, y + 3.5, { align: 'right' });

                    y += rowHeight;
                });

                // Subtotal del rubro
                const subtotalRubro = movimientos.reduce((sum, m) => sum + (parseFloat(m.cantidad) || 0), 0);
                const subtotalLabel = `Subtotal ${rubro}:`;
                const subtotalLabelLines = doc.splitTextToSize(subtotalLabel, xMonto - xRubro - 4);
                const subtotalHeight = Math.max(5.5, subtotalLabelLines.length * 3.5 + 1.5);

                checkNewPage(subtotalHeight + 1);
                doc.setFont(undefined, 'bold');
                doc.setFontSize(7.5);
                doc.setFillColor(250, 252, 255);
                doc.rect(margin, y, 170, subtotalHeight, 'F');
                doc.text(subtotalLabelLines, xRubro + 2, y + 3.5);
                doc.text(formatCurrency(subtotalRubro), xMonto + colMonto - 2, y + 3.5, { align: 'right' });
                y += subtotalHeight;
                doc.setFont(undefined, 'normal');
            });
        }

        // Agregar fila de total de ingresos al final de la sección
        const totalIngresosSeccion = (parseFloat(resumen.total_ingresos) || 0) + (parseFloat(resumen.saldo_anterior) || 0);
        checkNewPage(8);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(8);
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y, 170, 6, 'F');
        doc.text('TOTAL INGRESOS', margin + 2, y + 4.5);
        doc.text(formatCurrency(totalIngresosSeccion), margin + 170 - 2, y + 4.5, { align: 'right' });
        y += 6;
        doc.setFont(undefined, 'normal');

        y += 4;
        checkNewPage(8);

        // SECCIÓN DE EGRESOS DETALLADOS
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('EGRESOS DETALLADOS', margin, y);
        y += 6;

        if (egresos && egresos.length > 0) {
            // Encabezado de tabla
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, y, 170, 6, 'F');

            doc.text('Fecha', xFecha + 2, y + 4);
            doc.text('Entregado a', xPersona + 2, y + 4);
            doc.text('Concepto', xConcepto + 2, y + 4);
            doc.text('Rubro', xRubro + 2, y + 4);
            doc.text('Monto', xMonto + colMonto - 2, y + 4, { align: 'right' });
            y += 6;

            // Agrupar egresos por rubro
            const egresosPorRubro = egresos.reduce((acc, egreso) => {
                const rubro = egreso.rubro_nombre || 'OTROS';
                if (!acc[rubro]) acc[rubro] = [];
                acc[rubro].push(egreso);
                return acc;
            }, {});

            // Ordenar rubros alfabéticamente
            const rubrosEgresosOrdenados = Object.keys(egresosPorRubro).sort();

            rubrosEgresosOrdenados.forEach(rubro => {
                const movimientos = egresosPorRubro[rubro].sort((a, b) => parseDateLocal(a.fecha) - parseDateLocal(b.fecha));

                // Cabecera del rubro
                const rubroHeaderLines = doc.splitTextToSize(`RUBRO: ${rubro.toUpperCase()}`, 166);
                const headerHeight = Math.max(6, rubroHeaderLines.length * 3.5 + 2);

                checkNewPage(headerHeight + 2);
                doc.setFont(undefined, 'bold');
                doc.setFontSize(8);
                doc.setFillColor(248, 250, 252);
                doc.rect(margin, y, 170, headerHeight, 'F');
                doc.setTextColor(220, 38, 38); // Color rojo para egresos
                doc.text(rubroHeaderLines, margin + 2, y + 4);
                doc.setTextColor(0, 0, 0);
                y += headerHeight;

                doc.setFontSize(7);
                movimientos.forEach((egreso, index) => {
                    const fecha = parseDateLocal(egreso.fecha);
                    const fechaStr = `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()}`;

                    // Preparar textos largos con wrap
                    const personaLines = doc.splitTextToSize(egreso.entregado_a || '', colPersona - 4);
                    const conceptoLines = doc.splitTextToSize(egreso.concepto || '', colConcepto - 4);
                    const rubroLines = doc.splitTextToSize(egreso.rubro_nombre || '', colRubro - 4);

                    // Calcular altura de fila basada en el texto más largo
                    const maxLines = Math.max(personaLines.length, conceptoLines.length, rubroLines.length);
                    const rowHeight = Math.max(5.5, maxLines * 3.5 + 1.5);

                    checkNewPage(rowHeight);

                    // Alternar color de fondo
                    if (index % 2 === 0) {
                        doc.setFillColor(254, 254, 254);
                        doc.rect(margin, y, 170, rowHeight, 'F');
                    }

                    doc.setFont(undefined, 'normal');
                    doc.text(fechaStr, xFecha + 2, y + 3.5);
                    doc.text(personaLines, xPersona + 2, y + 3.5);
                    doc.text(conceptoLines, xConcepto + 2, y + 3.5);
                    doc.text(rubroLines, xRubro + 2, y + 3.5);
                    doc.text(formatCurrency(parseFloat(egreso.cantidad) || 0), xMonto + colMonto - 2, y + 3.5, { align: 'right' });

                    y += rowHeight;
                });

                // Subtotal del rubro
                const subtotalRubro = movimientos.reduce((sum, m) => sum + (parseFloat(m.cantidad) || 0), 0);
                const subtotalLabel = `Subtotal ${rubro}:`;
                const subtotalLabelLines = doc.splitTextToSize(subtotalLabel, xMonto - xRubro - 4);
                const subtotalHeight = Math.max(5.5, subtotalLabelLines.length * 3.5 + 1.5);

                checkNewPage(subtotalHeight + 1);
                doc.setFont(undefined, 'bold');
                doc.setFontSize(7.5);
                doc.setFillColor(255, 250, 250);
                doc.rect(margin, y, 170, subtotalHeight, 'F');
                doc.text(subtotalLabelLines, xRubro + 2, y + 3.5);
                doc.text(formatCurrency(subtotalRubro), xMonto + colMonto - 2, y + 3.5, { align: 'right' });
                y += subtotalHeight;
                doc.setFont(undefined, 'normal');
            });
        }
        else {
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.text('No hay egresos registrados en este período', margin + 5, y);
            y += 10;
        }

        y += 10;
        checkNewPage(20);

        // SECCIÓN DE APORTES INTANGIBLES
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('APORTES INTANGIBLES', margin, y);
        y += 8;

        if (aportes && aportes.length > 0) {
            // Encabezado
            doc.setFontSize(9);
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, y, 170, 7, 'F');
            doc.text('Fecha', xFecha + 2, y + 5);
            doc.text('Entregado por', xPersona + 2, y + 5);
            doc.text('Descripción', xConcepto + 2, y + 5);
            doc.text('Saldo Destino', xRubro + 2, y + 5);
            doc.text('Monto', xMonto + colMonto - 2, y + 5, { align: 'right' });
            y += 7;

            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);

            const aportesOrdenados = [...aportes].sort((a, b) => parseDateLocal(a.fecha) - parseDateLocal(b.fecha));

            aportesOrdenados.forEach((aporte, index) => {
                const fecha = parseDateLocal(aporte.fecha);
                const fechaStr = `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()}`;
                const personaLines = doc.splitTextToSize(aporte.entregado_por || '', colPersona - 4);
                const descLines = doc.splitTextToSize(aporte.descripcion || '', colConcepto - 4);
                const saldoLines = doc.splitTextToSize(aporte.saldo_intangible_descripcion || '', colRubro - 4);

                const maxLines = Math.max(personaLines.length, descLines.length, saldoLines.length);
                const rowHeight = Math.max(5.5, maxLines * 3.5 + 1.5);

                checkNewPage(rowHeight);
                if (index % 2 === 0) {
                    doc.setFillColor(254, 254, 254);
                    doc.rect(margin, y, 170, rowHeight, 'F');
                }

                doc.text(fechaStr, xFecha + 2, y + 3.5);
                doc.text(personaLines, xPersona + 2, y + 3.5);
                doc.text(descLines, xConcepto + 2, y + 3.5);
                doc.text(saldoLines, xRubro + 2, y + 3.5);
                doc.text(formatCurrency(parseFloat(aporte.aporte) || 0), xMonto + colMonto - 2, y + 3.5, { align: 'right' });
                y += rowHeight;
            });
        } else {
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.text('No hay aportes intangibles registrados en este período', margin + 5, y);
            y += 10;
        }

        y += 5;
        checkNewPage(20);

        // SECCIÓN DE RETIROS INTANGIBLES
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('RETIROS INTANGIBLES', margin, y);
        y += 8;

        if (retiros && retiros.length > 0) {
            doc.setFontSize(9);
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, y, 170, 7, 'F');
            doc.text('Fecha', xFecha + 2, y + 5);
            doc.text('Entregado a', xPersona + 2, y + 5);
            doc.text('Descripción', xConcepto + 2, y + 5);
            doc.text('Saldo Origen', xRubro + 2, y + 5);
            doc.text('Monto', xMonto + colMonto - 2, y + 5, { align: 'right' });
            y += 7;

            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);

            const retirosOrdenados = [...retiros].sort((a, b) => parseDateLocal(a.fecha) - parseDateLocal(b.fecha));

            retirosOrdenados.forEach((retiro, index) => {
                const fecha = parseDateLocal(retiro.fecha);
                const fechaStr = `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()}`;
                const personaLines = doc.splitTextToSize(retiro.entregado_a || '', colPersona - 4);
                const descLines = doc.splitTextToSize(retiro.descripcion || '', colConcepto - 4);
                const saldoLines = doc.splitTextToSize(retiro.saldo_intangible_descripcion || '', colRubro - 4);

                const maxLines = Math.max(personaLines.length, descLines.length, saldoLines.length);
                const rowHeight = Math.max(5.5, maxLines * 3.5 + 1.5);

                checkNewPage(rowHeight);
                if (index % 2 === 0) {
                    doc.setFillColor(254, 254, 254);
                    doc.rect(margin, y, 170, rowHeight, 'F');
                }

                doc.text(fechaStr, xFecha + 2, y + 3.5);
                doc.text(personaLines, xPersona + 2, y + 3.5);
                doc.text(descLines, xConcepto + 2, y + 3.5);
                doc.text(saldoLines, xRubro + 2, y + 3.5);
                doc.text(formatCurrency(parseFloat(retiro.retiro) || 0), xMonto + colMonto - 2, y + 3.5, { align: 'right' });
                y += rowHeight;
            });
        } else {
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.text('No hay retiros intangibles registrados en este período', margin + 5, y);
            y += 10;
        }

        y += 10;
        checkNewPage(45); // Espacio para resumen y firma

        // Línea separadora
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, 190, y);
        y += 10;

        // RESUMEN FINANCIERO
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('RESUMEN FINANCIERO', margin, y);
        y += 10;

        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');

        // Ingresos
        const saldoAnterior = parseFloat(resumen.saldo_anterior) || 0;
        const totalIngresosIncSA = (parseFloat(resumen.total_ingresos) || 0) + saldoAnterior;
        doc.text('Ingresos:', margin + 5, y);
        doc.setTextColor(16, 185, 129);
        doc.text(formatCurrency(totalIngresosIncSA), margin + 160, y, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        y += 8;

        // Total egresos
        doc.text('Total Egresos:', margin + 5, y);
        doc.setTextColor(239, 68, 68);
        doc.text(formatCurrency(resumen.total_egresos || 0), margin + 160, y, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        y += 10;

        // Línea separadora antes del saldo final
        doc.setDrawColor(150, 150, 150);
        doc.line(margin + 5, y, margin + 160, y);
        y += 8;

        // Saldo final
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('SALDO FINAL:', margin + 5, y);
        const saldoFinal = saldoAnterior + (parseFloat(resumen.total_ingresos) || 0) - (parseFloat(resumen.total_egresos) || 0);
        doc.setTextColor(79, 70, 229);
        doc.text(formatCurrency(saldoFinal), margin + 160, y, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        y += 10;

        // Firma (si está disponible)
        if (perfilData) {
            checkNewPage(30);

            const nombreFirma = perfilData.nombre_firma || 'EDINSON PAUL GAMONAL VIDARTE';
            const cargoFirma = perfilData.cargo_firma || 'TESORERO DNI';

            y += 5;

            // Espacio para firma (centrado en la página)
            const pageWidth = 210; // Ancho de página A4 en mm
            const signatureWidth = 90; // Ancho de la línea de firma
            const signatureX = (pageWidth - signatureWidth) / 2; // Centrar horizontalmente

            // Línea de firma
            doc.setDrawColor(0, 0, 0);
            doc.line(signatureX, y, signatureX + signatureWidth, y);
            y += 6;

            // Nombre
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(nombreFirma, pageWidth / 2, y, { align: 'center' });
            y += 6;

            // Cargo
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(cargoFirma, pageWidth / 2, y, { align: 'center' });
        }

        // Nombre del archivo dinámico
        const nombreArchivo = `Informe_Detallado_${periodoTexto.replace(/\s/g, '_')}.pdf`;

        // Descargar PDF
        doc.save(nombreArchivo);

        showNotification('Informe detallado generado y descargado exitosamente', 'success');

    } catch (error) {
        console.error('Error generando PDF detallado:', error);
        showNotification('Error al generar PDF detallado: ' + (error.message || 'Error desconocido'), 'error');
    }
}

// Funciones para descargar resumen de saldos intangibles
async function descargarResumenIntangiblePDF() {
    if (!datosResumenActual) {
        showNotification('Por favor, cargue el resumen primero haciendo clic en "Filtrar"', 'warning');
        return;
    }

    try {
        // Cargar datos del perfil para firma
        let perfilData = null;
        try {
            const perfilResponse = await apiFetch(`${API_BASE}/perfil.php?id=1`);
            const perfilResult = await perfilResponse.json();
            if (perfilResult.success) {
                perfilData = perfilResult.data;
            }
        } catch (error) {
            console.warn('No se pudieron cargar los datos del perfil:', error);
        }

        let jsPDF;
        if (typeof window.jspdf !== 'undefined' && window.jspdf.jsPDF) {
            jsPDF = window.jspdf.jsPDF;
        } else if (typeof window.jspdf !== 'undefined' && window.jspdf.default) {
            jsPDF = window.jspdf.default;
        } else if (typeof window.jsPDF !== 'undefined') {
            jsPDF = window.jsPDF;
        } else {
            showNotification('Error: La librería jsPDF no está cargada.', 'error');
            return;
        }

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        let y = 20;

        // Agregar logos si existen
        const logoHeight = 25;
        const logoWidth = 40;

        // Función auxiliar para convertir imagen a base64 y agregarla al PDF
        const addLogoToPDF = async (logoPath, x, y, width, height) => {
            if (!logoPath) return false;
            try {
                // Construir la ruta completa
                let fullPath;
                if (logoPath.startsWith('http')) {
                    fullPath = logoPath;
                } else {
                    // Obtener la ruta base del proyecto desde la URL actual
                    const currentUrl = window.location.href;
                    const urlObj = new URL(currentUrl);
                    const pathParts = urlObj.pathname.split('/').filter(p => p);

                    // Si estamos en index.php, el pathname incluye el nombre del archivo
                    // Necesitamos obtener solo el directorio base
                    let basePath = urlObj.pathname;
                    if (basePath.endsWith('.php') || basePath.endsWith('.html')) {
                        basePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
                    } else if (!basePath.endsWith('/')) {
                        basePath += '/';
                    }

                    // Construir la ruta completa
                    fullPath = urlObj.origin + basePath + logoPath;
                }

                console.log('Intentando cargar logo desde:', fullPath);
                console.log('Ruta original:', logoPath);

                return new Promise((resolve) => {
                    // Usar fetch para cargar la imagen como blob y convertir a base64
                    fetch(fullPath)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }
                            return response.blob();
                        })
                        .then(blob => {
                            return new Promise((resolveBlob) => {
                                const reader = new FileReader();
                                reader.onloadend = function () {
                                    const base64data = reader.result;
                                    try {
                                        // Determinar el formato de la imagen
                                        let format = 'PNG';
                                        if (logoPath.toLowerCase().endsWith('.jpg') || logoPath.toLowerCase().endsWith('.jpeg')) {
                                            format = 'JPEG';
                                        } else if (logoPath.toLowerCase().endsWith('.png')) {
                                            format = 'PNG';
                                        }

                                        // Agregar al PDF
                                        doc.addImage(base64data, format, x, y, width, height);
                                        console.log('Logo agregado exitosamente:', logoPath, 'Formato:', format);
                                        resolve(true);
                                    } catch (error) {
                                        console.error('Error al agregar imagen al PDF:', error);
                                        resolve(false);
                                    }
                                };
                                reader.onerror = function () {
                                    console.error('Error al leer el blob:', logoPath);
                                    resolve(false);
                                };
                                reader.readAsDataURL(blob);
                            });
                        })
                        .catch(error => {
                            console.error('Error al cargar imagen:', fullPath, error);
                            resolve(false);
                        });
                });
            } catch (error) {
                console.error('Error al procesar logo:', error);
                return false;
            }
        };

        // Cargar logos de forma asíncrona usando rutas fijas
        await Promise.all([
            addLogoToPDF(LOGO_IZQUIERDO, 20, y, logoWidth, logoHeight),
            addLogoToPDF(LOGO_DERECHO, 150, y, logoWidth, logoHeight)
        ]);

        y += logoHeight + 5;

        // Encabezado
        doc.setFontSize(18);
        doc.setTextColor(79, 70, 229);
        doc.text('Resumen de Saldos Intangibles', 105, y, { align: 'center' });
        y += 10;

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Sistema de Tesorería - Escuela Dominical', 105, y, { align: 'center' });
        y += 8;

        const hoy = new Date();
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        let periodoTexto = 'Todos los registros';
        if (datosResumenActual.fechaInicio || datosResumenActual.fechaFin) {
            const inicio = datosResumenActual.fechaInicio ? formatDate(datosResumenActual.fechaInicio) : 'Inicio';
            const fin = datosResumenActual.fechaFin ? formatDate(datosResumenActual.fechaFin) : 'Hoy';
            periodoTexto = `${inicio} - ${fin}`;
        }

        doc.text(`Período: ${periodoTexto}`, 105, y, { align: 'center' });
        y += 6;
        doc.text(`Generado el: ${hoy.getDate()} de ${monthNames[hoy.getMonth()]} de ${hoy.getFullYear()}`, 105, y, { align: 'center' });
        y += 15;

        doc.setDrawColor(200, 200, 200);
        doc.line(20, y, 190, y);
        y += 10;

        // Resumen general
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Resumen General', 20, y);
        y += 10;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(11);
        doc.setTextColor(16, 185, 129);
        doc.text('Total Aportes:', 25, y);
        doc.text(formatCurrency(datosResumenActual.totalAportes), 170, y, { align: 'right' });
        y += 7;

        doc.setTextColor(239, 68, 68);
        doc.text('Total Retiros:', 25, y);
        doc.text(formatCurrency(datosResumenActual.totalRetiros), 170, y, { align: 'right' });
        y += 7;

        doc.setFont(undefined, 'bold');
        doc.setTextColor(datosResumenActual.saldoNeto >= 0 ? 16 : 239, datosResumenActual.saldoNeto >= 0 ? 185 : 68, datosResumenActual.saldoNeto >= 0 ? 129 : 68);
        doc.text('Saldo Neto:', 25, y);
        doc.text(formatCurrency(datosResumenActual.saldoNeto), 170, y, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        y += 15;

        // Resumen por saldo
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Resumen por Saldo Intangible', 20, y);
        y += 10;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);

        Object.values(datosResumenActual.resumenPorSaldo).forEach(saldo => {
            if (y > 250) {
                doc.addPage();
                y = 20;
            }

            const saldoNetoSaldo = saldo.totalAportes - saldo.totalRetiros;

            doc.setFont(undefined, 'bold');
            doc.setFontSize(11);
            doc.text(saldo.descripcion, 25, y);
            y += 6;

            doc.setFont(undefined, 'normal');
            doc.setFontSize(9);
            doc.text(`  Aportes: ${formatCurrency(saldo.totalAportes)}`, 25, y);
            y += 5;
            doc.text(`  Retiros: ${formatCurrency(saldo.totalRetiros)}`, 25, y);
            y += 5;
            doc.setTextColor(saldoNetoSaldo >= 0 ? 16 : 239, saldoNetoSaldo >= 0 ? 185 : 68, saldoNetoSaldo >= 0 ? 129 : 68);
            doc.text(`  Saldo Neto: ${formatCurrency(saldoNetoSaldo)}`, 25, y);
            doc.setTextColor(0, 0, 0);
            y += 8;
        });

        // Nombre del archivo
        const fechaInicio = datosResumenActual.fechaInicio || 'inicio';
        const fechaFin = datosResumenActual.fechaFin || 'fin';
        // Agregar firma si existe información del perfil
        if (perfilData) {
            const nombreFirma = perfilData.nombre_firma || 'EDINSON PAUL GAMONAL VIDARTE';
            const cargoFirma = perfilData.cargo_firma || 'TESORERO DNI';

            y += 5;

            // Espacio para firma (centrado en la página)
            const pageWidth = 210; // Ancho de página A4 en mm
            const signatureWidth = 90; // Ancho de la línea de firma
            const signatureX = (pageWidth - signatureWidth) / 2; // Centrar horizontalmente

            // Línea para firma (centrada)
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.3);
            doc.line(signatureX, y, signatureX + signatureWidth, y);
            y += 5;

            // Nombre (centrado)
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(nombreFirma, pageWidth / 2, y, { align: 'center' });
            y += 7;

            // Cargo (centrado)
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(cargoFirma, pageWidth / 2, y, { align: 'center' });
        }

        const nombreArchivo = `Resumen_Saldos_Intangibles_${fechaInicio}_${fechaFin}.pdf`;

        doc.save(nombreArchivo);
        showNotification('PDF generado y descargado exitosamente', 'success');
    } catch (error) {
        console.error('Error generando PDF:', error);
        showNotification('Error al generar el PDF', 'error');
    }
}

async function descargarResumenIntangibleDetalladoPDF() {
    if (!datosResumenActual) {
        showNotification('Por favor, cargue el resumen primero haciendo clic en "Filtrar"', 'warning');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let y = 15;

        // Definir logos
        const logoWidth = 40;
        const logoHeight = 25;

        // Función interna para agregar logos (copiada para independencia)
        const addLogoToPDF = async (logoPath, x, y, width, height) => {
            try {
                let fullPath = logoPath;
                if (!logoPath.startsWith('http')) {
                    const urlObj = new URL(window.location.href);
                    let basePath = urlObj.pathname;
                    if (basePath.endsWith('.php') || basePath.endsWith('.html')) {
                        basePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
                    } else if (!basePath.endsWith('/')) {
                        basePath += '/';
                    }
                    fullPath = urlObj.origin + basePath + logoPath;
                }

                const response = await fetch(fullPath);
                if (!response.ok) throw new Error('Error al cargar imagen');
                const blob = await response.blob();

                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = function () {
                        const base64data = reader.result;
                        const format = logoPath.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG';
                        doc.addImage(base64data, format, x, y, width, height);
                        resolve(true);
                    };
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                console.warn('Error agregando logo:', logoPath, e);
                return false;
            }
        };

        // Cargar logos
        await Promise.all([
            addLogoToPDF(LOGO_IZQUIERDO, 20, y, logoWidth, logoHeight),
            addLogoToPDF(LOGO_DERECHO, 150, y, logoWidth, logoHeight)
        ]);

        y += logoHeight + 5;

        // Encabezado
        doc.setFontSize(18);
        doc.setTextColor(79, 70, 229);
        doc.text('INFORME DETALLADO DE SALDOS INTANGIBLES', 105, y, { align: 'center' });
        y += 10;

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Sistema de Tesorería - Escuela Dominical', 105, y, { align: 'center' });
        y += 8;

        const hoy = new Date();
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        let periodoTexto = 'Todos los registros';
        if (datosResumenActual.fechaInicio || datosResumenActual.fechaFin) {
            const inicio = datosResumenActual.fechaInicio ? formatDate(datosResumenActual.fechaInicio) : 'Inicio';
            const fin = datosResumenActual.fechaFin ? formatDate(datosResumenActual.fechaFin) : 'Hoy';
            periodoTexto = `${inicio} - ${fin}`;
        }

        doc.text(`Período: ${periodoTexto}`, 105, y, { align: 'center' });
        y += 6;
        doc.text(`Generado el: ${hoy.getDate()} de ${monthNames[hoy.getMonth()]} de ${hoy.getFullYear()}`, 105, y, { align: 'center' });
        y += 15;

        doc.setDrawColor(200, 200, 200);
        doc.line(20, y, 190, y);
        y += 10;

        // 1. Resumen General
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('1. Resumen General', 20, y);
        y += 10;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(11);
        doc.text('Total Aportes:', 25, y);
        doc.text(formatCurrency(datosResumenActual.totalAportes), 170, y, { align: 'right' });
        y += 7;
        doc.text('Total Retiros:', 25, y);
        doc.text(formatCurrency(datosResumenActual.totalRetiros), 170, y, { align: 'right' });
        y += 7;
        doc.setFont(undefined, 'bold');
        doc.text('Saldo Neto:', 25, y);
        doc.text(formatCurrency(datosResumenActual.saldoNeto), 170, y, { align: 'right' });
        y += 15;

        // 2. Detalle de Aportes
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('2. Detalle de Aportes', 20, y);
        y += 8;

        const aportesAgrupados = Object.values(datosResumenActual.resumenPorSaldo);

        if (datosResumenActual.aportes.length === 0) {
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.text('No hay aportes registrados en este período.', 25, y);
            y += 10;
        } else {
            aportesAgrupados.forEach(saldo => {
                const aportesSaldo = datosResumenActual.aportes.filter(a => a.saldo_intangible_id == saldo.id);
                if (aportesSaldo.length === 0) return;

                if (y > 250) { doc.addPage(); y = 20; }

                doc.setFont(undefined, 'bold');
                doc.setFontSize(11);
                doc.setTextColor(79, 70, 229);
                doc.text(`Saldo Intangible: ${saldo.descripcion}`, 20, y);
                y += 4;

                const tableData = aportesSaldo.map(a => [
                    formatDate(a.fecha),
                    a.entregado_por,
                    a.descripcion || '-',
                    formatCurrency(a.aporte)
                ]);

                doc.autoTable({
                    startY: y,
                    head: [['Fecha', 'Entregado por', 'Descripción', 'Monto']],
                    body: tableData,
                    theme: 'grid', // 'grid' añade los bordes que solicitó el usuario
                    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
                    styles: { fontSize: 9, cellPadding: 2 },
                    columnStyles: {
                        0: { cellWidth: 35 },
                        1: { cellWidth: 50 },
                        2: { cellWidth: 'auto' },
                        3: { cellWidth: 30, halign: 'right' }
                    },
                    margin: { left: 20, right: 20 }
                });

                y = doc.lastAutoTable.finalY + 8;
                doc.setTextColor(0, 0, 0);
            });
        }

        // 3. Detalle de Retiros
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('3. Detalle de Retiros', 20, y);
        y += 8;

        if (datosResumenActual.retiros.length === 0) {
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.text('No hay retiros registrados en este período.', 25, y);
            y += 10;
        } else {
            aportesAgrupados.forEach(saldo => {
                const retirosSaldo = datosResumenActual.retiros.filter(r => r.saldo_intangible_id == saldo.id);
                if (retirosSaldo.length === 0) return;

                if (y > 250) { doc.addPage(); y = 20; }

                doc.setFont(undefined, 'bold');
                doc.setFontSize(11);
                doc.setTextColor(79, 70, 229);
                doc.text(`Saldo Intangible: ${saldo.descripcion}`, 20, y);
                y += 4;

                const tableDataRetiros = retirosSaldo.map(r => [
                    formatDate(r.fecha),
                    r.entregado_a,
                    r.descripcion || '-',
                    formatCurrency(r.retiro)
                ]);

                doc.autoTable({
                    startY: y,
                    head: [['Fecha', 'Entregado a', 'Descripción', 'Monto']],
                    body: tableDataRetiros,
                    theme: 'grid',
                    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
                    styles: { fontSize: 9, cellPadding: 2 },
                    columnStyles: {
                        0: { cellWidth: 35 },
                        1: { cellWidth: 50 },
                        2: { cellWidth: 'auto' },
                        3: { cellWidth: 30, halign: 'right' }
                    },
                    margin: { left: 20, right: 20 }
                });

                y = doc.lastAutoTable.finalY + 8;
                doc.setTextColor(0, 0, 0);
            });
        }

        // Firma final
        const responsePerfil = await apiFetch(`${API_BASE}/perfil.php`);
        const perfilJson = await responsePerfil.json();
        const perfilData = perfilJson.success ? perfilJson.data : null;

        if (perfilData) {
            if (y > 240) { doc.addPage(); y = 20; }
            y += 15;
            const pageWidth = 210;
            const lineX = (pageWidth - 80) / 2;
            doc.line(lineX, y, lineX + 80, y);
            y += 5;
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text(perfilData.nombre_firma || 'EDINSON PAUL GAMONAL VIDARTE', pageWidth / 2, y, { align: 'center' });
            y += 5;
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(perfilData.cargo_firma || 'TESORERO DNI', pageWidth / 2, y, { align: 'center' });
        }

        const nombreArchivo = `Informe_Detallado_Intangibles_${periodoTexto.replace(/\s/g, '_')}.pdf`;
        doc.save(nombreArchivo);
        showNotification('PDF Detallado generado exitosamente', 'success');
    } catch (error) {
        console.error('Error generando PDF detallado:', error);
        showNotification('Error al generar el PDF detallado', 'error');
    }
}

async function descargarResumenIntangibleExcel() {
    if (!datosResumenActual) {
        showNotification('Por favor, cargue el resumen primero haciendo clic en "Filtrar"', 'warning');
        return;
    }

    try {
        const wb = XLSX.utils.book_new();

        // Hoja 1: Resumen (Solo resumen en la versión simple)
        const resumenData = [
            ['RESUMEN DE SALDOS INTANGIBLES'],
            ['Sistema de Tesorería - Escuela Dominical'],
            ['Generado el: ' + formatDate(getTodayLocalDate())],
            [''],
            ['RESUMEN GENERAL'],
            ['Total Aportes', datosResumenActual.totalAportes],
            ['Total Retiros', datosResumenActual.totalRetiros],
            ['Saldo Neto', datosResumenActual.saldoNeto],
            [''],
            ['RESUMEN POR SALDO INTANGIBLE'],
            ['Saldo Intangible', 'Total Aportes', 'Total Retiros', 'Saldo Neto']
        ];

        Object.values(datosResumenActual.resumenPorSaldo).forEach(saldo => {
            const saldoNeto = saldo.totalAportes - saldo.totalRetiros;
            resumenData.push([
                saldo.descripcion,
                saldo.totalAportes,
                saldo.totalRetiros,
                saldoNeto
            ]);
        });

        const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
        XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

        const fechaInicio = datosResumenActual.fechaInicio || 'inicio';
        const fechaFin = datosResumenActual.fechaFin || 'fin';
        const nombreArchivo = `Resumen_Intangibles_${fechaInicio}_${fechaFin}.xlsx`;

        XLSX.writeFile(wb, nombreArchivo);
        showNotification('Excel generado exitosamente', 'success');
    } catch (error) {
        console.error('Error generando Excel:', error);
        showNotification('Error al generar el Excel', 'error');
    }
}

async function descargarResumenIntangibleDetalladoExcel() {
    if (!datosResumenActual) {
        showNotification('Por favor, cargue el resumen primero haciendo clic en "Filtrar"', 'warning');
        return;
    }

    try {
        const wb = XLSX.utils.book_new();

        // Hoja 1: Resumen
        const resumenData = [
            ['RESUMEN DE SALDOS INTANGIBLES'],
            ['Sistema de Tesorería - Escuela Dominical'],
            ['Generado el: ' + formatDate(getTodayLocalDate())],
            [''],
            ['RESUMEN GENERAL'],
            ['Total Aportes', datosResumenActual.totalAportes],
            ['Total Retiros', datosResumenActual.totalRetiros],
            ['Saldo Neto', datosResumenActual.saldoNeto],
            [''],
            ['RESUMEN POR SALDO INTANGIBLE'],
            ['Saldo Intangible', 'Total Aportes', 'Total Retiros', 'Saldo Neto']
        ];

        Object.values(datosResumenActual.resumenPorSaldo).forEach(saldo => {
            const saldoNeto = saldo.totalAportes - saldo.totalRetiros;
            resumenData.push([
                saldo.descripcion,
                saldo.totalAportes,
                saldo.totalRetiros,
                saldoNeto
            ]);
        });

        const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
        XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

        // Hoja 2: Aportes
        const aportesData = [
            ['APORTES DE SALDOS INTANGIBLES DETALLADOS']
        ];

        Object.values(datosResumenActual.resumenPorSaldo).forEach(saldo => {
            const aportesSaldo = datosResumenActual.aportes.filter(a => a.saldo_intangible_id == saldo.id);
            if (aportesSaldo.length === 0) return;

            aportesData.push(['']);
            aportesData.push(['Saldo Intangible:', saldo.descripcion]);
            aportesData.push(['Fecha', 'Entregado por', 'Aporte', 'Descripción']);

            aportesSaldo.forEach(aporte => {
                aportesData.push([
                    formatDate(aporte.fecha),
                    aporte.entregado_por,
                    parseFloat(aporte.aporte),
                    aporte.descripcion || ''
                ]);
            });
        });

        const wsAportes = XLSX.utils.aoa_to_sheet(aportesData);
        XLSX.utils.book_append_sheet(wb, wsAportes, 'Detalle Aportes');

        // Hoja 3: Retiros
        const retirosData = [
            ['RETIROS DE SALDOS INTANGIBLES DETALLADOS']
        ];

        Object.values(datosResumenActual.resumenPorSaldo).forEach(saldo => {
            const retirosSaldo = datosResumenActual.retiros.filter(r => r.saldo_intangible_id == saldo.id);
            if (retirosSaldo.length === 0) return;

            retirosData.push(['']);
            retirosData.push(['Saldo Intangible:', saldo.descripcion]);
            retirosData.push(['Fecha', 'Entregado a', 'Retiro', 'Descripción']);

            retirosSaldo.forEach(retiro => {
                retirosData.push([
                    formatDate(retiro.fecha),
                    retiro.entregado_a,
                    parseFloat(retiro.retiro),
                    retiro.descripcion || ''
                ]);
            });
        });

        const wsRetiros = XLSX.utils.aoa_to_sheet(retirosData);
        XLSX.utils.book_append_sheet(wb, wsRetiros, 'Detalle Retiros');

        const fechaInicio = datosResumenActual.fechaInicio || 'inicio';
        const fechaFin = datosResumenActual.fechaFin || 'fin';
        const nombreArchivo = `Resumen_Detallado_Intangibles_${fechaInicio}_${fechaFin}.xlsx`;

        XLSX.writeFile(wb, nombreArchivo);
        showNotification('Excel Detallado generado exitosamente', 'success');
    } catch (error) {
        console.error('Error generando Excel detallado:', error);
        showNotification('Error al generar el Excel detallado', 'error');
    }
}

function updateDateDisplay() {
    // Obtener fecha actual correcta (hoy es 30 de diciembre 2025)
    const today = new Date();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const fecha = `${today.getDate()} de ${monthNames[today.getMonth()]} de ${today.getFullYear()}`;
    document.getElementById('currentDate').textContent = fecha;
}

function showNotification(message, type = 'info') {
    // Crear notificación simple
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        z-index: 3000;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Estilos adicionales para notificaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .text-center {
        text-align: center;
    }
    
    .text-success {
        color: var(--secondary-color);
        font-weight: 600;
    }
    
    .text-danger {
        color: var(--danger-color);
        font-weight: 600;
    }
    
    .badge {
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.875rem;
        font-weight: 500;
    }
    
    .badge-success {
        background: rgba(16, 185, 129, 0.1);
        color: var(--secondary-color);
    }
    
    .badge-danger {
        background: rgba(239, 68, 68, 0.1);
        color: var(--danger-color);
    }
`;
document.head.appendChild(style);

// ========================================
// FUNCIONES PARA SALDO ANTERIOR
// ========================================

// Función para abrir el modal de configuración de saldo anterior
function openSaldoAnteriorPeriodoModal() {
    console.log('openSaldoAnteriorPeriodoModal llamada');
    try {
        const tipoInforme = document.getElementById('tipoInforme');
        const periodoSelect = document.getElementById('periodoInforme');

        if (!tipoInforme || !periodoSelect) {
            showNotification('Error: No se encontraron los selectores de informe', 'error');
            return;
        }

        const tipo = tipoInforme.value;
        const periodo = periodoSelect.value;
        const periodoTexto = periodoSelect.options[periodoSelect.selectedIndex]?.textContent || '';

        if (!periodo) {
            showNotification('Por favor, seleccione un período primero', 'warning');
            return;
        }

        // Prellenar el modal con información del período
        document.getElementById('saldoAnteriorPeriodoTexto').value = periodoTexto;
        document.getElementById('saldoAnteriorPeriodoFecha').value = periodo;
        document.getElementById('saldoAnteriorPeriodoMonto').value = '';
        document.getElementById('saldoAnteriorPeriodoDescripcion').value = `Saldo anterior del período: ${periodoTexto}`;

        // Intentar cargar saldo anterior existente
        cargarSaldoAnteriorExistente(periodo);

        // Mostrar modal
        document.getElementById('saldoAnteriorPeriodoModal').style.display = 'block';

    } catch (error) {
        console.error('Error abriendo modal de saldo anterior:', error);
        showNotification('Error al abrir el modal: ' + error.message, 'error');
    }
}

// Hacer función global
window.openSaldoAnteriorPeriodoModal = openSaldoAnteriorPeriodoModal;

// Función para cargar saldo anterior existente
async function cargarSaldoAnteriorExistente(fecha) {
    try {
        const response = await apiFetch(`${API_BASE}/saldo_anterior.php?fecha_gestion=${fecha}`);
        const data = await response.json();

        if (data.success && data.data) {
            document.getElementById('saldoAnteriorPeriodoMonto').value = data.data.monto || '';
            document.getElementById('saldoAnteriorPeriodoDescripcion').value = data.data.descripcion || '';
        }
    } catch (error) {
        console.warn('No se pudo cargar saldo anterior existente:', error);
    }
}

// Función para cerrar el modal de saldo anterior
function closeSaldoAnteriorPeriodoModal() {
    document.getElementById('saldoAnteriorPeriodoModal').style.display = 'none';
    document.getElementById('saldoAnteriorPeriodoForm').reset();
}

// Hacer función global
window.closeSaldoAnteriorPeriodoModal = closeSaldoAnteriorPeriodoModal;

// Función para guardar el saldo anterior del período
async function guardarSaldoAnteriorPeriodo(event) {
    event.preventDefault();

    try {
        const fecha = document.getElementById('saldoAnteriorPeriodoFecha').value;
        const monto = parseFloat(document.getElementById('saldoAnteriorPeriodoMonto').value);
        const descripcion = document.getElementById('saldoAnteriorPeriodoDescripcion').value;

        if (!fecha || isNaN(monto)) {
            showNotification('Por favor, complete todos los campos requeridos', 'warning');
            return;
        }

        const response = await apiFetch(`${API_BASE}/saldo_anterior.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fecha_gestion: fecha,
                monto: monto,
                descripcion: descripcion
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Saldo anterior guardado exitosamente', 'success');
            closeSaldoAnteriorPeriodoModal();
            // Recargar el informe si está visible
            if (currentSection === 'informes') {
                // Aquí podrías recargar el informe automáticamente si lo deseas
            }
        } else {
            showNotification(data.message || 'Error al guardar saldo anterior', 'error');
        }
    } catch (error) {
        console.error('Error guardando saldo anterior:', error);
        showNotification('Error al guardar saldo anterior: ' + error.message, 'error');
    }
}

// Hacer función global
window.guardarSaldoAnteriorPeriodo = guardarSaldoAnteriorPeriodo;

// ========================================
// FUNCIÓN PARA DESCARGAR EXCEL DETALLADO
// ========================================

// Función para descargar informe detallado en Excel (Mensual, Bimestral, Anual)
async function descargarInformeDetalladoExcel() {
    console.log('descargarInformeDetalladoExcel llamada');

    // Verificar primero si XLSX está disponible
    if (typeof XLSX === 'undefined') {
        alert('Error Crítico: La librería XLSX no está cargada. Por favor recargue la página.');
        return;
    }

    try {
        const tipo = document.getElementById('tipoInforme');
        if (!tipo) {
            alert('Error: No se encontró el selector de tipo de informe');
            return;
        }

        const tipoValor = tipo.value;
        const periodoSelect = document.getElementById('periodoInforme');
        const periodo = periodoSelect?.value;

        if (!periodo && tipoValor !== 'anual' && tipoValor !== 'personalizado') {
            alert('Por favor, seleccione un período');
            return;
        }

        const periodoTexto = periodoSelect?.options[periodoSelect.selectedIndex]?.textContent || '';

        let fechaInicio, fechaFin;

        if (tipoValor === 'mensual') {
            const [year, month] = periodo.split('-');
            fechaInicio = `${year}-${month}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            fechaFin = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
        } else if (tipoValor === 'bimestral') {
            const [year, month] = periodo.split('-');
            const mesSeleccionado = parseInt(month);
            if (mesSeleccionado === 11) {
                fechaInicio = `${year}-11-01`;
                fechaFin = `${year}-12-31`;
            } else if (mesSeleccionado === 1) {
                fechaInicio = `${year}-01-01`;
                const lastDayFeb = new Date(year, 2, 0).getDate();
                fechaFin = `${year}-02-${String(lastDayFeb).padStart(2, '0')}`;
            } else if (mesSeleccionado === 3) {
                fechaInicio = `${year}-03-01`;
                const lastDayApr = new Date(year, 4, 0).getDate();
                fechaFin = `${year}-04-${String(lastDayApr).padStart(2, '0')}`;
            } else if (mesSeleccionado === 5) {
                fechaInicio = `${year}-05-01`;
                const lastDayJun = new Date(year, 6, 0).getDate();
                fechaFin = `${year}-06-${String(lastDayJun).padStart(2, '0')}`;
            } else if (mesSeleccionado === 7) {
                fechaInicio = `${year}-07-01`;
                const lastDayAug = new Date(year, 8, 0).getDate();
                fechaFin = `${year}-08-${String(lastDayAug).padStart(2, '0')}`;
            } else if (mesSeleccionado === 10 || mesSeleccionado === 9) { // Septiembre-Octubre
                fechaInicio = `${year}-09-01`;
                const lastDayOct = new Date(year, 10, 0).getDate();
                fechaFin = `${year}-10-${String(lastDayOct).padStart(2, '0')}`;
            }
        } else if (tipoValor === 'anual') {
            fechaInicio = '2025-11-01';
            fechaFin = '2026-10-31';
        } else {
            const periodoInicio = document.getElementById('periodoInformeInput').value;
            const periodoFin = document.getElementById('periodoFinInforme').value;
            fechaInicio = periodoInicio + '-01';
            const [year, month] = periodoFin.split('-');
            const lastDay = new Date(year, month, 0).getDate();
            fechaFin = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
        }

        showNotification('Generando Excel, por favor espere...', 'info');

        // Obtener datos
        const [resumenResponse, ingresosResponse, egresosResponse, aportesResponse, retirosResponse] = await Promise.all([
            apiFetch(`${API_BASE}/informes.php?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`),
            apiFetch(`${API_BASE}/ingresos.php?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`),
            apiFetch(`${API_BASE}/egresos.php?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`),
            apiFetch(`${API_BASE}/aportes_intangibles.php?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`),
            apiFetch(`${API_BASE}/retiros_intangibles.php?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`)
        ]);

        if (!resumenResponse.ok || !ingresosResponse.ok || !egresosResponse.ok || !aportesResponse.ok || !retirosResponse.ok) {
            alert('Error de conexión al obtener los datos del informe');
            return;
        }

        const resumenData = await resumenResponse.json();
        const ingresosData = await ingresosResponse.json();
        const egresosData = await egresosResponse.json();
        const aportesData = await aportesResponse.json();
        const retirosData = await retirosResponse.json();

        if (!resumenData.success || !ingresosData.success || !egresosData.success || !aportesData.success || !retirosData.success) {
            alert('Error al procesar los datos del informe. Verifique la consola.');
            return;
        }

        // Generar Excel
        await generarExcelDetallado(resumenData.data, ingresosData.data, egresosData.data, aportesData.data, retirosData.data, periodoTexto, fechaInicio);

    } catch (error) {
        console.error('Error generando Excel detallado:', error);
        alert('Error al generar Excel detallado: ' + (error.message || 'Error desconocido'));
    }
}

// Hacer función global
window.descargarInformeDetalladoExcel = descargarInformeDetalladoExcel;

// Función para generar el archivo Excel detallado
async function generarExcelDetallado(resumen, ingresos, egresos, aportes, retiros, periodoTexto, fechaInicio) {
    try {
        const wb = XLSX.utils.book_new();

        // ===== HOJA 1: RESUMEN =====
        // Aseguramos que el saldo anterior sea un número válido
        const saldoAnterior = parseFloat(resumen.saldo_anterior) || 0;
        const totalIngresos = parseFloat(resumen.total_ingresos) || 0;
        const totalEgresos = parseFloat(resumen.total_egresos) || 0;
        // Calculamos el saldo final explícitamente para asegurar consistencia
        const saldoFinal = saldoAnterior + totalIngresos - totalEgresos;

        // Título dinámico
        const tipoInforme = document.getElementById('tipoInforme').value;
        let tituloInforme = 'INFORME DETALLADO';
        if (tipoInforme === 'mensual') tituloInforme = 'INFORME MENSUAL DETALLADO';
        else if (tipoInforme === 'bimestral') tituloInforme = 'INFORME BIMESTRAL DETALLADO';
        else if (tipoInforme === 'anual') tituloInforme = 'INFORME ANUAL DETALLADO';

        const resumenData = [
            [tituloInforme],
            ['Sistema de Tesorería - Escuela Dominical'],
            ['Período: ' + periodoTexto],
            ['Generado el: ' + formatDate(getTodayLocalDate())],
            [''],
            ['RESUMEN FINANCIERO'],
            ['Total Ingresos', saldoAnterior + totalIngresos],
            ['Total Egresos', totalEgresos],
            ['Saldo Final', saldoFinal]
        ];

        const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);

        // Ajustar ancho de columnas para Resumen
        wsResumen['!cols'] = [{ wch: 20 }, { wch: 15 }];

        XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

        // ===== HOJA 2: INGRESOS DETALLADOS =====
        const ingresosHeader = ['Fecha', 'Recibido de', 'Concepto', 'Rubro', 'Monto', 'N° Recibo'];
        const ingresosRows = [];

        // Insertar Saldo Anterior
        ingresosRows.push([
            formatDate(fechaInicio), // Usamos la variable fechaInicio que está disponible en el scope superior (descargarInformeDetalladoExcel)
            'SALDO ANTERIOR',
            'Saldo Anterior',
            'SALDO ANTERIOR',
            saldoAnterior,
        ]);

        if (ingresos && ingresos.length > 0) {
            // Agrupar por rubro
            const ingresosPorRubro = ingresos.reduce((acc, ingreso) => {
                const rubro = ingreso.rubro_nombre || 'OTROS';
                if (!acc[rubro]) acc[rubro] = [];
                acc[rubro].push(ingreso);
                return acc;
            }, {});

            Object.keys(ingresosPorRubro).sort().forEach(rubro => {
                // Fila de cabecera de rubro
                ingresosRows.push(['RUBRO: ' + rubro.toUpperCase()]);

                const movimientos = ingresosPorRubro[rubro].sort((a, b) => parseDateLocal(a.fecha) - parseDateLocal(b.fecha));
                let subtotalRubro = 0;

                movimientos.forEach(ingreso => {
                    const monto = parseFloat(ingreso.cantidad) || 0;
                    subtotalRubro += monto;
                    ingresosRows.push([
                        formatDate(ingreso.fecha),
                        ingreso.recibido_de || '',
                        ingreso.concepto || '',
                        ingreso.rubro_nombre || '',
                        monto,
                        ingreso.numero_recibo || ''
                    ]);
                });

                // Fila de subtotal de rubro
                ingresosRows.push(['', '', 'SUBTOTAL ' + rubro, '', subtotalRubro, '']);
                ingresosRows.push(['']); // Fila en blanco
            });
        }

        // Agregar total al final
        ingresosRows.push(['', '', '', 'TOTAL INGRESOS', saldoAnterior + totalIngresos, '']);

        const wsIngresos = XLSX.utils.aoa_to_sheet([ingresosHeader, ...ingresosRows]);
        wsIngresos['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, wsIngresos, 'Ingresos Detallados');

        // ===== HOJA 3: EGRESOS DETALLADOS =====
        const egresosHeader = ['Fecha', 'Entregado a', 'Concepto', 'Rubro', 'Monto', 'N° Recibo'];
        const egresosRows = [];

        if (egresos && egresos.length > 0) {
            // Agrupar por rubro
            const egresosPorRubro = egresos.reduce((acc, egreso) => {
                const rubro = egreso.rubro_nombre || 'OTROS';
                if (!acc[rubro]) acc[rubro] = [];
                acc[rubro].push(egreso);
                return acc;
            }, {});

            Object.keys(egresosPorRubro).sort().forEach(rubro => {
                // Fila de cabecera de rubro
                egresosRows.push(['RUBRO: ' + rubro.toUpperCase()]);

                const movimientos = egresosPorRubro[rubro].sort((a, b) => parseDateLocal(a.fecha) - parseDateLocal(b.fecha));
                let subtotalRubro = 0;

                movimientos.forEach(egreso => {
                    const monto = parseFloat(egreso.cantidad) || 0;
                    subtotalRubro += monto;
                    egresosRows.push([
                        formatDate(egreso.fecha),
                        egreso.entregado_a || '',
                        egreso.concepto || '',
                        egreso.rubro_nombre || '',
                        monto,
                        egreso.numero_recibo || ''
                    ]);
                });

                // Fila de subtotal de rubro
                egresosRows.push(['', '', 'SUBTOTAL ' + rubro, '', subtotalRubro, '']);
                egresosRows.push(['']); // Fila en blanco
            });

            // Agregar total general
            egresosRows.push(['', '', '', 'TOTAL GENERAL EGRESOS', totalEgresos, '']);
        } else {
            egresosRows.push(['No hay egresos registrados en este período']);
        }

        const wsEgresos = XLSX.utils.aoa_to_sheet([egresosHeader, ...egresosRows]);
        wsEgresos['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, wsEgresos, 'Egresos Detallados');

        // ===== HOJA 4: APORTES INTANGIBLES =====
        const aportesHeader = ['Fecha', 'Entregado por', 'Descripción', 'Saldo Destino', 'Monto'];
        const aportesRows = [];
        if (aportes && aportes.length > 0) {
            aportes.sort((a, b) => parseDateLocal(a.fecha) - parseDateLocal(b.fecha)).forEach(a => {
                aportesRows.push([
                    formatDate(a.fecha),
                    a.entregado_por || '',
                    a.descripcion || '',
                    a.saldo_intangible_descripcion || '',
                    parseFloat(a.aporte) || 0
                ]);
            });
        } else {
            aportesRows.push(['No hay aportes intangibles registrados en este período']);
        }
        const wsAportes = XLSX.utils.aoa_to_sheet([aportesHeader, ...aportesRows]);
        wsAportes['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 25 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsAportes, 'Aportes Intangibles');

        // ===== HOJA 5: RETIROS INTANGIBLES =====
        const retirosHeader = ['Fecha', 'Entregado a', 'Descripción', 'Saldo Origen', 'Monto'];
        const retirosRows = [];
        if (retiros && retiros.length > 0) {
            retiros.sort((a, b) => parseDateLocal(a.fecha) - parseDateLocal(b.fecha)).forEach(r => {
                retirosRows.push([
                    formatDate(r.fecha),
                    r.entregado_a || '',
                    r.descripcion || '',
                    r.saldo_intangible_descripcion || '',
                    parseFloat(r.retiro) || 0
                ]);
            });
        } else {
            retirosRows.push(['No hay retiros intangibles registrados en este período']);
        }
        const wsRetiros = XLSX.utils.aoa_to_sheet([retirosHeader, ...retirosRows]);
        wsRetiros['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 25 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsRetiros, 'Retiros Intangibles');

        // Descargar archivo
        const nombreArchivo = `Informe_Detallado_${periodoTexto.replace(/\s/g, '_')}.xlsx`;
        XLSX.writeFile(wb, nombreArchivo);

        showNotification('Excel generado y descargado exitosamente', 'success');

    } catch (error) {
        console.error('Error generando Excel:', error);
        alert('Error al generar el archivo Excel: ' + error.message);
    }
}
