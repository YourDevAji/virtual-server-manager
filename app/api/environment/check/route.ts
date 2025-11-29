import { NextResponse } from 'next/server'
import { checkEnvironment } from '@/lib/scripts/environment'

export async function GET() {
  try {
    const checks = await checkEnvironment()
    return NextResponse.json(checks)
  } catch (error) {
    console.error('Error checking environment:', error)
    return NextResponse.json(
      { error: 'Failed to check environment' },
      { status: 500 }
    )
  }
}

