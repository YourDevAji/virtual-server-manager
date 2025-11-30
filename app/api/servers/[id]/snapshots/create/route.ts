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
    const body = await request.json().catch(() => ({})) as { name?: string }

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: 'Snapshot name is required' },
        { status: 400 }
      )
    }

    const snapshotName = body.name.trim()

    const { supabase } = createApiClient(request)

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

    const scriptResult = await executeScript('create_snapshot.sh', [instance.name, snapshotName])

    if (!scriptResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: scriptResult.error || 'Failed to create snapshot',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, name: snapshotName })
  } catch (error) {
    console.error('Error creating snapshot:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create snapshot' },
      { status: 500 }
    )
  }
}
