# Indicaciones para integrar Aether en otras apps

**Fecha:** viernes 18 de septiembre de 2026  
**Proyecto Aether:** `c:\xampp\htdocs\aether`  
**URL local típica:** `http://localhost/aether`  
**Manifiesto en vivo:** `GET /api/integrate.php`  
**SDK:** carpeta `sdk/` (JS, Python, PHP)

---

## 1. Qué es Aether (para integradores)

Aether es un **servicio educativo local** (sin internet obligatorio) que ofrece:

1. **Chat** con el agente pedagógico (Ollama + modelo `aether`)
2. **Misiones** por nivel escolar (preescolar / primaria / secundaria) alineadas a SEP–NEM
3. **Catálogo de imágenes tipadas** (`animal-`, `letra-`, `fruta-`, `verdura-`, `numero-`)
4. **Índice de libros SEP/CONALITEG** (texto/conceptos; **no** páginas escaneadas al niño)
5. **PDFs / recursos** en `base/archivos`

Tu app **no necesita** reimplementar la pedagogía: consume la API o el SDK y renderiza la UI.

---

## 2. Requisitos previos

| Componente | Estado esperado |
|------------|-----------------|
| XAMPP (Apache + PHP) | Sirviendo `htdocs/aether` |
| Ollama en `127.0.0.1:11434` | Modelo `aether` (o `aether:latest`) para chat |
| CORS | La API ya envía `Access-Control-Allow-Origin: *` |

Comprobar salud:

```http
GET http://localhost/aether/api/health.php
```

Respuesta útil: `ollama: true`, lista de `models`, versión de `php`.

Descubrir capacidades:

```http
GET http://localhost/aether/api/integrate.php
```

---

## 3. Niveles escolares (obligatorio enviarlos bien)

| `nivel` | `grade` válidos | Notas |
|---------|-----------------|-------|
| `preescolar` | 1–3 | Lección **visual y muy descriptiva** + imagen obligatoria |
| `primaria` | 1–6 | Grados **1–2** = mismo modo visual/descriptivo |
| `secundaria` | 1–3 | Lenguaje más avanzado |

**Regla young visual:**  
`preescolar` **O** (`primaria` **Y** `grade <= 2`) → textos largos/descriptivos + `visual_lesson: true` + imagen tipada.

Campos NEM (usar como `field` en misiones):

- `Lenguajes`
- `Saberes y pensamiento científico`
- `Ética, naturaleza y sociedades`
- `De lo humano y lo comunitario`

---

## 4. Endpoints que debe usar tu app

Base: `http://localhost/aether/api`

| ID | Método | Ruta | Para qué |
|----|--------|------|----------|
| health | GET | `/health.php` | Ping / diagnóstico |
| integrate | GET | `/integrate.php` | Manifiesto de integración |
| chat | POST | `/chat.php` | Conversación con el agente |
| missions | GET | `/missions.php?nivel=&grade=&field=` | Banco de misiones |
| mission_fresh | POST | `/missions.php` | Generar misión nueva |
| activities | POST | `/activities.php` | Actividades rápidas |
| catalog | GET | `/catalog.php?kind=&typed=1` | Imágenes tipadas |
| image | GET | `/image.php?ref=animal-gato` | Resolver una imagen |
| sep | GET | `/sep.php?nivel=&grade=&mode=hint` | Libros / hint curricular |
| archivos | GET | `/archivos.php` | PDFs locales |

### 4.1 Chat

```http
POST /api/chat.php
Content-Type: application/json

{
  "messages": [
    { "role": "system", "content": "NIVEL: Preescolar 1°. Sé descriptivo e incluye [IMAGEN_BASE:…]." },
    { "role": "user", "content": "Enséñame la letra A" }
  ]
}
```

La respuesta de Ollama trae el texto en `message.content`.  
Tu app debe:

1. Mostrar el texto al niño  
2. Extraer `[IMAGEN_BASE:etiqueta]` y mostrar la imagen tipada (nunca un escaneo de libro)

