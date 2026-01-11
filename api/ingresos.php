<?php
require_once '../config.php';
requireAuth();

$conn = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            $id = intval($_GET['id']);
            $stmt = $conn->prepare("SELECT i.*, r.nombre as rubro_nombre FROM ingresos i 
                                   JOIN rubros_ingresos r ON i.rubro_id = r.id WHERE i.id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            $ingreso = $result->fetch_assoc();
            // Formatear la fecha explícitamente para evitar problemas de zona horaria
            if ($ingreso && isset($ingreso['fecha'])) {
                // Extraer solo la parte de la fecha (YYYY-MM-DD) sin usar funciones de tiempo
                $fecha = $ingreso['fecha'];
                if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $fecha, $matches)) {
                    $ingreso['fecha'] = $matches[1];
                }
            }
            jsonResponse(true, $ingreso);
        } else {
            $fecha_inicio = $_GET['fecha_inicio'] ?? null;
            $fecha_fin = $_GET['fecha_fin'] ?? null;
            
            $sql = "SELECT i.*, r.nombre as rubro_nombre FROM ingresos i 
                   JOIN rubros_ingresos r ON i.rubro_id = r.id";
            
            if ($fecha_inicio && $fecha_fin) {
                $sql .= " WHERE i.fecha BETWEEN ? AND ?";
                $sql .= " ORDER BY i.fecha DESC, i.id DESC";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ss", $fecha_inicio, $fecha_fin);
            } else {
                $sql .= " ORDER BY i.fecha DESC, i.id DESC LIMIT 100";
                $stmt = $conn->prepare($sql);
            }
            
            $stmt->execute();
            $result = $stmt->get_result();
            $ingresos = [];
            while ($row = $result->fetch_assoc()) {
                // Formatear la fecha explícitamente para evitar problemas de zona horaria
                if (isset($row['fecha'])) {
                    $fecha = $row['fecha'];
                    if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $fecha, $matches)) {
                        $row['fecha'] = $matches[1];
                    }
                }
                $ingresos[] = $row;
            }
            jsonResponse(true, $ingresos);
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $recibido_de = $data['recibido_de'] ?? '';
        $cantidad = floatval($data['cantidad'] ?? 0);
        $concepto = $data['concepto'] ?? '';
        $fecha = $data['fecha'] ?? date('Y-m-d');
        $numero_recibo = $data['numero_recibo'] ?? '';
        $rubro_id = intval($data['rubro_id'] ?? 0);
        
        $stmt = $conn->prepare("INSERT INTO ingresos (recibido_de, cantidad, concepto, fecha, numero_recibo, rubro_id) 
                               VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sdsssi", $recibido_de, $cantidad, $concepto, $fecha, $numero_recibo, $rubro_id);
        
        if ($stmt->execute()) {
            jsonResponse(true, ['id' => $conn->insert_id], 'Ingreso registrado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al registrar ingreso: ' . $conn->error);
        }
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = intval($data['id']);
        $recibido_de = $data['recibido_de'] ?? '';
        $cantidad = floatval($data['cantidad'] ?? 0);
        $concepto = $data['concepto'] ?? '';
        $fecha = $data['fecha'] ?? date('Y-m-d');
        $numero_recibo = $data['numero_recibo'] ?? '';
        $rubro_id = intval($data['rubro_id'] ?? 0);
        
        $stmt = $conn->prepare("UPDATE ingresos SET recibido_de = ?, cantidad = ?, concepto = ?, 
                               fecha = ?, numero_recibo = ?, rubro_id = ? WHERE id = ?");
        $stmt->bind_param("sdsssii", $recibido_de, $cantidad, $concepto, $fecha, $numero_recibo, $rubro_id, $id);
        
        if ($stmt->execute()) {
            jsonResponse(true, null, 'Ingreso actualizado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al actualizar ingreso: ' . $conn->error);
        }
        break;
        
    case 'DELETE':
        $id = intval($_GET['id']);
        $stmt = $conn->prepare("DELETE FROM ingresos WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute()) {
            jsonResponse(true, null, 'Ingreso eliminado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al eliminar ingreso: ' . $conn->error);
        }
        break;
}

$conn->close();
?>

