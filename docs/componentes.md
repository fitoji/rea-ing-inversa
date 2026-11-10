# Componentes

Catálogo de componentes eléctricos que ofrece la paleta del editor: cómo se dibuja cada uno, qué código tiene, cómo se llama y qué bornes expone.

## De dónde sale esto

- **Los dibujos** salen del mismo `shapes(w, h)` que usa el lienzo (`app/src/symbols/families.ts`) y se escriben como SVG sueltos en `docs/img/componentes/`. Si cambia el símbolo en la app, cambia la miniatura.
- **Los códigos y nombres** vienen de `app/src/symbols/catalog.ts`, generado desde el menú real del binario CADe_SIMU con `pnpm catalog` (`app/scripts/make-catalog.ts`). No están adivinados por rango numérico.
- **Los grupos y los nombres de familia** son los de la paleta (`app/src/ui/Palette.tsx`).
- **Los bornes** son una convención IEC elegida al dibujar cada símbolo, no un dato que venga en el archivo: el formato los guarda por registro y acá se listan los que la app asigna por defecto. En la miniatura se ven como círculos.

Totales: **270 códigos** en el catálogo generado, **235 componentes dibujados**, **47 códigos del catálogo caen al fallback** (un rectángulo con el código adentro).

Hay **3 componentes dibujados que no figuran en el catálogo**: `8016` (Lámpara de señalización), `8017` (Contacto del térmico), `8018` (Contacto auxiliar NC doble). No salen del menú del CAD pero aparecen en archivos reales, así que su plantilla se generó desde los fixtures y el dibujo se escribió a mano. Por eso no tienen designador de catálogo.

El designador de la tabla es el prefijo con el que el CAD nombra el componente nuevo (`-M`, `-Q`…); `—` significa que el catálogo no lo define.

De los 270 códigos, **125 no traen designador** en el catálogo: el menú del CAD no sugiere prefijo para esos componentes (alimentaciones, sensores y varios más).

## Convención de bornes

- **Aparatos de potencia:** 1-3-5 arriba, 2-4-6 abajo.
- **Contactos auxiliares:** 11-12 (NC), 13-14 (NA), 11-12-14 (conmutado).
- **Bobinas y temporizadores:** A1-A2.
- **Sensores de 2 hilos:** 1-2; de 3 hilos: `+`, `O`, `-`.

## Alimentación (15)

| Dibujo | Código | Nombre | Designador | Bornes |
| --- | --- | --- | --- | --- |
| ![Alimentación L](img/componentes/3000.svg) | `3000` | Alimentación L | — | — |
| ![Alimentación N](img/componentes/3001.svg) | `3001` | Alimentación N | — | — |
| ![Alimentación PE](img/componentes/3002.svg) | `3002` | Alimentación PE | — | PE |
| ![Alimentación L N](img/componentes/3003.svg) | `3003` | Alimentación L N | — | — |
| ![Alimentación L1 L2 L3](img/componentes/3004.svg) | `3004` | Alimentación L1 L2 L3 | — | L1 · L2 · L3 |
| ![Alimentación L1 L2 L3 PE](img/componentes/3005.svg) | `3005` | Alimentación L1 L2 L3 PE | — | — |
| ![Alimentación L1 L2 L3 N](img/componentes/3006.svg) | `3006` | Alimentación L1 L2 L3 N | — | L1 · L2 · L3 · N |
| ![Alimentación L1 L2 L3 N PE](img/componentes/3007.svg) | `3007` | Alimentación L1 L2 L3 N PE | — | L1 · L2 · L3 · N · PE |
| ![Alimentación +](img/componentes/3008.svg) | `3008` | Alimentación + | — | + |
| ![Alimentación -](img/componentes/3009.svg) | `3009` | Alimentación - | — | — |
| ![Alimentación + -](img/componentes/3010.svg) | `3010` | Alimentación + - | — | + · - |
| ![Alimentación L N PE](img/componentes/3011.svg) | `3011` | Alimentación L N PE | — | — |
| ![Transformador](img/componentes/3012.svg) | `3012` | Transformador | `-T` | U1 · V1 · W1 · U2 · V2 · W2 |
| ![Rectificador](img/componentes/3013.svg) | `3013` | Rectificador | `-V` | ~ · ~ · + · - |
| ![Fuente de alimentacióm](img/componentes/3014.svg) | `3014` | Fuente de alimentacióm | `-V` | L · N · + · - |

## Motores (9)

| Dibujo | Código | Nombre | Designador | Bornes |
| --- | --- | --- | --- | --- |
| ![Motor trifásico](img/componentes/1000.svg) | `1000` | Motor trifásico | `-M` | U1 · V1 · W1 · PE |
| ![Motor trifásico YD](img/componentes/1001.svg) | `1001` | Motor trifásico YD | `-M` | U1 · V1 · W1 · U2 · V2 · W2 |
| ![Motor monofásico](img/componentes/1002.svg) | `1002` | Motor monofásico | `-M` | U1 · U2 |
| ![Motor Dahlander](img/componentes/1003.svg) | `1003` | Motor Dahlander | `-M` | U1 · V1 · W1 · U2 · V2 · W2 |
| ![Motor rotor bobinado](img/componentes/1004.svg) | `1004` | Motor rotor bobinado | `-M` | U1 · V1 · W1 · K · L · M |
| ![Motor dos velocidades](img/componentes/1005.svg) | `1005` | Motor dos velocidades | `-M` | U1 · V1 · W1 · U2 · V2 · W2 |
| ![Motor cc. iman permanente](img/componentes/1006.svg) | `1006` | Motor cc. iman permanente | `-M` | A1 · A2 |
| ![Motor cc. ex. indepen.](img/componentes/1007.svg) | `1007` | Motor cc. ex. indepen. | `-M` | A1 · A2 · E1 · E2 |
| ![Motor trifásico como monofásico](img/componentes/1010.svg) | `1010` | Motor trifásico como monofásico | `-M` | L · N |

## Potencia (15)

| Dibujo | Código | Nombre | Designador | Bornes |
| --- | --- | --- | --- | --- |
| ![Resistencia I](img/componentes/1050.svg) | `1050` | Resistencia I | `-R` | 1 · 2 |
| ![Resistencia III](img/componentes/1051.svg) | `1051` | Resistencia III | `-R` | 1 · 2 · 3 · 4 · 5 · 6 |
| ![Autotransformador III](img/componentes/1052.svg) | `1052` | Autotransformador III | `-T` | U1 · V1 · W1 · U2 · V2 · W2 |
| ![Arrancador electrónico](img/componentes/1053.svg) | `1053` | Arrancador electrónico | `-G` | 1 · 2 · 3 · 4 · 5 · 6 |
| ![Variador velocidad ca II.](img/componentes/1054.svg) | `1054` | Variador velocidad ca II. | `-G` | 1 · 2 · 3 · 4 |
| ![Variador velocidad ca III.](img/componentes/1055.svg) | `1055` | Variador velocidad ca III. | `-G` | 1 · 2 · 3 · 4 · 5 · 6 |
| ![Variador velocidad cc.](img/componentes/1057.svg) | `1057` | Variador velocidad cc. | `-G` | L+ · L- · M+ · M- |
| ![Variador velocidad cc.](img/componentes/1058.svg) | `1058` | Variador velocidad cc. | `-G` | L+ · L- · M+ · M- |
| ![Relé 1 canal](img/componentes/1076.svg) | `1076` | Relé 1 canal | `-K` | A1 · A2 · 11 · 14 |
| ![Contactor II](img/componentes/2000.svg) | `2000` | Contactor II | `-KM` | 1 · 2 · 3 · 4 |
| ![Contactor III](img/componentes/2001.svg) | `2001` | Contactor III | `-KM` | 1 · 3 · 5 · 2 · 4 · 6 |
| ![Interruptor II](img/componentes/2003.svg) | `2003` | Interruptor II | `-S` | 1 · 2 · 3 · 4 |
| ![Interruptor III](img/componentes/2004.svg) | `2004` | Interruptor III | `-S` | 1 · 2 · 3 · 4 · 5 · 6 |
| ![Contactor I](img/componentes/2006.svg) | `2006` | Contactor I | `-KM` | 1 · 2 |
| ![Interruptor I](img/componentes/2007.svg) | `2007` | Interruptor I | `-S` | 1 · 2 |

## Protección (33)

