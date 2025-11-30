// import { exec } from 'child_process'
// import { promisify } from 'util'
// import path from 'path'
// import { existsSync } from 'fs'

// const execAsync = promisify(exec)

// const SCRIPTS_DIR = path.join(process.cwd(), 'scripts')

// /**
//  * Find bash executable on Windows
//  */
// function findBashOnWindows(): string | null {
//   const possiblePaths = [
//     'C:\\Program Files\\Git\\bin\\bash.exe',
//     'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
//     'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
//     'bash', // Try if it's in PATH
//   ]

//   for (const bashPath of possiblePaths) {
//     try {
//       if (bashPath === 'bash' || existsSync(bashPath)) {
//         return bashPath
//       }
//     } catch {
//       continue
//     }
//   }

//   return null
// }

// /**
//  * Execute a shell script with arguments
//  */
// export async function executeScript(
//   scriptName: string,
//   args: string[] = []
// ): Promise<{ success: boolean; output: string; error?: string }> {
//   const scriptPath = path.join(SCRIPTS_DIR, scriptName)
  
//   // Check if script exists
//   if (!existsSync(scriptPath)) {
//     return {
//       success: false,
//       output: '',
//       error: `Script not found: ${scriptPath}`,
//     }
//   }

//   const isWindows = process.platform === 'win32'
  
//   let command: string

//   if (isWindows) {
//     // Try to find bash
//     const bashPath = findBashOnWindows()
    
//     if (!bashPath) {
//       // Bash not found - return failure but allow database operation to continue
//       console.warn('Bash not found. Script execution cannot proceed.')
//       return {
//         success: false,
//         output: '',
//         error: 'Bash not found. Please install Git Bash or ensure bash is in PATH. Database record created.',
//       }
//     }

//     // Convert Windows path to Unix-style for bash
//     // C:\Users\... -> /c/Users/...
//     const unixPath = scriptPath
//       .replace(/\\/g, '/')
//       .replace(/^([A-Z]):/, (match, drive) => `/${drive.toLowerCase()}`)
    
//     // Escape arguments - wrap each in quotes and escape internal quotes
//     const escapedArgs = args.map(arg => {
//       const escaped = arg.replace(/"/g, '\\"').replace(/\$/g, '\\$')
//       return `"${escaped}"`
//     }).join(' ')

//     // Use absolute path to bash and quote the script path
//     if (bashPath === 'bash') {
//       command = `bash "${unixPath}" ${escapedArgs}`
//     } else {
//       command = `"${bashPath}" "${unixPath}" ${escapedArgs}`
//     }
//   } else {
//     // Unix/Linux - make sure script is executable
//     const escapedArgs = args.map(arg => {
//       const escaped = arg.replace(/'/g, "'\\''")
//       return `'${escaped}'`
//     }).join(' ')
    
//     command = `bash "${scriptPath}" ${escapedArgs}`
//   }

//   try {
//     const { stdout, stderr } = await execAsync(command, {
//       cwd: SCRIPTS_DIR,
//       timeout: 300000, // 5 minutes timeout
//       maxBuffer: 10 * 1024 * 1024, // 10MB buffer
//     })

//     // Check stderr for errors (scripts output errors to stderr)
//     if (stderr) {
//       // Check if stderr contains error markers from our scripts
//       const hasError = stderr.includes('[ERROR]') || 
//                        stderr.toLowerCase().includes('error') ||
//                        stderr.toLowerCase().includes('failed')
      
//       // Filter out warnings and info messages
//       const isWarning = stderr.includes('[WARNING]') || 
//                         stderr.toLowerCase().includes('warning')
//       const isInfo = stderr.toLowerCase().includes('info') || 
//                      stderr.toLowerCase().includes('note')
      
//       if (hasError && !isWarning && !isInfo) {
//         // Extract error message (remove ANSI codes and get the actual error)
//         const errorLines = stderr.split('\n')
//           .filter(line => line.includes('[ERROR]') || line.toLowerCase().includes('error'))
//           .map(line => line.replace(/\x1b\[[0-9;]*m/g, '').trim())
//           .filter(line => line.length > 0)
        
//         const errorMessage = errorLines.length > 0 
//           ? errorLines.join('. ') 
//           : stderr.replace(/\x1b\[[0-9;]*m/g, '').trim()
        
