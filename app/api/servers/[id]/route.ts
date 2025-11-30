import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/supabase/api-client'

export async function GET(
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
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (instanceError || !instance) {
      return NextResponse.json(
        { error: 'Instance not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(instance)
  } catch (error) {
    console.error('Error fetching server:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch server' },
      { status: 500 }
    )
  }
}