### 4.2 Misión fresca

```http
POST /api/missions.php
Content-Type: application/json

{
  "nivel": "preescolar",
  "grade": 1,
  "field": "Lenguajes",
  "fresh": true,
  "llm": false
}
```

Respuesta: `{ "missions": [ { "title", "nivel", "grade", "rounds": [ ... ] } ] }`

Cada ronda incluye (aprox.):

- `concept_title`, `concept_text` — lección / explicación  
- `file` / `url` — imagen tipada  
- `question`, `options`, `answer`  
- `explainCorrect`, `explainWrong`  
- `visual_lesson`, `require_image`, `bibliography` / `sep_book`  
- `show_book_scan` — **siempre false** en UI infantil; si viene un path con `libros/`, **no lo muestres**

### 4.3 Catálogo e imagen

```http
GET /api/catalog.php?typed=1&kind=animal
GET /api/image.php?ref=letra-a
```

URL de asset (ejemplo):

`http://localhost/aether/base/imagenes/animal-gato.jpg`

---

## 5. Cómo integrar con el SDK (recomendado)

### JavaScript / Web / híbridas

```js
import { createAetherClient } from 'http://localhost/aether/sdk/aether-client.js';

const aether = createAetherClient({ baseUrl: 'http://localhost/aether' });

await aether.health();

const { content } = await aether.ask('Muéstrame un gato', {
  nivel: 'preescolar',
  grade: 1,
});

const mission = await aether.createMission({
  nivel: 'primaria',
  grade: 2,
  field: 'Lenguajes',
});

// Cola lista para tu UI: concepto + imagen + pregunta + opciones
const queue = aether.missionToQueue(mission);
```

Archivo: `sdk/aether-client.js`  
Demo: `http://localhost/aether/sdk/example.html`

### Python

```python
from aether_client import AetherClient  # sdk/aether_client.py

client = AetherClient("http://localhost/aether")
reply = client.ask("Cuenta hasta 3", nivel="primaria", grade=1)
mission = client.create_mission(nivel="preescolar", grade=1, field="Lenguajes")
queue = client.mission_to_queue(mission)
```

### PHP

```php
require_once 'sdk/AetherClient.php';

$aether = new AetherClient('http://localhost/aether');
$hi = $aether->ask('Hola', ['nivel' => 'preescolar', 'grade' => 1]);
$mission = $aether->createMission(['nivel' => 'primaria', 'grade' => 2, 'field' => 'Lenguajes']);
$queue = $aether->missionToQueue($mission);
```

---

## 6. Flujo recomendado en tu app

```
1. Arranque
   └─ GET health → si ollama=false, desactiva chat o avisa

2. Perfil del alumno
   └─ Guardar nivel + grade (ej. preescolar-2, primaria-1)

3. Pantalla de misión / juego
   └─ POST missions (fresh) o GET missions (banco)
   └─ missionToQueue → mostrar concepto CON imagen → preguntar → feedback

4. Pantalla de chat / tutor
   └─ ask(texto, { nivel, grade })
   └─ parseImageTags → resolveImage / assetUrl → pintar <img>

5. Recursos
   └─ getSep / getArchivos solo como apoyo adulto o bibliografía (título), no como quiz de página
```

---

## 7. Reglas pedagógicas que tu app DEBE respetar

Estas reglas ya las aplica Aether al generar contenido; tu UI no debe romperlas:

1. **No mostrar escaneos** de `base/imagenes/libros/` al niño.  
2. **Sí mostrar** imágenes tipadas: `animal-`, `fruta-`, `verdura-`, `letra-`, `numero-`.  
3. Mostrar **bibliografía** (título SEP) como texto, no como respuesta de quiz.  
4. En preescolar y primaria 1–2: lección **descriptiva** + imagen grande/clara.  
5. **Prohibido** en chat infantil pedir internet o usar `[GENERAR_IMAGEN]`.  
6. **Prohibido** quizzes tipo “¿De qué habla esta idea?” con solo nombres de campo NEM.  
7. Prácticas = comprensión / identificación / conteo / lectura, no memorizar títulos de página.

