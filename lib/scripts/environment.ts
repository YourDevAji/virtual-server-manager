import { exec, ExecOptions as NodeExecOptions } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'

// Helper to run a shell command and return stdout as string
async function runCommand(command: string, options?: NodeExecOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, options ?? undefined, (err, stdout) => {
      if (err) return reject(err)
      try {
        resolve(stdoutToString(stdout))
      } catch {
        // Fallback: stringify whatever stdout is
        resolve(String(stdout ?? ''))
      }
    })
  })
}

// Helper to convert stdout to string
function stdoutToString(output: string | Buffer | unknown): string {
  if (typeof output === 'string') return output
  if (output instanceof Buffer) return output.toString('utf8')
  return String(output ?? '')
}

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
  
  let vboxPath: string | null = null
  let version: string | null = null
  let pathLocation: string | null = null

  // First, try to find VBoxManage using which/where command
  try {
    const whichCommand = isWindows ? 'where VBoxManage' : 'which VBoxManage'
    const execOptions: NodeExecOptions = { timeout: 5000, encoding: 'utf8' }
    if (isWindows) {
      execOptions.shell = 'cmd.exe'
    }
    const whichOutput = await runCommand(whichCommand, execOptions)
    // Since runCommand returns Promise<string>, whichOutput is always a string
    const outputStr = whichOutput
    const paths = outputStr.trim().split('\n').filter((p: string) => p.trim())
    pathLocation = paths[0] || null
    
    if (pathLocation) {
      vboxPath = pathLocation.trim()
    }
  } catch {
    // Not in PATH, continue to check common locations
  }

  // If not found in PATH, check common installation paths
  if (!vboxPath) {
    const commonPaths = isWindows
      ? [
          'C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe',
          'C:\\Program Files (x86)\\Oracle\\VirtualBox\\VBoxManage.exe',
        ]
      : ['/usr/bin/VBoxManage', '/usr/local/bin/VBoxManage', '/opt/VirtualBox/VBoxManage']

    for (const testPath of commonPaths) {
      if (existsSync(testPath)) {
        vboxPath = testPath
        break
      }
    }
  }

  // If we found a path, try to execute it
  if (vboxPath) {
    try {
      // Always quote the path to handle spaces, especially on Windows
      const quotedPath = `"${vboxPath}"`
      const command = `${quotedPath} --version`
      
      const execOptions: NodeExecOptions = { timeout: 5000, encoding: 'utf8' }
      if (isWindows) {
        execOptions.shell = 'cmd.exe'
      }
      const versionOutput = await runCommand(command, execOptions)
      version = versionOutput.trim()

      // Success! VBoxManage is working
      const locationInfo = pathLocation
        ? `Found in PATH at: ${pathLocation}`
        : `Found at: ${vboxPath}`

      return {
        name: 'VirtualBox',
        status: 'ok',
        message: `VirtualBox ${version} is installed and working. ${locationInfo}`,
        fixable: false,
      }
    } catch (error: unknown) {
      // Path exists but command failed - might be corrupted or wrong version
      const errMsg = error instanceof Error ? error.message : String(error ?? 'Unknown error')
      return {
        name: 'VirtualBox',
        status: 'error',
        message: `VBoxManage found at ${vboxPath} but failed to execute: ${errMsg}`,
        fixable: true,
        fixInstructions: isWindows
          ? `VBoxManage exists but cannot run. Try reinstalling VirtualBox from https://www.virtualbox.org/ or restart your terminal/IDE after installation.`
          : `VBoxManage exists but cannot run. Try: sudo apt-get install --reinstall virtualbox (Ubuntu/Debian) or brew reinstall virtualbox (macOS)`,
      }
    }
  }

  // Not found anywhere - provide detailed instructions
  const instructions = isWindows
    ? `VirtualBox is not installed or not in PATH.

1. Download and install VirtualBox from https://www.virtualbox.org/wiki/Downloads
2. During installation, ensure "Add to PATH" is checked
3. If already installed, add to PATH manually:
   - Open System Properties > Environment Variables
   - Add to PATH: C:\\Program Files\\Oracle\\VirtualBox
   - Restart your terminal/IDE after adding to PATH
4. Click the "Refresh" button above to re-check after installation
5. Verify by running in a new terminal: VBoxManage --version`
    : `VirtualBox is not installed or not in PATH.

1. Install VirtualBox:
   - Ubuntu/Debian: sudo apt-get install virtualbox
   - macOS: brew install virtualbox
   - Or download from https://www.virtualbox.org/wiki/Downloads
2. If installed but not in PATH, add it to your shell profile:
   - Add to ~/.bashrc or ~/.zshrc: export PATH=$PATH:/usr/bin
3. Click the "Refresh" button above to re-check after installation
4. Verify by running: VBoxManage --version`

  return {
    name: 'VirtualBox',
    status: 'error',
    message: 'VirtualBox is not installed or VBoxManage is not accessible in PATH',
    fixable: true,
    fixInstructions: instructions,
  }
}

