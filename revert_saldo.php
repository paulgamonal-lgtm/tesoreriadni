<?php
require_once 'config.php';
$conn = getDBConnection();
$conn->query("UPDATE saldo_anterior SET monto=540.70 WHERE id=3");
echo "Reverted.";
?>
