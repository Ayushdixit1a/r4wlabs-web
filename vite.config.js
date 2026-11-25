import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const partials = path.resolve('src/partials');
const servicesDirectory = path.resolve('services');
const serviceInputs = fs.existsSync(servicesDirectory)
  ? Object.fromEntries(fs.readdirSync(servicesDirectory, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => [entry.name, path.resolve(servicesDirectory, entry.name, 'index.html')])
    .filter(([, file]) => fs.existsSync(file))
    .map(([slug, file]) => [`service-${slug}`, file]))
  : {};

// Shared header, footer and loader markup: <!-- @include name --> pulls in src/partials/name.html.
function htmlInclude() {
  return {
    name: 'html-include',
    transformIndexHtml: {
      order: 'pre',
      handler: html => html.replace(/<!--\s*@include\s+([\w-]+)\s*-->/g, (_, name) =>
        fs.readFileSync(path.join(partials, `${name}.html`), 'utf8')),
    },
    configureServer(server) {
      server.watcher.add(partials);
      server.watcher.on('change', file => {
        if (file.startsWith(partials)) server.ws.send({ type: 'full-reload' });
      });
    },
  };
}

export default defineConfig({
  plugins: [htmlInclude()],
  server: { host: '0.0.0.0', allowedHosts: true },
  preview: { host: '0.0.0.0', allowedHosts: true },
  build: {
    rollupOptions: {
      input: {
        home: path.resolve('index.html'),
        videoEditing: path.resolve('video-editing/index.html'),
        ...serviceInputs,
      },
    },
  },
});
