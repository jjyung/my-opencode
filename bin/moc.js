#!/usr/bin/env node

import { constants as osConstants } from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const knownProfiles = new Set(['opencode', 'openai', 'google', 'copilot']);
const knownProfilesText = 'opencode openai google copilot';
const signalExitCodes = {
  SIGHUP: 1,
  SIGINT: 2,
  SIGTERM: 15,
  SIGBREAK: 21,
};

const pluginPath = path.join('.opencode', 'plugins', 'provider-profile.mjs');
const configPath = path.join('.opencode', 'opencode.json');

const pluginAbsPath = path.resolve(process.cwd(), pluginPath);
const configAbsPath = path.resolve(process.cwd(), configPath);

function isKnownProfile(value) {
  return knownProfiles.has(value);
}

function normalizeProfile(value) {
  return value.trim();
}

function getMtime(filePath, label) {
  try {
    return String(fs.statSync(filePath).mtimeMs);
  } catch {
    console.error(`moc: failed to read ${label} mtime from ${label === 'plugin' ? pluginPath : configPath}`);
    process.exit(1);
  }
}

function readMeta(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const meta = {};

    for (const line of raw.split(/\r?\n/)) {
      const index = line.indexOf('=');
      if (index === -1) {
        continue;
      }

      const key = line.slice(0, index);
      const value = line.slice(index + 1);
      meta[key] = value;
    }

    if (meta.profile && meta.plugin_mtime && meta.config_mtime) {
      return meta;
    }
  } catch {
    return null;
  }

  return null;
}

function readCacheContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').replace(/\r?\n/g, '');
  } catch {
    return '';
  }
}

function writeCache(cacheDir, cacheContentPath, cacheMetaPath, profile, pluginMtime, configMtime, configContent) {
  const suffix = `.tmp.${process.pid}.${Date.now()}`;
  const tempContentPath = `${cacheContentPath}${suffix}`;
  const tempMetaPath = `${cacheMetaPath}${suffix}`;
  const metaContent = [
    `profile=${profile}`,
    `plugin_mtime=${pluginMtime}`,
    `config_mtime=${configMtime}`,
    '',
  ].join('\n');

  try {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(tempContentPath, `${configContent}\n`, 'utf8');
    fs.writeFileSync(tempMetaPath, metaContent, 'utf8');
    fs.renameSync(tempContentPath, cacheContentPath);
    fs.renameSync(tempMetaPath, cacheMetaPath);
    return true;
  } catch {
    try {
      fs.rmSync(tempContentPath, { force: true });
    } catch {
      // ignore cleanup errors
    }

    try {
      fs.rmSync(tempMetaPath, { force: true });
    } catch {
      // ignore cleanup errors
    }

    return false;
  }
}

function computeConfigContent(profile) {
  const result = spawnSync(process.execPath, [pluginAbsPath], {
    env: {
      ...process.env,
      OPENCODE_PROVIDER_PROFILE: profile,
    },
    encoding: 'utf8',
  });

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.error || result.status !== 0) {
    console.error(`moc: failed to compute OPENCODE_CONFIG_CONTENT from ${pluginPath}`);
    process.exit(typeof result.status === 'number' && result.status !== 0 ? result.status : 1);
  }

  return result.stdout.replace(/[\r\n]+$/, '');
}

function printDoctor(activeProfile, cacheContentPath, cacheMetaPath) {
  process.stdout.write(`profile=${activeProfile}\n`);
  process.stdout.write(`plugin_path=${pluginPath}\n`);
  process.stdout.write(`config_path=${configPath}\n`);
  process.stdout.write(`cache_content_path=${cacheContentPath}\n`);
  process.stdout.write(`cache_meta_path=${cacheMetaPath}\n`);
  process.stdout.write(`plugin_exists=${fs.existsSync(pluginAbsPath) ? 'yes' : 'no'}\n`);
  process.stdout.write(`config_exists=${fs.existsSync(configAbsPath) ? 'yes' : 'no'}\n`);
  process.stdout.write(`cache_content_exists=${fs.existsSync(path.resolve(process.cwd(), cacheContentPath)) ? 'yes' : 'no'}\n`);
  process.stdout.write(`cache_meta_exists=${fs.existsSync(path.resolve(process.cwd(), cacheMetaPath)) ? 'yes' : 'no'}\n`);
}

function resolveWindowsOpencodeInvocation() {
  const pathValue = process.env.PATH || '';
  const searchDirs = pathValue.split(path.delimiter).filter(Boolean);

  for (const searchDir of searchDirs) {
    const commandPath = path.join(searchDir, 'opencode.cmd');
    if (!fs.existsSync(commandPath)) {
      continue;
    }

    try {
      const raw = fs.readFileSync(commandPath, 'utf8');
      const matches = [...raw.matchAll(/"([^"]+\.(?:c|m)?js)"/gi)];
      const scriptRef = matches.at(-1)?.[1];

      if (!scriptRef) {
        continue;
      }

      const normalized = scriptRef
        .replace(/%dp0%/gi, `${searchDir}${path.sep}`)
        .replace(/\\/g, path.sep);
      const resolvedScriptPath = path.resolve(normalized);

      if (fs.existsSync(resolvedScriptPath)) {
        return {
          command: process.execPath,
          argsPrefix: [resolvedScriptPath],
          shell: false,
        };
      }
    } catch {
      // ignore unreadable shims and continue searching PATH
    }
  }

  return {
    command: 'opencode',
    argsPrefix: [],
    shell: true,
  };
}

