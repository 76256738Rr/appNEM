<?php
/**
 * Didzago → Aether (misiones tipadas SEP + juegos).
 * Sin chat. Compatible PHP 7.4+
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(204);
    exit;
}

$OLLAMA = getenv('OLLAMA_HOST') ?: 'http://127.0.0.1:11434';
$MODEL = getenv('DIDZAGO_MODEL') ?: 'aether';
$AETHER_BASE = getenv('AETHER_PUBLIC_BASE') ?: '/aether/';

$ALLOWED_ACTIONS = array('mission', 'memory', 'puzzle', 'escape', 'path');
$ALLOWED_AGES = array('4-6', '7-9', '10-13');
$ALLOWED_SUBJECTS = array('matematicas', 'lectura', 'ciencias', 'mixto');

$AETHER_MISSIONS = dirname(__DIR__) . '/../aether/api/missions.php';
$AETHER_MISSIONS_OK = false;
if (is_readable($AETHER_MISSIONS)) {
    require_once $AETHER_MISSIONS;
    $AETHER_MISSIONS_OK = function_exists('buildFreshMission') && function_exists('sanitizeMission');
}

function respond($code, $payload)
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function aether_public_url($path)
{
    global $AETHER_BASE;
    $path = str_replace('\\', '/', (string) $path);
    if ($path === '' || $path === 'null') {
        return null;
    }
    if (preg_match('#^https?://#i', $path)) {
        return $path;
    }
    if (strpos($path, '/libros/') !== false || strpos($path, 'libros/') === 0) {
        return null;
    }
    $path = ltrim($path, '/');
    $base = rtrim($AETHER_BASE, '/') . '/';
    $parts = explode('/', $path);
    $enc = array();
    foreach ($parts as $p) {
        $enc[] = rawurlencode($p);
    }
    return $base . implode('/', $enc);
}

function age_to_aether($age)
{
    if ($age === '4-6') {
        return array('nivel' => 'preescolar', 'grade' => 2, 'band' => '4-6');
    }
    if ($age === '10-13') {
        return array('nivel' => 'primaria', 'grade' => 5, 'band' => '10-13');
    }
    return array('nivel' => 'primaria', 'grade' => 3, 'band' => '7-9');
}

function subject_to_field($subject)
{
    if ($subject === 'lectura') {
        return array('field' => 'Lenguajes', 'category' => 'letras');
    }
    if ($subject === 'matematicas') {
        return array('field' => 'Saberes y pensamiento científico', 'category' => 'numeros');
    }
    if ($subject === 'ciencias') {
        return array('field' => 'Saberes y pensamiento científico', 'category' => 'naturaleza');
    }
    $fields = array(
        'Lenguajes',
        'Saberes y pensamiento científico',
        'Ética, naturaleza y sociedades',
        'De lo humano y lo comunitario',
    );
    return array('field' => $fields[array_rand($fields)], 'category' => '');
}

function load_aether_missions_lib()
{
    global $AETHER_MISSIONS_OK;
    return !empty($AETHER_MISSIONS_OK);
}

function sanitize_round_for_app($round, $age = '7-9')
{
    $file = str_replace('\\', '/', (string) (isset($round['file']) ? $round['file'] : ''));
    $url = str_replace('\\', '/', (string) (isset($round['url']) ? $round['url'] : ''));
    $type = isset($round['type']) ? (string) $round['type'] : 'practice';
    $isScan = (!empty($round['show_book_scan']))
        || ($type === 'libro')
        || (strpos($file, 'libros/') !== false)
        || (strpos($url, '/libros/') !== false);

    $imageUrl = null;
    if (!$isScan) {
        $imageUrl = aether_public_url($url !== '' ? $url : $file);
    }

    $bib = '';
    if (!empty($round['bibliography'])) {
        $bib = (string) $round['bibliography'];
    } elseif (!empty($round['sep_book'])) {
        $bib = (string) $round['sep_book'];
    }

    $options = isset($round['options']) && is_array($round['options']) ? $round['options'] : array();
    $answer = isset($round['answer']) ? (string) $round['answer'] : '';
    $choices = array();
    foreach ($options as $opt) {
        $label = (string) $opt;
        $choices[] = array(
            'label' => $label,
            'correct' => (mb_strtolower($label) === mb_strtolower($answer)),
        );
    }
    if ($choices && !array_filter($choices, function ($c) { return $c['correct']; })) {
        $choices[0]['correct'] = true;
        $choices[0]['label'] = $answer !== '' ? $answer : $choices[0]['label'];
    }

    $kind = isset($round['kind']) ? (string) $round['kind'] : '';
    $mode = isset($round['mode']) ? (string) $round['mode'] : '';
    if ($mode === '' && $kind === 'letra') {
        if ($age === '4-6') {
            $mode = 'identify';
        } elseif ($age === '10-13') {
            $mode = 'write';
        } else {
            $mode = 'read';
        }
    }
    if ($mode === '') {
        if ($type === 'explanation') {
            $mode = 'explain';
        } elseif ($type === 'challenge') {
            $mode = 'challenge';
        } else {
            $mode = 'identify';
        }
    }

    $typeLabels = array(
        'practice' => 'Práctica',
        'explanation' => 'Explicación',
        'challenge' => 'Reto',
    );
    $typeLabel = isset($round['type_label']) ? (string) $round['type_label'] : '';
    if ($typeLabel === '' && isset($typeLabels[$type])) {
        $typeLabel = $typeLabels[$type];
    }
    if ($typeLabel === '') {
        $typeLabel = 'Práctica';
    }

    $lab = isset($round['label']) ? (string) $round['label'] : '';
    $writeHint = isset($round['write_hint']) ? (string) $round['write_hint'] : '';
    if ($writeHint === '' && $kind === 'letra') {
        if ($mode === 'write') {
            $writeHint = 'Traza la letra ' . $lab . ' en la zona de escritura.';
        } elseif ($mode === 'read') {
            $writeHint = 'Lee en voz alta la letra ' . $lab . '.';
        } else {
            $writeHint = 'Toca y di la letra ' . $lab . '.';
        }
    }

    $hint = 'Toca la respuesta correcta.';
    if ($writeHint !== '') {
        $hint = $writeHint;
    }

    return array(
        'type' => $type,
        'type_label' => $typeLabel,
        'mode' => $mode,
        'kind' => $kind,
        'title' => isset($round['concept_title']) ? $round['concept_title'] : 'Concepto',
        'concept' => isset($round['concept_text']) ? $round['concept_text'] : '',
        'prompt' => isset($round['question']) ? $round['question'] : 'Elige la respuesta correcta.',
        'hint' => $hint,
        'write_hint' => $writeHint,
        'image' => $imageUrl,
        'bibliography' => $bib,
        'choices' => $choices,
        'success' => isset($round['explainCorrect']) ? $round['explainCorrect'] : '¡Correcto!',
        'retry' => isset($round['explainWrong']) ? $round['explainWrong'] : 'Buen intento',
        'label' => $lab,
        'needs_trace' => ($kind === 'letra' && $mode === 'write' && $type === 'practice'),
    );
}

function mission_to_activity($mission, $age, $subject)
{
    $roundsIn = isset($mission['rounds']) && is_array($mission['rounds']) ? $mission['rounds'] : array();
    $rounds = array();
    foreach ($roundsIn as $r) {
        if (!is_array($r)) {
            continue;
        }
        if ((isset($r['type']) ? $r['type'] : '') === 'pdf') {
            continue;
        }
        $rounds[] = sanitize_round_for_app($r, $age);
    }
    if (!$rounds) {
        return null;
    }
    // Preferir orden practice → explanation → challenge
    usort($rounds, function ($a, $b) {
        $order = array('practice' => 1, 'explanation' => 2, 'challenge' => 3);
        $oa = isset($order[$a['type']]) ? $order[$a['type']] : 9;
        $ob = isset($order[$b['type']]) ? $order[$b['type']] : 9;
        return $oa - $ob;
    });
    return array(
        'title' => isset($mission['title']) ? $mission['title'] : 'Misión Aether',
        'emoji' => isset($mission['emoji']) ? $mission['emoji'] : '✨',
        'field' => isset($mission['field']) ? $mission['field'] : '',
        'age_label' => isset($mission['age_label']) ? $mission['age_label'] : $age,
        'source' => isset($mission['source']) ? $mission['source'] : 'aether-missions',
        'subject' => $subject,
        'steps' => array('Práctica', 'Explicación', 'Reto'),
        'rounds' => $rounds,
        'prompt' => $rounds[0]['prompt'],
        'hint' => $rounds[0]['hint'],
        'choices' => $rounds[0]['choices'],
        'success' => $rounds[0]['success'],
        'retry' => $rounds[0]['retry'],
        'image' => $rounds[0]['image'],
        'concept' => $rounds[0]['concept'],
        'bibliography' => $rounds[0]['bibliography'],
        'concept_title' => $rounds[0]['title'],
    );
}

function fetch_aether_mission($age, $subject, $useLlm = false)
{
    if (!load_aether_missions_lib()) {
        return array('ok' => false, 'error' => 'API de misiones Aether no disponible');
    }
    $map = age_to_aether($age);
    $sf = subject_to_field($subject);
    try {
        $mission = buildFreshMission($map['grade'], $sf['field'], $sf['category'], $map['nivel']);
        if ($useLlm && function_exists('tryLlmEnrich')) {
            $mission = tryLlmEnrich($mission, 15);
        }
        $mission = sanitizeMission($mission);
        $activity = mission_to_activity($mission, $age, $subject);
        if (!$activity) {
            return array('ok' => false, 'error' => 'Misión sin rondas jugables');
        }
        return array('ok' => true, 'activity' => $activity, 'raw' => $mission);
    } catch (Exception $e) {
        return array('ok' => false, 'error' => $e->getMessage());
    }
}

function typed_labels_for_memory($age)
{
    $catalogPath = dirname(__DIR__) . '/../aether/base/catalogo.json';
    if (!is_readable($catalogPath)) {
        return null;
    }
    $data = json_decode(file_get_contents($catalogPath), true);
    $items = isset($data['items']) ? $data['items'] : array();
    $kinds = $age === '4-6' ? array('letra', 'numero', 'fruta') : array('animal', 'fruta', 'letra');
    $pool = array();
    foreach ($items as $it) {
        if (!is_array($it)) {
            continue;
        }
        $kind = isset($it['kind']) ? $it['kind'] : '';
        $file = isset($it['file']) ? $it['file'] : '';
        if ($kind === 'libro' || strpos($file, 'libros/') !== false) {
            continue;
        }
        if (!in_array($kind, $kinds, true)) {
            continue;
        }
        $lab = isset($it['label']) ? trim((string) $it['label']) : '';
        if ($lab !== '' && !in_array($lab, $pool, true)) {
            $pool[] = $lab;
        }
    }
    shuffle($pool);
    $n = $age === '4-6' ? 3 : ($age === '10-13' ? 4 : 3);
    $pairs = array_slice($pool, 0, $n);
    if (count($pairs) < 2) {
        return null;
    }
    return array(
        'title' => 'Memorama Aether',
        'intro' => 'Empareja las palabras del banco tipado.',
        'pairs' => $pairs,
    );
}

function ollama_chat($host, $model, $messages, $temperature = 0.35)
{
    $payload = array(
        'model' => $model,
        'messages' => $messages,
        'stream' => false,
        'format' => 'json',
        'options' => array(
            'temperature' => $temperature,
            'num_ctx' => 2048,
        ),
    );
    $ch = curl_init(rtrim($host, '/') . '/api/chat');
    curl_setopt_array($ch, array(
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => array('Content-Type: application/json'),
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 60,
    ));
    $raw = curl_exec($ch);
    $err = curl_error($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($raw === false) {
        return array('ok' => false, 'error' => 'Ollama no disponible', 'detail' => $err);
    }
    $data = json_decode($raw, true);
    if (!is_array($data) || $code >= 400) {
        return array('ok' => false, 'error' => 'Error de Ollama');
    }
    $content = isset($data['message']['content']) ? trim((string) $data['message']['content']) : '';
    return array('ok' => true, 'content' => $content);
}

function extract_json($text)
{
    $decoded = json_decode($text, true);
    if (is_array($decoded)) {
        return $decoded;
    }
    if (preg_match('/\{[\s\S]*\}/', $text, $m)) {
        $decoded = json_decode($m[0], true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }
    return null;
}

function schema_for($action)
{
    if ($action === 'memory') {
        return '{"title":"","intro":"","pairs":["A","B","C"]}';
    }
    if ($action === 'puzzle') {
        return '{"title":"","intro":"","sequence":[1,2,3,4],"missing_index":1,"choices":[{"label":"2","correct":true},{"label":"5","correct":false},{"label":"9","correct":false}]}';
    }
    if ($action === 'escape') {
        return '{"title":"","story":"","clue":"","choices":[{"label":"","correct":true},{"label":"","correct":false},{"label":"","correct":false}],"success":"","retry":""}';
    }
    return '{"missions":[{"title":"","meta":"","subject":"mixto"},{"title":"","meta":"","subject":"mixto"},{"title":"","meta":"","subject":"mixto"},{"title":"","meta":"","subject":"mixto"}]}';
}

function normalize_game($action, $data)
{
    if ($action === 'memory') {
        $pairs = isset($data['pairs']) && is_array($data['pairs']) ? array_values($data['pairs']) : array();
        $pairs = array_slice(array_filter(array_map('strval', $pairs)), 0, 6);
        if (count($pairs) < 2) {
            return null;
        }
        return array(
            'title' => isset($data['title']) ? (string) $data['title'] : 'Memorama',
            'intro' => isset($data['intro']) ? (string) $data['intro'] : 'Encuentra las parejas.',
            'pairs' => $pairs,
        );
    }
    if ($action === 'puzzle') {
        $seq = isset($data['sequence']) && is_array($data['sequence']) ? array_values($data['sequence']) : array();
        $choices = isset($data['choices']) && is_array($data['choices']) ? $data['choices'] : array();
        if (count($seq) < 3 || count($choices) < 2) {
            return null;
        }
        $norm = array();
        $has = false;
        foreach ($choices as $c) {
            $ok = !empty($c['correct']);
            if ($ok) {
                $has = true;
            }
            $norm[] = array('label' => (string) (isset($c['label']) ? $c['label'] : ''), 'correct' => $ok);
        }
        if (!$has) {
            $norm[0]['correct'] = true;
        }
        return array(
            'title' => isset($data['title']) ? (string) $data['title'] : 'Puzzle',
            'intro' => isset($data['intro']) ? (string) $data['intro'] : '¿Qué falta?',
            'sequence' => $seq,
            'missing_index' => isset($data['missing_index']) ? (int) $data['missing_index'] : 1,
            'choices' => $norm,
        );
    }
    if ($action === 'escape') {
        $choices = isset($data['choices']) && is_array($data['choices']) ? $data['choices'] : array();
        if (count($choices) < 2) {
            return null;
        }
        $norm = array();
        $has = false;
        foreach ($choices as $c) {
            $ok = !empty($c['correct']);
            if ($ok) {
                $has = true;
            }
            $norm[] = array('label' => (string) (isset($c['label']) ? $c['label'] : ''), 'correct' => $ok);
        }
        if (!$has) {
            $norm[0]['correct'] = true;
        }
        return array(
            'title' => isset($data['title']) ? (string) $data['title'] : 'Escape',
            'story' => isset($data['story']) ? (string) $data['story'] : '',
            'clue' => isset($data['clue']) ? (string) $data['clue'] : '',
            'choices' => $norm,
            'success' => isset($data['success']) ? (string) $data['success'] : '¡Bien!',
            'retry' => isset($data['retry']) ? (string) $data['retry'] : 'Otra vez',
        );
    }
    if ($action === 'path') {
        $missions = isset($data['missions']) && is_array($data['missions']) ? $data['missions'] : array();
        if (count($missions) < 3) {
            return null;
        }
        $out = array();
        foreach (array_slice($missions, 0, 4) as $m) {
            $out[] = array(
                'title' => isset($m['title']) ? (string) $m['title'] : 'Misión',
                'meta' => isset($m['meta']) ? (string) $m['meta'] : '',
                'subject' => isset($m['subject']) ? (string) $m['subject'] : 'mixto',
            );
        }
        return array('missions' => $out);
    }
    return null;
}

function generate_game($action, $age, $subject)
{
    global $OLLAMA, $MODEL;
    if ($action === 'memory') {
        $typed = typed_labels_for_memory($age);
        if ($typed) {
            return array('ok' => true, 'activity' => $typed, 'engine' => 'aether-catalog');
        }
    }
    if ($action === 'path' && load_aether_missions_lib()) {
        $subjects = array('lectura', 'matematicas', 'ciencias', 'mixto');
        $list = array();
        foreach ($subjects as $sub) {
            $res = fetch_aether_mission($age, $sub, false);
            if (!empty($res['ok'])) {
                $list[] = array(
                    'title' => $res['activity']['title'],
                    'meta' => $res['activity']['field'] . ' · Aether',
                    'subject' => $sub,
                );
            }
        }
        if (count($list) >= 3) {
            return array('ok' => true, 'activity' => array('missions' => array_slice($list, 0, 4)), 'engine' => 'aether-missions');
        }
    }

    $guide = $age === '4-6'
        ? 'Niños 4-6: textos cortísimos.'
        : ($age === '10-13' ? 'Pre-adolescentes 10-13: retos claros.' : 'Niños 7-9: lenguaje sencillo.');
    $system = 'Eres Aether (Didzago). Solo JSON jugable. Sin chat. Usa ideas SEP locales, sin páginas escaneadas.';
    $user = "Acción: {$action}\nEdad: {$age}\n{$guide}\nMateria: {$subject}\nEsquema: " . schema_for($action);
    $res = ollama_chat($OLLAMA, $MODEL, array(
        array('role' => 'system', 'content' => $system),
        array('role' => 'user', 'content' => $user),
    ));
    if (empty($res['ok'])) {
        return array('ok' => false, 'error' => isset($res['error']) ? $res['error'] : 'Error');
    }
    $json = extract_json($res['content']);
    if (!$json) {
        return array('ok' => false, 'error' => 'JSON inválido');
    }
    $norm = normalize_game($action, $json);
    if (!$norm) {
        return array('ok' => false, 'error' => 'Actividad incompleta');
    }
    return array('ok' => true, 'activity' => $norm, 'engine' => 'aether-ollama');
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $ollamaOk = false;
    $names = array();
    $ch = curl_init(rtrim($OLLAMA, '/') . '/api/tags');
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 4));
    $raw = curl_exec($ch);
    curl_close($ch);
    if ($raw !== false) {
        $ollamaOk = true;
        $tags = json_decode($raw, true);
        if (isset($tags['models']) && is_array($tags['models'])) {
            foreach ($tags['models'] as $m) {
                $names[] = isset($m['name']) ? $m['name'] : '';
            }
        }
    }
    $hasModel = false;
    foreach ($names as $n) {
        if ($n === $MODEL || strpos($n, $MODEL . ':') === 0) {
            $hasModel = true;
            break;
        }
    }
    $missionsOk = load_aether_missions_lib();
    respond(200, array(
        'ok' => true,
        'engine' => 'aether',
        'mode' => 'missions+games',
        'chat' => false,
        'model' => $MODEL,
        'available' => $missionsOk || ($ollamaOk && $hasModel),
        'missions' => $missionsOk,
        'ollama' => $ollamaOk,
        'actions' => $ALLOWED_ACTIONS,
    ));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, array('ok' => false, 'error' => 'Método no permitido'));
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    respond(400, array('ok' => false, 'error' => 'JSON inválido'));
}

$action = isset($input['action']) ? (string) $input['action'] : '';
$age = isset($input['age']) ? (string) $input['age'] : '7-9';
$subject = isset($input['subject']) ? (string) $input['subject'] : 'mixto';

if (!in_array($action, $ALLOWED_ACTIONS, true)) {
    respond(400, array('ok' => false, 'error' => 'Acción no válida', 'allowed' => $ALLOWED_ACTIONS));
}
if (!in_array($age, $ALLOWED_AGES, true)) {
    $age = '7-9';
}
if (!in_array($subject, $ALLOWED_SUBJECTS, true)) {
    $subject = 'mixto';
}

if ($action === 'mission') {
    try {
        $res = fetch_aether_mission($age, $subject, !empty($input['llm']));
        if (empty($res['ok'])) {
            respond(503, array('ok' => false, 'error' => isset($res['error']) ? $res['error'] : 'Sin misión'));
        }
        respond(200, array(
            'ok' => true,
            'engine' => 'aether-missions',
            'model' => $MODEL,
            'action' => $action,
            'age' => $age,
            'subject' => $subject,
            'activity' => $res['activity'],
        ));
    } catch (Throwable $e) {
        respond(500, array(
            'ok' => false,
            'error' => 'Error en misión Aether',
            'detail' => $e->getMessage(),
            'where' => $e->getFile() . ':' . $e->getLine(),
        ));
    }
}

$res = generate_game($action, $age, $subject);
if (empty($res['ok'])) {
    respond(503, array('ok' => false, 'error' => isset($res['error']) ? $res['error'] : 'Error'));
}
respond(200, array(
    'ok' => true,
    'engine' => isset($res['engine']) ? $res['engine'] : 'aether',
    'model' => $MODEL,
    'action' => $action,
    'age' => $age,
    'subject' => $subject,
    'activity' => $res['activity'],
));
