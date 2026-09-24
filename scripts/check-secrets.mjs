// Fails if anything that looks like a credential is tracked in the repository.
// Phase 4 rule: secrets live only in server environment variables, never in client code or git.
// Usage: npm run check:secrets   (also a CI step, and usable from a pre-commit hook)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PATTERNS = [
  [/\bsk-[A-Za-z0-9_-]{20,}\b/, 'OpenAI-style secret key'],
  [/\bsk-ant-[A-Za-z0-9_-]{20,}\b/, 'Anthropic API key'],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}\b/, 'GitHub token'],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}\b/, 'GitHub fine-grained token'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key id'],
  [/\bASIA[0-9A-Z]{16}\b/, 'AWS temporary access key id'],
  [/-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/, 'private key'],
  [/\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/, 'Stripe secret key'],
  [/\bwhsec_[A-Za-z0-9]{16,}\b/, 'webhook signing secret'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'Google API key'],
  [/\bxox[abposr]-[0-9A-Za-z-]{10,}\b/, 'Slack token'],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/, 'JSON Web Token'],
];

// Text files git tracks. Lock files and this script's own pattern list are not interesting.
const SKIP = /^(package-lock\.json|scripts\/check-secrets\.mjs)$/;
const BINARY = /\.(png|jpg|jpeg|webp|gif|svg|ico|pdf|zip|woff2?|ttf|pfb|icc|wasm|mp4)$/i;

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter((f) => f && !SKIP.test(f) && !BINARY.test(f));

const findings = [];
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue; // unreadable or genuinely binary
  }
  text.split(/\r?\n/).forEach((line, i) => {
    for (const [re, label] of PATTERNS) {
      if (re.test(line)) findings.push(`${file}:${i + 1}: possible ${label}`);
    }
  });
}

if (findings.length) {
  console.error(`Possible secrets in tracked files (${findings.length}):`);
  for (const f of findings) console.error(`  ${f}`);
  console.error('\nMove the value into an environment variable and rotate it: it is in git history.');
  process.exit(1);
}
console.log(`No credential-shaped strings in ${files.length} tracked text files.`);
