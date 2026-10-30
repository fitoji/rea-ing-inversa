# Formato `.cade` — CADe_SIMU

Estado: **parcial**. Todo lo marcado ✅ está verificado sobre `data/CADe_SIMU V4/CADe_S1`. Lo marcado ⚠️ es hipótesis sin confirmar contra el binario.

## Codificación

✅ Texto plano, codificación Latin-1 (compatible ASCII). Sin compresión ni cifrado.

## Cabecera

✅ `CADe_SIMU` seguido **inmediatamente del primer registro**, sin campo de versión.

⚠️ Corrección de una hipótesis previa: interpreté `CADe_SIMU*3*10501` como "versión 3, build 10501". **Es falso.** Comparando dos archivos:

| Archivo | Cabecera | Primer registro |
|---|---|---|
| `CADe_S1` | `CADe_SIMU` | `*3*10501` → id 3, código 10501 (configuración de hoja) |
| `arranque-paro-motor-3f.cad` | `CADe_SIMU` | `*0*2001` → id 0, código 2001 (`-KM1`) |

El campo que parecía "versión" es el **id del primer registro**. Los ids son secuenciales por archivo. No hay versión de formato declarada.

## Delimitadores

✅ Dos, con roles distintos:
- `*` separa campos numéricos.
- `#` cierra/segmenta campos con contenido textual (designadores, bornes) y separa registros.

✅ Sobre `CADe_S1`: 1829 segmentos separados por `#`.

## Registros de componente

✅ Estructura observada: un segmento de cabecera seguido de un segmento de geometría.

Ejemplo (contactor `-KM1`, tipo `2001`):

```
*5*2001#-KM1##1#3#5#2#4#6##
*1*1*1*1*1*1*0*0*39*108*0*0*-12*-3*18*15*0*0*0*1*0*4*5
```

- Cabecera: `*<id>*<tipo>#<designador>##<borne>#<borne>...#`
- Geometría: 24 campos numéricos; los primeros suelen ser flags de estado (0/1).

⚠️ Dentro de la geometría, los campos 8-9 son `x,y` y 13-16 son `offset_x, offset_y, ancho, alto`. Consistente en todas las muestras; falta confirmar semántica exacta de los flags.

## Discriminación de registros

✅ Un registro empieza en `*<id>*<código>#`, pero el mismo patrón aparece en la cola de la geometría (`...*4*5#`). Dos invariantes verificadas en las tres muestras:

1. **El primer registro empieza exactamente donde termina el magic** (prefijo de 0 bytes). Anclarlo evita que un `...*0*0#` de la geometría empate en longitud con la cadena real y se lleve el primer lugar — bug real que apareció con `ej0def.cad`, donde el primer id es 25 y la geometría termina en `*0*0#`.
2. **Los ids son estrictamente crecientes**, así que la subsecuencia creciente más larga sobre los candidatos restantes identifica los registros reales.

Implementado en `app/src/format/cade.ts`.

⚠️ Limitación conocida: en `inversion-giro-cej.cade` queda 1 registro de 161 mal delimitado (código `5`, layout de 2 campos). El inventario lo expone vía `layouts` en vez de esconderlo.

## Código 8: etiquetas de texto

✅ **Hallazgo nuevo.** El código `8` no es un componente: es una **etiqueta de texto libre**. Su contenido termina pegado al inicio del registro siguiente:

```
*48*8############ 0*0*0*...*700*-29*0#ARRANQUE Y PARO DE UN MOTOR 3F*49*8#...
```

Es la razón por la que un parser que divide por `#` falla: la frontera del registro cae **dentro** de un segmento. Obligó a cambiar el modelo de segmentos a offsets sobre el texto.

## Códigos de tipo observados

✅ Frecuencia real en `CADe_S1`:

| Código | Veces (`CADe_S1`) | Interpretación |
|---|---|---|
| 4000 | 98 | segmento de cable |
| 4001 | 27 | unión / punto de conexión |
| 4009 | 10 | cable de control |
| 4010 | 1 | cable especial |
| 7000 / 7001 | 4 / 3 | bobina / contacto auxiliar |
| 8013 / 8012 / 8000 / 8001 | 3 / 2 / 2 / 1 | llaves y selectores |
| 2001 | 2 | contacto de potencia (bornes 1-3-5 / 2-4-6) |
| 9000 / 9003 | 2 / 2 | bornes de motor |
| 6009 / 6002 | 1 / 1 | fusible |
| 3005 / 3003 | 1 / 1 | desconocido |
| 8016 | 1 | desconocido |
| 20000 | 2 | cabecera de hoja |
| 10501 | 1 | configuración de hoja (nombre, dimensiones) |

## Códigos nuevos (segundo archivo)

✅ De `arranque-paro-motor-3f.cad`, con designador asociado — evidencia empírica fuerte:

| Código | Designador | Interpretación |
|---|---|---|
| 1000 | `-M1` con bornes `U1 V1 W1 PE` | **motor trifásico** |
| 6003 | `ITM` | interruptor termomagnético |
| 6007 | `RELE` | relé térmico |
| 3005 | `-X` | bornera / borne de paso |

