<?php
// Verificar si estamos en el directorio api
$config_path = file_exists('config.php') ? 'config.php' : '../config.php';
require_once $config_path;

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Verificar estado de autenticación
    // La sesión ya está iniciada por config.php, solo verificamos
    
    if (isset($_SESSION['user_id']) && !empty($_SESSION['user_id']) && is_numeric($_SESSION['user_id'])) {
        jsonResponse(true, [
            'authenticated' => true,
            'user_id' => $_SESSION['user_id'],
            'nombre' => $_SESSION['nombre'] ?? '',
            'email' => $_SESSION['email'] ?? ''
        ]);
    } else {
        jsonResponse(true, ['authenticated' => false]);
    }
}

if ($method === 'POST') {
    // Login
    $data = json_decode(file_get_contents('php://input'), true);
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    
    if (empty($email) || empty($password)) {
        jsonResponse(false, null, 'Email y contraseña son requeridos');
    }
    
    $conn = getDBConnection();
    
    // Buscar usuario
    $stmt = $conn->prepare("SELECT id, nombre, email, password FROM usuarios WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    
    if ($user && md5($password) === $user['password']) {
        // La sesión ya está iniciada por config.php
        
        // Limpiar cualquier dato de sesión anterior (por seguridad)
        $_SESSION = array();
        
        // Establecer nuevos datos de sesión
        $_SESSION['user_id'] = intval($user['id']);
        $_SESSION['nombre'] = $user['nombre'];
        $_SESSION['email'] = $user['email'];
        $_SESSION['login_time'] = time();
        
        // Regenerar ID de sesión por seguridad (previene session fixation)
        session_regenerate_id(true);
        
        // Verificar que la sesión se estableció correctamente
        if (isset($_SESSION['user_id']) && $_SESSION['user_id'] == $user['id']) {
            jsonResponse(true, [
                'user_id' => $user['id'],
                'nombre' => $user['nombre'],
                'email' => $user['email']
            ], 'Login exitoso');
        } else {
            jsonResponse(false, null, 'Error al establecer la sesión');
        }
    } else {
        jsonResponse(false, null, 'Credenciales incorrectas');
    }
    
    $conn->close();
}

if ($method === 'DELETE') {
    // Logout
    session_destroy();
    jsonResponse(true, null, 'Sesión cerrada exitosamente');
}
?>

