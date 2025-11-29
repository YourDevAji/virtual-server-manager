import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/supabase/api-client'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { supabase, user } = await verifyAuth(request)

    // Fetch only user's instances (RLS will enforce this, but we filter explicitly)
    const { data, error } = await supabase
      .from('instances')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching servers:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch servers' },
      { status: 500 }
    )
  }
}

