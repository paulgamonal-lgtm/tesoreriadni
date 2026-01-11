<?php
require_once '../config.php';
requireAuth();

$conn = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            $id = intval($_GET['id']);
            $stmt = $conn->prepare("SELECT * FROM rubros_ingresos WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            $rubro = $result->fetch_assoc();
            jsonResponse(true, $rubro);
        } else {
            $periodo_id = $_GET['periodo_id'] ?? null;
            $sql = "SELECT * FROM rubros_ingresos";
            if ($periodo_id) {
                $stmt = $conn->prepare($sql . " WHERE periodo_id = ? ORDER BY nombre");
                $stmt->bind_param("i", $periodo_id);
                $stmt->execute();
                $result = $stmt->get_result();
            } else {
                $result = $conn->query($sql . " ORDER BY nombre");
            }
            $rubros = [];
            while ($row = $result->fetch_assoc()) {
                $rubros[] = $row;
            }
            jsonResponse(true, $rubros);
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $nombre = $data['nombre'] ?? '';
        $descripcion = $data['descripcion'] ?? '';
        $periodo_id = isset($data['periodo_id']) ? intval($data['periodo_id']) : null;
        
        $stmt = $conn->prepare("INSERT INTO rubros_ingresos (nombre, descripcion, periodo_id) VALUES (?, ?, ?)");
        $stmt->bind_param("ssi", $nombre, $descripcion, $periodo_id);
        
        if ($stmt->execute()) {
            jsonResponse(true, ['id' => $conn->insert_id], 'Rubro creado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al crear rubro: ' . $conn->error);
        }
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = intval($data['id']);
        $nombre = $data['nombre'] ?? '';
        $descripcion = $data['descripcion'] ?? '';
        $activo = isset($data['activo']) ? intval($data['activo']) : 1;
        
        $stmt = $conn->prepare("UPDATE rubros_ingresos SET nombre = ?, descripcion = ?, activo = ? WHERE id = ?");
        $stmt->bind_param("ssii", $nombre, $descripcion, $activo, $id);
        
        if ($stmt->execute()) {
            jsonResponse(true, null, 'Rubro actualizado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al actualizar rubro: ' . $conn->error);
        }
        break;
        
    case 'DELETE':
        $id = intval($_GET['id']);
        $stmt = $conn->prepare("DELETE FROM rubros_ingresos WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute()) {
            jsonResponse(true, null, 'Rubro eliminado exitosamente');
        } else {
            jsonResponse(false, null, 'Error al eliminar rubro: ' . $conn->error);
        }
        break;
}

$conn->close();
?>

