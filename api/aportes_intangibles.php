<?php
require_once '../config.php';
requireAuth();

$conn = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            $id = intval($_GET['id']);
            $stmt = $conn->prepare("SELECT a.*, s.descripcion as saldo_intangible_descripcion 
                                   FROM aportes_intangibles a 
                                   JOIN saldos_intangibles s ON a.saldo_intangible_id = s.id 
                                   WHERE a.id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            $aporte = $result->fetch_assoc();
            // Formatear la fecha explícitamente para evitar problemas de zona horaria
            if ($aporte && isset($aporte['fecha'])) {
                // Extraer solo la parte de la fecha (YYYY-MM-DD) sin usar funciones de tiempo
                $fecha = $aporte['fecha'];
                if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $fecha, $matches)) {
                    $aporte['fecha'] = $matches[1];
                }
            }
            jsonResponse(true, $aporte);
        } else {
            $saldo_id = $_GET['saldo_id'] ?? null;
            $fecha_inicio = $_GET['fecha_inicio'] ?? null;
            $fecha_fin = $_GET['fecha_fin'] ?? null;
            
            $sql = "SELECT a.*, s.descripcion as saldo_intangible_descripcion 
                   FROM aportes_intangibles a 
                   JOIN saldos_intangibles s ON a.saldo_intangible_id = s.id";
            
            $params = [];
            $types = '';
            
            if ($saldo_id) {
                $sql .= " WHERE a.saldo_intangible_id = ?";
                $params[] = intval($saldo_id);
                $types .= 'i';
            }
            
            if ($fecha_inicio && $fecha_fin) {
                $sql .= $saldo_id ? " AND" : " WHERE";
                $sql .= " a.fecha BETWEEN ? AND ?";
                $params[] = $fecha_inicio;
                $params[] = $fecha_fin;
                $types .= 'ss';
            }
            
            $sql .= " ORDER BY a.fecha DESC, a.id DESC";
            
            $stmt = $conn->prepare($sql);
            if (!empty($params)) {
                $stmt->bind_param($types, ...$params);
            }
            $stmt->execute();
            $result = $stmt->get_result();
            
            $aportes = [];
            while ($row = $result->fetch_assoc()) {
                // Formatear la fecha explícitamente para evitar problemas de zona horaria
                if (isset($row['fecha'])) {
                    $fecha = $row['fecha'];
                    if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $fecha, $matches)) {
                        $row['fecha'] = $matches[1];
                    }
                }
                $aportes[] = $row;
            }
            jsonResponse(true, $aportes);
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $saldo_intangible_id = intval($data['saldo_intangible_id'] ?? 0);
        $aporte = floatval($data['aporte'] ?? 0);
        $fecha = $data['fecha'] ?? date('Y-m-d');
        $entregado_por = $data['entregado_por'] ?? '';
        $descripcion = $data['descripcion'] ?? '';
        
        if (empty($saldo_intangible_id) || empty($entregado_por) || $aporte <= 0) {
            jsonResponse(false, null, 'Todos los campos son requeridos');
        }
        
        $stmt = $conn->prepare("INSERT INTO aportes_intangibles (saldo_intangible_id, aporte, fecha, entregado_por, descripcion) 
                               VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("idsss", $saldo_intangible_id, $aporte, $fecha, $entregado_por, $descripcion);
        
        if ($stmt->execute()) {
            jsonResponse(true, ['id' => $conn->insert_id], 'Aporte registrado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al registrar aporte: ' . $conn->error);
        }
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = intval($data['id']);
        $saldo_intangible_id = intval($data['saldo_intangible_id'] ?? 0);
        $aporte = floatval($data['aporte'] ?? 0);
        $fecha = $data['fecha'] ?? date('Y-m-d');
        $entregado_por = $data['entregado_por'] ?? '';
        $descripcion = $data['descripcion'] ?? '';
        
        $stmt = $conn->prepare("UPDATE aportes_intangibles SET saldo_intangible_id = ?, aporte = ?, fecha = ?, 
                               entregado_por = ?, descripcion = ? WHERE id = ?");
        $stmt->bind_param("idsssi", $saldo_intangible_id, $aporte, $fecha, $entregado_por, $descripcion, $id);
        
        if ($stmt->execute()) {
            jsonResponse(true, null, 'Aporte actualizado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al actualizar aporte: ' . $conn->error);
        }
        break;
        
    case 'DELETE':
        $id = intval($_GET['id']);
        $stmt = $conn->prepare("DELETE FROM aportes_intangibles WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute()) {
            jsonResponse(true, null, 'Aporte eliminado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al eliminar aporte: ' . $conn->error);
        }
        break;
}

$conn->close();
?>

