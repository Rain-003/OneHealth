import { useEffect, useRef, useState } from "react";
import { router } from "@inertiajs/react";

/** Use:
 *  const { dirty, setDirty, markClean } = useUnsavedChanges();
 *  setDirty(true) whenever any field changes; call markClean() after successful save.
 */
export default function useUnsavedChanges() {
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    const unbind = router.on("before", (evt: any) => {
      if (!dirtyRef.current) return;
      const ok = window.confirm("You have unsaved changes. Leave this page?");
      if (!ok) evt.preventDefault();
    });
    return () => { try { unbind?.(); } catch {} };
  }, []);

  const markClean = () => setDirty(false);

  return { dirty, setDirty, markClean };
}
