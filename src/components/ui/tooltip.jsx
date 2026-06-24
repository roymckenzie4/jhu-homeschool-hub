/**
 * shadcn Tooltip — Radix Tooltip primitive wrapped with the project's Tailwind
 * tokens. Used for the regulation-definition hovers on the comparison table's
 * column headers. Radix handles hover, focus (keyboard), and dismissal.
 *
 * Wrap the app (or a subtree) in <TooltipProvider> once; each tooltip is a
 * <Tooltip> with a <TooltipTrigger> and <TooltipContent>.
 */

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef(
  ({ className, sideOffset = 6, ...props }, ref) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-w-xs rounded border border-sable/20 bg-white px-3 py-2 font-sans text-[11px] normal-case leading-relaxed tracking-normal text-sable/80 shadow-lg",
          "data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  ),
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
