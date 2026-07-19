#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', 'shared', 'webassets');
const TARGETS = [
  path.join(__dirname, '..', 'webplayer', 'assets'),
  path.join(__dirname, '..', 'app', 'src', 'main', 'assets')
];

const FILES_TO_SYNC = ['app.js', 'index.html', 'style.css', 'web-bridge.js'];

function syncFiles() {
  console.log(`🔄 Sincronizando assets de ${SOURCE_DIR}...`);

  FILES_TO_SYNC.forEach(file => {
    const srcPath = path.join(SOURCE_DIR, file);

    if (!fs.existsSync(srcPath)) {
      console.error(`❌ Arquivo não encontrado: ${srcPath}`);
      return;
    }

    TARGETS.forEach(targetDir => {
      const destPath = path.join(targetDir, file);

      try {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✓ ${file} → ${path.relative(path.join(__dirname, '..'), targetDir)}`);
      } catch (err) {
        console.error(`❌ Erro ao copiar ${file} para ${targetDir}: ${err.message}`);
      }
    });
  });

  console.log('✅ Sincronização concluída');
}

function watchFiles() {
  console.log(`👀 Observando ${SOURCE_DIR} para mudanças...`);

  FILES_TO_SYNC.forEach(file => {
    const srcPath = path.join(SOURCE_DIR, file);

    fs.watch(srcPath, (eventType, filename) => {
      if (eventType === 'change') {
        console.log(`📝 ${file} modificado, sincronizando...`);
        syncFiles();
      }
    });
  });
}

// Main
const isWatchMode = process.argv.includes('--watch');

syncFiles();

if (isWatchMode) {
  watchFiles();
  console.log('Pressione Ctrl+C para parar o watcher');
}