function spawnOpencode(args, extraEnv = {}) {
  const invocation = process.platform === 'win32'
    ? resolveWindowsOpencodeInvocation()
    : { command: 'opencode', argsPrefix: [], shell: false };
  const child = spawn(invocation.command, [...invocation.argsPrefix, ...args], {
    env: {
      ...process.env,
      ...extraEnv,
    },
    stdio: 'inherit',
    shell: invocation.shell,
  });

  const signals = ['SIGINT', 'SIGTERM'];
  if (process.platform !== 'win32') {
    signals.push('SIGHUP');
  } else {
    signals.push('SIGBREAK');
  }

  let finished = false;
  const handlers = new Map();

  const cleanup = () => {
    for (const [signal, handler] of handlers) {
      process.off(signal, handler);
    }
    handlers.clear();
  };

  const finish = (code, signal) => {
    if (finished) {
      return;
    }

    finished = true;
    cleanup();

    if (signal) {
      const signalCode = osConstants.signals?.[signal] ?? signalExitCodes[signal];
      process.exit(typeof signalCode === 'number' ? 128 + signalCode : 1);
    }

    process.exit(code ?? 0);
  };

  for (const signal of signals) {
    const handler = () => {
      if (child.exitCode !== null || child.signalCode !== null) {
        return;
      }

      try {
        child.kill(signal);
      } catch {
        // ignore forwarding errors and wait for child exit
      }
    };

    handlers.set(signal, handler);
    process.on(signal, handler);
  }

  child.on('error', (error) => {
    cleanup();
    console.error(`moc: failed to launch opencode: ${error.message}`);
    process.exit(1);
  });

  child.on('exit', finish);
}

function main() {
  const originalArgs = process.argv.slice(2);
  let forwardedArgs = [...originalArgs];
  let profile = '';
  let commandMode = '';

  if (originalArgs[0] === 'doctor' || originalArgs[0] === 'print-config') {
    commandMode = originalArgs[0];
    const candidateProfile = originalArgs[1];

    if (typeof candidateProfile === 'string' && candidateProfile.length > 0) {
      profile = candidateProfile;
    } else {
      profile = 'opencode';
    }
  } else if (typeof originalArgs[0] === 'string' && isKnownProfile(originalArgs[0])) {
    profile = originalArgs[0];
    forwardedArgs = originalArgs.slice(1);
  } else if (originalArgs.length === 0) {
    const envProfile = typeof process.env.OPENCODE_PROVIDER_PROFILE === 'string'
      ? normalizeProfile(process.env.OPENCODE_PROVIDER_PROFILE)
      : '';

    profile = envProfile || 'opencode';
  }

  if (!profile) {
    spawnOpencode(forwardedArgs);
    return;
  }

  if (!isKnownProfile(profile)) {
    console.error(`moc: unknown profile '${profile}'. Must be one of: ${knownProfilesText}`);
    process.exit(1);
  }

  const cacheDir = path.join('.opencode', 'cache', 'provider-profile');
  const cacheContentPath = path.join(cacheDir, `${profile}.json`);
  const cacheMetaPath = path.join(cacheDir, `${profile}.meta`);
  const cacheContentAbsPath = path.resolve(process.cwd(), cacheContentPath);
  const cacheMetaAbsPath = path.resolve(process.cwd(), cacheMetaPath);

  if (!fs.existsSync(pluginAbsPath)) {
    console.error(`moc: plugin not found at ${pluginPath}; falling back to plain opencode`);
    spawnOpencode(forwardedArgs);
    return;
  }

  if (!fs.existsSync(configAbsPath)) {
    console.error(`moc: config not found at ${configPath}; cannot compute provider profile override`);
    process.exit(1);
  }

  if (commandMode === 'doctor') {
    printDoctor(profile, cacheContentPath, cacheMetaPath);
    process.exit(0);
  }

  const pluginMtime = getMtime(pluginAbsPath, 'plugin');
  const configMtime = getMtime(configAbsPath, 'config');

  let configContent = '';
  const meta = readMeta(cacheMetaAbsPath);

  if (meta && fs.existsSync(cacheContentAbsPath)) {
    if (
      meta.profile === profile
      && meta.plugin_mtime === pluginMtime
      && meta.config_mtime === configMtime
    ) {
      configContent = readCacheContent(cacheContentAbsPath);
    }
  }

  if (!configContent) {
    configContent = computeConfigContent(profile);

    if (!writeCache(cacheDir, cacheContentAbsPath, cacheMetaAbsPath, profile, pluginMtime, configMtime, configContent)) {
      console.error(`moc: warning: failed to update cache at ${cacheDir}; continuing with fresh config`);
    }
  }

  if (commandMode === 'print-config') {
    process.stdout.write(`${configContent}\n`);
    process.exit(0);
  }

  spawnOpencode(forwardedArgs, {
    OPENCODE_PROVIDER_PROFILE: profile,
    OPENCODE_CONFIG_CONTENT: configContent,
  });
}

main();
