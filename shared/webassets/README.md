# Shared Web Assets

Fonte única de verdade para assets web compartilhados entre **webplayer** (Node.js) e **APK** (Android).

## Arquivos Sincronizados

- `app.js` — Lógica principal da app (2395 linhas)
- `index.html` — Template HTML
- `style.css` — Estilos globais
- `web-bridge.js` — Bridge para comunicação JS ↔ Kotlin

## Workflow

### 1. Desenvolvimento Local

```bash
cd webplayer
npm run sync         # Sincroniza assets manualmente uma única vez
npm run dev          # Sobe servidor + watcher (re-sincroniza ao salvar)
```

Abra `http://localhost:3000` no browser. Edite qualquer arquivo em `shared/webassets/` — as mudanças vão pra ambos os destinos automaticamente.

### 2. Testar no APK

Depois que estiver satisfeito com a versão web:

```bash
npm run sync         # Garante que app/src/main/assets está atualizado
./gradlew installDebug
# ou ./gradlew assembleRelease
```

Gradle vai empacotar os assets de `app/src/main/assets` normalmente, sem mudança na build.

## Arquitetura

```
shared/webassets/  ← FONTE ÚNICA (edite aqui)
├── app.js
├── index.html
├── style.css
└── web-bridge.js

↓ (via scripts/sync-assets.js)

webplayer/assets/  ← Cópia gerada (não edite)
app/src/main/assets/  ← Cópia gerada (não edite)
```

## Regras Importantes

- **Nunca** edite diretamente em `webplayer/assets/` ou `app/src/main/assets/`
- **Sempre** edite em `shared/webassets/`
- `logo_black.png` é **específico** de cada pasta — não sincronizado

## Watcher (`npm run dev`)

Roda `fs.watch()` em cada arquivo. Quando detecta mudança:

1. Recopia arquivo para ambos os destinos
2. Imprime log de sucesso
3. Browser pode ter auto-reload via LiveJS (se implementado) ou manual F5

Para parar: `Ctrl+C`.

## Troubleshooting

**Arquivos não sincronizam?**
```bash
npm run sync  # Força sincronização manual
```

**Watcher não funciona em rede?**
Depende do filesystem. NTFS (Windows) + WSL podem ter delays. Sync manual é garantido.

**Arquivo sincronizado mas APK ainda antigo?**
```bash
./gradlew clean
./gradlew installDebug
```

Build precisa reprocessar assets.
