/**
 * Gulp export pipeline (Handlebars-accelerator style):
 * renders templates → bundles images into img/ → writes HTML + ZIP to out/exports/
 *
 * Usage:
 *   yarn export          — all saved templates
 *   yarn export -- <id>  — one template by id
 */
import gulp from 'gulp';
import { spawn } from 'node:child_process';

const OUTPUT_DIR = 'out/exports';

function runExport(done) {
  const templateId = process.argv.find((arg) => arg.startsWith('--id='))?.split('=')[1]
    ?? process.env.TEMPLATE_ID;

  const args = ['tsx', 'scripts/export-templates.ts'];
  if (templateId) args.push(templateId);

  const child = spawn('npx', args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env },
  });

  child.on('exit', (code) => done(code === 0 ? undefined : new Error(`export exited with ${code}`)));
}

function cleanExports(done) {
  import('node:fs').then((fs) => {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    console.log(`Cleaned ${OUTPUT_DIR}`);
    done();
  }).catch(done);
}

export const clean = cleanExports;
export const exportTemplates = runExport;
export const build = gulp.series(cleanExports, runExport);
export default exportTemplates;
