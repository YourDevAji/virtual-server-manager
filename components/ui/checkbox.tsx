// import * as React from "react"
// import { cn } from "@/lib/utils"

// export interface CheckboxProps
//   extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
//   onCheckedChange?: (checked: boolean) => void
// }

// const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
//   ({ className, onCheckedChange, ...props }, ref) => {
//     const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//       if (onCheckedChange) {
//         onCheckedChange(e.target.checked)
//       }
//     }

//     return (
//       <input
//         type="checkbox"
//         className={cn(
//           "h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary",
//           className
//         )}
//         ref={ref}
//         {...props}
//         onChange={handleChange}
//       />
//     )
//   }
// )
// Checkbox.displayName = "Checkbox"

// export { Checkbox }


import * as React from "react"
import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Call the custom onCheckedChange handler
      onCheckedChange?.(e.target.checked)
      
      // Also call the native onChange if provided
      onChange?.(e)
    }

    return (
      <input
        type="checkbox"
        className={cn(
          "h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary",
          className
        )}
        ref={ref}
        {...props}
        onChange={handleChange}
      />
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }