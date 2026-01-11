<?php
require_once 'config.php';
$conn = getDBConnection();

// Corregir saldos_intangibles
// Si tiene aportes en 2025, debería ser del periodo 1
$conn->query("UPDATE saldos_intangibles SET periodo_id = 1 WHERE id = 1");

// Para los rubros, si tienen movimientos en el rango del periodo 1, asignarlos allí
$res = $conn->query("SELECT id, nombre, fecha_inicio, fecha_fin FROM periodos_gestion");
$periodos = [];
while($row = $res->fetch_assoc()) $periodos[] = $row;

$tables = [
    'rubros_ingresos' => 'ingresos',
    'rubros_egresos' => 'egresos',
    'saldos_intangibles' => 'aportes_intangibles'
];

foreach ($tables as $rubroTable => $movTable) {
    echo "Procesando $rubroTable...\n";
    $rubrosRes = $conn->query("SELECT id FROM $rubroTable");
    while ($rubro = $rubrosRes->fetch_assoc()) {
        $rubroId = $rubro['id'];
        
        // Buscar el primer movimiento de este rubro
        $colId = ($rubroTable == 'saldos_intangibles') ? 'saldo_intangible_id' : 'rubro_id';
        $movRes = $conn->query("SELECT fecha FROM $movTable WHERE $colId = $rubroId ORDER BY fecha ASC LIMIT 1");
        
        if ($movRes && $mov = $movRes->fetch_assoc()) {
            $fecha = $mov['fecha'];
            echo "Rubro ID $rubroId tiene primer movimiento en $fecha. ";
            
            // Ver a qué periodo pertenece esta fecha
            foreach ($periodos as $p) {
                if ($fecha >= $p['fecha_inicio'] && $fecha <= $p['fecha_fin']) {
                    $conn->query("UPDATE $rubroTable SET periodo_id = {$p['id']} WHERE id = $rubroId");
                    echo "Asignado al Periodo ID: {$p['id']}\n";
                    break;
                }
            }
        } else {
            // Si no tiene movimientos, mantenerlo en el periodo activo actual o el más reciente
            echo "Rubro ID $rubroId no tiene movimientos.\n";
        }
    }
}

$conn->close();
?>
