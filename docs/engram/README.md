# Memoria del proyecto (Engram)

`rea-ing-inversa.json` es el export de la memoria de Engram **de este proyecto**: sesiones, observaciones y prompts. Se versiona para que el conocimiento del proyecto viaje con el repo y no dependa de una máquina.

## Cómo regenerarlo

Desde la raíz del repositorio:

```bash
engram export docs/engram/rea-ing-inversa.json --project rea-ing-inversa
```

El comando reescribe el archivo completo. No hace falta hacerlo en cada commit: es un snapshot, y conviene refrescarlo al cerrar una tanda de trabajo.

## Qué NO se versiona, y por qué

El store de Engram vive en `~/.engram/engram.db`: es un SQLite **global** de unos 32 MB (más un WAL que llegó a 19 MB) que guarda las memorias de **todos** los proyectos de la máquina. No entra al repo porque:

- expondría memorias de otros proyectos ajenos a este;
- es binario: cada guardado cambia decenas de MB y no hay diff legible;
- un conflicto de merge sobre un SQLite no se resuelve, se corrompe.

El export en JSON tiene el mismo contenido útil, pesa 100 KB y se lee como texto.
