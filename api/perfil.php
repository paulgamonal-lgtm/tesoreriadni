<?php
require_once '../config.php';
requireAuth();

$conn = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $id = intval($_GET['id'] ?? 1);
        $stmt = $conn->prepare("SELECT id, nombre, email, telefono, nombre_firma, cargo_firma FROM usuarios WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $usuario = $result->fetch_assoc();



        jsonResponse(true, $usuario);
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = intval($data['id'] ?? 1);
        $nombre = $data['nombre'] ?? '';
        $email = $data['email'] ?? '';
        $telefono = $data['telefono'] ?? '';
        $password = $data['password'] ?? '';
        $nombre_firma = $data['nombre_firma'] ?? '';
        $cargo_firma = $data['cargo_firma'] ?? '';

        try {
            if (!empty($password)) {
                $password_hash = md5($password);
                $stmt = $conn->prepare("UPDATE usuarios SET nombre = ?, email = ?, telefono = ?, password = ?, nombre_firma = ?, cargo_firma = ? WHERE id = ?");
                $stmt->bind_param("ssssssi", $nombre, $email, $telefono, $password_hash, $nombre_firma, $cargo_firma, $id);
            } else {
                $stmt = $conn->prepare("UPDATE usuarios SET nombre = ?, email = ?, telefono = ?, nombre_firma = ?, cargo_firma = ? WHERE id = ?");
                $stmt->bind_param("sssssi", $nombre, $email, $telefono, $nombre_firma, $cargo_firma, $id);
            }
            $stmt->execute();

            jsonResponse(true, null, 'Perfil actualizado exitosamente');
        } catch (Exception $e) {
            jsonResponse(false, null, 'Error al actualizar perfil: ' . $e->getMessage());
        }
        break;
        
}

$conn->close();
?>

