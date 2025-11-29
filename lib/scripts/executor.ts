import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

const SCRIPTS_DIR = path.join(process.cwd(), 'scripts')

/**
 * Find bash executable on Windows
 */
function findBashOnWindows(): string | null {
  const possiblePaths = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
    'bash', // Try if it's in PATH
  ]

  for (const bashPath of possiblePaths) {
    try {
      if (bashPath === 'bash' || existsSync(bashPath)) {
        return bashPath
      }
    } catch {
      continue
    }
  }

  return null
}

/**
 * Execute a shell script with arguments
 */
export async function executeScript(
  scriptName: string,
  args: string[] = []
): Promise<{ success: boolean; output: string; error?: string }> {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName)
  
  // Check if script exists
  if (!existsSync(scriptPath)) {
    return {
      success: false,
      output: '',
      error: `Script not found: ${scriptPath}`,
    }
  }

  const isWindows = process.platform === 'win32'
  
  let command: string

  if (isWindows) {
    // Try to find bash
    const bashPath = findBashOnWindows()
    
    if (!bashPath) {
      // Bash not found - return failure but allow database operation to continue
      console.warn('Bash not found. Script execution cannot proceed.')
      return {
        success: false,
        output: '',
        error: 'Bash not found. Please install Git Bash or ensure bash is in PATH. Database record created.',
      }
    }

    // Convert Windows path to Unix-style for bash
    // C:\Users\... -> /c/Users/...
    const unixPath = scriptPath
      .replace(/\\/g, '/')
      .replace(/^([A-Z]):/, (match, drive) => `/${drive.toLowerCase()}`)
    
    // Escape arguments - wrap each in quotes and escape internal quotes
    const escapedArgs = args.map(arg => {
      const escaped = arg.replace(/"/g, '\\"').replace(/\$/g, '\\$')
      return `"${escaped}"`
    }).join(' ')

    // Use absolute path to bash and quote the script path
    if (bashPath === 'bash') {
      command = `bash "${unixPath}" ${escapedArgs}`
    } else {
      command = `"${bashPath}" "${unixPath}" ${escapedArgs}`
    }
  } else {
    // Unix/Linux - make sure script is executable
    const escapedArgs = args.map(arg => {
      const escaped = arg.replace(/'/g, "'\\''")
      return `'${escaped}'`
    }).join(' ')
    
    command = `bash "${scriptPath}" ${escapedArgs}`
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: SCRIPTS_DIR,
      timeout: 300000, // 5 minutes timeout
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    })

    // On Windows, stderr might contain warnings that are not errors
    if (stderr && !stderr.includes('WARNING') && !stderr.includes('warning')) {
      // Check if it's actually an error or just informational
      const isError = !stderr.toLowerCase().includes('info') && 
                      !stderr.toLowerCase().includes('note')
      
      if (isError) {
        console.error(`Script error: ${stderr}`)
        return {
          success: false,
          output: stdout,
          error: stderr,
        }
      }
    }

    return {
      success: true,
      output: stdout || stderr || 'Script executed successfully',
    }
  } catch (error: any) {
    console.error(`Script execution failed: ${error.message}`)
    console.error(`Command: ${command}`)
    console.error(`Stdout: ${error.stdout || 'none'}`)
    console.error(`Stderr: ${error.stderr || 'none'}`)
    
    // Return failure but with detailed error message
    // The API route will handle this gracefully and still create the database record
    return {
      success: false,
      output: error.stdout || '',
      error: error.message || 'Unknown error',
    }
  }
}

/**
 * Check if a script exists
 */
export function scriptExists(scriptName: string): boolean {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName)
  try {
    return existsSync(scriptPath)
  } catch {
    return false
  }
}