## Códigos nuevos (tercer archivo, `ej0def.cad`)

| Código | Designador | Interpretación |
|---|---|---|
| 4019 | (sin designador) ×8 | **variante de cable**: misma geometría `x1,y1,x2,y2` que 4000, con un flag distinto en el campo 21 |
| 6001 | `-F`, bornes `1 3 2 4` | dispositivo de 4 bornes (contacto o seccionador) |
| 8018 | `-F`, bornes `95 97 96 98` | dispositivo de 4 bornes con numeración de auxiliar |
| 8000 / 8001 | `-S`, bornes `13/14` y `11/12` | pulsadores NA / NC |

✅ Confirmado en este archivo: los designadores son **texto libre**. Aparece `KM1` sin guion y `-M` sin número, lo que rompe cualquier supuesto de etiqueta normalizada.

## Bloque de hoja

✅ `20000#XXX` + campos de texto libre con fecha (`04-Feb-2024`) y nombre de hoja (`CADe_S1`), delimitados por marcadores `$$$` y `&&&`.

## Designadores vistos

✅ `-KM1`, `-KM2`, `-F1`, `-S0`…`-S4`, `-X`, `EV1`, `EV2`, `-M1`, `-S33`, `-S44`, `RELE`, `ITM`.

⚠️ Los designadores no siempre siguen el esquema `-XX`: `RELE` e `ITM` son texto libre escrito por el usuario, no etiquetas normalizadas.

## Archivos analizados

| Archivo | Tamaño | Segmentos `#` | Registros | Origen |
|---|---|---|---|---|
| `CADe_S1` | 12,6 KB | 1829 | 161 | instalación local (inversión de giro con PLC) |
| `arranque-paro-motor-3f.cad` | 3,5 KB | 474 | 43 | repositorio CURSO-CADE-SIMU (arranque-paro 3F) |
| `ej0def.cad` | 2,5 KB | — | 31 | muestra aportada (primer id = 25) |

## Nombres de componente en el binario

✅ Extraídos por `strings` desde `CADe_SIMU.exe` (biblioteca del autor, en español):
`Contactor I/II/III/IIII`, `Disyuntor I/II/III`, `Fusible I/II/III/IIIN/IN`, `Motor cc. ex. indepen.`, `Motor cc. iman permanente`, `Motor Dahalander`, `Motor dos velocidades`, `Motor monof`, `Motor neum`, `Bobina biestable`, `Bobina monoestable`, `Final de carrera` (contraido/expandido/mitad/pinza abierta/pinza cerrada).
Recursos gráficos: `CONTACTOR_ON/OFF/SIM_*`, `DISYUNTOR_*`, variantes `_3D_`.

## Decisión de diseño

✅ El parser trata cualquier registro no reconocido como **opaco pero preservado**: se guarda su texto original y se reescribe idéntico. Esto permite abrir, editar cables y guardar sin conocer los 200 códigos.

## Geometría de bornes (derivada de los cables)

✅ El formato **no guarda** las coordenadas de los bornes, sólo sus nombres. Pero los cables sí guardan sus extremos, y esos extremos caen exactamente sobre el borde de la caja del componente:

| Componente | Caja `(x, y, w, h)` | Puntos de conexión (relativos a la caja) |
|---|---|---|
| motor `-M1` (1000) | `(30, 150, 24, 24)` | `(0,0) (6,0) (12,0) (18,0)` — borde superior |
| contactor `-KM1` (2001) | `(30, 99, 18, 15)` | `(0,0) (6,0) (12,0) (0,12)` |
| térmico `RELE` (6007) | `(30, 129, 21, 15)` | `(0,0) (6,0) (12,0) (0,12)` |
| bornera `-X` (3005) | `(30, 66, 24, 3)` | `(0,0) (6,0) (12,0) (18,0)` — borde superior |
| pulsador `STAR` (8000) | `(162, 108, 6, 15)` | `(0,0) (0,12)` — borde izquierdo |
| bobina `-KM1` (7000) | `(183, 108, 6, 15)` | `(0,0) (0,12)` — borde izquierdo |

Conclusión: los bornes viven en una grilla de **6 unidades** sobre el borde de la caja. Dispositivos de varios bornes los alinean sobre el borde superior; los de dos bornes, sobre el borde izquierdo separados 12.

⚠️ Esto se observa en un solo esquema (ascendente, en escalera). Falta confirmarlo con archivos de otra disposición antes de tratarlo como regla universal. Mientras tanto, la app dibuja **los pines que el archivo evidencia**, no una geometría supuesta: sin cables, no hay pines.

## Cola de geometría que imita una cabecera

⚠️ El registro del motor termina en `...*0*1*0*15*16#`. Esa cola calza con el patrón `*<id>*<código>#` (id 15, código 16). Sólo el orden global de ids desambigua. Consecuencia para el editor: al reconstruir un registro suelto hay que modelar el **raw completo**, no el primer candidato que devuelve el parser.
