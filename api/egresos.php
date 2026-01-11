<?php
require_once '../config.php';
requireAuth();

$conn = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            $id = intval($_GET['id']);
            $stmt = $conn->prepare("SELECT e.*, r.nombre as rubro_nombre FROM egresos e 
                                   JOIN rubros_egresos r ON e.rubro_id = r.id WHERE e.id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            $egreso = $result->fetch_assoc();
            // Formatear la fecha explícitamente para evitar problemas de zona horaria
            if ($egreso && isset($egreso['fecha'])) {
                // Extraer solo la parte de la fecha (YYYY-MM-DD) sin usar funciones de tiempo
                $fecha = $egreso['fecha'];
                if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $fecha, $matches)) {
                    $egreso['fecha'] = $matches[1];
                }
            }
            jsonResponse(true, $egreso);
        } else {
            $fecha_inicio = $_GET['fecha_inicio'] ?? null;
            $fecha_fin = $_GET['fecha_fin'] ?? null;
            
            $sql = "SELECT e.*, r.nombre as rubro_nombre FROM egresos e 
                   JOIN rubros_egresos r ON e.rubro_id = r.id";
            
            if ($fecha_inicio && $fecha_fin) {
                $sql .= " WHERE e.fecha BETWEEN ? AND ?";
                $sql .= " ORDER BY e.fecha DESC, e.id DESC";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $fecha_inicio, $fecha_fin);
            } else {
                $sql .= " ORDER BY e.fecha DESC, e.id DESC LIMIT 100";
                $stmt = $conn->prepare($sql);
            }
            
            $stmt->execute();
            $result = $stmt->get_result();
            $egresos = [];
            while ($row = $result->fetch_assoc()) {
                // Formatear la fecha explícitamente para evitar problemas de zona horaria
                if (isset($row['fecha'])) {
                    $fecha = $row['fecha'];
                    if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $fecha, $matches)) {
                        $row['fecha'] = $matches[1];
                    }
                }
                $egresos[] = $row;
            }
            jsonResponse(true, $egresos);
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $cantidad = floatval($data['cantidad'] ?? 0);
        $concepto = $data['concepto'] ?? '';
        $fecha = $data['fecha'] ?? date('Y-m-d');
        $entregado_a = $data['entregado_a'] ?? '';
        $numero_recibo = $data['numero_recibo'] ?? '';
        $rubro_id = intval($data['rubro_id'] ?? 0);
        
        $stmt = $conn->prepare("INSERT INTO egresos (cantidad, concepto, fecha, entregado_a, numero_recibo, rubro_id) 
                               VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("dssssi", $cantidad, $concepto, $fecha, $entregado_a, $numero_recibo, $rubro_id);
        
        if ($stmt->execute()) {
            jsonResponse(true, ['id' => $conn->insert_id], 'Egreso registrado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al registrar egreso: ' . $conn->error);
        }
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = intval($data['id']);
        $cantidad = floatval($data['cantidad'] ?? 0);
        $concepto = $data['concepto'] ?? '';
        $fecha = $data['fecha'] ?? date('Y-m-d');
        $entregado_a = $data['entregado_a'] ?? '';
        $numero_recibo = $data['numero_recibo'] ?? '';
        $rubro_id = intval($data['rubro_id'] ?? 0);
        
        $stmt = $conn->prepare("UPDATE egresos SET cantidad = ?, concepto = ?, fecha = ?, 
                               entregado_a = ?, numero_recibo = ?, rubro_id = ? WHERE id = ?");
        $stmt->bind_param("dssssii", $cantidad, $concepto, $fecha, $entregado_a, $numero_recibo, $rubro_id, $id);
        
        if ($stmt->execute()) {
            jsonResponse(true, null, 'Egreso actualizado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al actualizar egreso: ' . $conn->error);
        }
        break;
        
    case 'DELETE':
        $id = intval($_GET['id']);
        $stmt = $conn->prepare("DELETE FROM egresos WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute()) {
            jsonResponse(true, null, 'Egreso eliminado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al eliminar egreso: ' . $conn->error);
        }
        break;
}

$conn->close();
?>