//         console.error(`Script error: ${errorMessage}`)
//         return {
//           success: false,
//           output: stdout || '',
//           error: errorMessage,
//         }
//       }
//     }

//     return {
//       success: true,
//       output: stdout || stderr || 'Script executed successfully',
//     }
//   } catch (error: any) {
//     console.error(`Script execution failed: ${error.message}`)
//     console.error(`Command: ${command}`)
//     console.error(`Stdout: ${error.stdout || 'none'}`)
//     console.error(`Stderr: ${error.stderr || 'none'}`)
    
//     // Extract error message from stderr if available
//     let errorMessage = error.message || 'Unknown error'
//     if (error.stderr) {
//       const errorLines = error.stderr.split('\n')
//         .filter((line: string) => line.includes('[ERROR]') || line.toLowerCase().includes('error'))
//         .map((line: string) => line.replace(/\x1b\[[0-9;]*m/g, '').trim())
//         .filter((line: string | any[]) => line.length > 0)
      
//       if (errorLines.length > 0) {
//         errorMessage = errorLines.join('. ')
//       } else {
//         // Use the full stderr if no specific error line found
//         errorMessage = error.stderr.replace(/\x1b\[[0-9;]*m/g, '').trim() || errorMessage
//       }
//     }
    
//     // Return failure but with detailed error message
//     return {
//       success: false,
//       output: error.stdout || '',
//       error: errorMessage,
//     }
//   }
// }

// /**
//  * Check if a script exists
//  */
// export function scriptExists(scriptName: string): boolean {
//   const scriptPath = path.join(SCRIPTS_DIR, scriptName)
//   try {
//     return existsSync(scriptPath)
//   } catch {
//     return false
//   }
// }

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

    // Check stderr for errors (scripts output errors to stderr)
    if (stderr) {
      // Check if stderr contains error markers from our scripts
      const hasError = stderr.includes('[ERROR]') || 
                       stderr.toLowerCase().includes('error') ||
                       stderr.toLowerCase().includes('failed')
      
      // Filter out warnings and info messages
      const isWarning = stderr.includes('[WARNING]') || 
                        stderr.toLowerCase().includes('warning')
      const isInfo = stderr.toLowerCase().includes('info') || 
                     stderr.toLowerCase().includes('note')
      
      if (hasError && !isWarning && !isInfo) {
        // Extract error message (remove ANSI codes and get the actual error)
        const errorLines = stderr.split('\n')
          .filter((line: string) => line.includes('[ERROR]') || line.toLowerCase().includes('error'))
          .map((line: string) => line.replace(/\x1b\[[0-9;]*m/g, '').trim())
          .filter((line: string) => line.length > 0)
        
        const errorMessage = errorLines.length > 0 
          ? errorLines.join('. ') 
          : stderr.replace(/\x1b\[[0-9;]*m/g, '').trim()
        
        console.error(`Script error: ${errorMessage}`)
        return {
          success: false,
          output: stdout || '',
          error: errorMessage,
        }
      }
    }

    return {
      success: true,
      output: stdout || stderr || 'Script executed successfully',
    }
  } catch (error: unknown) {
    // Type-safe error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const execError = error as { stdout?: string; stderr?: string }
    
    console.error(`Script execution failed: ${errorMessage}`)
    console.error(`Command: ${command}`)
    console.error(`Stdout: ${execError.stdout || 'none'}`)
    console.error(`Stderr: ${execError.stderr || 'none'}`)
    
    // Extract error message from stderr if available
    let detailedErrorMessage = errorMessage
    if (execError.stderr) {
      const errorLines = execError.stderr.split('\n')
        .filter((line: string) => line.includes('[ERROR]') || line.toLowerCase().includes('error'))
        .map((line: string) => line.replace(/\x1b\[[0-9;]*m/g, '').trim())
        .filter((line: string) => line.length > 0)
      
      if (errorLines.length > 0) {
        detailedErrorMessage = errorLines.join('. ')
      } else {
        // Use the full stderr if no specific error line found
        detailedErrorMessage = execError.stderr.replace(/\x1b\[[0-9;]*m/g, '').trim() || detailedErrorMessage
      }
    }
    
    // Return failure but with detailed error message
    return {
      success: false,
      output: execError.stdout || '',
      error: detailedErrorMessage,
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