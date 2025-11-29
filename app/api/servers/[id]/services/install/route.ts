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
    const body = await request.json()
    const { service } = body

    if (!service) {
      return NextResponse.json(
        { error: 'Service name is required' },
        { status: 400 }
      )
    }

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

    // Execute install_service.sh script
    const scriptResult = await executeScript('install_service.sh', [
      instance.name,
      service,
    ])

    if (!scriptResult.success) {
      console.error('Script execution failed:', scriptResult.error)
      // Continue anyway - service record will be created
    }

    // Create service record in database
    const { data: serviceData, error: serviceError } = await supabase
      .from('services')
      .insert({
        instance_id: id,
        service_name: service,
        status: 'installed',
      })
      .select()
      .single()

    if (serviceError) throw serviceError

    return NextResponse.json({ success: true, data: serviceData })
  } catch (error) {
    console.error('Error installing service:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to install service' },
      { status: 500 }
    )
  }
}
