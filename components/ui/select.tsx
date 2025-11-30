import * as React from "react"
import { cn } from "@/lib/utils"

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export function Select(props: SelectProps) {
  const { className, ...rest } = props
  return <select className={cn("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)} {...rest} />
}

