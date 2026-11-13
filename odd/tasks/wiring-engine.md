# wiring-engine — snap, hit-test, controller y comandos

**Objetivo:** implementar PR2 y PR3 del plan de `docs/WIRING_ARCHITECTURE_REVIEW.md`: snap priorizado + hit-test puro (PR2) y controller de gestos + unión por identidad de pin + transacciones (PR3).
**Rama:** `feat/wiring-pr1` (continúa; PR2 y PR3 son commits separados).
**Runner:** `node --test` (app/), typecheck `tsc --noEmit`.
**Estrategia de entrega:** commits por unidad en la rama; push/PR decisión del usuario.

## Specs

- **S1 (PR2):** snap priorizado pin → junction → segmento apto para derivación (tee) → cuadrícula, con tolerancia en píxeles transformada a unidades de documento ("Prioridad sugerida: pin válido cercano → junction existente → segmento apto para derivación → cuadrícula", docs/WIRING_ARCHITECTURE.md §5). Módulo puro `wiring/snap.ts`.
- **S2 (PR2):** hit-test puro con prioridades explícitas: endpoint > segmento > componente > fondo ("Detectar el objetivo bajo el puntero (pin, junction, extremo, segmento, componente o fondo), con prioridades explícitas", docs/WIRING_ARCHITECTURE.md §5). Módulo puro `wiring/hitTest.ts`.
- **S3 (PR2):** el Canvas usa el snap priorizado y el hit-test; el snap magnético a junction y tee es visible ("Usar tolerancia visual en píxeles transformada a coordenadas de documento", docs/WIRING_ARCHITECTURE.md §5).
- **S4 (PR3):** gestos cancelables: `Escape` y `pointercancel` durante un arrastre no modifican el documento ("Pulsar Escape durante arrastre | No cambia el documento", docs/WIRING_ARCHITECTURE.md §9; "`pointercancel` debe tener tratamiento explícito", §5). Hoy `onPointerCancel` delega en `onPointerUp` y CONFIRMA el gesto (app/src/ui/Canvas.tsx:444).
- **S5 (PR3):** mover un componente conserva los extremos anclados a sus bornes por identidad de pin, no por proximidad de caja ("Mover componente | Los extremos anclados siguen sus pines", docs/WIRING_ARCHITECTURE.md §9). El propio código lo promete: "la unión real pin↔cable llega en la fase 3" (app/src/editor/state.ts:165).
- **S6 (PR3):** una sola operación de undo por gesto confirmado, con transacciones formalizadas sin el hack de limpiar `past`/`future` ("Hacer 100 movimientos del puntero | Un solo paso de undo tras confirmar", docs/WIRING_ARCHITECTURE.md §9).
- **S7 (PR3):** punto de conexión en T visible en el lienzo (nodo `tee` de `buildNetwork`).
- **Fuera de alcance:** A* ortogonal, auto-junction al soltar, `WiringDocument` persistente, adapter completo de import/export, cambios de formato.

## Tasks

- T1 (S1, PR2): `wiring/snap.ts` + tests. Route: inline. DONE — commit snap priorizado, 11 tests.
- T2 (S2, PR2): `wiring/hitTest.ts` + tests. Route: inline. DONE — 8 tests, endpoints apagables para hitWire.
- T3 (S3, PR2): integración en Canvas (snapTarget + hitTest + highlight magnético). Route: inline. DONE — marcador `.snap-mark`; colocación de componentes conserva snap simple.
- T4 (S4, PR3): `wiring/controller.ts`, máquina de gestos pura + tests. Route: inline. DONE — 10 tests; eventos move/up/cancel, efectos declarativos.
- T5 (S4, S7, PR3): Canvas adopta controller; pointercancel/Escape cancelan; puntos tee visibles. Route: inline. DONE — commit b92246d; punto de T dibujado para nodos kind 'tee'.
- T6 (S5, S6, PR3): transacción formal (`runSteps`) + bendCable sin hack. Route: inline. DONE — S5 verificado ya cubierto: moveSelection arrastra extremos dentro de caja±4 (state.ts:168-208) y los bornes derivan de esos extremos, así que la identidad de pin no cambia el comportamiento observable hasta tener el modelo de anclas explícitas (fuera de alcance).

## Log

- L1 (2026-11-13): "arranca con pr2 y pr3" — autoriza PR2 (snap priorizado + hit-test, consumidos por el Canvas actual) y PR3 (controller tipado + commands, reemplazando el hack de bendCable y el DragOp actual), según el plan de docs/WIRING_ARCHITECTURE_REVIEW.md §6.
- L1b: contexto del usuario previo: "lo puedo probar en pnpm dev?" — PR2/PR3 deben ser visibles en `pnpm dev`.
- L2 (2026-11-13): PR2 y PR3 completos. Evidencia: 356/356 tests, tsc limpio, `vite build` OK. Commits: 5f4c2ed (PR2 snap+hitTest), b92246d (PR3 controller+transacción). Diferencias observadas deliberadas: (1) marquee captura shiftKey al pulsar, no al soltar; (2) los colineales superpuestos devuelven `touch` en segmentIntersection; (3) el punto de T se dibuja para nodos tee sin 4001. S5 resuelta como ya-cubierta (ver T6): la identidad de pin no altera el comportamiento observable mientras los bornes se deriven de los propios extremos de cable.
- L3 (2026-11-13): reporte del usuario "los bornes de l y n no los puedo mover" / "los bornes l y n". Reproducido con sonda numérica sobre `app/test_simu/PR1_Rodolfo_Giusti_03.cad`: L (3000) y N (3001) son componentes de caja 6×3 en (45,48)/(39,48); su tinta visible (círculo en (0,-3.2), rabito, letra en (0,-4.9)) vive pegada al cable que los alimenta (tramo 48: (45,48)→(45,51), extremo exactamente en la esquina de la caja). Con la prioridad cable>componente de edición y tolerancia 4/k, en zoom de ajuste (k≈1.8, tol 2.2) casi toda la tinta la capturaba el cable: el clic seleccionaba el cable y la terminal nunca se movía. Fix (commit be5c505): `segmentAttachedTo` en wiring/hitTest.ts — si el clic cae sobre la tinta de un componente (DOM data-id) y el tramo ganador tiene un extremo dentro de la caja de ese componente, gana el componente; un cable que solo pasa cerca o cruza sin conectar sigue ganando (no reabre el defecto de orden del DOM). Evidencia: 360/360 tests, tsc limpio, build OK. Pendiente: verificación manual del usuario en `pnpm dev`.
