// resources/js/components/print/iframe-print.ts

/**
 * Renders an HTML string into a hidden iframe and triggers window.print()
 * from there — so it **does not open a new tab** and does not navigate away.
 */
export function printHTMLInIframe(html: string) {
  if (typeof document === "undefined") return;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  iframe.setAttribute("aria-hidden", "true");

  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    console.error("[printHTMLInIframe] Unable to access iframe document");
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow;

  // Let styles/layout settle, then print and clean up
  setTimeout(() => {
    try {
      win?.focus();
      win?.print();
    } catch (err) {
      console.error("[printHTMLInIframe] Print failed", err);
    } finally {
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }
  }, 50);
}