| Dibujo | Código | Nombre | Designador | Bornes |
| --- | --- | --- | --- | --- |
| ![Fusible I](img/componentes/5000.svg) | `5000` | Fusible I | `-F` | 1 · 2 |
| ![Fusible IN](img/componentes/5001.svg) | `5001` | Fusible IN | `-F` | 1 · 2 · 3 · 4 |
| ![Fusible II](img/componentes/5002.svg) | `5002` | Fusible II | `-F` | 1 · 2 · 3 · 4 |
| ![Fusible III](img/componentes/5003.svg) | `5003` | Fusible III | `-F` | 1 · 2 · 3 · 4 · 5 · 6 |
| ![Seccionador I](img/componentes/5005.svg) | `5005` | Seccionador I | `-F` | 1 · 2 |
| ![Seccionador IN](img/componentes/5006.svg) | `5006` | Seccionador IN | `-F` | 1 · 2 · 3 · 4 |
| ![Seccionador II](img/componentes/5007.svg) | `5007` | Seccionador II | `-F` | 1 · 2 · 3 · 4 |
| ![Seccionador III](img/componentes/5008.svg) | `5008` | Seccionador III | `-F` | 1 · 2 · 3 · 4 · 5 · 6 |
| ![Automático I](img/componentes/6000.svg) | `6000` | Automático I | `-F` | 1 · 2 |
| ![Automático I](img/componentes/6000.svg) | `6000` | Automático I | `-F` | 1 · 2 |
| ![Automático IN](img/componentes/6001.svg) | `6001` | Automático IN | `-F` | 1 · 3 · 2 · 4 |
| ![Automático IN](img/componentes/6001.svg) | `6001` | Automático IN | `-F` | 1 · 3 · 2 · 4 |
| ![Automático II](img/componentes/6002.svg) | `6002` | Automático II | `-F` | 1 · 3 · 2 · 4 |
| ![Automático II](img/componentes/6002.svg) | `6002` | Automático II | `-F` | 1 · 3 · 2 · 4 |
| ![Automático III](img/componentes/6003.svg) | `6003` | Automático III | `-F` | 1 · 3 · 5 · 2 · 4 · 6 |
| ![Automático III](img/componentes/6003.svg) | `6003` | Automático III | `-F` | 1 · 3 · 5 · 2 · 4 · 6 |
| ![Automático IIIN](img/componentes/6004.svg) | `6004` | Automático IIIN | `-F` | 1 · 3 · 5 · 2 · 4 · 6 |
| ![Diferencial IN](img/componentes/6005.svg) | `6005` | Diferencial IN | `-F` | 1 · 3 · 2 · 4 |
| ![Diferencial IIIN](img/componentes/6006.svg) | `6006` | Diferencial IIIN | `-F` | 1 · 3 · 5 · 2 · 4 · 6 |
| ![Relé térmico](img/componentes/6007.svg) | `6007` | Relé térmico | `-F` | 1 · 3 · 5 · 2 · 4 · 6 |
| ![Relé térmico](img/componentes/6007.svg) | `6007` | Relé térmico | `-F` | 1 · 3 · 5 · 2 · 4 · 6 |
| ![Disyuntor II](img/componentes/6008.svg) | `6008` | Disyuntor II | `-Q` | 1 · 3 · 2 · 4 |
| ![Disyuntor II](img/componentes/6008.svg) | `6008` | Disyuntor II | `-Q` | 1 · 3 · 2 · 4 |
| ![Disyuntor III](img/componentes/6009.svg) | `6009` | Disyuntor III | `-Q` | 1 · 3 · 5 · 2 · 4 · 6 |
| ![Disyuntor III](img/componentes/6009.svg) | `6009` | Disyuntor III | `-Q` | 1 · 3 · 5 · 2 · 4 · 6 |
| ![Disyuntor I](img/componentes/6010.svg) | `6010` | Disyuntor I | `-Q` | 1 · 2 |
| ![Disyuntor I](img/componentes/6010.svg) | `6010` | Disyuntor I | `-Q` | 1 · 2 |
| ![Contactor](img/componentes/6015.svg) | `6015` | Contactor | `-Q` | 1 · 2 · 3 · 4 · 5 · 6 |
| ![Relé térmico](img/componentes/6016.svg) | `6016` | Relé térmico | `-F` | 1 · 2 · 3 · 4 · 5 · 6 |
| ![Interruptor automático](img/componentes/6017.svg) | `6017` | Interruptor automático | `-F` | 1 · 2 |
| ![Interruptor diferencial](img/componentes/6018.svg) | `6018` | Interruptor diferencial | `-F` | 1 · 2 · 3 · 4 |
| ![Interruptor](img/componentes/6019.svg) | `6019` | Interruptor | `-S` | 1 · 2 |
| ![Interruptor](img/componentes/6020.svg) | `6020` | Interruptor | `-S` | 1 · 2 |

## Mando (48)

| Dibujo | Código | Nombre | Designador | Bornes |
| --- | --- | --- | --- | --- |
| ![Contacto auxiliar NA](img/componentes/7000.svg) | `7000` | Contacto auxiliar NA | `-K` | 13 · 14 |
| ![Contacto auxiliar NC](img/componentes/7001.svg) | `7001` | Contacto auxiliar NC | `-K` | 11 · 12 |
| ![Contacto auxiliar NA-NC](img/componentes/7002.svg) | `7002` | Contacto auxiliar NA-NC | `-K` | 13 · 11 · 14 · 12 |
| ![Contacto auxiliar conmutado](img/componentes/7003.svg) | `7003` | Contacto auxiliar conmutado | `-K` | 11 · 12 · 14 |
| ![Contacto temporizador conexión NA](img/componentes/7004.svg) | `7004` | Contacto temporizador conexión NA | `-KA` | 13 · 14 |
| ![Contacto temporizador conexión NC](img/componentes/7005.svg) | `7005` | Contacto temporizador conexión NC | `-KA` | 11 · 12 |
| ![Contacto temporizador conexión NA-NC](img/componentes/7006.svg) | `7006` | Contacto temporizador conexión NA-NC | `-KA` | 13 · 11 · 14 · 12 |
| ![Contacto temporizador conexión conmutado](img/componentes/7007.svg) | `7007` | Contacto temporizador conexión conmutado | `-KA` | 11 · 12 · 14 |
| ![Contacto temporizador desconexión NA](img/componentes/7008.svg) | `7008` | Contacto temporizador desconexión NA | `-KA` | 13 · 14 |
| ![Contacto temporizador desconexión NC](img/componentes/7009.svg) | `7009` | Contacto temporizador desconexión NC | `-KA` | 11 · 12 |
| ![Contacto temporizador desconexión NA-NC](img/componentes/7010.svg) | `7010` | Contacto temporizador desconexión NA-NC | `-KA` | 13 · 11 · 14 · 12 |
| ![Contacto temporizador desconexión conmutado](img/componentes/7011.svg) | `7011` | Contacto temporizador desconexión conmutado | `-KA` | 11 · 12 · 14 |
| ![Contacto temporizador conexión desconexión NA](img/componentes/7012.svg) | `7012` | Contacto temporizador conexión desconexión NA | `-KA` | 13 · 14 |
| ![Contacto temporizador conexión desconexión NC](img/componentes/7013.svg) | `7013` | Contacto temporizador conexión desconexión NC | `-KA` | 11 · 12 |
| ![Contacto temporizador conexión desconexión NA-NC](img/componentes/7014.svg) | `7014` | Contacto temporizador conexión desconexión NA-NC | `-KA` | 13 · 11 · 14 · 12 |
| ![Contacto temporizador conexión desconexión conmutado](img/componentes/7015.svg) | `7015` | Contacto temporizador conexión desconexión conmutado | `-KA` | 11 · 12 · 14 |
| ![Rele](img/componentes/7016.svg) | `7016` | Rele | `-KA` | A1 · A2 |
| ![Contactor](img/componentes/7018.svg) | `7018` | Contactor | `-KM` | A1 · A2 |
| ![Contactos auxiliares](img/componentes/7019.svg) | `7019` | Contactos auxiliares | `-KM` | 13 · 11 · 14 · 12 |
| ![Contactos ON Delay](img/componentes/7020.svg) | `7020` | Contactos ON Delay | `-KM` | 13 · 14 |
| ![Contactos OFF Delay](img/componentes/7021.svg) | `7021` | Contactos OFF Delay | `-KM` | 13 · 14 |
| ![Contacto pulsador NA](img/componentes/8000.svg) | `8000` | Contacto pulsador NA | `-S` | 13 · 14 |
| ![Contacto pulsador NC](img/componentes/8001.svg) | `8001` | Contacto pulsador NC | `-S` | 11 · 12 |
| ![Contacto final de carrera NA](img/componentes/8012.svg) | `8012` | Contacto final de carrera NA | `-S` | 13 · 14 |
| ![Contacto final de carrera NC](img/componentes/8013.svg) | `8013` | Contacto final de carrera NC | `-S` | 11 · 12 |
| ![Lámpara de señalización](img/componentes/8016.svg) | `8016` | Lámpara de señalización | — | 97 · 98 |
| ![Contacto del térmico](img/componentes/8017.svg) | `8017` | Contacto del térmico | — | 95 · 96 |
| ![Contacto auxiliar NC doble](img/componentes/8018.svg) | `8018` | Contacto auxiliar NC doble | — | 95 · 97 · 96 · 98 |
| ![Bobina monoestable](img/componentes/9000.svg) | `9000` | Bobina monoestable | `-EV` | A1 · A2 |
| ![Bobina biestable](img/componentes/9001.svg) | `9001` | Bobina biestable | `-EV` | A1 · A2 |
| ![Telerruptor](img/componentes/9002.svg) | `9002` | Telerruptor | `-EV` | A1 · A2 · 1 · 2 |
| ![Electroválvula](img/componentes/9003.svg) | `9003` | Electroválvula | `-EV` | A1 · A2 |
| ![Temporizador a la conexión](img/componentes/9004.svg) | `9004` | Temporizador a la conexión | `-K` | A1 · A2 |
| ![Temporizador a la desconexión](img/componentes/9005.svg) | `9005` | Temporizador a la desconexión | — | A1 · A2 |
| ![Temporizador a la conexión desconexión](img/componentes/9006.svg) | `9006` | Temporizador a la conexión desconexión | — | A1 · A2 |
| ![Temporizador intermitente](img/componentes/9007.svg) | `9007` | Temporizador intermitente | `-K` | A1 · A2 |
| ![Contacto NA](img/componentes/10050.svg) | `10050` | Contacto NA | `-U` | 13 · 14 |
| ![Contacto NC](img/componentes/10051.svg) | `10051` | Contacto NC | — | 11 · 12 |
| ![Actuador de simple efecto](img/componentes/10500.svg) | `10500` | Actuador de simple efecto | `-A` | A |
| ![Actuador sin vástago](img/componentes/10502.svg) | `10502` | Actuador sin vástago | `-A` | A |
| ![Actuador sin vástago magnético](img/componentes/10503.svg) | `10503` | Actuador sin vástago magnético | `-A` | A |
| ![Actuador de doble efecto](img/componentes/10504.svg) | `10504` | Actuador de doble efecto | `-A` | A · B |
| ![Pinza neumática simple efecto](img/componentes/10505.svg) | `10505` | Pinza neumática simple efecto | `-A` | A |
| ![Pinza neumática](img/componentes/10506.svg) | `10506` | Pinza neumática | `-A` | A · B |
| ![Ventosa](img/componentes/10507.svg) | `10507` | Ventosa | `-V` | A |
| ![Motor neumático](img/componentes/10508.svg) | `10508` | Motor neumático | `-M` | A |
| ![Motor neumático reversible](img/componentes/10509.svg) | `10509` | Motor neumático reversible | `-M` | A · B |
| ![Actuador lineal eléctrico](img/componentes/10550.svg) | `10550` | Actuador lineal eléctrico | `-M` | A |

## Señalización y pulsadores (22)

| Dibujo | Código | Nombre | Designador | Bornes |
| --- | --- | --- | --- | --- |
| ![Contacto pulsador NA-NC](img/componentes/8002.svg) | `8002` | Contacto pulsador NA-NC | `-S` | 13 · 11 · 14 · 12 |
| ![Contacto pulsador conmutado](img/componentes/8003.svg) | `8003` | Contacto pulsador conmutado | `-S` | 11 · 12 · 14 |
| ![Contacto pulsador seta NA](img/componentes/8004.svg) | `8004` | Contacto pulsador seta NA | `-S` | 13 · 14 |
| ![Contacto pulsador seta NC](img/componentes/8005.svg) | `8005` | Contacto pulsador seta NC | `-S` | 11 · 12 |
| ![Contacto pulsador seta NA-NC](img/componentes/8006.svg) | `8006` | Contacto pulsador seta NA-NC | `-S` | 13 · 11 · 14 · 12 |
| ![Contacto pulsador seta conmutado](img/componentes/8007.svg) | `8007` | Contacto pulsador seta conmutado | `-S` | 11 · 12 · 14 |
| ![Contacto interruptor NA](img/componentes/8008.svg) | `8008` | Contacto interruptor NA | `-S` | 13 · 14 |
| ![Contacto interruptor NC](img/componentes/8009.svg) | `8009` | Contacto interruptor NC | `-S` | 11 · 12 |
| ![Contacto interruptor NA-NC](img/componentes/8010.svg) | `8010` | Contacto interruptor NA-NC | `-S` | 13 · 11 · 14 · 12 |
| ![Contacto interruptor conmutado](img/componentes/8011.svg) | `8011` | Contacto interruptor conmutado | `-S` | 11 · 12 · 14 |
| ![Contacto final de carrera NA-NC](img/componentes/8014.svg) | `8014` | Contacto final de carrera NA-NC | `-S` | 13 · 11 · 14 · 12 |
| ![Contacto final de carrera conmutado](img/componentes/8015.svg) | `8015` | Contacto final de carrera conmutado | `-S` | 11 · 12 · 14 |
| ![Pulsador](img/componentes/8100.svg) | `8100` | Pulsador | `-S` | 13 · 14 |
| ![Piloto](img/componentes/8101.svg) | `8101` | Piloto | `-H` | X1 · X2 |
| ![LED](img/componentes/8103.svg) | `8103` | LED | `-H` | X1 · X2 |
| ![Señalización óptica](img/componentes/9008.svg) | `9008` | Señalización óptica | `-H` | 97 · 98 |
| ![Señalización óptica](img/componentes/9008.svg) | `9008` | Señalización óptica | `-H` | 97 · 98 |
| ![Señalización óptica intermitente](img/componentes/9009.svg) | `9009` | Señalización óptica intermitente | — | X1 · X2 |
| ![Timbre](img/componentes/9010.svg) | `9010` | Timbre | — | X1 · X2 |
| ![Zumbador](img/componentes/9011.svg) | `9011` | Zumbador | — | X1 · X2 |
| ![Sirena](img/componentes/9012.svg) | `9012` | Sirena | — | X1 · X2 |
| ![Bocina](img/componentes/9013.svg) | `9013` | Bocina | `-H` | X1 · X2 |

## Sensores (83)

