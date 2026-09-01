import * as React from "react"

import { cn } from "@/lib/utils"

// `containerStyle` (a fixed height) signals an internally-scrolling table —
// only those get a tab stop + accessible name on the scroll region itself
// (WCAG 2.1.1: a scrollable region needs keyboard access independent of its
// content's own focusable elements). A naturally-growing table never
// scrolls, so it skips the extra tab stop rather than adding a no-op one.
//
// `containerRef` exposes the scrollable wrapper div itself (separate from
// `ref`, which forwards to the inner <table>) — callers that scroll a row
// into view need a handle on the actual scrolling element so they can clamp
// scrollTop directly instead of native scrollIntoView, which can cascade to
// the whole page (see EnrollmentTable.jsx).
const Table = React.forwardRef(
  ({ className, containerClassName, containerStyle, containerLabel, containerRef, ...props }, ref) => (
    <div
      ref={containerRef}
      className={cn("relative w-full overflow-auto", containerClassName)}
      style={containerStyle}
      tabIndex={containerStyle ? 0 : undefined}
      role={containerStyle ? "region" : undefined}
      aria-label={containerStyle ? containerLabel : undefined}
    >
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props} />
    </div>
  )
)
Table.displayName = "Table"

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props} />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props} />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props} />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props} />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props} />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props} />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
