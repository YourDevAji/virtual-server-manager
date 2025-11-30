import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/supabase/api-client'
import { executeScript } from '@/lib/scripts/executor'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { supabase, user } = await verifyAuth(request)

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

    const scriptResult = await executeScript('vm-metrics.sh', [instance.name])

    if (!scriptResult.success) {
      // Fall back to zero metrics instead of failing the endpoint
      return NextResponse.json({
        success: true,
        metrics: {
          cpu: 0,
          ram_used: 0,
          ram_total: 0,
        },
      })
    }

    try {
      const metrics = JSON.parse(scriptResult.output.trim())
      return NextResponse.json({ success: true, metrics })
    } catch {
      // If parsing fails, also fall back to zero metrics
      return NextResponse.json({
        success: true,
        metrics: {
          cpu: 0,
          ram_used: 0,
          ram_total: 0,
        },
      })
    }
  } catch (error) {
    console.error('Error fetching metrics:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
