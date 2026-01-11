<?php
require_once '../config.php';
requireAuth();

$conn = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            $id = intval($_GET['id']);
            $stmt = $conn->prepare("SELECT r.*, s.descripcion as saldo_intangible_descripcion 
                                   FROM retiros_intangibles r 
                                   JOIN saldos_intangibles s ON r.saldo_intangible_id = s.id 
                                   WHERE r.id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            $retiro = $result->fetch_assoc();
            // Formatear la fecha explícitamente para evitar problemas de zona horaria
            if ($retiro && isset($retiro['fecha'])) {
                // Extraer solo la parte de la fecha (YYYY-MM-DD) sin usar funciones de tiempo
                $fecha = $retiro['fecha'];
                if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $fecha, $matches)) {
                    $retiro['fecha'] = $matches[1];
                }
            }
            jsonResponse(true, $retiro);
        } else {
            $saldo_id = $_GET['saldo_id'] ?? null;
            $fecha_inicio = $_GET['fecha_inicio'] ?? null;
            $fecha_fin = $_GET['fecha_fin'] ?? null;
            
            $sql = "SELECT r.*, s.descripcion as saldo_intangible_descripcion 
                   FROM retiros_intangibles r 
                   JOIN saldos_intangibles s ON r.saldo_intangible_id = s.id";
            
            $params = [];
            $types = '';
            
            if ($saldo_id) {
                $sql .= " WHERE r.saldo_intangible_id = ?";
                $params[] = intval($saldo_id);
                $types .= 'i';
            }
            
            if ($fecha_inicio && $fecha_fin) {
                $sql .= $saldo_id ? " AND" : " WHERE";
                $sql .= " r.fecha BETWEEN ? AND ?";
                $params[] = $fecha_inicio;
                $params[] = $fecha_fin;
                $types .= 'ss';
            }
            
            $sql .= " ORDER BY r.fecha DESC, r.id DESC";
            
            $stmt = $conn->prepare($sql);
            if (!empty($params)) {
                $stmt->bind_param($types, ...$params);
            }
            $stmt->execute();
            $result = $stmt->get_result();
            
            $retiros = [];
            while ($row = $result->fetch_assoc()) {
                // Formatear la fecha explícitamente para evitar problemas de zona horaria
                if (isset($row['fecha'])) {
                    $fecha = $row['fecha'];
                    if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $fecha, $matches)) {
                        $row['fecha'] = $matches[1];
                    }
                }
                $retiros[] = $row;
            }
            jsonResponse(true, $retiros);
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $saldo_intangible_id = intval($data['saldo_intangible_id'] ?? 0);
        $retiro = floatval($data['retiro'] ?? 0);
        $fecha = $data['fecha'] ?? date('Y-m-d');
        $entregado_a = $data['entregado_a'] ?? '';
        $descripcion = $data['descripcion'] ?? '';
        
        if (empty($saldo_intangible_id) || empty($entregado_a) || $retiro <= 0) {
            jsonResponse(false, null, 'Todos los campos son requeridos y el retiro debe ser mayor a 0');
        }
        
        // Verificar que el saldo disponible sea suficiente
        $stmt = $conn->prepare("SELECT COALESCE(SUM(a.aporte), 0) - COALESCE(SUM(r.retiro), 0) as saldo_disponible 
                               FROM saldos_intangibles s
                               LEFT JOIN aportes_intangibles a ON s.id = a.saldo_intangible_id
                               LEFT JOIN retiros_intangibles r ON s.id = r.saldo_intangible_id
                               WHERE s.id = ?");
        $stmt->bind_param("i", $saldo_intangible_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $saldo_disponible = floatval($result->fetch_assoc()['saldo_disponible']);
        
        if ($retiro > $saldo_disponible) {
            jsonResponse(false, null, "El retiro excede el saldo disponible. Saldo disponible: " . number_format($saldo_disponible, 2));
        }
        
        $stmt = $conn->prepare("INSERT INTO retiros_intangibles (saldo_intangible_id, retiro, fecha, entregado_a, descripcion) 
                               VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("idsss", $saldo_intangible_id, $retiro, $fecha, $entregado_a, $descripcion);
        
        if ($stmt->execute()) {
            jsonResponse(true, ['id' => $conn->insert_id], 'Retiro registrado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al registrar retiro: ' . $conn->error);
        }
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = intval($data['id']);
        $saldo_intangible_id = intval($data['saldo_intangible_id'] ?? 0);
        $retiro = floatval($data['retiro'] ?? 0);
        $fecha = $data['fecha'] ?? date('Y-m-d');
        $entregado_a = $data['entregado_a'] ?? '';
        $descripcion = $data['descripcion'] ?? '';
        
        // Obtener el retiro actual para calcular saldo disponible correcto
        $stmt = $conn->prepare("SELECT retiro FROM retiros_intangibles WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $retiro_actual = floatval($stmt->get_result()->fetch_assoc()['retiro']);
        
        // Verificar que el saldo disponible sea suficiente (incluyendo el retiro actual)
        $stmt = $conn->prepare("SELECT COALESCE(SUM(a.aporte), 0) - COALESCE(SUM(r.retiro), 0) + ? as saldo_disponible 
                               FROM saldos_intangibles s
                               LEFT JOIN aportes_intangibles a ON s.id = a.saldo_intangible_id
                               LEFT JOIN retiros_intangibles r ON s.id = r.saldo_intangible_id AND r.id != ?
                               WHERE s.id = ?");
        $stmt->bind_param("dii", $retiro_actual, $id, $saldo_intangible_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $saldo_disponible = floatval($result->fetch_assoc()['saldo_disponible']);
        
        if ($retiro > $saldo_disponible) {
            jsonResponse(false, null, "El retiro excede el saldo disponible. Saldo disponible: " . number_format($saldo_disponible, 2));
        }
        
        $stmt = $conn->prepare("UPDATE retiros_intangibles SET saldo_intangible_id = ?, retiro = ?, fecha = ?, 
                               entregado_a = ?, descripcion = ? WHERE id = ?");
        $stmt->bind_param("idsssi", $saldo_intangible_id, $retiro, $fecha, $entregado_a, $descripcion, $id);
        
        if ($stmt->execute()) {
            jsonResponse(true, null, 'Retiro actualizado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al actualizar retiro: ' . $conn->error);
        }
        break;
        
    case 'DELETE':
        $id = intval($_GET['id']);
        $stmt = $conn->prepare("DELETE FROM retiros_intangibles WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute()) {
            jsonResponse(true, null, 'Retiro eliminado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al eliminar retiro: ' . $conn->error);
        }
        break;
}

$conn->close();
?>

