<?php
require_once 'config.php';
$conn = getDBConnection();
$result = $conn->query("SHOW COLUMNS FROM saldo_anterior");
while ($row = $result->fetch_assoc()) {
    echo $row['Field'] . "\n";
}
$conn->close();
?>
