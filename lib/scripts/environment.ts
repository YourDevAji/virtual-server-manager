import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import path from 'path'

const execAsync = promisify(exec)

export interface EnvironmentCheck {
  name: string
  status: 'ok' | 'warning' | 'error'
  message: string
  fixable: boolean
  fixCommand?: string
  fixInstructions?: string
}

/**
 * Check if VirtualBox is installed and accessible
 */
export async function checkVirtualBox(): Promise<EnvironmentCheck> {
  const isWindows = process.platform === 'win32'
  
  // Common VirtualBox paths
  const vboxPaths = isWindows
    ? [
        'C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe',
        'C:\\Program Files (x86)\\Oracle\\VirtualBox\\VBoxManage.exe',
      ]
    : ['/usr/bin/VBoxManage', '/usr/local/bin/VBoxManage']

  // Check if VBoxManage exists in common locations
  for (const vboxPath of vboxPaths) {
    if (existsSync(vboxPath)) {
      try {
        await execAsync(`"${vboxPath}" --version`, { timeout: 5000 })
        return {
          name: 'VirtualBox',
          status: 'ok',
          message: 'VirtualBox is installed and accessible',
          fixable: false,
        }
      } catch {
        // Path exists but command failed
      }
    }
  }

  // Try if it's in PATH
  try {
    await execAsync('VBoxManage --version', { timeout: 5000 })
    return {
      name: 'VirtualBox',
      status: 'ok',
      message: 'VirtualBox is installed and accessible',
      fixable: false,
    }
  } catch {
    // Not in PATH either
  }

  return {
    name: 'VirtualBox',
    status: 'error',
    message: 'VirtualBox is not installed or VBoxManage is not in PATH',
    fixable: true,
    fixInstructions: isWindows
      ? 'Install VirtualBox from https://www.virtualbox.org/ and add it to PATH: C:\\Program Files\\Oracle\\VirtualBox'
      : 'Install VirtualBox: sudo apt-get install virtualbox (Ubuntu/Debian) or brew install virtualbox (macOS)',
  }
}

/**
 * Check if bash is available
 */
export async function checkBash(): Promise<EnvironmentCheck> {
  const isWindows = process.platform === 'win32'
  
  if (!isWindows) {
    // On Unix systems, bash should be available
    try {
      await execAsync('bash --version', { timeout: 5000 })
      return {
        name: 'Bash',
        status: 'ok',
        message: 'Bash is available',
        fixable: false,
      }
    } catch {
      return {
        name: 'Bash',
        status: 'error',
        message: 'Bash is not available',
        fixable: true,
        fixInstructions: 'Install bash: sudo apt-get install bash (Linux) or it should be pre-installed on macOS',
      }
    }
  }

  // Windows: Check for Git Bash
  const gitBashPaths = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
  ]

  for (const bashPath of gitBashPaths) {
    if (existsSync(bashPath)) {
      return {
        name: 'Bash (Git Bash)',
        status: 'ok',
        message: 'Git Bash is installed',
        fixable: false,
      }
    }
  }

  // Check if bash is in PATH
  try {
    await execAsync('bash --version', { timeout: 5000 })
    return {
      name: 'Bash',
      status: 'ok',
      message: 'Bash is available in PATH',
      fixable: false,
    }
  } catch {
    // Not found
  }

  return {
    name: 'Bash',
    status: 'warning',
    message: 'Bash not found. Scripts will be simulated.',
    fixable: true,
    fixInstructions: 'Install Git Bash from https://git-scm.com/download/win and add it to PATH, or install WSL',
  }
}

/**
 * Check if scripts directory exists and scripts are present
 */
export function checkScripts(): EnvironmentCheck {
  const scriptsDir = path.join(process.cwd(), 'scripts')
  const requiredScripts = [
    'create_vm.sh',
    'start-vm.sh',
    'stop-vm.sh',
    'destroy_vm.sh',
    'install_service.sh',
    'manage_users.sh',
  ]

  if (!existsSync(scriptsDir)) {
    return {
      name: 'Scripts Directory',
      status: 'error',
      message: 'Scripts directory not found',
      fixable: false,
    }
  }

  const missingScripts = requiredScripts.filter(
    script => !existsSync(path.join(scriptsDir, script))
  )

  if (missingScripts.length > 0) {
    return {
      name: 'Scripts',
      status: 'error',
      message: `Missing scripts: ${missingScripts.join(', ')}`,
      fixable: false,
    }
  }

  return {
    name: 'Scripts',
    status: 'ok',
    message: 'All required scripts are present',
    fixable: false,
  }
}

/**
 * Run all environment checks
 */
export async function checkEnvironment(): Promise<EnvironmentCheck[]> {
  const [vboxCheck, bashCheck, scriptsCheck] = await Promise.all([
    checkVirtualBox(),
    checkBash(),
    Promise.resolve(checkScripts()),
  ])

  return [vboxCheck, bashCheck, scriptsCheck]
}

/**
 * Get environment status summary
 */
export function getEnvironmentStatus(checks: EnvironmentCheck[]): {
  allOk: boolean
  hasErrors: boolean
  hasWarnings: boolean
  canExecuteScripts: boolean
} {
  const hasErrors = checks.some(c => c.status === 'error')
  const hasWarnings = checks.some(c => c.status === 'warning')
  const allOk = checks.every(c => c.status === 'ok')
  
  // Can execute scripts if VirtualBox and Bash are OK (scripts check is just informational)
  const vboxOk = checks.find(c => c.name.includes('VirtualBox'))?.status === 'ok'
  const bashOk = checks.find(c => c.name.includes('Bash'))?.status === 'ok'
  const canExecuteScripts = vboxOk && bashOk

  return {
    allOk,
    hasErrors,
    hasWarnings,
    canExecuteScripts,
  }
}