| Dibujo | Código | Nombre | Designador | Bornes |
| --- | --- | --- | --- | --- |
| ![Det. inductivo NA 2 hilos](img/componentes/7500.svg) | `7500` | Det. inductivo NA 2 hilos | — | 1 · 2 |
| ![Det. inductivo NA 3 hilos PNP](img/componentes/7501.svg) | `7501` | Det. inductivo NA 3 hilos PNP | — | + · O · - |
| ![Det. inductivo NA 3 hilos NPN](img/componentes/7502.svg) | `7502` | Det. inductivo NA 3 hilos NPN | — | + · O · - |
| ![Det. inductivo NA 2 hilos](img/componentes/7503.svg) | `7503` | Det. inductivo NA 2 hilos | — | 1 · 2 |
| ![Det. inductivo NA 3 hilos PNP](img/componentes/7504.svg) | `7504` | Det. inductivo NA 3 hilos PNP | — | + · O · - |
| ![Det. inductivo NA 3 hilos NPN](img/componentes/7505.svg) | `7505` | Det. inductivo NA 3 hilos NPN | — | + · O · - |
| ![Det. capacitivo NA 2 hilos](img/componentes/7506.svg) | `7506` | Det. capacitivo NA 2 hilos | — | 1 · 2 |
| ![Det. capacitivo NA 3 hilos PNP](img/componentes/7507.svg) | `7507` | Det. capacitivo NA 3 hilos PNP | — | + · O · - |
| ![Det. capacitivo NA 3 hilos NPN](img/componentes/7508.svg) | `7508` | Det. capacitivo NA 3 hilos NPN | — | + · O · - |
| ![Det. capacitivo NA 2 hilos](img/componentes/7509.svg) | `7509` | Det. capacitivo NA 2 hilos | — | 1 · 2 |
| ![Det. capacitivo NA 3 hilos PNP](img/componentes/7510.svg) | `7510` | Det. capacitivo NA 3 hilos PNP | — | + · O · - |
| ![Det. capacitivo NA 3 hilos NPN](img/componentes/7511.svg) | `7511` | Det. capacitivo NA 3 hilos NPN | — | + · O · - |
| ![Det. magnético NA 2 hilos](img/componentes/7512.svg) | `7512` | Det. magnético NA 2 hilos | — | 1 · 2 |
| ![Det. magnético NA 3 hilos PNP](img/componentes/7513.svg) | `7513` | Det. magnético NA 3 hilos PNP | — | + · O · - |
| ![Det. magnético NA 3 hilos NPN](img/componentes/7514.svg) | `7514` | Det. magnético NA 3 hilos NPN | — | + · O · - |
| ![Det. magnético NA 2 hilos](img/componentes/7515.svg) | `7515` | Det. magnético NA 2 hilos | — | 1 · 2 |
| ![Det. magnético NA 3 hilos PNP](img/componentes/7516.svg) | `7516` | Det. magnético NA 3 hilos PNP | — | + · O · - |
| ![Det. magnético NA 3 hilos NPN](img/componentes/7517.svg) | `7517` | Det. magnético NA 3 hilos NPN | — | + · O · - |
| ![Det. inductivo NC 2 hilos](img/componentes/7520.svg) | `7520` | Det. inductivo NC 2 hilos | — | 1 · 2 |
| ![Det. inductivo NC 3 hilos PNP](img/componentes/7521.svg) | `7521` | Det. inductivo NC 3 hilos PNP | — | + · O · - |
| ![Det. inductivo NC 3 hilos NPN](img/componentes/7522.svg) | `7522` | Det. inductivo NC 3 hilos NPN | — | + · O · - |
| ![Det. inductivo NC 2 hilos](img/componentes/7523.svg) | `7523` | Det. inductivo NC 2 hilos | — | 1 · 2 |
| ![Det. inductivo NC 3 hilos PNP](img/componentes/7524.svg) | `7524` | Det. inductivo NC 3 hilos PNP | — | + · O · - |
| ![Det. inductivo NC 3 hilos NPN](img/componentes/7525.svg) | `7525` | Det. inductivo NC 3 hilos NPN | — | + · O · - |
| ![Det. capacitivo NC 2 hilos](img/componentes/7526.svg) | `7526` | Det. capacitivo NC 2 hilos | `-B` | 1 · 2 |
| ![Det. capacitivo NC 3 hilos PNP](img/componentes/7527.svg) | `7527` | Det. capacitivo NC 3 hilos PNP | — | + · O · - |
| ![Det. capacitivo NC 3 hilos NPN](img/componentes/7528.svg) | `7528` | Det. capacitivo NC 3 hilos NPN | — | + · O · - |
| ![Det. capacitivo NC 2 hilos](img/componentes/7529.svg) | `7529` | Det. capacitivo NC 2 hilos | — | 1 · 2 |
| ![Det. capacitivo NC 3 hilos PNP](img/componentes/7530.svg) | `7530` | Det. capacitivo NC 3 hilos PNP | — | + · O · - |
| ![Det. capacitivo NC 3 hilos NPN](img/componentes/7531.svg) | `7531` | Det. capacitivo NC 3 hilos NPN | — | + · O · - |
| ![Det. magnético NC 2 hilos](img/componentes/7532.svg) | `7532` | Det. magnético NC 2 hilos | `-B` | 1 · 2 |
| ![Det. magnético NC 3 hilos PNP](img/componentes/7533.svg) | `7533` | Det. magnético NC 3 hilos PNP | — | + · O · - |
| ![Det. magnético NC 3 hilos NPN](img/componentes/7534.svg) | `7534` | Det. magnético NC 3 hilos NPN | — | + · O · - |
| ![Det. magnético NC 2 hilos](img/componentes/7535.svg) | `7535` | Det. magnético NC 2 hilos | — | 1 · 2 |
| ![Det. magnético NC 3 hilos PNP](img/componentes/7536.svg) | `7536` | Det. magnético NC 3 hilos PNP | — | + · O · - |
| ![Det. magnético NC 3 hilos NPN](img/componentes/7537.svg) | `7537` | Det. magnético NC 3 hilos NPN | — | + · O · - |
| ![Barrera fotoeléctrica reflex](img/componentes/7550.svg) | `7550` | Barrera fotoeléctrica reflex | `-B` | 1 · 2 |
| ![Barrera foto. emisor](img/componentes/7551.svg) | `7551` | Barrera foto. emisor | `-B` | 1 · 2 |
| ![Barrera foto. emisor](img/componentes/7552.svg) | `7552` | Barrera foto. emisor | — | 1 · 2 |
| ![Barrera foto. receptor NA 2 hilos](img/componentes/7553.svg) | `7553` | Barrera foto. receptor NA 2 hilos | `-B` | 1 · 2 |
| ![Barrera foto. receptor NA 3 hilos PNP](img/componentes/7554.svg) | `7554` | Barrera foto. receptor NA 3 hilos PNP | — | + · O · - |
| ![Barrera foto. receptor NA 3 hilos NPN](img/componentes/7555.svg) | `7555` | Barrera foto. receptor NA 3 hilos NPN | — | + · O · - |
| ![Barrera foto. receptor NA 2 hilos](img/componentes/7556.svg) | `7556` | Barrera foto. receptor NA 2 hilos | — | 1 · 2 |
| ![Barrera foto. receptor NA 3 hilos PNP](img/componentes/7557.svg) | `7557` | Barrera foto. receptor NA 3 hilos PNP | — | + · O · - |
| ![Barrera foto. receptor NA 3 hilos NPN](img/componentes/7558.svg) | `7558` | Barrera foto. receptor NA 3 hilos NPN | — | + · O · - |
| ![Barrera foto. receptor NC 2 hilos](img/componentes/7559.svg) | `7559` | Barrera foto. receptor NC 2 hilos | `-B` | 1 · 2 |
| ![Barrera foto. receptor NC 3 hilos PNP](img/componentes/7560.svg) | `7560` | Barrera foto. receptor NC 3 hilos PNP | — | + · O · - |
| ![Barrera foto. receptor NC 3 hilos NPN](img/componentes/7561.svg) | `7561` | Barrera foto. receptor NC 3 hilos NPN | — | + · O · - |
| ![Barrera foto. receptor NC 2 hilos](img/componentes/7562.svg) | `7562` | Barrera foto. receptor NC 2 hilos | — | 1 · 2 |
| ![Barrera foto. receptor NC 3 hilos PNP](img/componentes/7563.svg) | `7563` | Barrera foto. receptor NC 3 hilos PNP | — | + · O · - |
| ![Barrera foto. receptor NC 3 hilos NPN](img/componentes/7564.svg) | `7564` | Barrera foto. receptor NC 3 hilos NPN | — | + · O · - |
| ![Presostato NA 2 hilos](img/componentes/7570.svg) | `7570` | Presostato NA 2 hilos | `-B` | 1 · 2 |
| ![Presostato NA 3 hilos PNP](img/componentes/7571.svg) | `7571` | Presostato NA 3 hilos PNP | — | + · O · - |
| ![Presostato NA 3 hilos NPN](img/componentes/7572.svg) | `7572` | Presostato NA 3 hilos NPN | — | + · O · - |
| ![Presostato NA 2 hilos](img/componentes/7573.svg) | `7573` | Presostato NA 2 hilos | — | 1 · 2 |
| ![Presostato NA 3 hilos PNP](img/componentes/7574.svg) | `7574` | Presostato NA 3 hilos PNP | — | + · O · - |
| ![Presostato NA 3 hilos NPN](img/componentes/7575.svg) | `7575` | Presostato NA 3 hilos NPN | — | + · O · - |
| ![Vacuostato NA 2 hilos](img/componentes/7576.svg) | `7576` | Vacuostato NA 2 hilos | `-B` | 1 · 2 |
| ![Vacuostato NA 3 hilos PNP](img/componentes/7577.svg) | `7577` | Vacuostato NA 3 hilos PNP | — | + · O · - |
| ![Vacuostato NA 3 hilos NPN](img/componentes/7578.svg) | `7578` | Vacuostato NA 3 hilos NPN | — | + · O · - |
| ![Vacuostato NA 2 hilos](img/componentes/7579.svg) | `7579` | Vacuostato NA 2 hilos | — | 1 · 2 |
| ![Vacuostato NA 3 hilos PNP](img/componentes/7580.svg) | `7580` | Vacuostato NA 3 hilos PNP | — | + · O · - |
| ![Vacuostato NA 3 hilos NPN](img/componentes/7581.svg) | `7581` | Vacuostato NA 3 hilos NPN | — | + · O · - |
| ![Presostato NC 2 hilos](img/componentes/7582.svg) | `7582` | Presostato NC 2 hilos | `-B` | 1 · 2 |
| ![Presostato NC 3 hilos NPN](img/componentes/7584.svg) | `7584` | Presostato NC 3 hilos NPN | — | + · O · - |
| ![Presostato NC 2 hilos](img/componentes/7585.svg) | `7585` | Presostato NC 2 hilos | — | 1 · 2 |
| ![Presostato NC 3 hilos PNP](img/componentes/7586.svg) | `7586` | Presostato NC 3 hilos PNP | — | + · O · - |
| ![Presostato NC 3 hilos NPN](img/componentes/7587.svg) | `7587` | Presostato NC 3 hilos NPN | — | + · O · - |
| ![Vacuostato NC 2 hilos](img/componentes/7588.svg) | `7588` | Vacuostato NC 2 hilos | `-B` | 1 · 2 |
| ![Vacuostato NC 3 hilos PNP](img/componentes/7589.svg) | `7589` | Vacuostato NC 3 hilos PNP | — | + · O · - |
| ![Vacuostato NC 3 hilos NPN](img/componentes/7590.svg) | `7590` | Vacuostato NC 3 hilos NPN | — | + · O · - |
| ![Termostato NA 3 hilos PNP](img/componentes/7591.svg) | `7591` | Termostato NA 3 hilos PNP | — | + · O · - |
| ![Vacuostato NC 3 hilos PNP](img/componentes/7592.svg) | `7592` | Vacuostato NC 3 hilos PNP | — | + · O · - |
| ![Vacuostato NC 3 hilos NPN](img/componentes/7593.svg) | `7593` | Vacuostato NC 3 hilos NPN | — | + · O · - |
| ![Termostato NA 3 hilos PNP](img/componentes/7594.svg) | `7594` | Termostato NA 3 hilos PNP | `-B` | + · O · - |
| ![Termostato NA 3 hilos NPN](img/componentes/7595.svg) | `7595` | Termostato NA 3 hilos NPN | — | + · O · - |
| ![Termostato NC 2 hilos](img/componentes/7600.svg) | `7600` | Termostato NC 2 hilos | `-B` | 1 · 2 |
| ![Termostato NC 3 hilos PNP](img/componentes/7601.svg) | `7601` | Termostato NC 3 hilos PNP | — | + · O · - |
| ![Termostato NC 3 hilos NPN](img/componentes/7602.svg) | `7602` | Termostato NC 3 hilos NPN | — | + · O · - |
| ![Termostato NC 2 hilos](img/componentes/7603.svg) | `7603` | Termostato NC 2 hilos | — | 1 · 2 |
| ![Termostato NC 3 hilos PNP](img/componentes/7604.svg) | `7604` | Termostato NC 3 hilos PNP | — | + · O · - |
| ![Termostato NC 3 hilos NPN](img/componentes/7605.svg) | `7605` | Termostato NC 3 hilos NPN | — | + · O · - |
| ![Presostato NC 3 hilos PNP](img/componentes/7883.svg) | `7883` | Presostato NC 3 hilos PNP | — | + · O · - |

