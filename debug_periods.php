<?php
require_once 'config.php';
$conn = getDBConnection();

echo "--- PERIODOS ---\n";
$res = $conn->query("SELECT id, nombre, es_activo FROM periodos_gestion");
while ($row = $res->fetch_assoc()) {
    echo "ID: {$row['id']} | Nombre: {$row['nombre']} | Activo: {$row['es_activo']}\n";
}

echo "\n--- SALDOS INTANGIBLES ---\n";
$res = $conn->query("SELECT id, descripcion, periodo_id FROM saldos_intangibles");
while ($row = $res->fetch_assoc()) {
    echo "ID: {$row['id']} | Desc: {$row['descripcion']} | Periodo ID: {$row['periodo_id']}\n";
}
$conn->close();
