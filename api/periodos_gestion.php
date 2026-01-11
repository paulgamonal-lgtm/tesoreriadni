<?php
require_once '../config.php';
requireAuth();

$conn = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            $id = intval($_GET['id']);
            $stmt = $conn->prepare("SELECT * FROM periodos_gestion WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            $periodo = $result->fetch_assoc();
            jsonResponse(true, $periodo);
        } elseif (isset($_GET['activo'])) {
            $stmt = $conn->prepare("SELECT * FROM periodos_gestion WHERE es_activo = 1 LIMIT 1");
            $stmt->execute();
            $result = $stmt->get_result();
            $periodo = $result->fetch_assoc();
            jsonResponse(true, $periodo);
        } else {
            $result = $conn->query("SELECT * FROM periodos_gestion ORDER BY fecha_inicio DESC");
            $periodos = [];
            while ($row = $result->fetch_assoc()) {
                $periodos[] = $row;
            }
            jsonResponse(true, $periodos);
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $nombre = $data['nombre'] ?? '';
        $fecha_inicio = $data['fecha_inicio'] ?? '';
        $fecha_fin = $data['fecha_fin'] ?? '';
        $es_activo = isset($data['es_activo']) ? intval($data['es_activo']) : 0;
        $saldo_inicial = floatval($data['saldo_inicial'] ?? 0);
        
        if ($es_activo == 1) {
            $conn->query("UPDATE periodos_gestion SET es_activo = 0");
        }
        
        $stmt = $conn->prepare("INSERT INTO periodos_gestion (nombre, fecha_inicio, fecha_fin, es_activo, saldo_inicial) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("sssid", $nombre, $fecha_inicio, $fecha_fin, $es_activo, $saldo_inicial);
        
        if ($stmt->execute()) {
            jsonResponse(true, ['id' => $conn->insert_id], 'Ciclo creado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al crear ciclo: ' . $conn->error);
        }
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = intval($data['id']);
        $nombre = $data['nombre'] ?? '';
        $fecha_inicio = $data['fecha_inicio'] ?? '';
        $fecha_fin = $data['fecha_fin'] ?? '';
        $es_activo = isset($data['es_activo']) ? intval($data['es_activo']) : 0;
        $saldo_inicial = floatval($data['saldo_inicial'] ?? 0);
        
        if ($es_activo == 1) {
            $conn->query("UPDATE periodos_gestion SET es_activo = 0 WHERE id != $id");
        }
        
        $stmt = $conn->prepare("UPDATE periodos_gestion SET nombre = ?, fecha_inicio = ?, fecha_fin = ?, es_activo = ?, saldo_inicial = ? WHERE id = ?");
        $stmt->bind_param("sssidi", $nombre, $fecha_inicio, $fecha_fin, $es_activo, $saldo_inicial, $id);
        
        if ($stmt->execute()) {
            jsonResponse(true, null, 'Ciclo actualizado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al actualizar ciclo: ' . $conn->error);
        }
        break;
        
    case 'DELETE':
        $id = intval($_GET['id']);
        
        // No permitir eliminar el ciclo activo
        $check = $conn->query("SELECT es_activo FROM periodos_gestion WHERE id = $id");
        $row = $check->fetch_assoc();
        if ($row && $row['es_activo'] == 1) {
            jsonResponse(false, null, 'No se puede eliminar el ciclo activo principal.');
        }

        $stmt = $conn->prepare("DELETE FROM periodos_gestion WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute()) {
            jsonResponse(true, null, 'Ciclo eliminado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al eliminar ciclo: ' . $conn->error);
        }
        break;
}

$conn->close();
?>
