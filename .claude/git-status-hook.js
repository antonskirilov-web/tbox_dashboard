#!/usr/bin/env node
const { execSync } = require('child_process');

const run = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();

const lines = [];

try {
  const status = run('git status --porcelain');
  if (status) {
    lines.push('⚠️  Незакоммиченные изменения:\n' + status.split('\n').map(l => '   ' + l).join('\n'));
  }
} catch (_) {}

try {
  const ahead = parseInt(run('git rev-list @{u}..HEAD --count'), 10);
  if (ahead > 0) lines.push(`🚀 Непушнутых коммитов: ${ahead} — выполни git push`);
} catch (_) {}

try {
  run('git fetch --quiet');
  const behind = parseInt(run('git rev-list HEAD..@{u} --count'), 10);
  if (behind > 0) lines.push(`⬇️  Непулленных изменений: ${behind} — выполни git pull`);
} catch (_) {}

const msg = lines.length > 0
  ? '🔍 Git-статус:\n' + lines.join('\n')
  : '✅ Git чист: всё закоммичено, запушено и актуально.';

console.log(JSON.stringify({ systemMessage: msg }));
