import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/supabase/api-client'
import { executeScript } from '@/lib/scripts/executor'

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
      .select('name, user_id')
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
      .update({ script_status: 'running' })
      .eq('id', id)

    // Execute destroy_vm.sh script (non-blocking)
    let scriptResult
    try {
      scriptResult = await executeScript('destroy_vm.sh', [instance.name])
    } catch (scriptError: unknown) {
      const err =
        scriptError instanceof Error ? scriptError : new Error(String(scriptError))
      scriptResult = {
        success: false,
        output: '',
        error: err.message || 'Script execution failed',
      }
    }

    // Delete from database regardless of script result
    // (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('instances')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) throw deleteError

    return NextResponse.json({
      success: true,
      message: scriptResult.success
        ? 'Server deleted successfully'
        : 'Server record deleted (script execution may have failed)',
      scriptResult: scriptResult.success ? undefined : scriptResult.error,
    })
  } catch (error: unknown) {
    console.error('Error deleting server:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete server' },
      { status: 500 }
    )
  }
}