/**
 * Check if bash is available
 */
export async function checkBash(): Promise<EnvironmentCheck> {
  const isWindows = process.platform === 'win32'
  
  let bashPath: string | null = null
  let version: string | null = null
  let pathLocation: string | null = null

  // First, try to find bash using which/where command
  try {
    const whichCommand = isWindows ? 'where bash' : 'which bash'
    const execOptions: NodeExecOptions = { timeout: 5000, encoding: 'utf8' }
    if (isWindows) {
      execOptions.shell = 'cmd.exe'
    }
    const whichOutput = await runCommand(whichCommand, execOptions)
    // Since runCommand returns Promise<string>, whichOutput is always a string
    const outputStr = whichOutput
    const paths = outputStr.trim().split('\n').filter((p: string) => p.trim())
    pathLocation = paths[0] || null
    
    if (pathLocation) {
      bashPath = pathLocation.trim()
    }
  } catch {
    // Not in PATH, continue to check common locations
  }

  if (!isWindows) {
    // On Unix systems, bash should be available
    if (bashPath) {
      try {
        const execOptions: NodeExecOptions = { timeout: 5000, encoding: 'utf8' }
        const versionOutput = await runCommand(`${bashPath} --version`, execOptions)
        version = versionOutput.trim().split('\n')[0] || null
        return {
          name: 'Bash',
          status: 'ok',
          message: `Bash is available${version ? ` (${version})` : ''}${pathLocation ? ` at: ${pathLocation}` : ''}`,
          fixable: false,
        }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error ?? 'Unknown error')
        return {
          name: 'Bash',
          status: 'error',
          message: `Bash found but failed to execute: ${errMsg}`,
          fixable: true,
          fixInstructions: 'Bash is corrupted. Try: sudo apt-get install --reinstall bash (Linux)',
        }
      }
    }

    // Try default bash
    try {
      const execOptions: NodeExecOptions = { timeout: 5000, encoding: 'utf8' }
      const versionOutput = await runCommand('bash --version', execOptions)
      version = versionOutput.trim().split('\n')[0] || null
      return {
        name: 'Bash',
        status: 'ok',
        message: `Bash is available${version ? ` (${version})` : ''}`,
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

  // Windows: Check for Git Bash in common locations
  const gitBashPaths = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
  ]

  for (const testPath of gitBashPaths) {
    if (existsSync(testPath)) {
      bashPath = testPath
      try {
        const execOptions: NodeExecOptions = { timeout: 5000, encoding: 'utf8' }
        const versionOutput = await runCommand(`"${testPath}" --version`, execOptions)
        version = versionOutput.trim().split('\n')[0] || null
        return {
          name: 'Bash (Git Bash)',
          status: 'ok',
          message: `Git Bash is installed${version ? ` (${version})` : ''} at: ${testPath}`,
          fixable: false,
        }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error ?? 'Unknown error')
        return {
          name: 'Bash (Git Bash)',
          status: 'error',
          message: `Git Bash found at ${testPath} but failed to execute: ${errMsg}`,
          fixable: true,
          fixInstructions: 'Git Bash is corrupted. Try reinstalling from https://git-scm.com/download/win',
        }
      }
    }
  }

  // Check if bash is in PATH
  if (pathLocation) {
    try {
      const execOptions: NodeExecOptions = { timeout: 5000, encoding: 'utf8' }
      const versionOutput = await runCommand('bash --version', execOptions)
      version = versionOutput.trim().split('\n')[0] || null
      return {
        name: 'Bash',
        status: 'ok',
        message: `Bash is available in PATH${version ? ` (${version})` : ''} at: ${pathLocation}`,
        fixable: false,
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error ?? 'Unknown error')
      return {
        name: 'Bash',
        status: 'error',
        message: `Bash found in PATH but failed to execute: ${errMsg}`,
        fixable: true,
        fixInstructions: 'Bash is corrupted. Try reinstalling Git Bash from https://git-scm.com/download/win',
      }
    }
  }

  return {
    name: 'Bash',
    status: 'warning',
    message: 'Bash not found. Scripts will be simulated.',
    fixable: true,
    fixInstructions: `Install Git Bash from https://git-scm.com/download/win

During installation:
1. Select "Git from the command line and also from 3rd-party software"
2. Add Git Bash to PATH
3. Restart your terminal/IDE after installation
4. Click the "Refresh" button above to re-check after installation
5. Verify by running in a new terminal: bash --version`,
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