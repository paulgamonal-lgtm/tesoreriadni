<?php
require_once '../config.php';
requireAuth();

$conn = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $fecha_mes = $_GET['fecha_mes'] ?? null;
        
        if ($fecha_mes) {
            // Obtener dinero intangible para un mes específico
            $stmt = $conn->prepare("SELECT * FROM dinero_intangible WHERE DATE_FORMAT(fecha_mes, '%Y-%m') = ?");
            $mes = substr($fecha_mes, 0, 7); // YYYY-MM
            $stmt->bind_param("s", $mes);
            $stmt->execute();
            $result = $stmt->get_result();
            $dinero = $result->fetch_assoc();
            
            if ($dinero) {
                jsonResponse(true, $dinero);
            } else {
                jsonResponse(true, ['monto' => 0.00, 'fecha_mes' => $fecha_mes, 'descripcion' => '']);
            }
        } else {
            // Obtener todos
            $result = $conn->query("SELECT * FROM dinero_intangible ORDER BY fecha_mes DESC");
            $dinero = [];
            while ($row = $result->fetch_assoc()) {
                $dinero[] = $row;
            }
            jsonResponse(true, $dinero);
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $monto = floatval($data['monto'] ?? 0);
        $fecha_mes = $data['fecha_mes'] ?? date('Y-m-01');
        $descripcion = $data['descripcion'] ?? '';
        $sumar = isset($data['sumar']) && $data['sumar'] === true; // Si es true, suma al existente
        
        // Asegurar que sea el primer día del mes
        $fecha_mes = substr($fecha_mes, 0, 7) . '-01';
        
        // Verificar si ya existe
        $stmt = $conn->prepare("SELECT id, monto FROM dinero_intangible WHERE fecha_mes = ?");
        $stmt->bind_param("s", $fecha_mes);
        $stmt->execute();
        $exists = $stmt->get_result()->fetch_assoc();
        
        if ($exists && $sumar) {
            // Sumar al monto existente
            $monto_final = floatval($exists['monto']) + $monto;
            $stmt = $conn->prepare("UPDATE dinero_intangible SET monto = ?, descripcion = ? WHERE fecha_mes = ?");
            $stmt->bind_param("dss", $monto_final, $descripcion, $fecha_mes);
            $mensaje = 'Dinero intangible actualizado exitosamente (se sumó al monto existente)';
        } else if ($exists) {
            // Actualizar (reemplazar)
            $stmt = $conn->prepare("UPDATE dinero_intangible SET monto = ?, descripcion = ? WHERE fecha_mes = ?");
            $stmt->bind_param("dss", $monto, $descripcion, $fecha_mes);
            $mensaje = 'Dinero intangible actualizado exitosamente';
        } else {
            // Insertar nuevo
            $stmt = $conn->prepare("INSERT INTO dinero_intangible (monto, fecha_mes, descripcion) VALUES (?, ?, ?)");
            $stmt->bind_param("dss", $monto, $descripcion, $fecha_mes);
            $mensaje = 'Dinero intangible guardado exitosamente';
        }
        
        if ($stmt->execute()) {
            jsonResponse(true, null, $mensaje);
        } else {
            jsonResponse(false, null, 'Error al guardar dinero intangible: ' . $conn->error);
        }
        break;
        
    case 'PUT':
        // Similar a POST pero siempre actualiza
        $data = json_decode(file_get_contents('php://input'), true);
        $monto = floatval($data['monto'] ?? 0);
        $fecha_mes = $data['fecha_mes'] ?? date('Y-m-01');
        $descripcion = $data['descripcion'] ?? '';
        $fecha_mes = substr($fecha_mes, 0, 7) . '-01';
        
        $stmt = $conn->prepare("UPDATE dinero_intangible SET monto = ?, descripcion = ? WHERE fecha_mes = ?");
        $stmt->bind_param("dss", $monto, $descripcion, $fecha_mes);
        
        if ($stmt->execute()) {
            jsonResponse(true, null, 'Dinero intangible actualizado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al actualizar dinero intangible: ' . $conn->error);
        }
        break;
}

$conn->close();
?>

