# Caja de ritmos infinita (demo HTML)

Proyecto básico para crear ritmos en navegador, con:

- Pads para disparar sonidos.
- Secuenciador de 16 pasos.
- Modulación (filtro, LFO, reverb, swing, BPM).
- Carga de audio local o por URL directa.

## Ejecutar

### Opción recomendada (compatible con previews)

```bash
npm start
```

Esto levanta un servidor estático en el puerto `8000` (o `PORT` si la plataforma lo define).

### Opción alternativa

```bash
python3 -m http.server 8000
```

Luego entra a `http://localhost:8000`.

## Nota importante sobre YouTube/Spotify

No se puede usar directamente audio de YouTube o Spotify en un HTML simple debido a políticas de plataforma, licencias y CORS.
Para hacerlo legalmente hay que usar sus APIs oficiales y/o SDKs con autenticación.
