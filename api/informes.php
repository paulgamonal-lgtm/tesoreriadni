<?php
require_once '../config.php';
requireAuth();

$conn = getDBConnection();

// Obtener saldo anterior - busca saldo configurado para el período o calcula automáticamente
function getSaldoAnterior($conn, $fecha_inicio, $periodo_id = null) {
    $fecha_inicio_ciclo = null;
    $saldo_inicial_ciclo = 0;

    // Si se proporciona periodo_id, usar su saldo_inicial como base y su fecha_inicio como tope inferior
    if ($periodo_id) {
        $stmt = $conn->prepare("SELECT saldo_inicial, fecha_inicio FROM periodos_gestion WHERE id = ?");
        $stmt->bind_param("i", $periodo_id);
        $stmt->execute();
        $res = $stmt->get_result()->fetch_assoc();
        if ($res) {
            $saldo_inicial_ciclo = floatval($res['saldo_inicial']);
            $fecha_inicio_ciclo = $res['fecha_inicio'];
        }
    }

    // Primero, buscar si hay un saldo anterior configurado para esta fecha de gestión o anterior más cercana
    // Pero solo si es posterior a la fecha de inicio del ciclo (si existe)
    $sql = "SELECT monto, fecha_gestion FROM saldo_anterior WHERE fecha_gestion <= ? ";
    if ($fecha_inicio_ciclo) {
        $sql .= " AND fecha_gestion >= ? ";
    }
    $sql .= " ORDER BY fecha_gestion DESC LIMIT 1";

    $stmt = $conn->prepare($sql);
    if ($fecha_inicio_ciclo) {
        $stmt->bind_param("ss", $fecha_inicio, $fecha_inicio_ciclo);
    } else {
        $stmt->bind_param("s", $fecha_inicio);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    $saldo_configurado = $result->fetch_assoc();
    
    if ($saldo_configurado) {
        $saldo_base = floatval($saldo_configurado['monto']);
        $fecha_saldo_base = $saldo_configurado['fecha_gestion'];
        
        $stmt = $conn->prepare("SELECT COALESCE(SUM(cantidad), 0) as total FROM ingresos WHERE fecha >= ? AND fecha < ?");
        $stmt->bind_param("ss", $fecha_saldo_base, $fecha_inicio);
        $stmt->execute();
        $ingresos_periodo = floatval($stmt->get_result()->fetch_assoc()['total']);
        
        $stmt = $conn->prepare("SELECT COALESCE(SUM(cantidad), 0) as total FROM egresos WHERE fecha >= ? AND fecha < ?");
        $stmt->bind_param("ss", $fecha_saldo_base, $fecha_inicio);
        $stmt->execute();
        $egresos_periodo = floatval($stmt->get_result()->fetch_assoc()['total']);
        
        return $saldo_base + $ingresos_periodo - $egresos_periodo;
    } else {
        // Si no hay saldo configurado en este rango, usar el saldo inicial del ciclo o del sistema
        $saldo_base_calculo = $saldo_inicial_ciclo;
        $fecha_inicio_calculo = $fecha_inicio_ciclo;

        if (!$fecha_inicio_calculo) {
            // Caso tradicional: buscar el primer saldo anterior registrado en el sistema
            $stmt = $conn->prepare("SELECT monto, fecha_gestion FROM saldo_anterior ORDER BY fecha_gestion ASC LIMIT 1");
            $stmt->execute();
            $res = $stmt->get_result()->fetch_assoc();
            $saldo_base_calculo = $res ? floatval($res['monto']) : 0;
            $fecha_inicio_calculo = $res ? $res['fecha_gestion'] : '1900-01-01';
        }
        
        $stmt = $conn->prepare("SELECT COALESCE(SUM(cantidad), 0) as total FROM ingresos WHERE fecha >= ? AND fecha < ?");
        $stmt->bind_param("ss", $fecha_inicio_calculo, $fecha_inicio);
        $stmt->execute();
        $ingresos_anteriores = floatval($stmt->get_result()->fetch_assoc()['total']);
        
        $stmt = $conn->prepare("SELECT COALESCE(SUM(cantidad), 0) as total FROM egresos WHERE fecha >= ? AND fecha < ?");
        $stmt->bind_param("ss", $fecha_inicio_calculo, $fecha_inicio);
        $stmt->execute();
        $egresos_anteriores = floatval($stmt->get_result()->fetch_assoc()['total']);
        
        return $saldo_base_calculo + $ingresos_anteriores - $egresos_anteriores;
    }
}

// Obtener dinero intangible acumulativo (aportes - retiros hasta la fecha fin)
// Si se proporciona fecha_inicio_ciclo, solo cuenta movimientos desde esa fecha
function getDineroIntangible($conn, $fecha_fin, $fecha_inicio_ciclo = null) {
    $sqlAportes = "SELECT COALESCE(SUM(aporte), 0) FROM aportes_intangibles WHERE fecha <= ?";
    $sqlRetiros = "SELECT COALESCE(SUM(retiro), 0) FROM retiros_intangibles WHERE fecha <= ?";
    
    if ($fecha_inicio_ciclo) {
        $sqlAportes .= " AND fecha >= ?";
        $sqlRetiros .= " AND fecha >= ?";
    }

    $stmtA = $conn->prepare($sqlAportes);
    if ($fecha_inicio_ciclo) {
        $stmtA->bind_param("ss", $fecha_fin, $fecha_inicio_ciclo);
    } else {
        $stmtA->bind_param("s", $fecha_fin);
    }
    $stmtA->execute();
    $totalAportes = floatval($stmtA->get_result()->fetch_row()[0]);

    $stmtR = $conn->prepare($sqlRetiros);
    if ($fecha_inicio_ciclo) {
        $stmtR->bind_param("ss", $fecha_fin, $fecha_inicio_ciclo);
    } else {
        $stmtR->bind_param("s", $fecha_fin);
    }
    $stmtR->execute();
    $totalRetiros = floatval($stmtR->get_result()->fetch_row()[0]);

    return $totalAportes - $totalRetiros;
}

// Obtener dinero intangible por saldo intangible (acumulativo por saldo)
function getDineroIntangiblePorSaldo($conn, $fecha_fin, $fecha_inicio_ciclo = null) {
    $sql = "SELECT s.id, s.descripcion, 
                (SELECT COALESCE(SUM(a.aporte), 0) FROM aportes_intangibles a WHERE a.saldo_intangible_id = s.id AND a.fecha <= ?" . ($fecha_inicio_ciclo ? " AND a.fecha >= ?" : "") . ") - 
                (SELECT COALESCE(SUM(r.retiro), 0) FROM retiros_intangibles r WHERE r.saldo_intangible_id = s.id AND r.fecha <= ?" . ($fecha_inicio_ciclo ? " AND r.fecha >= ?" : "") . ") as total 
            FROM saldos_intangibles s 
            WHERE s.activo = 1
            GROUP BY s.id, s.descripcion
            HAVING total > 0
            ORDER BY s.descripcion";

    $stmt = $conn->prepare($sql);
    if ($fecha_inicio_ciclo) {
        $stmt->bind_param("ssss", $fecha_fin, $fecha_inicio_ciclo, $fecha_fin, $fecha_inicio_ciclo);
    } else {
        $stmt->bind_param("ss", $fecha_fin, $fecha_fin);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    $saldos = [];
    while ($row = $result->fetch_assoc()) {
        $saldos[] = [
            'id' => $row['id'],
            'descripcion' => $row['descripcion'],
            'total' => floatval($row['total'])
        ];
    }
    return $saldos;
}

// Obtener dinero intangible del mes (solo aportes del mes, sin retiros)
function getDineroIntangibleMes($conn, $fecha_inicio, $fecha_fin) {
    $stmt = $conn->prepare("SELECT COALESCE(SUM(aporte), 0) as total_aportes 
                           FROM aportes_intangibles 
                           WHERE DATE(fecha) >= DATE(?) AND DATE(fecha) <= DATE(?)");
    $stmt->bind_param("ss", $fecha_inicio, $fecha_fin);
    $stmt->execute();
    $result = $stmt->get_result();
    return floatval($result->fetch_assoc()['total_aportes']);
}

// Obtener dinero intangible por saldo intangible del mes (solo aportes del mes)
function getDineroIntangiblePorSaldoMes($conn, $fecha_inicio, $fecha_fin) {
    $stmt = $conn->prepare("SELECT s.id, s.descripcion, COALESCE(SUM(a.aporte), 0) as total 
                           FROM saldos_intangibles s 
                           LEFT JOIN aportes_intangibles a ON s.id = a.saldo_intangible_id 
                           AND DATE(a.fecha) >= DATE(?) AND DATE(a.fecha) <= DATE(?)
                           WHERE s.activo = 1
                           GROUP BY s.id, s.descripcion
                           ORDER BY s.descripcion");
    $stmt->bind_param("ss", $fecha_inicio, $fecha_fin);
    $stmt->execute();
    $result = $stmt->get_result();
    $saldos = [];
    while ($row = $result->fetch_assoc()) {
        $saldos[] = [
            'id' => $row['id'],
            'descripcion' => $row['descripcion'],
            'total' => floatval($row['total'])
        ];
    }
    return $saldos;
}

// Obtener ingresos por rubro en rango de fechas
function getIngresosPorRubro($conn, $fecha_inicio, $fecha_fin) {
    $stmt = $conn->prepare("SELECT r.id, r.nombre, COALESCE(SUM(i.cantidad), 0) as total 
                           FROM rubros_ingresos r 
                           LEFT JOIN ingresos i ON r.id = i.rubro_id AND i.fecha BETWEEN ? AND ?
                           GROUP BY r.id, r.nombre
                           ORDER BY r.nombre");
    $stmt->bind_param("ss", $fecha_inicio, $fecha_fin);
    $stmt->execute();
    $result = $stmt->get_result();
    $rubros = [];
    while ($row = $result->fetch_assoc()) {
        $rubros[] = [
            'id' => $row['id'],
            'nombre' => $row['nombre'],
            'total' => floatval($row['total'])
        ];
    }
    return $rubros;
}

// Obtener egresos por rubro en rango de fechas
function getEgresosPorRubro($conn, $fecha_inicio, $fecha_fin) {
    $stmt = $conn->prepare("SELECT r.id, r.nombre, COALESCE(SUM(e.cantidad), 0) as total 
                           FROM rubros_egresos r 
                           LEFT JOIN egresos e ON r.id = e.rubro_id AND e.fecha BETWEEN ? AND ?
                           GROUP BY r.id, r.nombre
                           ORDER BY r.nombre");
    $stmt->bind_param("ss", $fecha_inicio, $fecha_fin);
    $stmt->execute();
    $result = $stmt->get_result();
    $rubros = [];
    while ($row = $result->fetch_assoc()) {
        $rubros[] = [
            'id' => $row['id'],
            'nombre' => $row['nombre'],
            'total' => floatval($row['total'])
        ];
    }
    return $rubros;
}

// Obtener total de ingresos en rango
function getTotalIngresos($conn, $fecha_inicio, $fecha_fin) {
    $stmt = $conn->prepare("SELECT COALESCE(SUM(cantidad), 0) as total FROM ingresos WHERE fecha BETWEEN ? AND ?");
    $stmt->bind_param("ss", $fecha_inicio, $fecha_fin);
    $stmt->execute();
    $result = $stmt->get_result();
    return floatval($result->fetch_assoc()['total']);
}

// Obtener total de egresos en rango
function getTotalEgresos($conn, $fecha_inicio, $fecha_fin) {
    $stmt = $conn->prepare("SELECT COALESCE(SUM(cantidad), 0) as total FROM egresos WHERE fecha BETWEEN ? AND ?");
    $stmt->bind_param("ss", $fecha_inicio, $fecha_fin);
    $stmt->execute();
    $result = $stmt->get_result();
    return floatval($result->fetch_assoc()['total']);
}

// Procesar solicitud
$fecha_inicio = $_GET['fecha_inicio'] ?? date('Y-m-01');
$fecha_fin = $_GET['fecha_fin'] ?? date('Y-m-t');
$periodo_id = isset($_GET['periodo_id']) ? intval($_GET['periodo_id']) : null;

$fecha_inicio_ciclo = null;
if ($periodo_id) {
    $stmt = $conn->prepare("SELECT fecha_inicio FROM periodos_gestion WHERE id = ?");
    $stmt->bind_param("i", $periodo_id);
    $stmt->execute();
    $res = $stmt->get_result()->fetch_assoc();
    if ($res) {
        $fecha_inicio_ciclo = $res['fecha_inicio'];
    }
}

$saldo_anterior = getSaldoAnterior($conn, $fecha_inicio, $periodo_id);
$ingresos_por_rubro = getIngresosPorRubro($conn, $fecha_inicio, $fecha_fin);
$egresos_por_rubro = getEgresosPorRubro($conn, $fecha_inicio, $fecha_fin);
$total_ingresos = getTotalIngresos($conn, $fecha_inicio, $fecha_fin);
$total_egresos = getTotalEgresos($conn, $fecha_inicio, $fecha_fin);

// Dinero intangible es acumulativo dentro del ciclo (aportes - retiros desde inicio de ciclo hasta fecha fin)
$dinero_intangible = getDineroIntangible($conn, $fecha_fin, $fecha_inicio_ciclo);
$dinero_intangible_por_saldo = getDineroIntangiblePorSaldo($conn, $fecha_fin, $fecha_inicio_ciclo);

// Aportes del mes (solo para información)
$dinero_intangible_mes = getDineroIntangibleMes($conn, $fecha_inicio, $fecha_fin);
$dinero_intangible_por_saldo_mes = getDineroIntangiblePorSaldoMes($conn, $fecha_inicio, $fecha_fin);
$saldo_final = $saldo_anterior + $total_ingresos - $total_egresos;

jsonResponse(true, [
    'fecha_inicio' => $fecha_inicio,
    'fecha_fin' => $fecha_fin,
    'saldo_anterior' => $saldo_anterior,
    'ingresos_por_rubro' => $ingresos_por_rubro,
    'egresos_por_rubro' => $egresos_por_rubro,
    'total_ingresos' => $total_ingresos,
    'total_egresos' => $total_egresos,
    'dinero_intangible' => $dinero_intangible, // Total acumulativo hasta fecha fin
    'dinero_intangible_mes' => $dinero_intangible_mes, // Solo aportes del mes
    'dinero_intangible_por_saldo' => $dinero_intangible_por_saldo, // Acumulativo por saldo
    'dinero_intangible_por_saldo_mes' => $dinero_intangible_por_saldo_mes, // Solo del mes
    'saldo_final' => $saldo_final
]);

$conn->close();
?>

