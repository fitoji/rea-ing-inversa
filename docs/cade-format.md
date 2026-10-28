# Formato `.cade` — CADe_SIMU

Estado: **parcial**. Todo lo marcado ✅ está verificado sobre `data/CADe_SIMU V4/CADe_S1`. Lo marcado ⚠️ es hipótesis sin confirmar contra el binario.

## Codificación

✅ Texto plano, codificación Latin-1 (compatible ASCII). Sin compresión ni cifrado.

## Cabecera

✅ `CADe_SIMU*3*10501`
- campo 0: magic `CADe_SIMU`
- campo 1: versión de formato (`3`)
- campo 2: build (`10501`)

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

## Códigos de tipo observados

✅ Frecuencia real en `CADe_S1`:

| Código | Veces | ⚠️ Interpretación |
|---|---|---|
| 4000 | 98 | segmento de cable |
| 4001 | 27 | unión / punto de conexión |
| 4009 | 10 | cable de control |
| 4010 | 1 | cable especial |
| 7000 / 7001 | 4 / 3 | bobina / contacto auxiliar |
| 8013 / 8012 / 8000 / 8001 | 3 / 2 / 2 / 1 | llaves y selectores |
| 2001 | 2 | contacto de potencia |
| 9000 / 9003 | 2 / 2 | bornes de motor |
| 6009 / 6002 | 1 / 1 | fusible |
| 3005 / 3003 | 1 / 1 | desconocido |
| 8016 | 1 | desconocido |
| 20000 | 2 | cabecera de hoja |

⚠️ La columna de interpretación es inferencia por coherencia geométrica y designadores. **No confirmada** contra el binario.

## Bloque de hoja

✅ `20000#XXX` + campos de texto libre con fecha (`04-Feb-2024`) y nombre de hoja (`CADe_S1`), delimitados por marcadores `$$$` y `&&&`.

## Designadores vistos

✅ `-KM1`, `-KM2`, `-F1`, `-S0`…`-S4`, `-X`, `EV1`, `EV2`, `-M1`, `-S33`, `-S44`.

## Nombres de componente en el binario

✅ Extraídos por `strings` desde `CADe_SIMU.exe` (biblioteca del autor, en español):
`Contactor I/II/III/IIII`, `Disyuntor I/II/III`, `Fusible I/II/III/IIIN/IN`, `Motor cc. ex. indepen.`, `Motor cc. iman permanente`, `Motor Dahalander`, `Motor dos velocidades`, `Motor monof`, `Motor neum`, `Bobina biestable`, `Bobina monoestable`, `Final de carrera` (contraido/expandido/mitad/pinza abierta/pinza cerrada).
Recursos gráficos: `CONTACTOR_ON/OFF/SIM_*`, `DISYUNTOR_*`, variantes `_3D_`.

## Decisión de diseño

✅ El parser trata cualquier registro no reconocido como **opaco pero preservado**: se guarda su texto original y se reescribe idéntico. Esto permite abrir, editar cables y guardar sin conocer los 200 códigos.
