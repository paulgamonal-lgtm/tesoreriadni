<?php
require_once '../config.php';
requireAuth();

$conn = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            $id = intval($_GET['id']);
            $stmt = $conn->prepare("SELECT * FROM saldos_intangibles WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            $saldo = $result->fetch_assoc();
            jsonResponse(true, $saldo);
        } else {
            $activos = isset($_GET['activos']) && $_GET['activos'] == '1';
            $periodo_id = $_GET['periodo_id'] ?? null;
            
            $sql = "SELECT * FROM saldos_intangibles";
            $where = [];
            $params = [];
            $types = "";

            if ($activos) {
                $where[] = "activo = 1";
            }
            if ($periodo_id) {
                $where[] = "periodo_id = ?";
                $params[] = $periodo_id;
                $types .= "i";
            }

            if (!empty($where)) {
                $sql .= " WHERE " . implode(" AND ", $where);
            }
            $sql .= " ORDER BY descripcion";

            if (!empty($params)) {
                $stmt = $conn->prepare($sql);
                $stmt->bind_param($types, ...$params);
                $stmt->execute();
                $result = $stmt->get_result();
            } else {
                $result = $conn->query($sql);
            }
            
            $saldos = [];
            while ($row = $result->fetch_assoc()) {
                $saldos[] = $row;
            }
            jsonResponse(true, $saldos);
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $descripcion = $data['descripcion'] ?? '';
        $periodo_id = isset($data['periodo_id']) ? intval($data['periodo_id']) : null;
        
        if (empty($descripcion)) {
            jsonResponse(false, null, 'La descripción es requerida');
        }
        
        $stmt = $conn->prepare("INSERT INTO saldos_intangibles (descripcion, periodo_id) VALUES (?, ?)");
        $stmt->bind_param("si", $descripcion, $periodo_id);
        
        if ($stmt->execute()) {
            jsonResponse(true, ['id' => $conn->insert_id], 'Saldo intangible creado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al crear saldo intangible: ' . $conn->error);
        }
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = intval($data['id']);
        $descripcion = $data['descripcion'] ?? '';
        $activo = isset($data['activo']) ? intval($data['activo']) : 1;
        
        $stmt = $conn->prepare("UPDATE saldos_intangibles SET descripcion = ?, activo = ? WHERE id = ?");
        $stmt->bind_param("sii", $descripcion, $activo, $id);
        
        if ($stmt->execute()) {
            jsonResponse(true, null, 'Saldo intangible actualizado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al actualizar saldo intangible: ' . $conn->error);
        }
        break;
        
    case 'DELETE':
        $id = intval($_GET['id']);
        $stmt = $conn->prepare("DELETE FROM saldos_intangibles WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute()) {
            jsonResponse(true, null, 'Saldo intangible eliminado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al eliminar saldo intangible: ' . $conn->error);
        }
        break;
}

$conn->close();
?>

