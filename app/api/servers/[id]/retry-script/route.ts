import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/supabase/api-client'
import { executeScript } from '@/lib/scripts/executor'

// Re-export verifyAuth for consistency
export { verifyAuth }

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify authentication
    const { supabase, user } = await verifyAuth(request)

    // Get instance (verify ownership)
    const { data: instance, error: instanceError } = await supabase
      .from('instances')
      .select('name, os, cpu, ram, storage, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (instanceError || !instance) {
      return NextResponse.json(
        { error: 'Instance not found' },
        { status: 404 }
      )
    }

    // Update script status to running
    await supabase
      .from('instances')
      .update({ script_status: 'running', script_error: null })
      .eq('id', id)

    // Execute create_vm.sh script
    const scriptResult = await executeScript('create_vm.sh', [
      instance.name,
      instance.os,
      instance.cpu.toString(),
      instance.ram.toString(),
      instance.storage.toString(),
    ])

    // Update instance with script execution result
    const scriptStatus = scriptResult.success ? 'completed' : 'failed'
    await supabase
      .from('instances')
      .update({
        script_status: scriptStatus,
        script_error: scriptResult.error || null,
      })
      .eq('id', id)

    if (!scriptResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: scriptResult.error || 'Script execution failed',
          message: scriptResult.error || 'Script execution failed',
          scriptStatus,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Script execution completed successfully',
      scriptStatus,
    })
  } catch (error) {
    console.error('Error retrying script:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to retry script' },
      { status: 500 }
    )
  }
}

