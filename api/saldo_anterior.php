<?php
require_once '../config.php';
requireAuth();

$conn = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Si se proporciona una fecha, buscar el saldo para esa fecha específica
        if (isset($_GET['fecha_gestion'])) {
            $fecha_gestion = $_GET['fecha_gestion'];
            $stmt = $conn->prepare("SELECT * FROM saldo_anterior WHERE fecha_gestion = ?");
            $stmt->bind_param("s", $fecha_gestion);
            $stmt->execute();
            $result = $stmt->get_result();
            $saldo = $result->fetch_assoc();
        } else {
            // Si no se proporciona fecha, obtener el más reciente
            $stmt = $conn->query("SELECT * FROM saldo_anterior ORDER BY fecha_gestion DESC LIMIT 1");
            $saldo = $stmt->fetch_assoc();
        }
        
        // Formatear la fecha explícitamente para evitar problemas de zona horaria
        if ($saldo && isset($saldo['fecha_gestion'])) {
            // Extraer solo la parte de la fecha (YYYY-MM-DD) sin usar funciones de tiempo
            $fecha = $saldo['fecha_gestion'];
            if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $fecha, $matches)) {
                $saldo['fecha_gestion'] = $matches[1];
            }
        }
        jsonResponse(true, $saldo);
        break;
        
    case 'POST':
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $monto = floatval($data['monto'] ?? 0);
        $fecha_gestion = $data['fecha_gestion'] ?? date('Y-m-01');
        $descripcion = $data['descripcion'] ?? '';
        
        // Eliminar saldos anteriores para esta fecha
        $stmt = $conn->prepare("DELETE FROM saldo_anterior WHERE fecha_gestion = ?");
        $stmt->bind_param("s", $fecha_gestion);
        $stmt->execute();
        
        // Insertar nuevo saldo
        $stmt = $conn->prepare("INSERT INTO saldo_anterior (monto, fecha_gestion, descripcion) VALUES (?, ?, ?)");
        $stmt->bind_param("dss", $monto, $fecha_gestion, $descripcion);
        
        if ($stmt->execute()) {
            jsonResponse(true, ['id' => $conn->insert_id], 'Saldo anterior actualizado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al actualizar saldo anterior: ' . $conn->error);
        }
        break;
}

$conn->close();
?>

