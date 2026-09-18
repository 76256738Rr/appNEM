<?php
/**
 * Chat libre de Aether desactivado en Didzago.
 * Usa api/activity.php → misiones tipadas del agente Aether.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(204);
    exit;
}

http_response_code($_SERVER['REQUEST_METHOD'] === 'GET' ? 200 : 410);
echo json_encode([
    'ok' => false,
    'chat' => false,
    'message' => 'El chat de Aether está desactivado. Didzago usa misiones tipadas SEP (práctica, explicación, reto).',
    'use' => 'api/activity.php',
    'actions' => ['mission', 'memory', 'puzzle', 'escape', 'path'],
    'engine' => 'aether-missions',
], JSON_UNESCAPED_UNICODE);