Tags válidos en texto del agente:

```text
[IMAGEN_BASE:animal-gato]
[IMAGEN_BASE:letra-a]
[IMAGEN_BASE:numero-tres]
[IMAGEN_BASE:fruta-manzana]
[IMAGEN_BASE:verdura-zanahoria]
```

---

## 8. Contrato de datos (cola de práctica)

`missionToQueue(mission)` (JS/Python/PHP) produce elementos así:

```json
{
  "type": "practice",
  "concept": {
    "title": "¡Mira la letra A!",
    "text": "Mira bien la imagen…",
    "src": "http://localhost/aether/base/imagenes/letra-a.png",
    "label": "A",
    "visualLesson": true,
    "bibliography": "Título del libro SEP"
  },
  "question": "Observa la imagen. ¿Qué letra grande estás viendo?",
  "options": ["A", "B", "C", "D"],
  "answer": "A",
  "explainCorrect": "¡Sí! …",
  "explainWrong": "Mira otra vez…"
}
```

Tu app solo necesita:

1. Pantalla de **concepto** (título + texto + imagen)  
2. Pantalla de **práctica** (pregunta + opciones)  
3. **Feedback** con `explainCorrect` / `explainWrong`

---

## 9. Configuración en apps externas (Didzago u otras)

Define en tu app una variable de entorno o config:

```text
AETHER_BASE_URL=http://localhost/aether
```

En producción en la misma máquina / red local:

```text
AETHER_BASE_URL=http://192.168.x.x/aether
```

Checklist de integración:

- [ ] `GET /api/health.php` responde OK  
- [ ] Se envía siempre `nivel` + `grade`  
- [ ] Chat o misiones muestran imágenes tipadas  
- [ ] No se renderizan paths con `libros/`  
- [ ] Preescolar / primaria 1–2 usan textos descriptivos (no recortarlos a 1 frase)  
- [ ] Bibliografía visible como metadato, no como opción de respuesta  
- [ ] (Opcional) TTS / accesibilidad sobre `concept.text` y `question`

---

## 10. Errores frecuentes

| Síntoma | Causa probable | Qué hacer |
|---------|----------------|-----------|
| Chat 502 | Ollama apagado o sin modelo `aether` | Encender Ollama; `ollama run aether` / crear desde Modelfile |
| Misión sin imagen | Path de libro filtrado o catálogo vacío | Pedir `fresh` + verificar `catalog.php?typed=1` |
| CORS en navegador | Orígenes raros / proxy | Usar misma máquina o proxy; API ya permite `*` |
| Textos cortos en kínder | Tu app recorta el texto | No truncar si `visual_lesson` / `youngVisual` |
| Imagen rota | URL sin `base/imagenes/` | Usar `assetUrl()` del SDK o `image.php?ref=` |

---

## 11. Archivos de referencia en el repo

| Archivo | Contenido |
|---------|-----------|
| `docs/indicaciones-integracion-aether.md` | Este documento |
| `docs/indicaciones-2026-09-18.md` | Reglas pedagógicas de contenido |
| `sdk/README.md` | Resumen rápido del SDK |
| `sdk/aether-client.js` | Cliente web |
| `sdk/aether_client.py` | Cliente Python |
| `sdk/AetherClient.php` | Cliente PHP |
| `sdk/example.html` | Demo de integración |
| `api/integrate.php` | Manifiesto JSON |

---

## 12. Contacto técnico (operación local)

1. Abrir XAMPP → Start Apache  
2. Abrir Ollama  
3. Probar: `http://localhost/aether/sdk/example.html`  
4. Desde tu app: apuntar `baseUrl` a Aether y llamar `createMission` / `ask`

Con eso cualquier app puede integrar Aether como **motor pedagógico + banco de misiones + chat local**.