## Líneas y cables (4)

| Dibujo | Código | Nombre | Designador | Bornes |
| --- | --- | --- | --- | --- |
| ![Cable fase](img/componentes/4000.svg) | `4000` | Cable fase | — | — |
| ![Cable neutro](img/componentes/4009.svg) | `4009` | Cable neutro | — | — |
| ![Cable PE](img/componentes/4010.svg) | `4010` | Cable PE | — | — |
| ![Cable -](img/componentes/4019.svg) | `4019` | Cable - | — | — |

## Borneras (6)

| Dibujo | Código | Nombre | Designador | Bornes |
| --- | --- | --- | --- | --- |
| ![Regleta cuadrada](img/componentes/4011.svg) | `4011` | Regleta cuadrada | `-X` | 1 · 2 · 3 · 4 |
| ![Regleta redonda](img/componentes/4012.svg) | `4012` | Regleta redonda | — | 1 · 2 · 3 · 4 |
| ![Conector salida](img/componentes/4013.svg) | `4013` | Conector salida | — | 1 · 2 · 3 · 4 |
| ![Conector entrada](img/componentes/4014.svg) | `4014` | Conector entrada | — | 1 · 2 · 3 · 4 |
| ![Regleta redonda 2](img/componentes/4015.svg) | `4015` | Regleta redonda 2 | — | 1 · 2 · 3 · 4 |
| ![Regleta redonda 3](img/componentes/4016.svg) | `4016` | Regleta redonda 3 | — | 1 · 2 · 3 · 4 · 5 · 6 |

