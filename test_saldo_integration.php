<?php
// Script to test the integration of Saldo Inicial
require_once 'config.php';

// Helper to make local requests (simulated) or just direct calls if we include files (but files output JSON and exit).
// Better to use curl to localhost if possible, or just direct DB checks.

$conn = getDBConnection();

echo "--- Test Start ---\n";

// 1. Check current saldo_anterior table
echo "Current saldo_anterior table:\n";
$res = $conn->query("SELECT * FROM saldo_anterior ORDER BY fecha_gestion ASC");
while ($row = $res->fetch_assoc()) {
    print_r($row);
}

// 2. Simulate User Updating Profile with new Saldo Inicial
echo "\n--- Simulating Profile Update (Saldo Inicial = 5000) ---\n";
// logic from perfil.php adapted for test
$saldo_inicial = 5000.00;
$check = $conn->query("SELECT id FROM saldo_anterior ORDER BY fecha_gestion ASC LIMIT 1");
if ($check->num_rows > 0) {
    echo "Updating existing record...\n";
    $row = $check->fetch_assoc();
    $update_saldo = $conn->prepare("UPDATE saldo_anterior SET monto = ? WHERE id = ?");
    $update_saldo->bind_param("di", $saldo_inicial, $row['id']);
    $update_saldo->execute();
} else {
    echo "Creating new record...\n";
    $fecha_base = '2024-01-01';
    $descripcion = 'Saldo Inicial - Gestión';
    $insert_saldo = $conn->prepare("INSERT INTO saldo_anterior (monto, fecha_gestion, descripcion) VALUES (?, ?, ?)");
    $insert_saldo->bind_param("dss", $saldo_inicial, $fecha_base, $descripcion);
    $insert_saldo->execute();
}

// 3. Verify DB again
echo "\n--- Verifying DB after update ---\n";
$res = $conn->query("SELECT * FROM saldo_anterior ORDER BY fecha_gestion ASC LIMIT 1");
$row = $res->fetch_assoc();
echo "New Base Saldo: " . ($row ? $row['monto'] : 'NONE') . "\n";

if ($row && abs($row['monto'] - 5000) < 0.01) {
    echo "SUCCESS: Saldo updated correctly.\n";
} else {
    echo "FAILURE: Saldo not updated.\n";
}

$conn->close();
?>
