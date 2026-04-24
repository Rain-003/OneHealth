import * as React from "react";
import * as RA from "@radix-ui/react-scroll-area";

function cx(...p: Array<string | false | null | undefined>) {
  return p.filter(Boolean).join(" ");
}

export function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof RA.Root>) {
  return (
    <RA.Root className={cx("relative overflow-hidden", className)} {...props}>
      <RA.Viewport className="h-full w-full rounded-[inherit]">
        {children}
      </RA.Viewport>
      <RA.Scrollbar
        orientation="vertical"
        className="flex select-none touch-none p-0.5 bg-transparent hover:bg-black/5 transition-colors"
      >
        <RA.Thumb className="flex-1 rounded-full bg-black/30" />
      </RA.Scrollbar>
      <RA.Corner />
    </RA.Root>
  );
}

export const ScrollBar = RA.Scrollbar;