## Códigos sin símbolo dedicado (47)

No tienen dibujo propio: el lienzo los pinta con el fallback, un rectángulo con el código adentro y los bornes que declare el archivo. Siguen siendo válidos para abrir y guardar sin pérdida; lo que falta es el dibujo, así que no llevan miniatura acá.

Lo mismo pasa con cualquier código que no esté en el catálogo, por ejemplo `20000`, que aparece en el sample PR1: `resolveSymbol()` lo dibuja como `Genérico 20000` en lugar de romper el render.

| Código | Nombre | Designador |
| --- | --- | --- |
| `1059` | ControlVariador velocidad cc. | `-G` |
| `2002` | Contactor IIII | `-KM` |
| `2005` | Interruptor IIII | `-S` |
| `4001` | Conexión | — |
| `4002` | Manguera | — |
| `4003` | Entrada manguera | — |
| `4004` | Entrada manguera | — |
| `4017` | Regleta redonda 4 | `-X` |
| `4018` | Cable + | — |
| `5004` | Fusible IIIN | `-F` |
| `5009` | Seccionador IIIN | `-F` |
| `8102` | Botonera | `-H` |
| `10000` | Función lógica AND 2 | `-U` |
| `10001` | Función lógica AND 3 | — |
| `10002` | Función lógica AND 4 | — |
| `10003` | Función lógica AND 2 | — |
| `10010` | Función lógica OR 2 | `-U` |
| `10011` | Función lógica OR 3 | — |
| `10012` | Función lógica OR 4 | — |
| `10013` | Función lógica OR 2 | — |
| `10020` | Función lógica NAND 2 | `-U` |
| `10021` | Función lógica NAND 3 | — |
| `10022` | Función lógica NAND 4 | — |
| `10023` | Función lógica NAND 2 | — |
| `10030` | Función lógica NOR 2 | `-U` |
| `10031` | Función lógica NOR 3 | — |
| `10032` | Función lógica NOR 4 | — |
| `10033` | Función lógica NOR 2 | — |
| `10040` | Función lógica INV | `-U` |
| `10041` | Función lógica EXOR | `-U` |
| `10052` | Flanco ascendente | — |
| `10053` | Flanco descendente | `-U` |
| `10060` | Asignar | `-U` |
| `10061` | Set | — |
| `10062` | Asignar | `-U` |
| `10064` | Biestable RS | `-U` |
| `10065` | Bivisor Binario | `-U` |
| `10070` | Prueba | `-I` |
| `10071` | Visualiza | `-Q` |
| `10100` | Etapa 0 GRAFCET | — |
| `10101` | Etapa 0 GRAFCET | — |
| `10106` | Línea enlace GRAFCET | — |
| `10107` | Enlace de entrada GRAFCET | — |
| `10108` | Enlace de Salida GRAFCET | — |
| `10111` | Macro Etapa GRAFCET | — |
| `10112` | Etapa 0 GRAFCET | — |
| `10501` | Actuador de doble efecto | `-A` |

## Cómo mantenerlo

1. Regenerar tabla y dibujos: `pnpm componentes` (desde la raíz o desde `app/`). El script borra `docs/img/componentes/` y la rehace, así no quedan SVG huérfanos.
2. Si cambia el catálogo: correr `pnpm catalog` primero (necesita el binario en `data/`), después este script.
3. Cuando se agrega el dibujo de un código que estaba en fallback, sale de esa sección y aparece en su familia con su miniatura.
4. Un componente nuevo necesita dibujo y bornes en `src/symbols/families.ts` más su plantilla en `src/symbols/templates.ts`.
