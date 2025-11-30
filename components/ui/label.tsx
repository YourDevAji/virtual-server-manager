import * as React from "react"
import { cn } from "@/lib/utils"

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

export function Label(props: LabelProps) {
  const { children, className, ...rest } = props
  return <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...rest}>{children}</label>
}

