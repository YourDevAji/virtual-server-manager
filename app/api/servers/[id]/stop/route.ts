import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-client'
import { executeScript } from '@/lib/scripts/executor'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { supabase } = createApiClient(request)

    // Get instance
    const { data: instance, error: instanceError } = await supabase
      .from('instances')
      .select('name, user_id')
      .eq('id', id)
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

    // Execute stop-vm.sh script
    const scriptResult = await executeScript('stop-vm.sh', [instance.name])

    // Get current instance status before updating
    const { data: currentInstance } = await supabase
      .from('instances')
      .select('status')
      .eq('id', id)
      .single()

    // Update status in database regardless of script result
    await supabase
      .from('instances')
      .update({
        status: scriptResult.success ? 'stopped' : (currentInstance?.status || 'stopped'),
        script_status: scriptResult.success ? 'completed' : 'failed',
        script_error: scriptResult.error || null,
      })
      .eq('id', id)

    if (!scriptResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: scriptResult.error || 'Failed to stop server',
          message: scriptResult.error || 'Failed to stop server'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: scriptResult.output || 'Server stopped successfully' 
    })
  } catch (error) {
    console.error('Error stopping server:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to stop server' },
      { status: 500 }
    )
  }
}
